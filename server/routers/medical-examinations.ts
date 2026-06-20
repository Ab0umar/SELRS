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
  insertPatientToMssql,
  syncPatientsFromMssql,
  syncSinglePatientFromMssql,
  upsertPatientToMssql,
} from "../integrations/mssqlPatients";

import { normalizeVisitType } from "./_medical/service-helpers";

export const medicalExaminationsRoutes = {
  getAppointmentsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAppointmentsByPatient(input.patientId);
    }),

  getMedicalTotals: protectedProcedure.query(async () => {
    return await db.getMedicalTotals();
  }),

  getOperations: protectedProcedure.query(async () => {
    return await db.getAllAppointments();
  }),

  getAllOperations: protectedProcedure.query(async () => {
    return await db.getAllAppointments();
  }),

  getAppointments: protectedProcedure.query(async () => {
    return await db.getAllAppointments();
  }),

  deleteAppointment: managerProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteAppointment(input.appointmentId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_APPOINTMENT",
        "appointment",
        input.appointmentId,
        { message: "Deleted appointment" },
      );
      return { success: true };
    }),

  updateAppointment: managerProcedure
    .input(
      z.object({
        appointmentId: z.number(),
        updates: z
          .object({
            status: z
              .enum(["scheduled", "completed", "cancelled", "no_show"])
              .optional(),
            notes: z.string().optional(),
          })
          .partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateAppointment(input.appointmentId, input.updates);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_APPOINTMENT",
        "appointment",
        input.appointmentId,
        { message: "Updated appointment" },
      );
      return { success: true };
    }),

  createExamination: medicalStaffProcedure
    .input(
      z.object({
        visitId: z.number(),
        patientId: z.number(),
        ucvaOD: z.string().optional(),
        ucvaOS: z.string().optional(),
        bcvaOD: z.string().optional(),
        bcvaOS: z.string().optional(),
        refOD_S: z.number().optional(),
        refOD_C: z.number().optional(),
        refOD_A: z.number().optional(),
        refOS_S: z.number().optional(),
        refOS_C: z.number().optional(),
        refOS_A: z.number().optional(),
        iopOD: z.number().optional(),
        iopOS: z.number().optional(),
        examinationNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createExamination({
          ...input,
          examinedBy: ctx.user.id,
        });

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_EXAMINATION",
          "examination",
          0,
          { message: `Created examination for patient ${input.patientId}` },
        );

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create examination: ${error}`);
      }
    }),

  updateExamination: medicalStaffProcedure
    .input(
      z.object({
        examinationId: z.number(),
        updates: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateExamination(input.examinationId, input.updates);

      // Also persist to dedicated tables if autoref/glasses fields are in updates
      const u = input.updates;
      const hasAutoref =
        u.sphereOD ||
        u.sphereOS ||
        u.cylinderOD ||
        u.cylinderOS ||
        u.axisOD ||
        u.axisOS ||
        u.ucvaOD ||
        u.ucvaOS ||
        u.bcvaOD ||
        u.bcvaOS ||
        u.iopOD ||
        u.iopOS;
      const hasGlasses = u.glassesData;

      if (hasAutoref || hasGlasses) {
        const exam = await db.getExaminationById(input.examinationId);
        if (exam?.patientId) {
          if (hasAutoref) {
            await db.saveAutorefractometryData({
              examinationId: input.examinationId,
              patientId: exam.patientId,
              sphereOD: u.sphereOD,
              cylinderOD: u.cylinderOD,
              axisOD: u.axisOD,
              ucvaOD: u.ucvaOD,
              bcvaOD: u.bcvaOD,
              iopOD: u.iopOD,
              sphereOS: u.sphereOS,
              cylinderOS: u.cylinderOS,
              axisOS: u.axisOS,
              ucvaOS: u.ucvaOS,
              bcvaOS: u.bcvaOS,
              iopOS: u.iopOS,
            });
          }
          if (hasGlasses) {
            let gd: any = {};
            try {
              gd = JSON.parse(u.glassesData);
            } catch {
              /* ignore */
            }
            await db.saveGlassesRecord({
              examinationId: input.examinationId,
              patientId: exam.patientId,
              sOD: gd.od?.s,
              cOD: gd.od?.c,
              axisOD: gd.od?.axis || gd.od?.a,
              pdOD: gd.od?.pd,
              bcvaOD: gd.od?.bcva,
              sOS: gd.os?.s,
              cOS: gd.os?.c,
              axisOS: gd.os?.axis || gd.os?.a,
              pdOS: gd.os?.pd,
              bcvaOS: gd.os?.bcva,
            });
          }
        }
      }

      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_EXAMINATION",
        "examination",
        input.examinationId,
        { message: "Updated examination" },
      );
      return { success: true };
    }),

  getExaminationsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getExaminationsByPatient(input.patientId);
    }),

  getAutorefractometryByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAutorefractometryByPatient(input.patientId);
    }),

  getAutorefractometryOverview: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).optional(),
          pageSize: z.number().min(1).max(200).optional(),
          search: z.string().optional(),
          statusFilter: z.enum(["all", "complete", "partial"]).optional(),
          locationType: z.enum(["center", "external"]).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getAutorefractometryOverviewRows({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        statusFilter: input?.statusFilter,
        locationType: input?.locationType,
      });
    }),

  getGlassesRecordsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getGlassesRecordsByPatient(input.patientId);
    }),

  getAfterRefractionByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAfterRefractionByPatient(input.patientId);
    }),

  saveAfterRefractionData: protectedProcedure
    .input(
      z.object({
        examinationId: z.number().int().positive(),
        patientId: z.number().int().positive(),
        od: z
          .object({
            s: z.string().optional(),
            c: z.string().optional(),
            axis: z.string().optional(),
          })
          .optional(),
        os: z
          .object({
            s: z.string().optional(),
            c: z.string().optional(),
            axis: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.saveAfterRefractionData(input);
    }),

  getVisitsByPatient: protectedProcedure
    .input(
      z
        .union([z.number(), z.object({ patientId: z.number() })])
        .nullable()
        .optional(),
    )
    .query(async ({ input }) => {
      let patientId = null;
      if (typeof input === "number") {
        patientId = input;
      } else if (input && typeof input === "object" && "patientId" in input) {
        patientId = input.patientId;
      }
      if (patientId === 0) {
        return await db.getAllVisits();
      }
      if (!patientId) return [];
      return await db.getVisitsByPatient(patientId);
    }),

  getFollowupVisitsByPatient: protectedProcedure
    .input(
      z
        .union([z.number(), z.object({ patientId: z.number() })])
        .nullable()
        .optional(),
    )
    .query(async ({ input }) => {
      let patientId = null;
      if (typeof input === "number") {
        patientId = input;
      } else if (input && typeof input === "object" && "patientId" in input) {
        patientId = input.patientId;
      }
      if (!patientId) return [];
      return await db.getFollowupVisitsByPatient(patientId);
    }),

  getVisits: protectedProcedure.query(async () => {
    return await db.getAllVisits();
  }),

  getExaminations: protectedProcedure.query(async () => {
    return await db.getAllExaminations();
  }),

  updateVisitDate: adminProcedure
    .input(
      z.object({
        visitId: z.number(),
        visitDate: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Parse the date
      const [year, month, day] = input.visitDate.split("-");
      const visitDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      );

      await db.updateVisit(input.visitId, { visitDate });
      return { success: true };
    }),

  updateVisitExamData: protectedProcedure
    .input(
      z.object({
        visitId: z.number(),
        updates: z.object({
          autorefraction: z.any().optional(),
          pentacam: z.any().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to update exam data",
        });
      }

      // Get examinations for this visit
      const exams = await db.getExaminationsByVisit(input.visitId);

      // Update autorefraction if provided
      if (input.updates.autorefraction && exams.length > 0) {
        const exam = exams[0];
        await db.saveAutorefractometryData({
          examinationId: exam.id,
          patientId: exam.patientId,
          od: input.updates.autorefraction?.od,
          os: input.updates.autorefraction?.os,
        });
      }

      // Update pentacam if provided
      if (input.updates.pentacam) {
        const pentacams = await db.getPentacamResultsByVisit(input.visitId);
        if (pentacams.length > 0) {
          const pentacam = pentacams[0];
          const updates: any = {};
          if (input.updates.pentacam.od) {
            updates.k1OD = input.updates.pentacam.od.k1;
            updates.k2OD = input.updates.pentacam.od.k2;
            updates.thinnestPointOD = input.updates.pentacam.od.thinnest;
          }
          if (input.updates.pentacam.os) {
            updates.k1OS = input.updates.pentacam.os.k1;
            updates.k2OS = input.updates.pentacam.os.k2;
            updates.thinnestPointOS = input.updates.pentacam.os.thinnest;
          }

          if (Object.keys(updates).length > 0) {
            await db.updatePentacamResult(pentacam.id, updates);
          }
        }
      }

      return { success: true };
    }),

  saveFollowupSheet: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
        followupItems: z.array(
          z.object({
            tableIndex: z.number(),
            followupDate: z.string().optional(),
            followupName: z.string().optional(),
            vaOD: z.string().optional(),
            vaOS: z.string().optional(),
            refracOD: z.any().optional(),
            refracOS: z.any().optional(),
            flapOD: z.any().optional(),
            flapOS: z.any().optional(),
            iopOD: z.string().optional(),
            iopOS: z.string().optional(),
            treatment: z.string().optional(),
            notes: z.string().optional(),
            rightEye: z.boolean().optional(),
            leftEye: z.boolean().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to save followup sheet",
        });
      }

      // Get or create followup sheet
      let sheet: any = await db.getLatestFollowupSheet(
        input.patientId,
        input.sheetType,
      );
      let nextVersion = 1;

      if (sheet) {
        // Check if current version is full (4 items with dates)
        const items = await db.getFollowupItemsBySheet(sheet.id);
        const fullItems = items.filter((i: any) => i.followupDate);
        if (fullItems.length >= 4) {
          nextVersion = sheet.version + 1;
          sheet = null; // Create new sheet
        }
      }

      if (!sheet) {
        const result = await db.createFollowupSheet({
          patientId: input.patientId,
          sheetType: input.sheetType,
          version: nextVersion,
        });
        sheet = {
          id: (result as any)[0],
          patientId: input.patientId,
          sheetType: input.sheetType,
          version: nextVersion,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Save items
      for (const item of input.followupItems) {
        if (!item.followupDate) continue; // Skip empty items

        const existingItem = await db.getFollowupItemsBySheet(sheet.id);
        const existingIndex = existingItem.find(
          (i: any) => i.tableIndex === item.tableIndex,
        );

        if (existingIndex) {
          await db.updateFollowupItem(existingIndex.id, {
            followupDate: item.followupDate
              ? new Date(item.followupDate)
              : null,
            followupName: item.followupName,
            vaOD: item.vaOD,
            vaOS: item.vaOS,
            refracOD: item.refracOD ? JSON.stringify(item.refracOD) : null,
            refracOS: item.refracOS ? JSON.stringify(item.refracOS) : null,
            flapOD: item.flapOD ? JSON.stringify(item.flapOD) : null,
            flapOS: item.flapOS ? JSON.stringify(item.flapOS) : null,
            iopOD: item.iopOD,
            iopOS: item.iopOS,
            treatment: item.treatment,
            notes: item.notes,
            rightEye: item.rightEye ?? false,
            leftEye: item.leftEye ?? false,
          });
        } else {
          await db.createFollowupItem({
            followupSheetId: sheet.id,
            tableIndex: item.tableIndex,
            followupDate: item.followupDate
              ? new Date(item.followupDate)
              : null,
            followupName: item.followupName,
            vaOD: item.vaOD,
            vaOS: item.vaOS,
            refracOD: item.refracOD ? JSON.stringify(item.refracOD) : null,
            refracOS: item.refracOS ? JSON.stringify(item.refracOS) : null,
            flapOD: item.flapOD ? JSON.stringify(item.flapOD) : null,
            flapOS: item.flapOS ? JSON.stringify(item.flapOS) : null,
            iopOD: item.iopOD,
            iopOS: item.iopOS,
            treatment: item.treatment,
            notes: item.notes,
            rightEye: item.rightEye ?? false,
            leftEye: item.leftEye ?? false,
          });
        }
      }

      await db.logAuditEvent(
        ctx.user.id,
        "SAVE_FOLLOWUP_SHEET",
        "followup_sheets",
        sheet.id,
        { message: `Saved followup sheet version ${sheet.version}` },
      );
      return { success: true, sheetId: sheet.id, version: sheet.version };
    }),

  getFollowupSheets: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        sheetType: z
          .enum(["consultant", "specialist", "lasik", "external"])
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const sheets = await db.getFollowupSheetsByPatient(
        input.patientId,
        input.sheetType,
      );
      const sheetsWithItems = await Promise.all(
        (sheets as any[]).map(async (sheet) => ({
          ...sheet,
          items: await db.getFollowupItemsBySheet(sheet.id),
        })),
      );
      return sheetsWithItems;
    }),

  getAllFollowupItems: protectedProcedure.query(async () => {
    return await db.getAllFollowupItems();
  }),

  getAllExaminations: protectedProcedure.query(async () => {
    return await db.getAllExaminations();
  }),

  getRefractionsOverview: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).optional(),
          pageSize: z.number().min(1).max(200).optional(),
          search: z.string().optional(),
          statusFilter: z.enum(["all", "complete", "partial"]).optional(),
          locationType: z.enum(["center", "external"]).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getRefractionsOverviewRows({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        statusFilter: input?.statusFilter,
        locationType: input?.locationType,
      });
    }),

  getSheetEntry: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
      }),
    )
    .query(async ({ input }) => {
      const stored = await db.getSheetEntry(input.patientId, input.sheetType);
      let base: any = {};
      if (stored) {
        try {
          base = JSON.parse(stored);
        } catch {
          base = {};
        }
      }

      // Build/refresh sheet payload from dedicated tables (source of truth).
      const [
        autorefRows,
        afterRefractionRows,
        glassesRows,
        pentacamRows,
        reports,
        surgeries,
      ] = await Promise.all([
        db.getAutorefractometryByPatient(input.patientId),
        db.getAfterRefractionByPatient(input.patientId),
        db.getGlassesRecordsByPatient(input.patientId),
        db.getPentacamResultsByPatient(input.patientId, 1),
        db.getDoctorReportsByPatient(input.patientId),
        db.getSurgeriesByPatient(input.patientId),
      ]);

      const pickFirstWithValues = (rows: any[] | undefined, keys: string[]) =>
        (rows ?? []).find((row: any) =>
          keys.some((key) => {
            const value = row?.[key];
            return (
              value !== null &&
              value !== undefined &&
              String(value).trim() !== ""
            );
          }),
        ) ??
        (rows ?? [])[0] ??
        {};

      const autoref = pickFirstWithValues(autorefRows as any[], [
        "sphereOD",
        "cylinderOD",
        "axisOD",
        "ucvaOD",
        "bcvaOD",
        "iopOD",
        "sphereOS",
        "cylinderOS",
        "axisOS",
        "ucvaOS",
        "bcvaOS",
        "iopOS",
      ]) as any;
      const afterRefraction = pickFirstWithValues(
        afterRefractionRows as any[],
        [
          "sphereOD",
          "cylinderOD",
          "axisOD",
          "sphereOS",
          "cylinderOS",
          "axisOS",
        ],
      ) as any;
      const glasses = pickFirstWithValues(glassesRows as any[], [
        "sOD",
        "cOD",
        "axisOD",
        "pdOD",
        "bcvaOD",
        "sOS",
        "cOS",
        "axisOS",
        "pdOS",
        "bcvaOS",
      ]) as any;
      const pentacam = pickFirstWithValues(pentacamRows as any[], [
        "k1OD",
        "k2OD",
        "axisOD",
        "thinnestPointOD",
        "apexOD",
        "residualOD",
        "tttOD",
        "ablationOD",
        "k1OS",
        "k2OS",
        "axisOS",
        "thinnestPointOS",
        "apexOS",
        "residualOS",
        "tttOS",
        "ablationOS",
      ]) as any;
      const report = (reports?.[0] ?? {}) as any;
      const surgery = (surgeries?.[0] ?? {}) as any;
      const odSphere =
        autoref?.sphereOD ?? base?.examData?.autorefraction?.od?.s ?? "";
      const odCylinder =
        autoref?.cylinderOD ?? base?.examData?.autorefraction?.od?.c ?? "";
      const odAxis =
        autoref?.axisOD ?? base?.examData?.autorefraction?.od?.axis ?? "";
      const osSphere =
        autoref?.sphereOS ?? base?.examData?.autorefraction?.os?.s ?? "";
      const osCylinder =
        autoref?.cylinderOS ?? base?.examData?.autorefraction?.os?.c ?? "";
      const osAxis =
        autoref?.axisOS ?? base?.examData?.autorefraction?.os?.axis ?? "";
      const odAirPuff =
        autoref?.iopOD ?? base?.examData?.autorefraction?.od?.airPuff1 ?? "";
      const osAirPuff =
        autoref?.iopOS ?? base?.examData?.autorefraction?.os?.airPuff1 ?? "";

      const payload = {
        ...base,
        formData: {
          ...(base?.formData ?? {}),
          diagnosis:
            String(report?.diagnosis ?? "").trim() ||
            base?.formData?.diagnosis ||
            "",
          treatmentPlan:
            String(report?.treatment ?? "").trim() ||
            base?.formData?.treatmentPlan ||
            "",
          recommendations:
            String(report?.recommendations ?? "").trim() ||
            base?.formData?.recommendations ||
            "",
        },
        examData: {
          ...(base?.examData ?? {}),
          autorefraction: {
            od: {
              ...(base?.examData?.autorefraction?.od ?? {}),
              s: odSphere,
              s1: odSphere,
              s2: odSphere,
              s3: odSphere,
              c: odCylinder,
              c1: odCylinder,
              c2: odCylinder,
              c3: odCylinder,
              axis: odAxis,
              a1: odAxis,
              a2: odAxis,
              a3: odAxis,
              afterS:
                afterRefraction?.sphereOD ??
                base?.examData?.autorefraction?.od?.afterS ??
                "",
              afterC:
                afterRefraction?.cylinderOD ??
                base?.examData?.autorefraction?.od?.afterC ??
                "",
              afterA:
                afterRefraction?.axisOD ??
                base?.examData?.autorefraction?.od?.afterA ??
                "",
              ucva:
                autoref?.ucvaOD ??
                base?.examData?.autorefraction?.od?.ucva ??
                "",
              bcva:
                autoref?.bcvaOD ??
                base?.examData?.autorefraction?.od?.bcva ??
                "",
              iop:
                autoref?.iopOD ?? base?.examData?.autorefraction?.od?.iop ?? "",
              airPuff1: odAirPuff,
              airPuff2: odAirPuff,
              airPuff3: odAirPuff,
            },
            os: {
              ...(base?.examData?.autorefraction?.os ?? {}),
              s: osSphere,
              s1: osSphere,
              s2: osSphere,
              s3: osSphere,
              c: osCylinder,
              c1: osCylinder,
              c2: osCylinder,
              c3: osCylinder,
              axis: osAxis,
              a1: osAxis,
              a2: osAxis,
              a3: osAxis,
              afterS:
                afterRefraction?.sphereOS ??
                base?.examData?.autorefraction?.os?.afterS ??
                "",
              afterC:
                afterRefraction?.cylinderOS ??
                base?.examData?.autorefraction?.os?.afterC ??
                "",
              afterA:
                afterRefraction?.axisOS ??
                base?.examData?.autorefraction?.os?.afterA ??
                "",
              ucva:
                autoref?.ucvaOS ??
                base?.examData?.autorefraction?.os?.ucva ??
                "",
              bcva:
                autoref?.bcvaOS ??
                base?.examData?.autorefraction?.os?.bcva ??
                "",
              iop:
                autoref?.iopOS ?? base?.examData?.autorefraction?.os?.iop ?? "",
              airPuff1: osAirPuff,
              airPuff2: osAirPuff,
              airPuff3: osAirPuff,
            },
          },
          glasses: {
            od: {
              ...(base?.examData?.glasses?.od ?? {}),
              s: glasses?.sOD ?? base?.examData?.glasses?.od?.s ?? "",
              c: glasses?.cOD ?? base?.examData?.glasses?.od?.c ?? "",
              axis: glasses?.axisOD ?? base?.examData?.glasses?.od?.axis ?? "",
              pd: glasses?.pdOD ?? base?.examData?.glasses?.od?.pd ?? "",
              bcva: glasses?.bcvaOD ?? base?.examData?.glasses?.od?.bcva ?? "",
            },
            os: {
              ...(base?.examData?.glasses?.os ?? {}),
              s: glasses?.sOS ?? base?.examData?.glasses?.os?.s ?? "",
              c: glasses?.cOS ?? base?.examData?.glasses?.os?.c ?? "",
              axis: glasses?.axisOS ?? base?.examData?.glasses?.os?.axis ?? "",
              pd: glasses?.pdOS ?? base?.examData?.glasses?.os?.pd ?? "",
              bcva: glasses?.bcvaOS ?? base?.examData?.glasses?.os?.bcva ?? "",
            },
          },
          pentacam: {
            od: {
              ...(base?.examData?.pentacam?.od ?? {}),
              k1: pentacam?.k1OD ?? base?.examData?.pentacam?.od?.k1 ?? "",
              k2: pentacam?.k2OD ?? base?.examData?.pentacam?.od?.k2 ?? "",
              axis:
                pentacam?.axisOD ?? base?.examData?.pentacam?.od?.axis ?? "",
              ax1: pentacam?.axisOD ?? base?.examData?.pentacam?.od?.ax1 ?? "",
              ax2: pentacam?.axisOD ?? base?.examData?.pentacam?.od?.ax2 ?? "",
              thinnest:
                pentacam?.thinnestPointOD ??
                base?.examData?.pentacam?.od?.thinnest ??
                "",
              apex:
                pentacam?.apexOD ?? base?.examData?.pentacam?.od?.apex ?? "",
              residual:
                pentacam?.residualOD ??
                base?.examData?.pentacam?.od?.residual ??
                "",
              ttt: pentacam?.tttOD ?? base?.examData?.pentacam?.od?.ttt ?? "",
              ablation:
                pentacam?.ablationOD ??
                base?.examData?.pentacam?.od?.ablation ??
                "",
            },
            os: {
              ...(base?.examData?.pentacam?.os ?? {}),
              k1: pentacam?.k1OS ?? base?.examData?.pentacam?.os?.k1 ?? "",
              k2: pentacam?.k2OS ?? base?.examData?.pentacam?.os?.k2 ?? "",
              axis:
                pentacam?.axisOS ?? base?.examData?.pentacam?.os?.axis ?? "",
              ax1: pentacam?.axisOS ?? base?.examData?.pentacam?.os?.ax1 ?? "",
              ax2: pentacam?.axisOS ?? base?.examData?.pentacam?.os?.ax2 ?? "",
              thinnest:
                pentacam?.thinnestPointOS ??
                base?.examData?.pentacam?.os?.thinnest ??
                "",
              apex:
                pentacam?.apexOS ?? base?.examData?.pentacam?.os?.apex ?? "",
              residual:
                pentacam?.residualOS ??
                base?.examData?.pentacam?.os?.residual ??
                "",
              ttt: pentacam?.tttOS ?? base?.examData?.pentacam?.os?.ttt ?? "",
              ablation:
                pentacam?.ablationOS ??
                base?.examData?.pentacam?.os?.ablation ??
                "",
            },
          },
        },
        operationDetails: {
          ...(base?.operationDetails ?? {}),
          type:
            String(surgery?.surgeryType ?? "").trim() ||
            base?.operationDetails?.type ||
            "",
          date: surgery?.surgeryDate ?? base?.operationDetails?.date ?? "",
        },
      };

      return JSON.stringify(payload);
    }),

  saveSheetEntry: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
        content: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.upsertSheetEntry({
        patientId: input.patientId,
        sheetType: input.sheetType,
        content: input.content,
      });
      broadcastSheetUpdate(input.patientId, input.sheetType);
      await db.logAuditEvent(
        ctx.user.id,
        "SAVE_SHEET",
        "sheetEntry",
        input.patientId,
        { sheetType: input.sheetType },
      );
      return { success: true };
    }),

  saveRefractionToExamination: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        autorefraction: z
          .object({
            od: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                ucva: z.string().optional(),
                bcva: z.string().optional(),
                iop: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                ucva: z.string().optional(),
                bcva: z.string().optional(),
                iop: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        glassesData: z
          .object({
            od: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                pd: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                pd: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        pentacam: z
          .object({
            od: z
              .object({
                k1: z.string().optional(),
                k2: z.string().optional(),
                axis: z.string().optional(),
                thinnest: z.string().optional(),
                apex: z.string().optional(),
                residualStroma: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                k1: z.string().optional(),
                k2: z.string().optional(),
                axis: z.string().optional(),
                thinnest: z.string().optional(),
                apex: z.string().optional(),
                residualStroma: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Get or create today's examination for patient
      const today = new Date().toISOString().split("T")[0];
      const visits = await db.getVisitsByPatient(input.patientId);
      let visitId = visits.find((v: any) => {
        const vDate =
          v.visitDate instanceof Date
            ? v.visitDate.toISOString()
            : String(v.visitDate ?? "");
        return vDate.split("T")[0] === today;
      })?.id;

      if (!visitId) {
        // Create new visit for today
        const newVisit = await db.createVisit({
          patientId: input.patientId,
          visitDate: new Date().toISOString(),
          notes: "Created from refraction save",
        });
        visitId = (newVisit as any).id ?? (newVisit as any).insertId;
      }

      // Prepare examination data
      const examinationData: any = {
        patientId: input.patientId,
        visitId: visitId,
      };

      // Create/update examination
      const exams = await db.getExaminationsByVisit(visitId!);
      let examinationId: number;

      if (exams.length > 0) {
        // Update existing examination
        examinationId = exams[0].id;
        await db.updateExamination(examinationId, examinationData);
      } else {
        // Create new examination
        const result = await db.createExamination(examinationData);
        examinationId = (result as any).insertId;
      }

      // Save autorefraction to separate table
      if (input.autorefraction?.od || input.autorefraction?.os) {
        await db.saveAutorefractometryData({
          examinationId,
          patientId: input.patientId,
          sphereOD: input.autorefraction?.od?.s,
          cylinderOD: input.autorefraction?.od?.c,
          axisOD: input.autorefraction?.od?.axis,
          ucvaOD: input.autorefraction?.od?.ucva,
          bcvaOD: input.autorefraction?.od?.bcva,
          iopOD: input.autorefraction?.od?.iop,
          sphereOS: input.autorefraction?.os?.s,
          cylinderOS: input.autorefraction?.os?.c,
          axisOS: input.autorefraction?.os?.axis,
          ucvaOS: input.autorefraction?.os?.ucva,
          bcvaOS: input.autorefraction?.os?.bcva,
          iopOS: input.autorefraction?.os?.iop,
        });
      }

      // Save glasses to separate table
      if (input.glassesData?.od || input.glassesData?.os) {
        await db.saveGlassesRecord({
          examinationId,
          patientId: input.patientId,
          sOD: (input.glassesData?.od as any)?.s,
          cOD: (input.glassesData?.od as any)?.c,
          axisOD: (input.glassesData?.od as any)?.axis,
          pdOD: (input.glassesData?.od as any)?.pd,
          addOD: (input.glassesData?.od as any)?.add,
          bcvaOD: (input.glassesData?.od as any)?.bcva,
          sOS: (input.glassesData?.os as any)?.s,
          cOS: (input.glassesData?.os as any)?.c,
          axisOS: (input.glassesData?.os as any)?.axis,
          pdOS: (input.glassesData?.os as any)?.pd,
          addOS: (input.glassesData?.os as any)?.add,
          bcvaOS: (input.glassesData?.os as any)?.bcva,
        });
      }

      return { success: true };
    }),

  saveExaminationForm: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitDate: z.string(),
        visitType: z.string(),
        appointmentId: z.number().optional(),
        data: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = [
        "reception",
        "nurse",
        "technician",
        "doctor",
        "admin",
        "manager",
      ];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions for examination form",
        });
      }

      // Guard: reject saves when input.data carries no real clinical values
      const _hasRealData = (val: unknown): boolean => {
        if (val === null || val === undefined) return false;
        if (typeof val === "string") return val.trim().length > 0;
        if (typeof val === "number") return true;
        if (typeof val === "boolean") return val;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object")
          return Object.values(val as Record<string, unknown>).some(
            _hasRealData,
          );
        return false;
      };
      if (!_hasRealData(input.data)) {
        return { success: true, examinationId: null, visitId: null };
      }

      // Parse visitDate to avoid timezone issues
      const [year, month, day] = input.visitDate.split("-");
      const visitDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      );
      const visitDateStr = visitDate.toISOString().split("T")[0];

      // Find existing visit for this patient on this date
      const existingVisits = await db.getVisitsByPatient(input.patientId);
      let visitId = existingVisits.find((v: any) => {
        const vDate =
          v.visitDate instanceof Date
            ? v.visitDate.toISOString()
            : String(v.visitDate ?? "");
        return vDate.split("T")[0] === visitDateStr;
      })?.id;

      // If no visit exists for today, create one
      if (!visitId) {
        const visit = await db.createVisit({
          patientId: input.patientId,
          visitDate: visitDate,
          visitType: normalizeVisitType(input.visitType),
          appointmentId: input.appointmentId || null,
        });

        visitId = (visit as any)?.insertId as number | undefined;
        if (!visitId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create visit - no ID returned from database",
          });
        }
      }

      // Keep examination row minimal; clinical values are stored in dedicated tables.
      const examinationData: any = {
        patientId: input.patientId,
        visitId: visitId,
      };

      const pickNonEmptyString = (...values: unknown[]): string | undefined => {
        for (const value of values) {
          if (value === null || value === undefined) continue;
          const normalized = String(value).trim();
          if (normalized) return normalized;
        }
        return undefined;
      };

      // Extract autoref data from payload
      const autorefractionPayload =
        input.data["autorefraction"] &&
        typeof input.data["autorefraction"] === "object"
          ? (input.data["autorefraction"] as Record<string, any>)
          : null;
      const autorefractionOd =
        (input.data["autoref-od"] as Record<string, any> | undefined) ??
        ((input.data["autoref"] as any)?.od as
          | Record<string, any>
          | undefined) ??
        (autorefractionPayload?.od as Record<string, any> | undefined);
      const autorefractionOs =
        (input.data["autoref-os"] as Record<string, any> | undefined) ??
        ((input.data["autoref"] as any)?.os as
          | Record<string, any>
          | undefined) ??
        (autorefractionPayload?.os as Record<string, any> | undefined);

      const sphereOD = pickNonEmptyString(
        autorefractionOd?.s,
        autorefractionOd?.s1,
        autorefractionOd?.s2,
        autorefractionOd?.s3,
      );
      const cylinderOD = pickNonEmptyString(
        autorefractionOd?.c,
        autorefractionOd?.c1,
        autorefractionOd?.c2,
        autorefractionOd?.c3,
      );
      const axisOD = pickNonEmptyString(
        autorefractionOd?.axis,
        autorefractionOd?.a1,
        autorefractionOd?.a2,
        autorefractionOd?.a3,
      );
      const sphereOS = pickNonEmptyString(
        autorefractionOs?.s,
        autorefractionOs?.s1,
        autorefractionOs?.s2,
        autorefractionOs?.s3,
      );
      const cylinderOS = pickNonEmptyString(
        autorefractionOs?.c,
        autorefractionOs?.c1,
        autorefractionOs?.c2,
        autorefractionOs?.c3,
      );
      const axisOS = pickNonEmptyString(
        autorefractionOs?.axis,
        autorefractionOs?.a1,
        autorefractionOs?.a2,
        autorefractionOs?.a3,
      );
      const airPuffOD = pickNonEmptyString(
        autorefractionOd?.airPuff1,
        autorefractionOd?.airPuff2,
        autorefractionOd?.airPuff3,
      );
      const airPuffOS = pickNonEmptyString(
        autorefractionOs?.airPuff1,
        autorefractionOs?.airPuff2,
        autorefractionOs?.airPuff3,
      );

      // Extract glasses data for dedicated table save
      const glassesPayload = input.data["glasses"];

      // Store the entire payload as JSON for record-keeping
      examinationData.radiologyLabsNotes = JSON.stringify(input.data);

      let examinationId: number | undefined;

      // Ensure there is one examination row per visit (FK target for dedicated exam tables).
      const existingExams = await db.getExaminationsByVisit(visitId);
      if (existingExams.length > 0) {
        await db.updateExamination(existingExams[0].id, examinationData);
        examinationId = existingExams[0].id;
      } else {
        const result = await db.createExamination(examinationData);
        examinationId = (result as any).insertId;
      }

      // Save autorefraction to separate table
      if (
        examinationId &&
        (_hasRealData(autorefractionOd) || _hasRealData(autorefractionOs))
      ) {
        await db.saveAutorefractometryData({
          examinationId,
          patientId: input.patientId,
          sphereOD,
          cylinderOD,
          axisOD,
          ucvaOD: autorefractionOd?.ucva,
          bcvaOD: autorefractionOd?.bcva,
          iopOD: autorefractionOd?.iop ?? airPuffOD,
          od: autorefractionOd,
          sphereOS,
          cylinderOS,
          axisOS,
          ucvaOS: autorefractionOs?.ucva,
          bcvaOS: autorefractionOs?.bcva,
          iopOS: autorefractionOs?.iop ?? airPuffOS,
          os: autorefractionOs,
        });
      }

      // Save AFTER refraction to dedicated table when present.
      const afterRefractionPayload =
        input.data["afterRefraction"] &&
        typeof input.data["afterRefraction"] === "object"
          ? (input.data["afterRefraction"] as Record<string, any>)
          : null;
      const afterSphereOD = pickNonEmptyString(
        autorefractionOd?.afterS,
        afterRefractionPayload?.od?.s,
        afterRefractionPayload?.od?.sphere,
      );
      const afterCylinderOD = pickNonEmptyString(
        autorefractionOd?.afterC,
        afterRefractionPayload?.od?.c,
        afterRefractionPayload?.od?.cylinder,
      );
      const afterAxisOD = pickNonEmptyString(
        autorefractionOd?.afterA,
        afterRefractionPayload?.od?.axis,
        afterRefractionPayload?.od?.a,
      );
      const afterSphereOS = pickNonEmptyString(
        autorefractionOs?.afterS,
        afterRefractionPayload?.os?.s,
        afterRefractionPayload?.os?.sphere,
      );
      const afterCylinderOS = pickNonEmptyString(
        autorefractionOs?.afterC,
        afterRefractionPayload?.os?.c,
        afterRefractionPayload?.os?.cylinder,
      );
      const afterAxisOS = pickNonEmptyString(
        autorefractionOs?.afterA,
        afterRefractionPayload?.os?.axis,
        afterRefractionPayload?.os?.a,
      );
      if (
        examinationId &&
        (afterSphereOD ||
          afterCylinderOD ||
          afterAxisOD ||
          afterSphereOS ||
          afterCylinderOS ||
          afterAxisOS)
      ) {
        await db.saveAfterRefractionData({
          examinationId,
          patientId: input.patientId,
          sphereOD: afterSphereOD,
          cylinderOD: afterCylinderOD,
          axisOD: afterAxisOD,
          sphereOS: afterSphereOS,
          cylinderOS: afterCylinderOS,
          axisOS: afterAxisOS,
        });
      }

      // Save glasses to separate table
      if (
        examinationId &&
        glassesPayload &&
        typeof glassesPayload === "object" &&
        (_hasRealData(glassesPayload.od) || _hasRealData(glassesPayload.os))
      ) {
        await db.saveGlassesRecord({
          examinationId,
          patientId: input.patientId,
          sOD: glassesPayload.od?.s,
          cOD: glassesPayload.od?.c,
          axisOD: glassesPayload.od?.axis,
          pdOD: glassesPayload.od?.pd,
          addOD: glassesPayload.od?.add,
          bcvaOD: glassesPayload.od?.bcva,
          sOS: glassesPayload.os?.s,
          cOS: glassesPayload.os?.c,
          axisOS: glassesPayload.os?.axis,
          pdOS: glassesPayload.os?.pd,
          addOS: glassesPayload.os?.add,
          bcvaOS: glassesPayload.os?.bcva,
        });
      }

      // Extract pentacam data if present
      const pentacamPayload = input.data["pentacam"];
      if (
        pentacamPayload &&
        typeof pentacamPayload === "object" &&
        (_hasRealData(pentacamPayload.od) || _hasRealData(pentacamPayload.os))
      ) {
        const odData = pentacamPayload.od || {};
        const osData = pentacamPayload.os || {};

        await db.createPentacamResult({
          visitId: visitId,
          patientId: input.patientId,
          rtK1: odData.k1,
          rtK2: odData.k2,
          rtAX: odData.axis || odData.ax1,
          rtThinnestPoint: odData.thinnest,
          rtApex: odData.apex,
          rtResidual: odData.residual,
          rtTTT: odData.ttt,
          rtAblation: odData.ablation,
          ltK1: osData.k1,
          ltK2: osData.k2,
          ltAX: osData.axis || osData.ax1,
          ltThinnestPoint: osData.thinnest,
          ltApex: osData.apex,
          ltResidual: osData.residual,
          ltTTT: osData.ttt,
          ltAblation: osData.ablation,
        });
      }

      const readString = (...keys: string[]) => {
        for (const key of keys) {
          const raw = input.data[key];
          if (typeof raw === "string") {
            const v = raw.trim();
            if (v) return v;
          }
        }
        return "";
      };

      const parseAnyArray = (value: unknown): any[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) return [];
          try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const diagnosisText = readString(
        "diagnosis",
        "doctor-diagnosis",
        "medical-diagnosis",
      );
      const treatmentText = readString(
        "treatment",
        "recommended-treatment",
        "doctor-treatment",
        "prescription",
      );
      const recommendationsText = readString(
        "recommendations",
        "report",
        "doctor-report",
      );
      const additionalNotesText = readString("additional-notes", "notes");
      const diseasesArray = parseAnyArray(input.data["diseases"]);

      // Same behavior as other save flows: always ensure a doctor report row exists per visit.
      const existingReports = await db.getDoctorReportsByVisit(visitId);
      const doctorReportData = {
        visitId,
        patientId: input.patientId,
        doctorId: ctx.user.id,
        diagnosis: diagnosisText,
        treatment: treatmentText,
        recommendations: recommendationsText,
        additionalNotes: additionalNotesText,
        diseases:
          diseasesArray.length > 0 ? JSON.stringify(diseasesArray) : null,
        clinicalOpinion: additionalNotesText || null,
      };

      const _hasReportData =
        diagnosisText ||
        treatmentText ||
        recommendationsText ||
        additionalNotesText ||
        diseasesArray.length > 0;
      if (_hasReportData) {
        if ((existingReports ?? []).length > 0) {
          await db.updateDoctorReport(existingReports[0].id, doctorReportData);
        } else {
          await db.createDoctorReport(doctorReportData);
        }
      }

      // Upsert tests from payload (expected IDs array).
      const requestedTestIds = Array.from(
        new Set(
          parseAnyArray(input.data["tests"])
            .map((v: any) => Number(v?.testId ?? v?.id ?? v))
            .filter((id: number) => Number.isFinite(id) && id > 0),
        ),
      );
      const existingRequests = await db.getTestRequestsByVisit(visitId);
      if ((existingRequests ?? []).length === 0) {
        const createdRequest: any = await db.createTestRequest({
          patientId: input.patientId,
          visitId,
          requestDate: new Date(),
          status: "pending",
          notes: "Created from examination form",
        });
        const testRequestId = Number(
          createdRequest?.insertId ?? createdRequest?.[0]?.insertId ?? 0,
        );
        if (testRequestId > 0 && requestedTestIds.length > 0) {
          await db.createTestRequestItems(
            requestedTestIds.map((testId) => ({
              testRequestId,
              testId,
              result: null,
            })),
          );
        }
      }

      // Upsert prescription from payload (expected medication IDs array).
      const requestedMedicationIds = Array.from(
        new Set(
          parseAnyArray(input.data["treatment"])
            .map((v: any) => Number(v?.medicationId ?? v?.id ?? v))
            .filter((id: number) => Number.isFinite(id) && id > 0),
        ),
      );
      const existingPrescriptions =
        await db.getPrescriptionsWithItemsByVisit(visitId);
      if ((existingPrescriptions ?? []).length === 0) {
        if (requestedMedicationIds.length > 0) {
          const meds = await db.getAllMedications();
          const medById = new Map(
            (meds ?? []).map((m: any) => [Number(m.id), String(m.name ?? "")]),
          );
          await db.createPrescriptionWithItems({
            patientId: input.patientId,
            visitId,
            doctorId: ctx.user.id,
            notes: "Created from examination form",
            items: requestedMedicationIds.map((medicationId) => ({
              medicationId,
              medicationName: String(
                medById.get(medicationId) || `Medication ${medicationId}`,
              ),
            })),
          });
        } else {
          await db.createPrescription({
            visitId,
            patientId: input.patientId,
            doctorId: ctx.user.id,
            prescriptionDate: new Date(),
            notes: "Created from examination form",
          });
        }
      }

      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_EXAMINATION_FORM",
        "examination",
        input.patientId,
        { message: "Saved examination form" },
      );

      // Clear examination cache so next open fetches fresh medical data
      try {
        await db.invalidatePatientPageStateCache([input.patientId]);
      } catch (error) {
        console.warn(
          `[Exam Save] Cache invalidation failed for patient ${input.patientId}:`,
          error,
        );
        // Non-blocking: exam already saved successfully
      }

      return { success: true, examinationId: examinationId ?? null, visitId };
    }),

  saveMedicalVisit: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitDate: z.string().optional(),
        isFollowup: z.boolean().optional(),
        appointmentId: z.number().optional(),
        // Medical measurements
        symptoms: z.string().optional(),
        autoref: z
          .object({
            od: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                ucva: z.string().optional(),
                bcva: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                ucva: z.string().optional(),
                bcva: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        iop: z
          .object({
            od: z.string().optional(),
            os: z.string().optional(),
          })
          .optional(),
        after: z
          .object({
            od: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        glasses: z
          .object({
            od: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                pd: z.string().optional(),
                bcva: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                pd: z.string().optional(),
                bcva: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        fundus: z
          .object({
            od: z
              .object({
                discStatus: z.string().optional(),
                cupDiscRatio: z.string().optional(),
                macuaStatus: z.string().optional(),
                vesselStatus: z.string().optional(),
                otherFindings: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                discStatus: z.string().optional(),
                cupDiscRatio: z.string().optional(),
                macuaStatus: z.string().optional(),
                vesselStatus: z.string().optional(),
                otherFindings: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        pentacam: z
          .object({
            od: z
              .object({
                k1: z.string().optional(),
                k2: z.string().optional(),
                ax1: z.string().optional(),
                ax2: z.string().optional(),
                axis: z.string().optional(),
                thinnest: z.string().optional(),
                apex: z.string().optional(),
                residual: z.string().optional(),
                ttt: z.string().optional(),
                ablation: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                k1: z.string().optional(),
                k2: z.string().optional(),
                ax1: z.string().optional(),
                ax2: z.string().optional(),
                axis: z.string().optional(),
                thinnest: z.string().optional(),
                apex: z.string().optional(),
                residual: z.string().optional(),
                ttt: z.string().optional(),
                ablation: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        radiologyLabs: z.string().optional(),
        // Tests and treatment from dashboard
        tests: z.string().optional(),
        // Doctor notes
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        report: z.string().optional(),
        diseases: z.string().optional(),
        recommendations: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to save medical visit",
        });
      }

      // Validate patient exists
      const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found",
        });
      }

      // Guard: reject saves with no real clinical data to prevent empty visit/exam rows
      const _hasVal = (v: string | undefined): boolean =>
        Boolean(v && String(v).trim().length > 0);
      const _hasObjData = (
        obj: Record<string, string | undefined> | undefined,
      ): boolean =>
        Boolean(
          obj &&
          Object.values(obj).some((v) => _hasVal(v as string | undefined)),
        );
      const _hasMeasurements =
        _hasObjData(input.autoref?.od) ||
        _hasObjData(input.autoref?.os) ||
        _hasVal(input.iop?.od) ||
        _hasVal(input.iop?.os) ||
        _hasObjData(input.after?.od) ||
        _hasObjData(input.after?.os) ||
        _hasObjData(input.glasses?.od) ||
        _hasObjData(input.glasses?.os) ||
        _hasObjData(input.fundus?.od as any) ||
        _hasObjData(input.fundus?.os as any) ||
        _hasObjData(input.pentacam?.od as any) ||
        _hasObjData(input.pentacam?.os as any);
      const _hasClinicalText =
        _hasVal(input.symptoms) ||
        _hasVal(input.diagnosis) ||
        _hasVal(input.treatment) ||
        _hasVal(input.report) ||
        _hasVal(input.diseases) ||
        _hasVal(input.recommendations) ||
        _hasVal(input.radiologyLabs);
      const _hasTests = (() => {
        try {
          const t = JSON.parse(input.tests ?? "[]");
          return Array.isArray(t) && t.length > 0;
        } catch {
          return false;
        }
      })();
      if (!_hasMeasurements && !_hasClinicalText && !_hasTests) {
        return { success: true, examinationId: null, visitId: null };
      }

      // Parse visitDate to avoid timezone issues
      let visitDate: Date;
      if (input.visitDate) {
        const [year, month, day] = input.visitDate.split("-");
        visitDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
      } else {
        visitDate = new Date();
      }
      const visitType = input.isFollowup ? "followup" : "examination";

      // Create or get visit
      const visit = await db.createVisit({
        patientId: input.patientId,
        visitDate: visitDate,
        visitType: visitType,
        chiefComplaint: input.symptoms,
        appointmentId: input.appointmentId || null,
      });

      let visitId = (visit as any)?.insertId as number | undefined;
      if (!visitId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create visit - no ID returned from database",
        });
      }

      // Prepare examination data from autoref, IOP, glasses, pentacam
      const examinationData: any = {
        patientId: input.patientId,
        visitId: visitId,
      };

      // Map autoref data
      if (input.autoref) {
        if (input.autoref.od) {
          examinationData.sphereOD = input.autoref.od.s;
          examinationData.cylinderOD = input.autoref.od.c;
          examinationData.axisOD = input.autoref.od.axis;
          examinationData.ucvaOD = input.autoref.od.ucva;
          examinationData.bcvaOD = input.autoref.od.bcva;
        }
        if (input.autoref.os) {
          examinationData.sphereOS = input.autoref.os.s;
          examinationData.cylinderOS = input.autoref.os.c;
          examinationData.axisOS = input.autoref.os.axis;
          examinationData.ucvaOS = input.autoref.os.ucva;
          examinationData.bcvaOS = input.autoref.os.bcva;
        }
      }

      // Map IOP data
      if (input.iop) {
        examinationData.iopOD = input.iop.od;
        examinationData.iopOS = input.iop.os;
      }

      // Map glasses data (store as JSON)
      if (input.glasses?.od || input.glasses?.os) {
        examinationData.glassesData = JSON.stringify(input.glasses);
      }

      // Map fundus data (store as JSON in posteriorSegment fields for now)
      if (input.fundus?.od || input.fundus?.os) {
        // Store fundus findings as JSON in posteriorSegment fields
        if (input.fundus.od && Object.values(input.fundus.od).some((v) => v)) {
          examinationData.posteriorSegmentOD = JSON.stringify(input.fundus.od);
        }
        if (input.fundus.os && Object.values(input.fundus.os).some((v) => v)) {
          examinationData.posteriorSegmentOS = JSON.stringify(input.fundus.os);
        }
      }

      // Map radiology/labs notes and tests/treatment data
      const radiologyData: any = {};
      if (input.radiologyLabs) {
        try {
          Object.assign(radiologyData, JSON.parse(input.radiologyLabs));
        } catch {
          radiologyData.notes = input.radiologyLabs;
        }
      }
      // Add tests and treatment from dashboard
      if (input.tests) {
        try {
          radiologyData.tests = JSON.parse(input.tests);
        } catch {
          radiologyData.tests = [];
        }
      }
      if (input.treatment) {
        try {
          radiologyData.treatment = JSON.parse(input.treatment);
        } catch {
          radiologyData.treatment = [];
        }
      }
      if (Object.keys(radiologyData).length > 0) {
        examinationData.radiologyLabsNotes = JSON.stringify(radiologyData);
      }

      // Always create examination row
      const examResult = await db.createExamination(examinationData);
      const examinationId: number =
        (examResult as any)?.insertId || (examResult as any)?.id;

      // Save autoref only when at least one eye has real data
      if (_hasObjData(input.autoref?.od) || _hasObjData(input.autoref?.os)) {
        await db.saveAutorefractometryData({
          examinationId,
          patientId: input.patientId,
          ...input.autoref,
        });
      }

      // Save AFTER refraction only when at least one eye has real data
      if (_hasObjData(input.after?.od) || _hasObjData(input.after?.os)) {
        await db.saveAfterRefractionData({
          examinationId,
          patientId: input.patientId,
          ...input.after,
        });
      }

      // Save glasses only when at least one eye has real data
      if (_hasObjData(input.glasses?.od) || _hasObjData(input.glasses?.os)) {
        await db.saveGlassesRecord({
          examinationId,
          patientId: input.patientId,
          ...input.glasses,
        });
      }

      const hasPentacamValue = [
        input.pentacam?.od?.k1,
        input.pentacam?.od?.k2,
        input.pentacam?.os?.k1,
        input.pentacam?.os?.k2,
        input.pentacam?.od?.thinnest,
        input.pentacam?.os?.thinnest,
      ].some((value) => String(value ?? "").trim().length > 0);

      if (hasPentacamValue) {
        await db.createPentacamResult({
          visitId: visitId,
          patientId: input.patientId,
          rtK1: input.pentacam?.od?.k1,
          rtK2: input.pentacam?.od?.k2,
          rtAX: input.pentacam?.od?.axis || input.pentacam?.od?.ax1,
          rtThinnestPoint: input.pentacam?.od?.thinnest,
          rtApex: input.pentacam?.od?.apex,
          rtResidual: input.pentacam?.od?.residual,
          rtTTT: input.pentacam?.od?.ttt,
          rtAblation: input.pentacam?.od?.ablation,
          ltK1: input.pentacam?.os?.k1,
          ltK2: input.pentacam?.os?.k2,
          ltAX: input.pentacam?.os?.axis || input.pentacam?.os?.ax1,
          ltThinnestPoint: input.pentacam?.os?.thinnest,
          ltApex: input.pentacam?.os?.apex,
          ltResidual: input.pentacam?.os?.residual,
          ltTTT: input.pentacam?.os?.ttt,
          ltAblation: input.pentacam?.os?.ablation,
          techniciansNotes: input.radiologyLabs,
        });
      }

      // Save doctor report only when at least one clinical field has real data
      if (
        _hasVal(input.diagnosis) ||
        _hasVal(input.treatment) ||
        _hasVal(input.recommendations) ||
        _hasVal(input.report) ||
        _hasVal(input.symptoms) ||
        _hasVal(input.diseases) ||
        _hasVal(input.radiologyLabs)
      ) {
        await db.createDoctorReport({
          visitId: visitId,
          patientId: input.patientId,
          doctorId: ctx.user.id,
          diagnosis: input.diagnosis,
          treatment: input.treatment,
          recommendations: input.recommendations || input.report,
          diseases: input.diseases,
          additionalNotes: input.radiologyLabs,
          clinicalOpinion: input.symptoms,
        });
      }

      // Log audit event
      await db.logAuditEvent(
        ctx.user.id,
        "SAVE_MEDICAL_VISIT",
        "visit",
        input.patientId,
        {
          visitId: visitId,
          isFollowup: input.isFollowup,
          hasDiagnosis: !!input.diagnosis,
          hasTreatment: !!input.treatment,
        },
      );

      return { success: true, visitId: visitId };
    }),

  updateVisitQueueStatus: protectedProcedure
    .input(
      z.object({
        visitId: z.number(),
        queueStatus: z.enum(["checkedIn", "next", "clinic", "treated"]),
        patientId: z.number().optional(),
        date: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Same practical access as today-queue reads: طاقم طبي + استقبال + إدارة (وليس فقط doctor/nurse أو مسار /patients).
      const permissions = await db.getEffectiveUserPermissions(
        ctx.user.id,
        ctx.user.role,
      );
      const role = String(ctx.user.role ?? "").toLowerCase();
      const staffRoles = [
        "doctor",
        "nurse",
        "technician",
        "reception",
        "manager",
        "admin",
      ];
      const canUpdateQueue =
        permissions.includes("/patients") || staffRoles.includes(role);
      if (!canUpdateQueue) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update patient queue status.",
        });
      }

      await db.updateVisitQueueStatus(input.visitId, input.queueStatus);

      // If marked as treated, advance the non-external queue one-by-one.
      if (input.queueStatus === "treated") {
        const normalizedInputDate =
          typeof input.date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())
            ? input.date.trim()
            : null;
        const visitDateIso =
          normalizedInputDate || (await db.getVisitDateIsoById(input.visitId));
        if (visitDateIso) {
          await db.cascadeQueueStatus(visitDateIso);
          await db.autoAdvanceQueuePatients(visitDateIso);
        }
      }

      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_QUEUE_STATUS",
        "visit",
        input.visitId,
        {
          newStatus: input.queueStatus,
        },
      );

      return { success: true };
    }),

  addFollowupToQueue: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitDate: z.string().optional(), // ISO yyyy-MM-dd, defaults to today
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["doctor", "nurse", "admin", "manager", "receptionist"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بإضافة متابعة للطابور",
        });
      }

      let visitDate: Date;
      if (input.visitDate) {
        // Use noon so UTC conversion never rolls the date backward by a day
        // (servers in UTC+2/+3 would shift midnight to the previous UTC day).
        const [year, month, day] = input.visitDate.split("-").map(Number);
        visitDate = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        visitDate = new Date();
      }

      // Look up the patient's branch so the NOT NULL column is satisfied.
      const patient = await db.getPatientById(input.patientId);
      const branch =
        String((patient as any)?.branch ?? "").trim() || "examinations";

      const visit = await db.createVisit({
        patientId: input.patientId,
        visitDate,
        visitType: "followup",
        branch,
        queueStatus: "checkedIn",
        checkedInAt: new Date(),
      });

      const visitId = (visit as any)?.insertId as number | undefined;
      if (!visitId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل إنشاء زيارة المتابعة",
        });
      }

      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_FOLLOWUP_VISIT",
        "visit",
        visitId,
        { patientId: input.patientId, visitDate: visitDate.toISOString() },
      );

      return { success: true, visitId };
    }),

  getTodayPatientsByQueueStatus: protectedProcedure
    .input(
      z.object({
        date: z.string().optional(),
        queueStatus: z.enum(["checkedIn", "next", "clinic", "treated"]),
      }),
    )
    .query(async ({ input }) => {
      try {
        const dateIso = input.date || new Date().toISOString().split("T")[0];

        // Daily rollover: carry forward unfinished old queues as treated.
        await db.rolloverPreviousQueueVisitsAsTreated(dateIso);

        // Auto-advance patients through queue
        await db.autoAdvanceQueuePatients(dateIso);

        const visits = await db.getTodayVisitsByQueueStatus(
          dateIso,
          input.queueStatus,
        );

        // Reshape flattened data back to structured format.
        // If a patient has multiple visits today (e.g. consultation + followup),
        // prefer the followup visit so the correct card type is shown.
        const patientMap = new Map();
        for (const visit of visits) {
          const patientId = visit.patientId;
          const row = {
            id: patientId,
            patientCode: visit.patientCode,
            fullName: visit.patientFullName,
            phone: visit.patientPhone,
            serviceType: visit.patientServiceType,
            locationType: visit.patientLocationType,
            doctorId: visit.patientDoctorId,
            doctorName: visit.doctorName,
            visitId: visit.id,
            visitDate: visit.visitDate,
            visitType: visit.visitType,
            queueStatus: visit.queueStatus,
            checkedInAt: visit.checkedInAt,
            checkedInTime: (visit as any).checkedInTime ?? null,
            movedToNextAt: visit.movedToNextAt,
            movedToClinicAt: visit.movedToClinicAt,
            treatedAt: visit.treatedAt,
          };
          if (!patientMap.has(patientId)) {
            patientMap.set(patientId, row);
          } else if (visit.visitType === "followup") {
            // Followup visit overrides an earlier consultation visit for the same patient.
            patientMap.set(patientId, row);
          }
        }

        return Array.from(patientMap.values()).sort((a, b) => {
          const aTime = a.checkedInAt
            ? new Date(a.checkedInAt).getTime()
            : a.visitDate
              ? new Date(a.visitDate).getTime()
              : 0;
          const bTime = b.checkedInAt
            ? new Date(b.checkedInAt).getTime()
            : b.visitDate
              ? new Date(b.visitDate).getTime()
              : 0;
          return aTime - bTime;
        });
      } catch (error) {
        console.error("getTodayPatientsByQueueStatus error:", error);
        throw error;
      }
    }),
};
