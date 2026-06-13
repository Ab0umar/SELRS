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
import { symptomDirectoryEntrySchema } from "./_medical/service-helpers";
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

export const medicalCatalogRoutes = {
  getMedications: protectedProcedure.query(async () => {
    return await db.getAllMedications();
  }),

  getAllMedications: protectedProcedure.query(async () => {
    return await db.getAllMedications();
  }),

  createMedication: managerProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.enum([
          "tablet",
          "drops",
          "ointment",
          "injection",
          "suspension",
          "other",
        ]),
        activeIngredient: z.string().optional(),
        strength: z.string().optional(),
        manufacturer: z.string().optional(),
        dosage: z.string().optional(),
        description: z.string().optional(),
        stockPieces: z.number().int().nonnegative().optional(),
        inventoryStatus: z
          .enum(["available", "out_of_stock", "reserved"])
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.createMedication({
        name: input.name,
        type: input.type,
        activeIngredient: input.activeIngredient || "",
        strength: input.strength || "",
        manufacturer: input.manufacturer || "",
        dosage: input.dosage || "",
        description: input.description || "",
        stockPieces: input.stockPieces ?? null,
        inventoryStatus: input.inventoryStatus ?? null,
      });
      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_MEDICATION",
        "medication",
        0,
        { message: `Added medication ${input.name}` },
      );
      return { success: true };
    }),

  updateMedication: managerProcedure
    .input(
      z.object({
        medicationId: z.number(),
        updates: z.object({
          name: z.string().optional(),
          type: z
            .enum([
              "tablet",
              "drops",
              "ointment",
              "injection",
              "suspension",
              "other",
            ])
            .optional(),
          activeIngredient: z.string().optional(),
          strength: z.string().optional(),
          manufacturer: z.string().optional(),
          dosage: z.string().optional(),
          description: z.string().optional(),
          stockPieces: z.number().int().nonnegative().nullable().optional(),
          inventoryStatus: z
            .enum(["available", "out_of_stock", "reserved"])
            .nullable()
            .optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateMedication(input.medicationId, input.updates);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_MEDICATION",
        "medication",
        input.medicationId,
        { message: "Updated medication" },
      );
      return { success: true };
    }),

  deleteMedication: managerProcedure
    .input(z.object({ medicationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMedication(input.medicationId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_MEDICATION",
        "medication",
        input.medicationId,
        { message: "Deleted medication" },
      );
      return { success: true };
    }),

  getAllDiseases: protectedProcedure.query(async () => {
    return await db.getAllDiseases();
  }),

  createDisease: managerProcedure
    .input(
      z.object({
        name: z.string(),
        branch: z.string().optional(),
        abbrev: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.createDisease(
        input.name,
        input.branch ?? null,
        input.abbrev ?? null,
      );
      await db.logAuditEvent(ctx.user.id, "CREATE_DISEASE", "disease", 0, {
        message: `Added disease ${input.name}`,
      });
      return { success: true };
    }),

  updateDisease: managerProcedure
    .input(
      z.object({
        diseaseId: z.number(),
        name: z.string(),
        branch: z.string().optional(),
        abbrev: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateDisease(
        input.diseaseId,
        input.name,
        input.branch ?? null,
        input.abbrev ?? null,
      );
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_DISEASE",
        "disease",
        input.diseaseId,
        { message: "Updated disease" },
      );
      return { success: true };
    }),

  deleteDisease: managerProcedure
    .input(z.object({ diseaseId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteDisease(input.diseaseId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_DISEASE",
        "disease",
        input.diseaseId,
        { message: "Deleted disease" },
      );
      return { success: true };
    }),

  getAllSymptoms: protectedProcedure.query(async () => {
    const row = await db.getSystemSetting("symptoms_directory");
    if (!row?.value)
      return [] as Array<z.infer<typeof symptomDirectoryEntrySchema>>;
    try {
      const parsed = JSON.parse(row.value);
      const normalized = z.array(symptomDirectoryEntrySchema).safeParse(parsed);
      if (!normalized.success)
        return [] as Array<z.infer<typeof symptomDirectoryEntrySchema>>;
      return normalized.data;
    } catch {
      return [] as Array<z.infer<typeof symptomDirectoryEntrySchema>>;
    }
  }),

  createSymptom: managerProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("symptoms_directory");
      let current: Array<z.infer<typeof symptomDirectoryEntrySchema>> = [];
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          const normalized = z
            .array(symptomDirectoryEntrySchema)
            .safeParse(parsed);
          if (normalized.success) current = normalized.data;
        } catch {
          current = [];
        }
      }
      const name = String(input.name ?? "").trim();
      if (!name) return { success: true };
      if (
        current.some(
          (item) =>
            String(item.name ?? "")
              .trim()
              .toLowerCase() === name.toLowerCase(),
        )
      ) {
        return { success: true, duplicate: true };
      }
      current.push({
        id: `sym_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
      });
      await db.updateSystemSettings("symptoms_directory", current);
      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_SYMPTOM",
        "systemSetting",
        0,
        { message: `Added symptom ${name}` },
      );
      return { success: true };
    }),

  updateSymptom: managerProcedure
    .input(z.object({ symptomId: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("symptoms_directory");
      let current: Array<z.infer<typeof symptomDirectoryEntrySchema>> = [];
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          const normalized = z
            .array(symptomDirectoryEntrySchema)
            .safeParse(parsed);
          if (normalized.success) current = normalized.data;
        } catch {
          current = [];
        }
      }
      const next = current.map((item) =>
        item.id === input.symptomId
          ? { ...item, name: String(input.name ?? "").trim() }
          : item,
      );
      await db.updateSystemSettings("symptoms_directory", next);
      await db.logAuditEvent(
        ctx.user.id,
        "UPDATE_SYMPTOM",
        "systemSetting",
        0,
        { symptomId: input.symptomId },
      );
      return { success: true };
    }),

  deleteSymptom: managerProcedure
    .input(z.object({ symptomId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getSystemSetting("symptoms_directory");
      let current: Array<z.infer<typeof symptomDirectoryEntrySchema>> = [];
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          const normalized = z
            .array(symptomDirectoryEntrySchema)
            .safeParse(parsed);
          if (normalized.success) current = normalized.data;
        } catch {
          current = [];
        }
      }
      const next = current.filter((item) => item.id !== input.symptomId);
      await db.updateSystemSettings("symptoms_directory", next);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_SYMPTOM",
        "systemSetting",
        0,
        { symptomId: input.symptomId },
      );
      return { success: true };
    }),

  getTests: protectedProcedure.query(async () => {
    return await db.getAllTests();
  }),

  getAllTests: protectedProcedure.query(async () => {
    return await db.getAllTests();
  }),

  createTest: managerProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.enum(["examination", "lab", "imaging", "other"]),
        category: z.string().optional(),
        normalRange: z.string().optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
        priceEgp: z.string().optional(),
        durationMinutes: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.createTest({
        name: input.name,
        type: input.type,
        category: input.category || "",
        normalRange: input.normalRange || "",
        unit: input.unit || "",
        description: input.description || "",
        priceEgp: input.priceEgp?.trim() || null,
        durationMinutes: input.durationMinutes ?? null,
        isActive: input.isActive ?? true,
      });
      await db.logAuditEvent(ctx.user.id, "CREATE_TEST", "test", 0, {
        message: `Added test ${input.name}`,
      });
      return { success: true };
    }),

  updateTest: managerProcedure
    .input(
      z.object({
        testId: z.number(),
        updates: z.object({
          name: z.string().optional(),
          type: z.enum(["examination", "lab", "imaging", "other"]).optional(),
          category: z.string().optional(),
          normalRange: z.string().optional(),
          unit: z.string().optional(),
          description: z.string().optional(),
          priceEgp: z.string().nullable().optional(),
          durationMinutes: z.number().int().nonnegative().nullable().optional(),
          isActive: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const raw = { ...input.updates } as Record<string, unknown>;
      for (const key of Object.keys(raw)) {
        if (raw[key] === undefined) delete raw[key];
      }
      if (input.updates.category !== undefined) {
        raw.category = input.updates.category ?? "";
      }
      await db.updateTest(input.testId, raw);
      await db.logAuditEvent(ctx.user.id, "UPDATE_TEST", "test", input.testId, {
        message: "Updated test",
      });
      return { success: true };
    }),

  deleteTest: managerProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteTest(input.testId);
      await db.logAuditEvent(ctx.user.id, "DELETE_TEST", "test", input.testId, {
        message: "Deleted test",
      });
      return { success: true };
    }),

  getMyTestFavorites: medicalStaffProcedure.query(async ({ ctx }) => {
    return await db.getTestFavoritesByUser(ctx.user.id);
  }),

  toggleTestFavorite: medicalStaffProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await db.toggleTestFavorite(ctx.user.id, input.testId);
    }),

  createTestRequest: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        date: z.string().optional(),
        priority: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            testId: z.number(),
            notes: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.createTestRequest({
        patientId: input.patientId,
        visitId: input.visitId,
        requestDate: new Date(),
        status: "pending",
        notes: input.notes,
      });

      // Get the ID of the created test request
      const testRequestId = result[0].insertId;

      // Create test request items
      if (input.items && input.items.length > 0) {
        const itemsToInsert = input.items.map((item: any) => ({
          testRequestId: testRequestId,
          testId: item.testId,
          result: item.notes,
        }));
        await db.createTestRequestItems(itemsToInsert);
      }

      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_TEST_REQUEST",
        "testRequest",
        testRequestId,
        {
          message: `Created test request for patient ${input.patientId} with ${input.items?.length || 0} items`,
        },
      );
      return { success: true };
    }),

  getTestRequestsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByPatient(input.patientId);
    }),

  getPatientTestRequests: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByPatient(input.patientId);
    }),

  getTestRequestsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByVisit(input.visitId);
    }),

  createPrescription: medicalStaffProcedure
    .input(
      z.object({
        visitId: z.number(),
        patientId: z.number(),
        medicationName: z.string(),
        dosage: z.string(),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        instructions: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createPrescription({
          ...input,
          doctorId: ctx.user.id,
        });

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_PRESCRIPTION",
          "prescription",
          0,
          { message: `Created prescription for patient ${input.patientId}` },
        );

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create prescription: ${error}`);
      }
    }),

  getPrescriptionsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsByVisit(input.visitId);
    }),

  createPrescriptionWithItems: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        date: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            medicationId: z.number().optional(),
            medicationName: z.string(),
            dosage: z.string().optional(),
            frequency: z.string().optional(),
            duration: z.string().optional(),
            instructions: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[createPrescriptionWithItems] input", {
        patientId: input.patientId,
        itemsCount: input.items.length,
        firstItem: input.items[0],
      });
      await db.createPrescriptionWithItems({
        patientId: input.patientId,
        visitId: input.visitId,
        doctorId: ctx.user.id,
        date: input.date,
        notes: input.notes,
        items: input.items,
      });
      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_PRESCRIPTION",
        "prescription",
        0,
        { message: `Created prescription for patient ${input.patientId}` },
      );
      return { success: true };
    }),

  getPrescriptionsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsByPatient(input.patientId);
    }),

  getPrescriptionsWithItemsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsWithItemsByPatient(input.patientId);
    }),

  getPrescriptionsOverview: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).optional(),
          pageSize: z.number().min(1).max(200).optional(),
          search: z.string().optional(),
          statusFilter: z
            .enum(["all", "active", "completed", "expired"])
            .optional(),
          locationType: z.enum(["center", "external"]).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await db.getPrescriptionsOverviewRows({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        statusFilter: input?.statusFilter,
        locationType: input?.locationType,
      });
    }),

  getPrescriptionsWithItemsByVisit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsWithItemsByVisit(input.visitId);
    }),

  deletePrescription: managerProcedure
    .input(z.object({ prescriptionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deletePrescription(input.prescriptionId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_PRESCRIPTION",
        "prescription",
        input.prescriptionId,
        { message: "Deleted prescription" },
      );
      return { success: true };
    }),

  createSurgery: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        appointmentId: z.number().optional(),
        surgeryType: z.string(),
        surgeryDate: z.string(),
        preOpUCVA_OD: z.string().optional(),
        preOpUCVA_OS: z.string().optional(),
        preOpBCVA_OD: z.string().optional(),
        preOpBCVA_OS: z.string().optional(),
        surgeryNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createSurgery({
          ...input,
          doctorId: ctx.user.id,
          surgeryDate: new Date(input.surgeryDate),
          status: "scheduled",
        });

        await db.logAuditEvent(ctx.user.id, "CREATE_SURGERY", "surgery", 0, {
          message: `Created surgery record for patient ${input.patientId}`,
        });

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create surgery: ${error}`);
      }
    }),

  getSurgeriesByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getSurgeriesByPatient(input.patientId);
    }),

  deleteSurgery: medicalStaffProcedure
    .input(z.object({ surgeryId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteSurgery(input.surgeryId);
      await db.logAuditEvent(
        ctx.user.id,
        "DELETE_SURGERY",
        "surgery",
        input.surgeryId,
        { message: "Deleted surgery" },
      );
      return { success: true };
    }),

  createPostOpFollowup: medicalStaffProcedure
    .input(
      z.object({
        surgeryId: z.number(),
        patientId: z.number().optional(),
        date: z.string().optional(),
        followupDate: z.string().optional(),
        findings: z.string().optional(),
        recommendations: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.createPostOpFollowup({
        surgeryId: input.surgeryId,
        patientId: input.patientId ?? 0,
        followupDate: input.followupDate
          ? new Date(input.followupDate)
          : input.date
            ? new Date(input.date)
            : new Date(),
        findings: input.findings ?? null,
        recommendations: input.recommendations ?? null,
      });
      await db.logAuditEvent(
        ctx.user.id,
        "CREATE_POST_OP",
        "postOpFollowup",
        input.surgeryId,
        { message: "Created followup" },
      );
      return { success: true };
    }),

  getPostOpFollowupsByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPostOpFollowupsByPatient(input.patientId);
    }),

  getPostOpFollowupsBySurgery: protectedProcedure
    .input(z.object({ surgeryId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPostOpFollowupsBySurgery(input.surgeryId);
    }),
};
