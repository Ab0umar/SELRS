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
  type Medication,
} from "../../drizzle/schema";
import { mssqlQuery } from "../services/accounting/mssqlAccounting";
import { broadcastSheetUpdate } from "../_core/ws";
import { symptomDirectoryEntrySchema } from "./_medical/service-helpers";
import { getBuildInfo } from "../_core/buildInfo";
import {
  egyptianDrugDosageForms,
  type EgyptianDrugReference,
  matchEgyptianDrugReference,
  searchEgyptianDrugReference,
} from "../services/egyptianDrugReference";

type ExistingMedicationReferenceMatch = {
  medicationId: number;
  currentName: string;
  currentStrength: string;
  confidence: "exact" | "normalized" | "ingredient" | "suggested" | "suspected";
  reference: EgyptianDrugReference;
};
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
  matchExistingMedicationsWithEgyptianReference: medicalStaffProcedure.query(
    async () => {
      const medications = await db.getAllMedications();
      const matches = await matchEgyptianDrugReference(
        medications.map((medication: Medication) => medication.name),
      );
      const byName = new Map(
        matches.map((result) => [result.name.trim().toLowerCase(), result]),
      );
      const items = medications
        .map((medication: Medication) => {
          const result = byName.get(medication.name.trim().toLowerCase());
          return result?.match
            ? {
                medicationId: medication.id,
                currentName: medication.name,
                currentStrength: medication.strength ?? "",
                confidence: result.confidence,
                reference: result.match,
              }
            : null;
        })
        .filter(
          (
            item: ExistingMedicationReferenceMatch | null,
          ): item is ExistingMedicationReferenceMatch => item != null,
        );
      return {
        items,
        totalExisting: medications.length,
        unmatched: medications.length - items.length,
      };
    },
  ),

  syncExistingMedicationsWithEgyptianReference: medicalStaffProcedure
    .input(
      z.object({
        medicationIds: z.array(z.number().int().positive()).min(1).max(10_000),
      }),
    )
    .mutation(async ({ input }) => {
      const selectedIds = new Set(input.medicationIds);
      const medications = (await db.getAllMedications()).filter(
        (medication: Medication) => selectedIds.has(medication.id),
      );
      const matches = await matchEgyptianDrugReference(
        medications.map((medication: Medication) => medication.name),
      );
      let updated = 0;
      for (const medication of medications) {
        const result = matches.find(
          (match) =>
            match.name.trim().toLowerCase() ===
            medication.name.trim().toLowerCase(),
        );
        const drug = result?.match;
        if (!drug || !result) continue;
        const ingredientOnly = result.confidence === "ingredient";
        await db.updateMedication(medication.id, {
          name: ingredientOnly ? medication.name : drug.commercialNameEn,
          type:
            drug.dosageForm === "drops"
              ? "drops"
              : drug.dosageForm === "ointment"
                ? "ointment"
                : drug.dosageForm === "ampoules"
                  ? "injection"
                  : drug.dosageForm === "suspension" ||
                      drug.dosageForm === "syrup" ||
                      drug.dosageForm === "solution"
                    ? "suspension"
                    : drug.dosageForm === "tablets" ||
                        drug.dosageForm === "capsules"
                      ? "tablet"
                      : "other",
          activeIngredient: drug.scientificName,
          strength: ingredientOnly
            ? medication.strength || ""
            : drug.strength || medication.strength || "",
          manufacturer: ingredientOnly
            ? medication.manufacturer || ""
            : drug.manufacturer,
          description: [
            drug.commercialNameAr,
            drug.route ? `Route: ${drug.route}` : "",
            "Source: Egyptian Drug Database (CC0)",
          ]
            .filter(Boolean)
            .join(" | "),
        });
        updated += 1;
      }
      return { updated, skipped: input.medicationIds.length - updated };
    }),

  searchEgyptianDrugReference: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().max(100).default(""),
        limit: z.number().int().min(1).max(50).default(30),
        dosageForm: z.enum(egyptianDrugDosageForms).optional(),
      }),
    )
    .query(async ({ input }) =>
      searchEgyptianDrugReference(input.query, input.limit, input.dosageForm),
    ),

  addEgyptianDrugToPrescriptionCatalog: medicalStaffProcedure
    .input(
      z.object({
        commercialNameEn: z.string().trim().min(1).max(255),
        commercialNameAr: z.string().trim().max(255).optional(),
        scientificName: z.string().trim().max(255).optional(),
        manufacturer: z.string().trim().max(255).optional(),
        route: z.string().trim().max(100).optional(),
        dosageForm: z.enum(egyptianDrugDosageForms).optional(),
        strength: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = (await db.getAllMedications()).find(
        (row: { name: string }) =>
          row.name.trim().toLowerCase() ===
          input.commercialNameEn.trim().toLowerCase(),
      );
      if (existing) return { medication: existing, created: false };

      const result = await db.createMedication({
        name: input.commercialNameEn,
        type:
          input.dosageForm === "drops"
            ? "drops"
            : input.dosageForm === "ointment"
              ? "ointment"
              : input.dosageForm === "ampoules"
                ? "injection"
                : input.dosageForm === "suspension" ||
                    input.dosageForm === "syrup" ||
                    input.dosageForm === "solution"
                  ? "suspension"
                  : input.dosageForm === "tablets" ||
                      input.dosageForm === "capsules"
                    ? "tablet"
                    : "other",
        activeIngredient: input.scientificName || "",
        strength: input.strength || "",
        manufacturer: input.manufacturer || "",
        description: [
          input.commercialNameAr,
          input.route ? `Route: ${input.route}` : "",
          "Source: Egyptian Drug Database (CC0)",
        ]
          .filter(Boolean)
          .join(" | "),
      });
      return { medication: result, created: true };
    }),

  addEgyptianDrugsToPrescriptionCatalog: medicalStaffProcedure
    .input(
      z.object({
        query: z.string().trim().max(100).default(""),
        dosageForm: z.enum(egyptianDrugDosageForms).optional(),
        selectedNames: z
          .array(z.string().trim().min(1).max(255))
          .min(1)
          .max(10_000),
      }),
    )
    .mutation(async ({ input }) => {
      const reference = await searchEgyptianDrugReference(
        input.query,
        10_000,
        input.dosageForm,
      );
      const selectedNames = new Set(
        input.selectedNames.map((name) => name.toLowerCase()),
      );
      const existingNames = new Set(
        (await db.getAllMedications()).map((row: { name: string }) =>
          row.name.trim().toLowerCase(),
        ),
      );
      const unique = new Map(
        reference.items
          .filter((drug) =>
            selectedNames.has(drug.commercialNameEn.toLowerCase()),
          )
          .map((drug) => [drug.commercialNameEn.toLowerCase(), drug]),
      );
      const rows = [...unique.values()]
        .filter(
          (drug) => !existingNames.has(drug.commercialNameEn.toLowerCase()),
        )
        .map((drug) => ({
          name: drug.commercialNameEn,
          type:
            drug.dosageForm === "drops"
              ? ("drops" as const)
              : drug.dosageForm === "ointment"
                ? ("ointment" as const)
                : drug.dosageForm === "ampoules"
                  ? ("injection" as const)
                  : drug.dosageForm === "suspension" ||
                      drug.dosageForm === "syrup" ||
                      drug.dosageForm === "solution"
                    ? ("suspension" as const)
                    : drug.dosageForm === "tablets" ||
                        drug.dosageForm === "capsules"
                      ? ("tablet" as const)
                      : ("other" as const),
          activeIngredient: drug.scientificName,
          strength: drug.strength,
          manufacturer: drug.manufacturer,
          description: [
            drug.commercialNameAr,
            drug.route ? `Route: ${drug.route}` : "",
            "Source: Egyptian Drug Database (CC0)",
          ]
            .filter(Boolean)
            .join(" | "),
        }));

      await db.createMedicationsBulk(rows);
      return {
        created: rows.length,
        skipped: input.selectedNames.length - rows.length,
      };
    }),

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
        requestDate: input.date
          ? new Date(`${input.date}T12:00:00`)
          : new Date(),
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

  replaceTestRequest: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number(),
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
      await db.deleteTestRequestsByVisit(input.visitId);
      if (input.items.length > 0) {
        const result = await db.createTestRequest({
          patientId: input.patientId,
          visitId: input.visitId,
          requestDate: input.date
            ? new Date(`${input.date}T12:00:00`)
            : new Date(),
          status: "pending",
          notes: input.notes,
        });
        const testRequestId = result[0].insertId;
        await db.createTestRequestItems(
          input.items.map((item) => ({
            testRequestId,
            testId: item.testId,
            result: item.notes,
          })),
        );
      }
      await db.logAuditEvent(
        ctx.user.id,
        "REPLACE_TEST_REQUEST",
        "visit",
        input.visitId,
        { itemCount: input.items.length },
      );
      return { success: true };
    }),

  getTestRequestsByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByPatient(input.patientId);
    }),

  getPatientTestRequests: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTestRequestsByPatient(input.patientId);
    }),

  getMedicalHistoryByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getMedicalHistoryByPatient(input.patientId);
    }),

  upsertMedicalHistory: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number().int().positive(),
        diabetes: z.boolean().optional(),
        hypertension: z.boolean().optional(),
        heartDisease: z.boolean().optional(),
        asthma: z.boolean().optional(),
        allergies: z.boolean().optional(),
        thyroid: z.boolean().optional(),
        autoimmune: z.boolean().optional(),
        familyKeratoconus: z.boolean().optional(),
        glaucoma: z.boolean().optional(),
        previousSurgeries: z.string().nullable().optional(),
        medications: z.string().nullable().optional(),
        familyHistory: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.upsertMedicalHistory(input);
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

  getPrescriptionsByVisit: makePageProcedure("/patient-file")
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

  replacePrescriptionWithItems: medicalStaffProcedure
    .input(
      z.object({
        patientId: z.number(),
        visitId: z.number(),
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
      const existing = await db.getPrescriptionsWithItemsByVisit(input.visitId);
      for (const prescription of existing ?? []) {
        if (prescription?.id) await db.deletePrescription(prescription.id);
      }
      if (input.items.length > 0) {
        await db.createPrescriptionWithItems({
          patientId: input.patientId,
          visitId: input.visitId,
          doctorId: ctx.user.id,
          date: input.date,
          notes: input.notes,
          items: input.items,
        });
      }
      await db.logAuditEvent(
        ctx.user.id,
        "REPLACE_PRESCRIPTION",
        "visit",
        input.visitId,
        { itemCount: input.items.length },
      );
      return { success: true };
    }),

  getPrescriptionsByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPrescriptionsByPatient(input.patientId);
    }),

  getPrescriptionsWithItemsByPatient: makePageProcedure("/patient-file")
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

  getPrescriptionsWithItemsByVisit: makePageProcedure("/patient-file")
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
        surgeon: z.string().optional(),
        notes: z.string().optional(),
        patientNameOverride: z.string().optional(),
        patientCodeOverride: z.string().optional(),
        patientDobOverride: z.string().optional(),
        patientGenderOverride: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const {
          preOpUCVA_OD,
          preOpUCVA_OS,
          preOpBCVA_OD,
          preOpBCVA_OS,
          surgeryNotes,
          ...rest
        } = input;
        await db.createSurgery({
          ...rest,
          notes: input.notes ?? surgeryNotes,
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

  getSurgeriesByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getSurgeriesByPatient(input.patientId);
    }),

  updateSurgery: medicalStaffProcedure
    .input(
      z.object({
        surgeryId: z.number(),
        surgeryType: z.string().optional(),
        surgeryDate: z.string().optional(),
        surgeon: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
        patientNameOverride: z.string().optional(),
        patientCodeOverride: z.string().optional(),
        patientDobOverride: z.string().optional(),
        patientGenderOverride: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { surgeryId, surgeryDate, ...rest } = input;
        await db.updateSurgery(surgeryId, {
          ...rest,
          ...(surgeryDate ? { surgeryDate: new Date(surgeryDate) } : {}),
        });
        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_SURGERY",
          "surgery",
          surgeryId,
          {
            message: `Updated surgery ${surgeryId}`,
          },
        );
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to update surgery: ${error}`);
      }
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

  getPostOpFollowupsByPatient: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPostOpFollowupsByPatient(input.patientId);
    }),

  getPostOpFollowupsBySurgery: makePageProcedure("/patient-file")
    .input(z.object({ surgeryId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPostOpFollowupsBySurgery(input.surgeryId);
    }),
};
