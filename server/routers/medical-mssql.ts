import { z } from "zod";
import { access, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  doctorProcedure,
  nurseProcedure,
  technicianProcedure,
  receptionProcedure,
  managerProcedure,
  adminProcedure,
  medicalStaffProcedure,
} from "../_core/procedures";
import { authService } from "../_core/auth";
import {
  getAppNotificationSettings,
  pushAppNotification,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import { isFcmConfigured } from "../_core/fcmPush";
import * as db from "../db";
import { eq, asc, desc, and, inArray, sql } from "drizzle-orm";
import {
  services,
  doctorsLookup,
  patients,
  examinations,
  examinationChecklistItems,
  patientPageStates,
  autorefractometryData,
  afterRefractionData,
  glassesRecords,
  pentacamResults,
  doctorReports,
  testRequests,
  prescriptions,
  patientServiceEntries,
} from "../../drizzle/schema";
import { mssqlQuery } from "../services/accounting/mssqlAccounting";
import { broadcastSheetUpdate } from "../_core/ws";
import { getBuildInfo } from "../_core/buildInfo";
import { copyObjectInS3, deleteFromS3, listObjectsInS3 } from "../_core/s3";
import {
  backfillPapatSrvNamesInMssql,
  deletePatientFromMssqlByCode,
  ensurePatientServiceInMssql,
  getMssqlSyncStatus,
  getNextMssqlPatientCode,
  insertPatientToMssql,
  syncPatientsFromMssql,
  syncSinglePatientFromMssql,
  upsertPatientToMssql,
} from "../integrations/mssqlPatients";

import { canPushToMssql, findExistingPatientByNameOrPhone, normalizePhoneKey, pushNewPatientToMssql, readDoctorNameFromStateData, readFreshDoctorNameForPatient, readRoleSignatureFromStateData, registrationPricingPayload, resolveDoctorCodeById, resolveDoctorCodeByName, resolveNotificationTargetRolesByUserRole, resolvePatientNotifTitle, resolveServiceCodeForType } from "./_medical/patient-helpers";
import { DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG, inferSrvTyp, normalizeServiceCodeKey, normalizeServiceDefaultSheet, normalizeVisitType, serviceTypeFromSheetOrType } from "./_medical/service-helpers";

export const medicalMssqlRoutes = {
  syncPatientsFromMssql: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(20000).optional(),
          dryRun: z.boolean().optional(),
          incremental: z.boolean().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await syncPatientsFromMssql({
        limit: input?.limit,
        dryRun: input?.dryRun ?? false,
        incremental: input?.incremental ?? false,
      });
      await db.logAuditEvent(
        ctx.user.id,
        "SYNC_PATIENTS_FROM_MSSQL",
        "patient",
        0,
        {
          fetched: result.fetched,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          dryRun: result.dryRun,
          incremental: result.incremental,
          incrementalSince: result.incrementalSince,
          lastMarker: result.lastMarker,
        },
      );
      return result;
    }),

  resetPatientServiceTypesFromServiceCode: adminProcedure
    .input(
      z
        .object({
          dryRun: z.boolean().optional(),
          onlyConsultant: z.boolean().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");

      const dryRun = Boolean(input?.dryRun);
      const onlyConsultant = Boolean(input?.onlyConsultant);

      const svcRows = await dbConn
        .select({
          code: services.code,
          serviceType: services.serviceType,
          defaultSheet: services.defaultSheet,
        })
        .from(services)
        .where(eq(services.isActive, true));
      const svcMap = new Map<
        string,
        { serviceType: string | null; defaultSheet: string | null }
      >();
      for (const row of svcRows) {
        const code = normalizeServiceCodeKey(row.code);
        if (!code) continue;
        svcMap.set(code, {
          serviceType: (row.serviceType as string | null) ?? null,
          defaultSheet: (row.defaultSheet as string | null) ?? null,
        });
      }
      console.log(
        `[resetPatientServiceTypes] Loaded ${svcMap.size} services. Sample codes:`,
        Array.from(svcMap.keys()).slice(0, 10),
      );

      const pageStateRows = await dbConn
        .select({
          patientId: patientPageStates.patientId,
          data: patientPageStates.data,
        })
        .from(patientPageStates)
        .where(eq(patientPageStates.page, "examination"));
      const sheetTypeByPatientId = new Map<number, Record<string, string>>();
      for (const row of pageStateRows) {
        const patientId = Number(row.patientId ?? 0);
        if (!patientId) continue;
        const rawData = row.data as any;
        const dataObj =
          rawData && typeof rawData === "object"
            ? rawData
            : (() => {
                try {
                  return JSON.parse(String(rawData ?? "{}"));
                } catch {
                  return {};
                }
              })();
        const rawMap =
          dataObj && typeof dataObj.serviceSheetTypeByCode === "object"
            ? (dataObj.serviceSheetTypeByCode as Record<string, unknown>)
            : {};
        const normalizedMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawMap)) {
          const nk = normalizeServiceCodeKey(k);
          const sv = String(v ?? "").trim();
          if (nk && sv) normalizedMap[nk] = sv;
        }
        if (Object.keys(normalizedMap).length > 0)
          sheetTypeByPatientId.set(patientId, normalizedMap);
      }

      // Get all patients with their current service type
      const allPatients = await dbConn
        .select({
          id: patients.id,
          serviceType: patients.serviceType,
        })
        .from(patients);

      // Get all service entries ordered by date (latest first per patient)
      const allServiceEntries = await dbConn
        .select({
          patientId: patientServiceEntries.patientId,
          serviceCode: patientServiceEntries.serviceCode,
          serviceDate: patientServiceEntries.serviceDate,
          id: patientServiceEntries.id,
        })
        .from(patientServiceEntries)
        .orderBy(
          desc(patientServiceEntries.serviceDate),
          desc(patientServiceEntries.id),
        );

      // Build map of patient ID -> latest service code
      const latestServiceByPatient = new Map<
        number,
        { serviceCode: string | null; currentType: string | null }
      >();
      for (const p of allPatients) {
        latestServiceByPatient.set(p.id, {
          serviceCode: null,
          currentType: p.serviceType,
        });
      }

      // For each patient, find their latest service entry
      const seenPatients = new Set<number>();
      let withServiceEntry = 0;
      for (const entry of allServiceEntries) {
        const patientId = Number(entry.patientId ?? 0);
        if (!patientId || seenPatients.has(patientId)) continue;
        seenPatients.add(patientId);
        withServiceEntry++;
        latestServiceByPatient.set(patientId, {
          serviceCode: entry.serviceCode,
          currentType:
            latestServiceByPatient.get(patientId)?.currentType ?? null,
        });
      }
      console.log(
        `[resetPatientServiceTypes] Found ${allServiceEntries.length} total service entries, ${withServiceEntry} patients with latest service entries`,
      );

      let scanned = 0;
      let updated = 0;
      let withCode = 0;
      let mappedFromServices = 0;
      let mappedFromPageState = 0;
      let unresolved = 0;
      const changedSample: Array<{
        id: number;
        from: string;
        to: string;
        code: string;
      }> = [];

      let filteredByConsultant = 0;
      for (const [
        id,
        { serviceCode, currentType },
      ] of latestServiceByPatient.entries()) {
        scanned += 1;
        const code = normalizeServiceCodeKey(serviceCode);
        const normalizedCurrentType = String(currentType ?? "")
          .trim()
          .toLowerCase();
        if (!id || !code) continue;
        withCode += 1;
        if (onlyConsultant && normalizedCurrentType !== "consultant") {
          filteredByConsultant++;
          continue;
        }

        const svc = svcMap.get(code);
        let nextType: string | null = null;

        // Map service's defaultSheet directly to patient serviceType
        if (svc && svc.defaultSheet) {
          const sheet = String(svc.defaultSheet).trim().toLowerCase();
          // Direct sheet-to-type mapping
          if (sheet === "external") nextType = "external";
          else if (sheet === "surgery") nextType = "surgery";
          else if (sheet === "specialist") nextType = "specialist";
          else if (sheet === "lasik") nextType = "lasik";
          else if (sheet === "consultant") nextType = "consultant";
          mappedFromServices += 1;
        } else {
          unresolved += 1;
        }

        if (
          id % 500 === 0 ||
          code === "1586" ||
          (code === "1521" && id < 1000) ||
          (code === "1572" && id < 1000)
        ) {
          console.log(
            `[resetPatientServiceTypes] Patient ${id}: code="${code}", currentType="${normalizedCurrentType}", svc=${svc ? `{defaultSheet:"${svc.defaultSheet}"}` : "null"}, nextType="${nextType}", willUpdate=${!nextType || nextType === normalizedCurrentType ? "NO" : "YES"}`,
          );
        }
        if (!nextType || nextType === normalizedCurrentType) continue;

        if (!dryRun) {
          await dbConn
            .update(patients)
            .set({
              serviceType: nextType as any,
              ...(nextType === "external"
                ? { locationType: "external" as const }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(patients.id, id));
        }
        updated += 1;
        if (changedSample.length < 20) {
          changedSample.push({
            id,
            from: normalizedCurrentType || "-",
            to: nextType,
            code,
          });
        }
      }

      console.log(
        `[resetPatientServiceTypes] SUMMARY: scanned=${scanned}, withCode=${withCode}, filteredByConsultant=${filteredByConsultant}, mappedFromServices=${mappedFromServices}, mappedFromPageState=${mappedFromPageState}, unresolved=${unresolved}, updated=${updated}, dryRun=${dryRun}, onlyConsultant=${onlyConsultant}`,
      );

      await db.logAuditEvent(
        ctx.user.id,
        "RESET_PATIENT_SERVICE_TYPES_FROM_SERVICE_CODE",
        "patient",
        0,
        {
          scanned,
          updated,
          dryRun,
          onlyConsultant,
        },
      );

      return {
        scanned,
        withCode,
        updated,
        dryRun,
        onlyConsultant,
        mappedFromServices,
        mappedFromPageState,
        unresolved,
        sample: changedSample,
      };
    }),

  resetMssqlSyncCodes: adminProcedure.mutation(async ({ ctx }) => {
    const affected = await db.resetMssqlSyncCodes();
    await db.logAuditEvent(
      ctx.user.id,
      "RESET_MSSQL_SYNC_CODES",
      "patient",
      0,
      { affected },
    );
    return { affected };
  }),

  resetPatientsAutoIncrement: adminProcedure
    .input(z.object({ value: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");
      await dbConn.execute(
        `ALTER TABLE patients AUTO_INCREMENT = ${input.value}`,
      );
      await db.logAuditEvent(
        ctx.user.id,
        "RESET_PATIENTS_AUTO_INCREMENT",
        "patient",
        0,
        { value: input.value },
      );
      return { value: input.value };
    }),

  getNextMssqlPatientCode: protectedProcedure.query(async () => {
    try {
      return { code: await getNextMssqlPatientCode() };
    } catch (error) {
      console.warn("[medical.getNextMssqlPatientCode] fallback", error);
      return { code: await db.getNextPatientCode() };
    }
  }),

  getMssqlSyncStatus: adminProcedure.query(async () => {
    try {
      return await getMssqlSyncStatus();
    } catch (error) {
      console.warn("[medical.getMssqlSyncStatus] fallback", error);
      return {
        lastSuccessAt: null,
        lastMarker: null,
        lastMode: null,
        lastResult: null,
        running: false,
        lastRunStartedAt: null,
        lastRunFinishedAt: null,
        lastError: "unavailable",
        nextRunAt: null,
        lastChangeCount: null,
      };
    }
  }),

  backfillMssqlServiceNames: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50000).optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await backfillPapatSrvNamesInMssql(input?.limit);
      await db.logAuditEvent(
        ctx.user.id,
        "BACKFILL_MSSQL_PAPAT_SRV_NAMES",
        "systemSetting",
        0,
        {
          limit: input?.limit ?? null,
          updated: result.updated,
          note: result.note ?? "",
        },
      );
      return result;
    }),

  getMssqlSyncRuntimeConfig: adminProcedure.query(async () => {
    const fallback = DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG;
    const row = await db
      .getSystemSetting("mssql_sync_runtime_v1")
      .catch(() => null);
    if (!row?.value) return fallback;
    try {
      const parsed = JSON.parse(String(row.value ?? "{}")) as Record<
        string,
        unknown
      >;
      return {
        enabled:
          typeof parsed.enabled === "boolean"
            ? parsed.enabled
            : fallback.enabled,
        intervalMs:
          Number.isFinite(Number(parsed.intervalMs)) &&
          Number(parsed.intervalMs) >= 5_000
            ? Math.trunc(Number(parsed.intervalMs))
            : fallback.intervalMs,
        limit:
          Number.isFinite(Number(parsed.limit)) && Number(parsed.limit) >= 1
            ? Math.min(20_000, Math.trunc(Number(parsed.limit)))
            : fallback.limit,
        incremental:
          typeof parsed.incremental === "boolean"
            ? parsed.incremental
            : fallback.incremental,
        overwriteExisting:
          typeof parsed.overwriteExisting === "boolean"
            ? parsed.overwriteExisting
            : fallback.overwriteExisting,
        preserveManualEdits:
          typeof parsed.preserveManualEdits === "boolean"
            ? parsed.preserveManualEdits
            : fallback.preserveManualEdits,
        linkServicesForExisting:
          typeof parsed.linkServicesForExisting === "boolean"
            ? parsed.linkServicesForExisting
            : fallback.linkServicesForExisting,
      };
    } catch {
      return fallback;
    }
  }),

  updateMssqlSyncRuntimeConfig: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        intervalMs: z.number().int().min(5000).max(3600000),
        limit: z.number().int().min(1).max(20000),
        incremental: z.boolean(),
        overwriteExisting: z.boolean().optional(),
        preserveManualEdits: z.boolean().optional(),
        linkServicesForExisting: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.overwriteExisting) {
        await db.logAuditEvent(
          ctx.user.id,
          "MSSQL_SYNC_OVERWRITE_MODE_ENABLED",
          "systemSetting",
          0,
          {
            warning:
              "Overwrite mode will backfill patient fields. Existing user-edited values may be changed if empty-check allows update path.",
          },
        );
      }
      await db.updateSystemSettings("mssql_sync_runtime_v1", {
        enabled: input.enabled,
        intervalMs: input.intervalMs,
        limit: input.limit,
        incremental: input.incremental,
        overwriteExisting:
          typeof input.overwriteExisting === "boolean"
            ? input.overwriteExisting
            : String(
                process.env.MSSQL_SYNC_UPDATE_EXISTING ?? "false",
              ).toLowerCase() === "true",
        preserveManualEdits:
          typeof input.preserveManualEdits === "boolean"
            ? input.preserveManualEdits
            : String(
                process.env.MSSQL_SYNC_PRESERVE_MANUAL_EDITS ?? "true",
              ).toLowerCase() !== "false",
        linkServicesForExisting:
          typeof input.linkServicesForExisting === "boolean"
            ? input.linkServicesForExisting
            : String(
                process.env.MSSQL_SYNC_LINK_SERVICES_FOR_EXISTING ?? "true",
              ).toLowerCase() !== "false",
      });
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_MSSQL_SYNC_RUNTIME_CONFIG",
        "systemSetting",
        0,
        {
          ...input,
        },
      );
      return { success: true };
    }),

  linkMultipleServicesToMssql: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        services: z.array(
          z.object({
            code: z.string().min(1),
            quantity: z.number().int().min(1).max(10).optional(),
            doctorCode: z.string().optional(),
            doctorName: z.string().optional(),
            servicePrice: z.number().nonnegative().optional(),
            discountValue: z.number().nonnegative().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowed = await canPushToMssql(ctx.user);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission for MSSQL adding",
        });
      }
      const patient = await db.getPatientById(input.patientId);
      const patientCode = String((patient as any)?.patientCode ?? "").trim();
      if (!patientCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Patient code missing",
        });
      }

      const results = [];
      for (const srv of input.services) {
        const res = await ensurePatientServiceInMssql(
          patientCode,
          srv.code,
          srv.quantity ?? null,
          String(srv.doctorCode ?? "").trim() || null,
          String(srv.doctorName ?? "").trim() || null,
          srv.discountValue ?? null,
          srv.servicePrice ?? null,
        );
        results.push({
          serviceCode: srv.code,
          linked: res.linked,
          note: res.note,
        });
      }

      await db.logAuditEvent(
        ctx.user.id,
        "LINK_MULTIPLE_SERVICES_MSSQL",
        "patient",
        input.patientId,
        {
          patientCode,
          count: input.services.length,
          results,
        },
      );

      return { success: true, results };
    }),

  linkPatientServiceToMssql: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        serviceCode: z.string().min(1),
        quantity: z.number().int().min(1).max(10).optional(),
        doctorCode: z.string().optional(),
        doctorName: z.string().optional(),
        servicePrice: z.number().nonnegative().optional(),
        discountValue: z.number().nonnegative().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowed = await canPushToMssql(ctx.user);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission for MSSQL adding",
        });
      }
      const patient = await db.getPatientById(input.patientId);
      const patientCode = String((patient as any)?.patientCode ?? "").trim();
      if (!patientCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Patient code missing",
        });
      }
      const serviceCode = String(input.serviceCode ?? "").trim();
      const result = await ensurePatientServiceInMssql(
        patientCode,
        serviceCode,
        input.quantity ?? null,
        String(input.doctorCode ?? "").trim() || null,
        String(input.doctorName ?? "").trim() || null,
        input.discountValue ?? null,
        input.servicePrice ?? null,
      );
      if (!result.linked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.note
            ? `MSSQL add failed: ${result.note}`
            : "MSSQL add failed",
        });
      }
      await db.logAuditEvent(
        ctx.user.id,
        "LINK_PATIENT_SERVICE_MSSQL",
        "patient",
        input.patientId,
        {
          patientCode,
          serviceCode,
          quantity: input.quantity ?? null,
          doctorCode: String(input.doctorCode ?? "").trim(),
          doctorName: String(input.doctorName ?? "").trim(),
          linked: result.linked,
          note: result.note ?? "",
        },
      );
      return {
        success: true,
        linked: true,
        note: result.note ?? "",
        patientCode,
        serviceCode,
      };
    }),

  deletePatientFromMssql: adminProcedure
    .input(
      z.object({
        patientId: z.number().optional(),
        patientCode: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const codeFromInput = String(input.patientCode ?? "").trim();
      let patientCode = codeFromInput;
      if (!patientCode && input.patientId) {
        const patient = await db.getPatientById(input.patientId);
        patientCode = String((patient as any)?.patientCode ?? "").trim();
      }
      if (!patientCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing patient code for MSSQL delete",
        });
      }

      const result = await deletePatientFromMssqlByCode(patientCode);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_PATIENT_MSSQL",
        "patient",
        Number(input.patientId ?? 0),
        {
          patientCode,
          deleted: result.deleted,
          note: result.note ?? "",
        },
      );
      return { success: true, ...result, patientCode };
    }),

  deletePatientWithAllData: adminProcedure
    .input(z.object({ patientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.deletePatientWithAllData(input.patientId);
        await db.logAuditEvent(
          ctx.user.id,
          "DELETE_PATIENT_WITH_DATA",
          "patient",
          input.patientId,
          { message: "Deleted patient and all related data" },
        );
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete patient and data: ${error}`);
      }
    }),

  deleteVisitWithAllData: adminProcedure
    .input(z.object({ visitId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.deleteVisitWithAllData(input.visitId);
        await db.logAuditEvent(
          ctx.user.id,
          "DELETE_VISIT_WITH_DATA",
          "visit",
          input.visitId,
          { message: "Deleted visit and all related data" },
        );
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete visit and data: ${error}`);
      }
    }),

  deleteExaminationDirect: adminProcedure
    .input(z.object({ examinationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await db.deleteExaminationDirect(input.examinationId);
        await db.logAuditEvent(
          ctx.user.id,
          "DELETE_EXAMINATION",
          "examination",
          input.examinationId,
          { message: "Deleted examination and related data" },
        );
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to delete examination: ${error}`);
      }
    }),

  syncRegistrationCatalogFromMssql: managerProcedure.mutation(
    async ({ ctx }) => {
      const stageStats: Record<string, unknown> = {};
      try {
        // Discover column names via INFORMATION_SCHEMA
        const srvColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SRVCMF'`,
          {},
        );
        const mdColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MDTEAM'`,
          {},
        );
        const lstdColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
          `SELECT COLUMN_NAME FROM op2026.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SRVLSTD'`,
          {},
        );
        const srvCols = new Set(
          srvColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()),
        );
        const mdCols = new Set(
          mdColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()),
        );
        const lstdCols = new Set(
          lstdColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()),
        );

        const pickCol = (
          cols: Set<string>,
          candidates: string[],
        ): string | null =>
          candidates.find((c) => cols.has(c.toUpperCase())) ?? null;

        const srvCodeCol = pickCol(srvCols, [
          "SRV_CD",
          "SRVCOD",
          "SRV_CODE",
          "CODE",
        ]);
        const srvNameCol = pickCol(srvCols, [
          "SRV_NM_AR",
          "SRV_NM_EN",
          "SRV_NM",
          "SRV_NAME",
          "SRVNAME",
          "NAME",
          "NM",
        ]);
        const drsCodeCol = pickCol(mdCols, [
          "CODE",
          "DRS_CD",
          "DRSCOD",
          "DRS_CODE",
        ]);
        const drsNameCol = pickCol(mdCols, [
          "PHNM_AR",
          "PHNM_EN",
          "DRS_NM",
          "DRS_NAME",
          "DRSNAME",
          "NAME",
          "NM",
        ]);
        const drsDeptNoCol = mdCols.has("DPT_NO") ? "DPT_NO" : null;
        const lstdCodeCol = pickCol(lstdCols, [
          "SRV_CD",
          "SRVCOD",
          "SRV_CODE",
          "CODE",
        ]);
        const lstdPriceCol = pickCol(lstdCols, [
          "PR_VL",
          "PRC1",
          "PRC",
          "PRC_VL",
          "PRICE",
          "PRCVL",
          "DISC_VL",
          "SRVRAT",
        ]);

        if (!srvCodeCol || !srvNameCol) {
          throw new Error(
            `Cannot find service code/name columns in SRVCMF. Available: ${[...srvCols].join(", ")}`,
          );
        }
        if (!drsCodeCol || !drsNameCol) {
          throw new Error(
            `Cannot find doctor code/name columns in MDTEAM. Available: ${[...mdCols].join(", ")}`,
          );
        }
        if (!lstdCodeCol || !lstdPriceCol) {
          throw new Error(
            `Cannot find code/price columns in SRVLSTD. Available: ${[...lstdCols].join(", ")}`,
          );
        }

        const servicesQuery = `
        SELECT
          l.${lstdCodeCol} AS code,
          MAX(s.${srvNameCol}) AS name,
          CAST(ISNULL(TRY_CAST(MAX(l.${lstdPriceCol}) AS DECIMAL(10,2)), 0) AS DECIMAL(10,2)) AS price
        FROM op2026.dbo.SRVLSTD l
        JOIN SRVCMF s ON s.${srvCodeCol} = l.${lstdCodeCol}
        WHERE l.${lstdCodeCol} IS NOT NULL AND l.${lstdCodeCol} <> ''
          AND s.DPT_NO = 15
        GROUP BY l.${lstdCodeCol}
        ORDER BY l.${lstdCodeCol}
      `;

        const mssqlServices = await mssqlQuery(servicesQuery, {});
        stageStats.servicesRows = mssqlServices.length;

        if (!drsDeptNoCol) {
          throw new Error(
            `DPT_NO column not found in MDTEAM. Available: ${[...mdCols].join(", ")}`,
          );
        }

        const doctorsQuery = `
        SELECT DISTINCT
          ${drsCodeCol} AS code,
          ${drsNameCol} AS name
        FROM MDTEAM
        WHERE ${drsCodeCol} IS NOT NULL AND ${drsCodeCol} <> ''
          AND ${drsDeptNoCol} = 15
        ORDER BY ${drsCodeCol}
      `;
        const mssqlDoctors = await mssqlQuery(doctorsQuery, {});
        stageStats.doctorsRows = mssqlDoctors.length;

        // Upsert to MySQL services and doctorsLookup tables
        const result = await db.upsertRegistrationCatalogRows({
          mssqlServices: mssqlServices.map((row: any) => ({
            code: String(row.code ?? "").trim(),
            name: String(row.name ?? "").trim(),
            price: Number(row.price ?? 0),
          })),
          mssqlDoctors: mssqlDoctors.map((row: any) => ({
            code: String(row.code ?? "").trim(),
            name: String(row.name ?? "").trim(),
          })),
        });
        stageStats.servicesUpserted = result.servicesUpserted;
        stageStats.doctorsUpserted = result.doctorsUpserted;

        await db.logAuditEvent(
          ctx.user.id,
          "SYNC_REGISTRATION_CATALOG",
          "system",
          0,
          {
            servicesUpserted: result.servicesUpserted,
            doctorsUpserted: result.doctorsUpserted,
          },
        );

        return {
          success: true,
          servicesUpserted: result.servicesUpserted,
          doctorsUpserted: result.doctorsUpserted,
          mssqlServicesRows: mssqlServices.length,
          mssqlDoctorsRows: mssqlDoctors.length,
        };
      } catch (error) {
        const err = error as any;
        console.error("syncRegistrationCatalogFromMssql error:", {
          stageStats,
          message: err?.message ?? String(err),
          code: err?.code,
          name: err?.name,
          state: err?.state,
          number: err?.number,
          originalError: err?.originalError?.message ?? null,
          precedingErrors: Array.isArray(err?.precedingErrors)
            ? err.precedingErrors.map((e: any) => e?.message ?? String(e))
            : null,
        });
        const errMsg = err?.message ?? String(err);
        const originalMsg = err?.originalError?.message ?? null;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sync registration catalog from MSSQL: ${originalMsg ?? errMsg} (stage: ${JSON.stringify(stageStats)})`,
        });
      }
    },
  ),

  updateServicePriceInMssql: managerProcedure
    .input(z.object({ code: z.string().min(1), price: z.number().min(0) }))
    .mutation(async ({ input }) => {
      const lstdColsRaw = await mssqlQuery<{ COLUMN_NAME: string }>(
        `SELECT COLUMN_NAME FROM op2026.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SRVLSTD'`,
        {},
      );
      const lstdCols = new Set(
        lstdColsRaw.map((r) => r.COLUMN_NAME.toUpperCase()),
      );
      const pickCol = (
        cols: Set<string>,
        candidates: string[],
      ): string | null =>
        candidates.find((c) => cols.has(c.toUpperCase())) ?? null;
      const lstdCodeCol = pickCol(lstdCols, [
        "SRV_CD",
        "SRVCOD",
        "SRV_CODE",
        "CODE",
      ]);
      const lstdPriceCol = pickCol(lstdCols, [
        "PR_VL",
        "PRC1",
        "PRC",
        "PRC_VL",
        "PRICE",
        "PRCVL",
        "DISC_VL",
        "SRVRAT",
      ]);
      if (!lstdCodeCol || !lstdPriceCol) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Cannot find code/price columns in SRVLSTD. Available: ${[...lstdCols].join(", ")}`,
        });
      }
      await mssqlQuery(
        `UPDATE op2026.dbo.SRVLSTD SET ${lstdPriceCol} = @price WHERE ${lstdCodeCol} = @code AND CA_CD = '000000'`,
        { price: input.price, code: input.code },
      );
      return { success: true };
    }),

  addServiceInDb: managerProcedure
    .input(
      z.object({
        id: z.string().min(1),
        code: z.string().min(1),
        name: z.string().min(1),
        category: z.string(),
        serviceType: z.string(),
        srvTyp: z.string(),
        defaultSheet: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.addServiceInDb(input);
      return { success: true };
    }),

  getServicesFromDb: managerProcedure.query(async () => {
    return db.getAllServicesFromDb();
  }),

  updateServiceInDb: managerProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().optional(),
        category: z.string().nullable().optional(),
        serviceType: z.string().optional(),
        srvTyp: z.string().nullable().optional(),
        defaultSheet: z.string().optional(),
        locationType: z.string().optional(),
        price: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateServiceInDb(id, updates);
      return { success: true };
    }),

  getRegistrationCatalog: protectedProcedure.query(async () => {
    try {
      return await db.getRegistrationCatalogFromDb();
    } catch (error) {
      console.error("getRegistrationCatalog error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch registration catalog",
      });
    }
  }),

  getDataSourceAuditStatus: adminProcedure
    .input(z.object({ patientId: z.number().optional() }))
    .query(async ({ input }) => {
      if (!input.patientId) {
        return { checked: false };
      }

      const patientId = input.patientId;
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");

      // 1. Patient row from patients table
      const patientRow = await db.getPatientById(patientId);

      // 2. Latest examination for this patient
      const examinationRows = await dbConn
        .select()
        .from(examinations)
        .where(eq(examinations.patientId, patientId))
        .orderBy(desc(examinations.createdAt))
        .limit(1);
      const latestExam = examinationRows[0] ?? null;

      // 3. Checklist from examination_checklist_items
      let checklistNormalized: Record<string, boolean | null> | null = null;
      if (latestExam) {
        const checklistRows = await dbConn
          .select()
          .from(examinationChecklistItems)
          .where(eq(examinationChecklistItems.examinationId, latestExam.id))
          .limit(1);
        if (checklistRows[0]) {
          const row = checklistRows[0];
          checklistNormalized = {
            generalDiseases: row.generalDiseases ?? null,
            pregnancyOrLactation: row.pregnancyOrLactation ?? null,
            usesAllergySupplementsSteroidsOrPressureMeds:
              row.usesAllergySupplementsSteroidsOrPressureMeds ?? null,
            acneTreatment: row.acneTreatment ?? null,
            familyKeratoconus: row.familyKeratoconus ?? null,
            usesTearSubstituteOrExcessTearsOrSandySensation:
              row.usesTearSubstituteOrExcessTearsOrSandySensation ?? null,
            symptomsWorseWithAirOrAC: row.symptomsWorseWithAirOrAC ?? null,
            glaucomaTreatment: row.glaucomaTreatment ?? null,
          };
        }
      }

      // 4. patientPageStates for examination page
      const pageStateRows = await dbConn
        .select()
        .from(patientPageStates)
        .where(
          and(
            eq(patientPageStates.patientId, patientId),
            eq(patientPageStates.page, "examination"),
          ),
        )
        .orderBy(desc(patientPageStates.updatedAt))
        .limit(1);
      const pageStateData = (pageStateRows[0]?.data ?? null) as Record<
        string,
        unknown
      > | null;
      const checklistInPageState = pageStateData
        ? {
            generalDiseases: pageStateData.generalDiseases ?? null,
            pregnancyOrLactation: pageStateData.pregnancyOrLactation ?? null,
            usesAllergySupplementsSteroidsOrPressureMeds:
              pageStateData.usesAllergySupplementsSteroidsOrPressureMeds ??
              null,
            acneTreatment: pageStateData.acneTreatment ?? null,
            familyKeratoconus: pageStateData.familyKeratoconus ?? null,
            usesTearSubstituteOrExcessTearsOrSandySensation:
              pageStateData.usesTearSubstituteOrExcessTearsOrSandySensation ??
              null,
            symptomsWorseWithAirOrAC:
              pageStateData.symptomsWorseWithAirOrAC ?? null,
            glaucomaTreatment: pageStateData.glaucomaTreatment ?? null,
          }
        : null;

      // 5. Autorefractometry data (autoref + IOP)
      const autorefRows = await dbConn
        .select()
        .from(autorefractometryData)
        .where(eq(autorefractometryData.patientId, patientId))
        .orderBy(desc(autorefractometryData.createdAt))
        .limit(1);
      const latestAutoref = autorefRows[0] ?? null;

      // 6. After refraction data
      const afterRefRows = latestExam
        ? await dbConn
            .select()
            .from(afterRefractionData)
            .where(eq(afterRefractionData.examinationId, latestExam.id))
            .limit(1)
        : [];
      const afterRefData = afterRefRows[0] ?? null;

      // 7. Glasses records
      const glassesRows = await dbConn
        .select()
        .from(glassesRecords)
        .where(eq(glassesRecords.patientId, patientId))
        .orderBy(desc(glassesRecords.createdAt))
        .limit(1);
      const latestGlasses = glassesRows[0] ?? null;

      // 8. Pentacam data
      const pentacamRows = latestExam
        ? await dbConn
            .select()
            .from(pentacamResults)
            .where(eq(pentacamResults.visitId, latestExam.id))
            .limit(1)
        : [];
      const pentacamData = pentacamRows[0] ?? null;

      // 9. Doctor report (diagnosis, treatment)
      const doctorReportRows = latestExam
        ? await dbConn
            .select()
            .from(doctorReports)
            .where(eq(doctorReports.visitId, latestExam.id))
            .limit(1)
        : [];
      const doctorReportData = doctorReportRows[0] ?? null;

      // 10. Test requests
      const testReqRows = await dbConn
        .select()
        .from(testRequests)
        .where(eq(testRequests.patientId, patientId))
        .orderBy(desc(testRequests.createdAt))
        .limit(1);
      const latestTestRequest = testReqRows[0] ?? null;

      return {
        checked: true,
        patientId,
        patient: patientRow
          ? {
              id: patientRow.id,
              fullName: patientRow.fullName,
              patientCode: patientRow.patientCode,
              phone: patientRow.phone,
              doctorCode: patientRow.doctorCode,
              serviceCode: patientRow.serviceCode,
            }
          : null,
        latestExamId: latestExam?.id ?? null,
        checklistNormalized,
        checklistInPageState,
        pageStateUpdatedAt: pageStateRows[0]?.updatedAt ?? null,
        pageStateSessionFields: pageStateData
          ? {
              doctorName: pageStateData.doctorName ?? null,
              visitDate: pageStateData.visitDate ?? null,
              sheetSelection: pageStateData.sheetSelection ?? null,
              serviceCode: pageStateData.serviceCode ?? null,
            }
          : null,
        // Additional exam data
        autoref: latestAutoref
          ? {
              sphereOD: latestAutoref.sphereOD ?? null,
              cylinderOD: latestAutoref.cylinderOD ?? null,
              axisOD: latestAutoref.axisOD ?? null,
              sphereOS: latestAutoref.sphereOS ?? null,
              cylinderOS: latestAutoref.cylinderOS ?? null,
              axisOS: latestAutoref.axisOS ?? null,
              iopOD: latestAutoref.iopOD ?? null,
              iopOS: latestAutoref.iopOS ?? null,
            }
          : null,
        afterRef: afterRefData
          ? {
              sphereOD: afterRefData.sphereOD ?? null,
              cylinderOD: afterRefData.cylinderOD ?? null,
              axisOD: afterRefData.axisOD ?? null,
              sphereOS: afterRefData.sphereOS ?? null,
              cylinderOS: afterRefData.cylinderOS ?? null,
              axisOS: afterRefData.axisOS ?? null,
            }
          : null,
        glasses: latestGlasses
          ? {
              sOD: latestGlasses.sOD ?? null,
              cOD: latestGlasses.cOD ?? null,
              axisOD: latestGlasses.axisOD ?? null,
              sOS: latestGlasses.sOS ?? null,
              cOS: latestGlasses.cOS ?? null,
              axisOS: latestGlasses.axisOS ?? null,
              pdOD: latestGlasses.pdOD ?? null,
              addOD: latestGlasses.addOD ?? null,
            }
          : null,
        pentacam: pentacamData
          ? {
              k1OD: pentacamData.k1OD ?? null,
              k2OD: pentacamData.k2OD ?? null,
              k1OS: pentacamData.k1OS ?? null,
              k2OS: pentacamData.k2OS ?? null,
              thinnestPointOD: pentacamData.thinnestPointOD ?? null,
              thinnestPointOS: pentacamData.thinnestPointOS ?? null,
            }
          : null,
        doctorReport: doctorReportData
          ? {
              diagnosis: doctorReportData.diagnosis ?? null,
              treatment: doctorReportData.treatment ?? null,
              recommendations: doctorReportData.recommendations ?? null,
            }
          : null,
        testRequest: latestTestRequest
          ? {
              requestDate: latestTestRequest.requestDate ?? null,
              status: latestTestRequest.status ?? null,
            }
          : null,
      };
    }),
};
