/**
 * OP History — unified per-operation-type patient list, merged from
 * sheetEntries (lasik/external operationDetails), surgeries, and
 * followupItems, plus manual entries. See patientOperations in
 * drizzle/schema.ts and the sync functions in server/db.ts for the merge
 * logic (mirrors the patientServiceEntries/upsertPatientServiceEntry
 * source+sourceRef dedup pattern used for the legacy-year patient sync).
 */
import { z } from "zod";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure } from "../_core/procedures";
import * as db from "../db";
import { loadNameMaps } from "./legacyPatients";
import { getServiceCodeNamesFromMssql } from "../integrations/mssqlPatients";

const PATIENT_DATA_EDIT_PERMISSIONS = [
  "/patient-data/edit",
  "/quick-entry",
  "/new-cases",
];

async function assertCanEditPatientData(userId: number, role: string) {
  if (role === "admin") return;
  const permissions = await db.getEffectiveUserPermissions(userId, role);
  const canEdit = PATIENT_DATA_EDIT_PERMISSIONS.some((p) =>
    permissions.includes(p),
  );
  if (!canEdit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "You do not have permission to add operation records. Contact admin to enable /patient-data/edit or patient intake permissions.",
    });
  }
}

export const opHistoryRouter = router({
  sync: adminProcedure.mutation(async () => {
    return await db.syncPatientOperationsFromSources();
  }),

  getTypeCounts: protectedProcedure.query(async () => {
    return await db.getPatientOperationTypeCounts();
  }),

  listByType: protectedProcedure
    .input(
      z.object({
        operationType: z.string().trim().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(25),
        query: z.string().trim().max(255).optional(),
        locationType: z.enum(["center", "external"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { doctorNames } = await loadNameMaps();
      const rows = await db.getPatientOperationsByType(input);
      return {
        rows: rows.map((row: { doctorCode: string | null }) => ({
          ...row,
          doctorName: row.doctorCode
            ? (doctorNames.get(row.doctorCode) ?? null)
            : null,
        })),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // Pre-fill suggestion for the operation-type fields on the print sheets
  // and followup pages — resolved from the patient's current requested
  // service code via serviceCodeOpTypeMap. Null when there's nothing to
  // suggest; the field stays exactly as manual entry would leave it.
  getSuggestedOperationType: protectedProcedure
    .input(z.object({ patientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await db.getSuggestedOperationTypeForPatient(input.patientId);
    }),

  getServiceCodeMappings: protectedProcedure.query(async () => {
    return await db.getServiceCodeOpTypeMappings();
  }),

  // Bare codes are meaningless to an admin picking an operation type — pull
  // in each code's Arabic service name from the legacy MSSQL catalog
  // (SRVCMF) so the mapping UI shows what the code actually is. A code the
  // MSSQL lookup fails/can't find just comes back with an empty name; the
  // mapping flow still works from the code alone.
  listUnmappedServiceCodes: protectedProcedure.query(async () => {
    const codes = await db.getUnmappedServiceCodes();
    let names = new Map<string, string>();
    try {
      names = await getServiceCodeNamesFromMssql(codes);
    } catch {
      // MSSQL unreachable — fall back to bare codes rather than failing the whole list.
    }
    return codes.map((serviceCode: string) => ({
      serviceCode,
      serviceName: names.get(serviceCode) ?? "",
    }));
  }),

  upsertServiceCodeMapping: adminProcedure
    .input(
      z.object({
        serviceCodes: z.array(z.string().trim().min(1)).min(1),
        operationType: z.string().trim().min(1).max(50),
        // Fallback label applied to every code in this batch when a
        // per-code name isn't given in `labels`.
        label: z.string().trim().max(255).optional(),
        // Per-code names (e.g. resolved from the MSSQL SRVCMF catalog) —
        // each code keeps its own real operation name instead of all codes
        // in a multi-select batch sharing one label.
        labels: z.record(z.string(), z.string().trim().max(255)).optional(),
        // Per-code operation types — a rule-based bulk apply can map
        // different codes in the same batch to different types (e.g. one
        // call mapping some codes to PRK and others to Lasik at once).
        operationTypes: z.record(z.string(), z.string().trim().min(1).max(50)).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      for (const serviceCode of input.serviceCodes) {
        await db.upsertServiceCodeOpTypeMapping({
          serviceCode,
          operationType: input.operationTypes?.[serviceCode] ?? input.operationType,
          label: input.labels?.[serviceCode] ?? input.label ?? null,
        });
      }
      return { success: true, count: input.serviceCodes.length } as const;
    }),

  addManual: protectedProcedure
    .input(
      z.object({
        patientId: z.number().int().positive(),
        operationType: z.string().trim().min(1).max(50),
        operationDate: z.string().trim().optional(),
        eye: z.enum(["OD", "OS", "OU"]).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await assertCanEditPatientData(ctx.user.id, ctx.user.role);
      const sourceRef = `manual:${crypto.randomUUID()}`;
      await db.upsertPatientOperation({
        patientId: input.patientId,
        operationType: input.operationType,
        operationDate: input.operationDate ?? null,
        source: "manual",
        sourceRef,
        eye: input.eye ?? null,
        notes: input.notes ?? null,
      });
      return { success: true } as const;
    }),
});
