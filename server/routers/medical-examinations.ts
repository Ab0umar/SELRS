import { examinationFormInput } from "../services/examination-form-input";
import { z } from "zod";
import {medicalVisitInput} from "../services/medical-visit-input";
import { access, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  clinicalStaffProcedure,
  doctorProcedure,
  nurseProcedure,
  technicianProcedure,
  receptionProcedure,
  managerProcedure,
  adminProcedure,
  medicalStaffProcedure,
  makePageProcedure,
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

import { cairoDateIso } from "../../shared/visitSchedule";
import { clinicalArray, clinicalValue, selectClinicalVisit, fundusRecord, correctedVision } from "../../shared/clinical-record";
import { saveClinicalSheet } from "../services/clinical-sheet";
import {examinationSheetFields} from "../../shared/examination-fields";

export const medicalExaminationsRoutes = {
  getAppointmentsByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAppointmentsByPatient(input.patientId);
    }),

  getMedicalTotals: clinicalStaffProcedure.query(async () => {
    return await db.getMedicalTotals();
  }),

  getPatientRegistrationTrend: clinicalStaffProcedure
    .input(
      z.object({ months: z.number().int().min(1).max(36).default(12) }).optional(),
    )
    .query(async ({ input }) => {
      return await db.getPatientRegistrationTrend(input?.months ?? 12);
    }),

  getOperations: clinicalStaffProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(1000).default(500) })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getAllAppointments(undefined, input?.limit ?? 500);
    }),

  getAllOperations: clinicalStaffProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(1000).default(500) })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getAllAppointments(undefined, input?.limit ?? 500);
    }),

  getAppointments: clinicalStaffProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(1000).default(500) })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getAllAppointments(undefined, input?.limit ?? 500);
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
        const connection = await db.getDb();
        if (!connection) throw new Error("Database not available");
        const value = (value: unknown) => value === undefined ? undefined : String(value);
        await saveClinicalSheet(connection,{
          patientId:input.patientId,visitId:input.visitId,sheetType:"clinical",
          content:JSON.stringify({examinationNotes:input.examinationNotes,examData:{autorefraction:{
            od:{s:value(input.refOD_S),c:value(input.refOD_C),axis:value(input.refOD_A),ucva:input.ucvaOD,bcva:input.bcvaOD,iop:value(input.iopOD)},
            os:{s:value(input.refOS_S),c:value(input.refOS_C),axis:value(input.refOS_A),ucva:input.ucvaOS,bcva:input.bcvaOS,iop:value(input.iopOS)},
          }}}),
        },ctx.user.id,ctx.user.role);

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_EXAMINATION",
          "examination",
          0,
          { message: `Created examination for patient ${input.patientId}` },
        );

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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
      // autoref/IOP/glasses fields belong exclusively to autorefractometryData /
      // glassesRecords — never duplicate them onto the examinations row itself.
      const DEDICATED_TABLE_ONLY_FIELDS = [
        "sphereOD",
        "sphereOS",
        "cylinderOD",
        "cylinderOS",
        "axisOD",
        "axisOS",
        "ucvaOD",
        "ucvaOS",
        "bcvaOD",
        "bcvaOS",
        "iopOD",
        "iopOS",
        "glassesData",
      ] as const;
      const examinationUpdates = { ...input.updates };
      for (const field of DEDICATED_TABLE_ONLY_FIELDS) {
        delete examinationUpdates[field];
      }
      // Identity/ownership columns must never be client-writable.
      for (const field of [
        "id",
        "patientId",
        "visitId",
        "examinedBy",
        "createdAt",
        "updatedAt",
      ]) {
        delete examinationUpdates[field];
      }
      if (Object.keys(examinationUpdates).length > 0) {
        await db.updateExamination(input.examinationId, examinationUpdates);
      }

      // Also persist to dedicated tables if autoref/glasses fields are in updates
      const u = input.updates;
      const hasAutoref = [
        "sphereOD",
        "sphereOS",
        "cylinderOD",
        "cylinderOS",
        "axisOD",
        "axisOS",
        "ucvaOD",
        "ucvaOS",
        "bcvaOD",
        "bcvaOS",
        "iopOD",
        "iopOS",
      ].some((key) => u[key] !== undefined);
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
            let gd: any = null;
            try {
              gd = typeof u.glassesData === "string"
                ? JSON.parse(u.glassesData)
                : u.glassesData;
            } catch {
              gd = null;
            }
            if (!gd || typeof gd !== "object") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "glassesData must be valid JSON",
              });
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

  getExaminationsByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getExaminationsByPatient(input.patientId);
    }),

  getAutorefractometryByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAutorefractometryByPatient(input.patientId);
    }),

  getAutorefractometryOverview: clinicalStaffProcedure
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

  getGlassesRecordsByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getGlassesRecordsByPatient(input.patientId);
    }),

  getAfterRefractionByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAfterRefractionByPatient(input.patientId);
    }),

  saveAfterRefractionData: medicalStaffProcedure
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

  getVisitsByPatient: makePageProcedure("/patient-file")
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

  getFollowupVisitsByPatient: makePageProcedure("/patient-file")
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

  getVisits: clinicalStaffProcedure.query(async () => {
    return await db.getAllVisits();
  }),

  getExaminations: clinicalStaffProcedure.query(async () => {
    return await db.getAllExaminations();
  }),

  updateVisitDate: adminProcedure
    .input(
      z.object({
        visitId: z.number(),
        visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .mutation(async ({ input }) => {
      // Use noon so UTC conversion never rolls the date backward by a day
      // (servers in UTC+2/+3 would shift midnight to the previous UTC day).
      const [year, month, day] = input.visitDate.split("-");
      const visitDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        12,
        0,
        0,
      );

      await db.updateVisit(input.visitId, { visitDate });
      return { success: true };
    }),

  updateVisitChiefComplaint: medicalStaffProcedure
    .input(
      z.object({
        visitId: z.number(),
        chiefComplaint: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.updateVisit(input.visitId, {
        chiefComplaint: input.chiefComplaint,
      });
      return { success: true };
    }),

  updateVisitExamData: medicalStaffProcedure
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
      const allowedRoles = ["doctor", "nurse", "technician", "admin", "manager"];
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

  saveFollowupSheet: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        sheetType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "surgery",
          "external",
          "pentacam_c",
          "pentacam_ex",
          "pentacam_ex_c",
          "surgery_external",
          "surgery_center",
          "pentacam_center",
          "pentacam_external",
        ]),
        appendMode: z.boolean().optional(),
        followupItems: z.array(
          z.object({
            itemId: z.number().int().positive().optional(),
              visitId:z.number().int().positive().optional(),
              clinicalContent:z.record(z.string(),z.unknown()).optional(),
            tableIndex: z.number(),
            followupDate: z.string().optional(),
            operationDate: z.string().optional(),
            operationType: z.string().optional(),
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

      const saved = await db.saveFollowupSheetItems({
        patientId: input.patientId,
          doctorId:ctx.user.id,
          role:ctx.user.role,
        sheetType: input.sheetType,
        followupItems: input.followupItems.map((item) => ({
          ...item,
          followupDate: item.followupDate ? new Date(item.followupDate) : null,
          operationDate: item.operationDate ? new Date(item.operationDate) : null,
          refracOD: item.refracOD ? JSON.stringify(item.refracOD) : null,
          refracOS: item.refracOS ? JSON.stringify(item.refracOS) : null,
          flapOD: item.flapOD ? JSON.stringify(item.flapOD) : null,
          flapOS: item.flapOS ? JSON.stringify(item.flapOS) : null,
        })),
      });
      await db.logAuditEvent(
        ctx.user.id,
        "SAVE_FOLLOWUP_SHEET",
        "followup_sheets",
        saved.sheetId ?? input.patientId,
        { message: `Saved followup sheet version ${saved.version}` },
      );
      return saved;
    }),

  getFollowupSheets: makePageProcedure("/patient-file")
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

  getAllFollowupItems: clinicalStaffProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(1000).default(500) })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getAllFollowupItems(input?.limit ?? 500);
    }),

  getAllExaminations: clinicalStaffProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(500).default(250) })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getAllExaminations(input?.limit ?? 250);
    }),

  getRefractionsOverview: clinicalStaffProcedure
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

  getSheetEntry: makePageProcedure("/patient-file")
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        sheetType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "surgery",
          "external",
          "pentacam_c",
          "pentacam_ex",
          "pentacam_ex_c",
          "surgery_external",
          "surgery_center",
          "pentacam_center",
          "pentacam_external",
          "clinical",
        ]),
      }),
    )
    .query(async ({ input }) => {
      const patientVisits = await db.getVisitsByPatient(input.patientId);
      if(input.visitId && !patientVisits.some((visit:{id:number})=>visit.id===input.visitId))throw new TRPCError({code:"BAD_REQUEST",message:"The selected visit does not belong to this patient"});
      const effectiveVisitId = input.visitId ?? patientVisits[0]?.id;
      const stored = await db.getSheetEntry(
        input.patientId,
        input.sheetType,
        effectiveVisitId,
      );
      let base: any = {};
      if (stored) {
        try {
          const metadata=JSON.parse(stored);
          base={visitId:metadata.visitId,signatures:metadata.signatures,layout:metadata.layout,printLayout:metadata.printLayout,operationId:metadata.operationId ?? metadata.operationDetails?.surgeryId};
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
        histories,
      ] = await Promise.all([
        db.getAutorefractometryByPatient(input.patientId),
        db.getAfterRefractionByPatient(input.patientId),
        db.getGlassesRecordsByPatient(input.patientId),
        effectiveVisitId
          ? db.getPentacamResultsByVisit(effectiveVisitId).then((rows) => rows.filter((row: any) => Number(row.patientId) === input.patientId))
          : db.getPentacamResultsByPatient(input.patientId, 1),
        db.getDoctorReportsByPatient(input.patientId),
        db.getSurgeriesByPatient(input.patientId),
        db.getMedicalHistoryByPatient(input.patientId),
      ]);
      const visitExaminations = effectiveVisitId
        ? await db.getExaminationsByVisit(effectiveVisitId)
        : [];
      const visitExaminationIds = new Set(
        visitExaminations.map((row: any) => Number(row.id)),
      );

      const rowsForVisit = (rows: any[] | undefined) => {
        if (!effectiveVisitId) return rows ?? [];
        return (rows ?? []).filter(
          (row: any) =>
            Number(row?.visitId) === Number(effectiveVisitId) ||
            visitExaminationIds.has(Number(row?.examinationId)),
        );
      };
      const pickFirstWithValues = (rows: any[] | undefined, _keys: string[]) =>
        rowsForVisit(rows)[0] ?? {};

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
        "pachymetryOD",
        "k1OD",
        "k2OD",
        "axisOD",
        "thinnestPointOD",
        "apexOD",
        "residualOD",
        "tttOD",
        "ablationOD",
        "pachymetryOS",
        "k1OS",
        "k2OS",
        "axisOS",
        "thinnestPointOS",
        "apexOS",
        "residualOS",
        "tttOS",
        "ablationOS",
      ]) as any;
      const storedReport = rowsForVisit(reports as any[])?.[0];
      const surgery = effectiveVisitId
        ? surgeries?.find((row: any) => Number(row.visitId) === Number(effectiveVisitId) && (!base.operationId || Number(row.id)===Number(base.operationId)))
        : surgeries?.[0];
      const selectedVisit = patientVisits.find((row:any)=>Number(row.id)===Number(effectiveVisitId));
      const report=storedReport ?? (selectedVisit ? {diagnosis:selectedVisit.diagnosis,treatment:selectedVisit.treatment,recommendations:selectedVisit.recommendations,additionalNotes:selectedVisit.history,diseases:JSON.stringify(selectedVisit.diseaseIds),clinicalOpinion:selectedVisit.chiefComplaint,symptoms:selectedVisit.symptoms} : undefined);
      const selectedExamination = visitExaminations[0];
      const pressure=selectedExamination?.airPuff;
      const details=examinationSheetFields(selectedExamination?.findings ?? {});
      details.treatmentPlan=Object.fromEntries((selectedExamination?.procedurePlans ?? []).map((plan:any)=>[plan.eye,plan]));
      for (const eye of ["od","os"]) {
        if (autoref.id && base.examData?.autorefraction?.[eye]) {
          for (const key of ["s","s1","s2","s3","c","c1","c2","c3","axis","a1","a2","a3","ucva","bcva","iop","airPuff1","airPuff2","airPuff3"]) delete base.examData.autorefraction[eye][key];
        }
        if (glasses.id && base.examData?.glasses?.[eye]) base.examData.glasses[eye] = {};
        if (pentacam.id && base.examData?.pentacam?.[eye]) base.examData.pentacam[eye] = {};
        if (afterRefraction.id && base.examData?.autorefraction?.[eye]) {
          for (const key of ["afterS","afterC","afterA"]) delete base.examData.autorefraction[eye][key];
        }
      }
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
        pressure?.iopOD ?? "";
      const osAirPuff =
        pressure?.iopOS ?? "";

      const payload = {
        ...base,
        ...details,
        medicalChecklist:selectedExamination?.medicalChecklist ?? {},
        readingValue:details.readingValue ?? base.readingValue ?? "",
        notes:details.notes ?? base.notes ?? "",
        officeNotes:details.notes ?? base.officeNotes ?? "",
        diabetesDuration:histories?.[0]?.diabetesDuration ?? base.diabetesDuration ?? "",
        medicalHistoryOther:histories?.[0]?.otherHistory ?? base.medicalHistoryOther ?? "",
        visitId: effectiveVisitId,
        symptoms:selectedVisit?.symptoms ?? report?.symptoms ?? "",
        fundus: selectedExamination ? {od:fundusRecord(selectedExamination.posteriorSegmentOD).otherFindings,os:fundusRecord(selectedExamination.posteriorSegmentOS).otherFindings} : base.fundus,
        examinationNotes: selectedExamination?.radiologyLabsNotes ?? base.examinationNotes ?? "",
        medicalHistory: histories?.[0] ? {
          "سكر؟":histories[0].diabetes ? "yes" : "no", "ضغط؟":histories[0].hypertension ? "yes" : "no",
          "الغدة الدرقية؟":histories[0].thyroid ? "yes" : "no", "أمراض مناعة؟":histories[0].autoimmune ? "yes" : "no",
          "ماء زرقاء؟":histories[0].glaucoma ? "yes" : "no", "قرنية مخروطية بالعائلة؟":histories[0].familyKeratoconus ? "yes" : "no",
        } : base.medicalHistory,
        consultantExam: {...(details.consultantExam ?? base.consultantExam),complains:selectedVisit ? selectedVisit.chiefComplaint ?? "" : report?.clinicalOpinion ?? base?.consultantExam?.complains ?? ""},
        historyNotes: report?.additionalNotes ?? "",
        diseases: report ? clinicalArray(report.diseases) : base.diseases ?? [],
        diagnosisText: clinicalValue(report, "diagnosis", base?.diagnosisText ?? base?.formData?.diagnosis),
        finalDecisionText: clinicalValue(report, "recommendations", base?.finalDecisionText ?? base?.finalDecision),
        finalDecision: clinicalValue(report, "recommendations", base?.finalDecision ?? base?.finalDecisionText),
        formData: {
          ...(base?.formData ?? {}),
          diagnosis:
            clinicalValue(report, "diagnosis", base?.formData?.diagnosis),
          treatmentPlan:
            clinicalValue(report, "treatment", base?.formData?.treatmentPlan),
          recommendations:
            clinicalValue(report, "recommendations", base?.formData?.recommendations),
        },
        examData: {
          ...(base?.examData ?? {}),
          fundus:{od:fundusRecord(selectedExamination?.posteriorSegmentOD),os:fundusRecord(selectedExamination?.posteriorSegmentOS)},
          autorefraction: {
            od: {
              ...(base?.examData?.autorefraction?.od ?? {}),
              s: odSphere,
              s1: odSphere,
              s2: autoref?.sphere2OD ?? "",
              s3: autoref?.sphere3OD ?? "",
              c: odCylinder,
              c1: odCylinder,
              c2: autoref?.cylinder2OD ?? "",
              c3: autoref?.cylinder3OD ?? "",
              axis: odAxis,
              a1: odAxis,
              a2: autoref?.axis2OD ?? "",
              a3: autoref?.axis3OD ?? "",
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
              bcva:correctedVision(glasses.id ? glasses : undefined,undefined,"OD") ?? "",
              iop:
                pressure?.iopOD ?? "",
              airPuff1: odAirPuff,
              airPuff2: pressure?.iop2OD ?? "",
              airPuff3: pressure?.iop3OD ?? "",
            },
            os: {
              ...(base?.examData?.autorefraction?.os ?? {}),
              s: osSphere,
              s1: osSphere,
              s2: autoref?.sphere2OS ?? "",
              s3: autoref?.sphere3OS ?? "",
              c: osCylinder,
              c1: osCylinder,
              c2: autoref?.cylinder2OS ?? "",
              c3: autoref?.cylinder3OS ?? "",
              axis: osAxis,
              a1: osAxis,
              a2: autoref?.axis2OS ?? "",
              a3: autoref?.axis3OS ?? "",
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
              bcva:correctedVision(glasses.id ? glasses : undefined,undefined,"OS") ?? "",
              iop:
                pressure?.iopOS ?? "",
              airPuff1: osAirPuff,
              airPuff2: pressure?.iop2OS ?? "",
              airPuff3: pressure?.iop3OS ?? "",
            },
          },
          glasses: {
            od: {
              ...(base?.examData?.glasses?.od ?? {}),
              s: glasses?.sOD ?? base?.examData?.glasses?.od?.s ?? "",
              c: glasses?.cOD ?? base?.examData?.glasses?.od?.c ?? "",
              axis: glasses?.axisOD ?? base?.examData?.glasses?.od?.axis ?? "",
              pd: glasses?.pdOD ?? base?.examData?.glasses?.od?.pd ?? "",
              add: glasses?.addOD ?? base?.examData?.glasses?.od?.add ?? "",
              bcva: glasses?.bcvaOD ?? base?.examData?.glasses?.od?.bcva ?? "",
            },
            os: {
              ...(base?.examData?.glasses?.os ?? {}),
              s: glasses?.sOS ?? base?.examData?.glasses?.os?.s ?? "",
              c: glasses?.cOS ?? base?.examData?.glasses?.os?.c ?? "",
              axis: glasses?.axisOS ?? base?.examData?.glasses?.os?.axis ?? "",
              pd: glasses?.pdOS ?? base?.examData?.glasses?.os?.pd ?? "",
              add: glasses?.addOS ?? base?.examData?.glasses?.os?.add ?? "",
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
              ax2: pentacam?.axis2OD ?? "",
              thinnest:
                pentacam?.thinnestPointOD ??
                base?.examData?.pentacam?.od?.thinnest ??
                "",
              pachymetry:
                pentacam?.pachymetryOD ??
                base?.examData?.pentacam?.od?.pachymetry ??
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
              ax2: pentacam?.axis2OS ?? "",
              thinnest:
                pentacam?.thinnestPointOS ??
                base?.examData?.pentacam?.os?.thinnest ??
                "",
              pachymetry:
                pentacam?.pachymetryOS ??
                base?.examData?.pentacam?.os?.pachymetry ??
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
          surgeryId:surgery?.id,
          type:String(surgery?.surgeryType ?? ""),
          date:surgery?.surgeryDate ?? "",
          eyes:{right:surgery?.eye === "OD" || surgery?.eye === "OU",left:surgery?.eye === "OS" || surgery?.eye === "OU",both:surgery?.eye === "OU"},
        },
      };

      return JSON.stringify(payload);
    }),

  saveSheetEntry: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        sheetType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "surgery",
          "external",
          "pentacam_c",
          "pentacam_ex",
          "pentacam_ex_c",
          "surgery_external",
          "surgery_center",
          "pentacam_center",
          "pentacam_external",
          "clinical",
        ]),
        content: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await db.getDb();
      if (!connection) throw new Error("Database not available");
      const saved = await saveClinicalSheet(connection, input, ctx.user.id, ctx.user.role);
      broadcastSheetUpdate(input.patientId, input.sheetType);
      await db.logAuditEvent(
        ctx.user.id,
        "SAVE_SHEET",
        "sheetEntry",
        input.patientId,
        { sheetType: input.sheetType, visitId: saved.visitId },
      );
      return saved;
    }),

  deleteSheetEntryForVisit: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number(),
        sheetType: z.enum(["consultant", "specialist", "lasik", "external"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.deleteSheetEntryForVisit(input);
      broadcastSheetUpdate(input.patientId, input.sheetType);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_SHEET_ENTRY",
        "sheetEntry",
        input.patientId,
        { visitId: input.visitId, sheetType: input.sheetType },
      );
      return result;
    }),

  saveRefractionToExamination: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        examinationId: z.number().optional(),
        createVisitIfMissing: z.boolean().optional().default(true),
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
                add: z.string().optional(),
                bcva: z.string().optional(),
              })
              .optional(),
            os: z
              .object({
                s: z.string().optional(),
                c: z.string().optional(),
                axis: z.string().optional(),
                pd: z.string().optional(),
                add: z.string().optional(),
                bcva: z.string().optional(),
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
      // Use the explicitly selected visit when provided. Legacy callers may
      // still fall back to today's visit creation behavior.
      const today = input.visitDate ?? cairoDateIso();
      const visits = await db.getVisitsByPatient(input.patientId);
      let visitId: number | undefined;
      try {visitId=selectClinicalVisit(visits,input.patientId,input.visitId,today)?.id;}
      catch(error) {throw new TRPCError({code:"BAD_REQUEST",message:(error as Error).message});}

      if (!visitId && !input.createVisitIfMissing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب اختيار زيارة موجودة قبل حفظ الفحص",
        });
      }

      if (!visitId) {
        // Create new visit for today
        const newVisit = await db.createVisit({
          patientId: input.patientId,
          visitDate: new Date(`${today}T12:00:00`),
          visitType: "examination",
          branch: "examinations",
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

      if (input.examinationId) {
        const selectedExamination = exams.find(
          (exam: any) => Number(exam.id) === Number(input.examinationId),
        );
        if (!selectedExamination) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "الفحص المحدد لا يخص الزيارة المختارة",
          });
        }
        examinationId = selectedExamination.id;
        await db.updateExamination(examinationId, examinationData);
      } else if (exams.length > 0) {
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

  saveExaminationForm: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().int().positive().optional(),
        visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
      const hasSelectionUpdate = Object.prototype.hasOwnProperty.call(input.data, "tests") ||
        Array.isArray(input.data.treatment) ||
        (typeof input.data.treatment === "string" && input.data.treatment.trim().startsWith("["));
      if (!_hasRealData(input.data) && !hasSelectionUpdate && Object.keys(input.data).length === 0) {
        return { success: true, examinationId: null, visitId: null };
      }

      const normalized = examinationFormInput(input, ctx.user.role);
      const saved = await db.saveClinicalVisitData(normalized, {doctorId:ctx.user.id,role:ctx.user.role});
      await db.logAuditEvent(ctx.user.id,"CREATE_EXAMINATION_FORM","examination",saved.examinationId,{visitId:saved.visitId});
      return {success:true,examinationId:saved.examinationId,visitId:saved.visitId};
    }),

  saveMedicalVisit: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().int().positive().optional(),
        visitDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        isFollowup: z.boolean().optional(),
        appointmentId: z.number().optional(),
        // Medical measurements
        symptoms: z.string().optional(),
        chiefComplaint:z.string().optional(),
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
        medicationItems:z.array(z.object({medicationId:z.number().int().positive(),dosage:z.string().optional(),frequency:z.string().optional(),duration:z.string().optional(),instructions:z.string().optional()})).optional(),
        // Doctor notes
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        report: z.string().optional(),
        diseases: z.string().optional(),
        recommendations: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if(!["doctor","nurse","admin","manager"].includes(ctx.user.role))throw new TRPCError({code:"FORBIDDEN",message:"Insufficient permissions to save medical visit"});
      const normalized=medicalVisitInput(input);
      const meaningful=(value:unknown):boolean=>typeof value==="string" ? Boolean(value.trim() && value.trim()!=="[]") : Array.isArray(value) ? value.length>0 : value!==null && typeof value==="object" ? Object.values(value).some(meaningful) : false;
      if(!input.visitId && ![input.autoref,input.iop,input.after,input.glasses,input.fundus,input.pentacam,input.chiefComplaint,input.symptoms,input.diagnosis,input.recommendations,input.report,input.treatment,input.diseases,input.radiologyLabs,input.tests,input.medicationItems].some(meaningful))return {success:true,examinationId:null,visitId:null};
      const saved=await db.saveClinicalVisitData(normalized,{doctorId:ctx.user.id,role:ctx.user.role});
      await db.logAuditEvent(ctx.user.id,"SAVE_MEDICAL_VISIT","visit",saved.visitId,{visitId:saved.visitId,isFollowup:input.isFollowup});
      return saved;
    }),

  updateVisitQueueStatus: protectedProcedure
    .input(
      z.object({
        visitId: z.number(),
        queueStatus: z.enum([
          "checkedIn",
          "next",
          "clinic1",
          "clinic2",
          "pentacam",
          "treated",
        ]),
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
        "accountant",
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

      if (input.queueStatus !== "treated" && !["reception", "accountant", "admin", "manager"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Reception or accounting access required" });
      }

      if (input.queueStatus === "treated") {
        const hasCompletionData = await db.visitHasQueueCompletionData(
          input.visitId,
        );
        if (!hasCompletionData) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن تسجيل المريض كمعالج قبل إدخال بيانات الكشف.",
          });
        }
      }

      await db.updateVisitQueueStatus(
        input.visitId,
        input.queueStatus,
        ctx.user.id,
      );

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

  undoVisitTreated: receptionProcedure
    .input(z.object({ visitId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const role = String(ctx.user.role ?? "").toLowerCase();
      const canUpdateQueue = ["reception", "accountant", "admin"].includes(
        role,
      );
      if (!canUpdateQueue) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update patient queue status.",
        });
      }

      const result = await db.undoVisitTreated(input.visitId);

      await db.logAuditEvent(
        ctx.user.id,
        "UNDO_VISIT_TREATED",
        "visit",
        input.visitId,
        { restoredStatus: result.queueStatus },
      );

      return { success: true, queueStatus: result.queueStatus };
    }),

  addFollowupToQueue: receptionProcedure
    .input(
      z.object({
        patientId: z.number().int().positive(),
        visitDate: z.iso.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const permissions = await db.getEffectiveUserPermissions(
        ctx.user.id,
        ctx.user.role,
      );
      if (
        !["admin", "accountant", "reception"].includes(
          String(ctx.user.role ?? "").toLowerCase(),
        ) &&
        !permissions.includes("action/followup-queue")
      ) {
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
        visitDate = new Date(`${cairoDateIso()}T12:00:00+02:00`);
      }

      // Look up the patient's branch so the NOT NULL column is satisfied.
      const patient = await db.getPatientById(input.patientId);
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المريض غير موجود" });
      }
      const branch =
        String((patient as any)?.branch ?? "").trim() || "examinations";

      const dateIso = visitDate.toISOString().split("T")[0];
      const clinicNo = await db.getNextAlternatingClinicNo(dateIso);
      const clinicStatus = clinicNo === 1 ? "clinic1" : "clinic2";

      const visit = await db.createVisit({
        patientId: input.patientId,
        visitDate,
        visitType: "followup",
        branch,
        queueStatus: clinicStatus as any,
        checkedInAt: new Date(),
        movedToClinicAt: new Date(),
      });

      const visitId = (visit as any)?.insertId as number | undefined;
      if (!visitId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل إنشاء زيارة المتابعة",
        });
      }

      await db.updateVisit(visitId, {
        visitType: "followup",
        queueStatus: clinicStatus,
        movedToClinicAt: new Date(),
        treatedAt: null,
      });

      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_FOLLOWUP_VISIT",
        "visit",
        visitId,
        { patientId: input.patientId, visitDate: visitDate.toISOString() },
      );

      return { success: true, visitId };
    }),

  getTodayPatientsByQueueStatus: clinicalStaffProcedure
    .input(
      z.object({
        date: z.string().optional(),
        queueStatus: z
          .enum([
            "checkedIn",
            "next",
            "clinic1",
            "clinic2",
            "pentacam",
            "treated",
          ])
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const dateIso = input.date || new Date().toISOString().split("T")[0];

        // Daily rollover: carry forward unfinished old queues as treated.
        await db.rolloverPreviousQueueVisitsAsTreated(dateIso);

        // Triage checkedIn patients that don't need a clinic slot
        // (pentacam-code -> pentacam, no matching code -> treated immediately).
        // Clinic1/clinic2 slot filling itself only happens via cascadeQueueStatus,
        // triggered when a patient is marked treated.
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
          // Preserve per-stage membership when returning the combined snapshot.
          const patientKey = `${visit.queueStatus}:${patientId}`;
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
            treatedByUserId: visit.treatedByUserId,
            treatedByName:
              String(visit.treatedByName ?? "").trim() ||
              String(visit.treatedByUsername ?? "").trim() ||
              null,
            hasQueueCompletionData:
              Number(visit.hasQueueCompletionData ?? 0) === 1,
          };
          if (!patientMap.has(patientKey)) {
            patientMap.set(patientKey, row);
          } else if (visit.visitType === "followup") {
            // Followup visit overrides an earlier consultation visit for the same patient.
            patientMap.set(patientKey, row);
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
