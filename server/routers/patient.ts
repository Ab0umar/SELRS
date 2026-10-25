import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  receptionProcedure,
  makePageProcedure,
} from "../_core/procedures";
import * as db from "../db";
import { broadcastBookingUpdate } from "../_core/ws";
import { visitScheduleSchema } from "../../shared/visitSchedule";
import { saveVisitSchedule } from "../services/visitSchedule";

/**
 * Patient Router - Patient-related queries and mutations
 */
export const patientRouter = router({
  /**
   * Get patient by ID
   * Used by Dashboard to load patient medical file
   */
  getPatient: makePageProcedure("/patient-file")
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
  updatePatient: receptionProcedure
    .input(
      z.object({
        patientId: z.number(),
        updates: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await db.updatePatient(input.patientId, input.updates);

        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_PATIENT",
          "patient",
          input.patientId,
          { fields: Object.keys(input.updates) },
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
    .input(visitScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      const permissions = await db.getEffectiveUserPermissions(ctx.user.id, ctx.user.role);
      if (!["admin", "manager", "reception", "accountant"].includes(ctx.user.role) && !permissions.includes("action/schedule-visit")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بتحديد موعد" });
      }
      try {
        const { id, cancelledRequestId } = await saveVisitSchedule(input, ctx.user.id);

        broadcastBookingUpdate();

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_VISIT_SCHEDULE_REQUEST",
          "visit_schedule_requests",
          id,
          {
            visitDate: input.visitDate,
            service: input.service,
            patientId: input.patientId,
            cancelledRequestId,
            moveToCheckedIn: input.moveToCheckedIn,
          },
        );

        return { id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[createVisitScheduleRequest]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save appointment request",
        });
      }
    }),

  getVisitScheduleRequests: protectedProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        branch: z.enum(["tanta", "kfs"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getVisitScheduleRequestsByDate(input.date, input.branch);
    }),

  removeVisitScheduleRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const permissions = await db.getEffectiveUserPermissions(
        ctx.user.id,
        ctx.user.role,
      );
      const role = String(ctx.user.role ?? "").toLowerCase();
      const canRemoveBooking =
        permissions.includes("/today") ||
        permissions.includes("/patients") ||
        ["admin", "manager", "reception"].includes(role);
      if (!canRemoveBooking) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove booking requests.",
        });
      }

      const request = await db.getVisitScheduleRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking request not found",
        });
      }

      await db.deleteVisitScheduleRequest(input.requestId);
      await db.logAuditEvent(
        ctx.user.id,
        "REMOVE_VISIT_SCHEDULE_REQUEST",
        "visit_schedule_requests",
        input.requestId,
        {
          fullName: request.fullName,
          visitDate: request.visitDate,
          service: request.service,
        },
      );

      return { success: true };
    }),
});

export type PatientRouter = typeof patientRouter;
