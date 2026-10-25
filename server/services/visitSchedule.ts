import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { patients, visits, visitScheduleRequests } from "../../drizzle/schema";
import { cairoDateIso, visitScheduleSchema } from "../../shared/visitSchedule";
import type { z } from "zod";
import type { MySql2Database } from "drizzle-orm/mysql2";

export async function saveVisitSchedule(
  input: z.infer<typeof visitScheduleSchema>,
  userId: number,
) {
  const database: MySql2Database | null = await getDb();
  if (!database)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return database.transaction(async (tx) => {
    const patient = input.patientId
      ? (
          await tx
            .select()
            .from(patients)
            .where(eq(patients.id, input.patientId))
            .for("update")
        )[0]
      : undefined;
    if (input.patientId && !patient)
      throw new TRPCError({ code: "NOT_FOUND", message: "المريض غير موجود" });
    let cancelledRequestId: number | null = null;
    if (input.cancelPreviousAppointment && patient) {
      const [previous] = await tx
        .select({ id: visitScheduleRequests.id })
        .from(visitScheduleRequests)
        .where(
          and(
            eq(visitScheduleRequests.patientId, patient.id),
            eq(visitScheduleRequests.status, "scheduled"),
            sql`${visitScheduleRequests.visitDate} >= ${cairoDateIso()}`,
          ),
        )
        .orderBy(desc(visitScheduleRequests.id))
        .limit(1)
        .for("update");
      if (previous) {
        await tx
          .update(visitScheduleRequests)
          .set({ status: "cancelled" })
          .where(eq(visitScheduleRequests.id, previous.id));
        cancelledRequestId = previous.id;
      }
    }
    if (input.moveToCheckedIn && patient) {
      const [existing] = await tx
        .select({ id: visits.id })
        .from(visits)
        .where(
          and(
            eq(visits.patientId, patient.id),
            sql`DATE(${visits.visitDate}) = ${input.visitDate}`,
          ),
        )
        .orderBy(desc(visits.id))
        .limit(1)
        .for("update");
      const visitType =
        input.service === "followup"
          ? "followup"
          : input.service === "surgery"
            ? "surgery"
            : "examination";
      const state = {
        queueStatus: "checkedIn" as const,
        checkedInAt: new Date(),
        treatedAt: null,
        visitType,
      } as const;
      if (existing)
        await tx.update(visits).set(state).where(eq(visits.id, existing.id));
      else
        await tx
          .insert(visits)
          .values({
            ...state,
            patientId: patient.id,
            visitDate: new Date(`${input.visitDate}T12:00:00+02:00`),
            branch: input.service === "surgery" ? "surgery" : "examinations",
          });
    }
    const [result] = await tx.insert(visitScheduleRequests).values({
      fullName: patient?.fullName ?? input.fullName,
      age: patient?.age ?? input.age ?? null,
      phone: patient?.phone ?? input.phone ?? null,
      patientId: patient?.id ?? null,
      visitDate: new Date(`${input.visitDate}T12:00:00+02:00`),
      service: input.service,
      patientType: input.patientType,
      branch: null,
      status: input.moveToCheckedIn ? "registered" : "scheduled",
      createdByUserId: userId,
    });
    return { id: result.insertId, cancelledRequestId };
  });
}
