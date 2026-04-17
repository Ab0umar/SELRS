import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
});

export type PatientRouter = typeof patientRouter;
