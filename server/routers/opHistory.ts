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

  getServiceCodeMappings: protectedProcedure.query(async () => {
    return await db.getServiceCodeOpTypeMappings();
  }),

  listUnmappedServiceCodes: protectedProcedure.query(async () => {
    return await db.getUnmappedServiceCodes();
  }),

  upsertServiceCodeMapping: adminProcedure
    .input(
      z.object({
        serviceCodes: z.array(z.string().trim().min(1)).min(1),
        operationType: z.string().trim().min(1).max(50),
        label: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      for (const serviceCode of input.serviceCodes) {
        await db.upsertServiceCodeOpTypeMapping({
          serviceCode,
          operationType: input.operationType,
          label: input.label ?? null,
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
