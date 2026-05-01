import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { InsertVisitScheduleRequest } from "../../drizzle/schema";
import { router, protectedProcedure } from "../_core/procedures";
import * as db from "../db";

/**
 * Patient Router - Patient-related queries and mutations
 */
export const patientRouter = router({
  /**
   * Get patient by ID
   * Used by Dashboard to load patient medical file
   */
  getPatient: protectedProcedure
    .input(z.number().nullable().optional())
    .query(async ({ input, ctx }) => {
      if (!input) return null;

      try {
        const patient = await db.getPatientById(input);
        if (!patient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found",
          });
        }
        return patient;
      } catch (error) {
        console.error(`Error fetching patient ${input}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch patient data",
        });
      }
    }),

  /**
   * Update patient profile
   */
  updatePatient: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        updates: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await db.updatePatient(
          input.patientId,
          input.updates
        );

        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_PATIENT",
          "patient",
          input.patientId,
          { fields: Object.keys(input.updates) }
        );

        return updated;
      } catch (error) {
        console.error(`Error updating patient ${input.patientId}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update patient",
        });
      }
    }),

  /**
   * حفظ طلب موعد/كشف (استقبال) في جدول `visit_schedule_requests`
   */
  createVisitScheduleRequest: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1).max(255),
        age: z.number().int().min(0).max(130).optional().nullable(),
        visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        phone: z.string().max(32).optional().nullable(),
        service: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const payload: Omit<InsertVisitScheduleRequest, "id" | "createdAt" | "updatedAt"> = {
          fullName: input.fullName.trim(),
          age: input.age ?? null,
          // Drizzle mysql `date` accepts YYYY-MM-DD string at runtime
          visitDate: input.visitDate as unknown as InsertVisitScheduleRequest["visitDate"],
          phone: input.phone?.trim() || null,
          service: input.service.trim(),
          createdByUserId: ctx.user.id,
        };
        const { id } = await db.insertVisitScheduleRequest(payload);

        await db.logAuditEvent(ctx.user.id, "CREATE_VISIT_SCHEDULE_REQUEST", "visit_schedule_requests", id, {
          visitDate: input.visitDate,
          service: input.service,
        });

        return { id };
      } catch (error) {
        console.error("[createVisitScheduleRequest]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save appointment request",
        });
      }
    }),
});

export type PatientRouter = typeof patientRouter;
