import { and, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import { patients, surgeries, visits } from "../../drizzle/schema";
type Transaction = Parameters<Parameters<MySql2Database["transaction"]>[0]>[0];
export type ClinicalOperationInput = {
  patientId: number;
  visitId?: number;
  surgeryId?: number;
  surgeryType?: string | null;
  surgeryDate?: Date | string | null;
  eye?: string | null;
  surgeon?: string | null;
  notes?: string | null;
  sourceRef?: string;
  status?: "scheduled" | "completed" | "cancelled";
};
export async function persistClinicalOperation(
  tx: Transaction,
  input: ClinicalOperationInput,
) {
  const [patient] = await tx
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .for("update");
  if (!patient)
    throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
  if (input.visitId) {
    const [visit] = await tx
      .select({ id: visits.id })
      .from(visits)
      .where(
        and(
          eq(visits.id, input.visitId),
          eq(visits.patientId, input.patientId),
        ),
      );
    if (!visit)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Operation visit does not belong to this patient",
      });
  }
  const candidates = input.surgeryId
    ? await tx
        .select()
        .from(surgeries)
        .where(
          and(
            eq(surgeries.id, input.surgeryId),
            eq(surgeries.patientId, input.patientId),
          ),
        )
    : input.sourceRef
      ? await tx
          .select()
          .from(surgeries)
          .where(
            and(
              eq(surgeries.sourceRef, input.sourceRef),
              eq(surgeries.patientId, input.patientId),
            ),
          )
      : input.visitId
        ? await tx
            .select()
            .from(surgeries)
            .where(
              and(
                eq(surgeries.visitId, input.visitId),
                eq(surgeries.patientId, input.patientId),
              ),
            )
            .orderBy(desc(surgeries.id))
        : [];
  if (input.surgeryId && !candidates.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Operation does not belong to this patient",
    });
  if (candidates.length > 1)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Select the operation explicitly; this visit has multiple operations",
    });
  const { surgeryId, ...patch } = input;
  const record: Partial<typeof surgeries.$inferInsert> = {
    ...patch,
    surgeryDate: undefined,
  };
  if (input.surgeryDate !== undefined) {
    record.surgeryDate = input.surgeryDate
      ? input.surgeryDate instanceof Date
        ? input.surgeryDate
        : new Date(
            /^\d{4}-\d{2}-\d{2}$/.test(input.surgeryDate)
              ? `${input.surgeryDate}T12:00:00`
              : input.surgeryDate,
          )
      : null;
    if (record.surgeryDate && Number.isNaN(record.surgeryDate.getTime()))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid operation date",
      });
  }
  if (candidates[0]) {
    await tx
      .update(surgeries)
      .set(record)
      .where(eq(surgeries.id, candidates[0].id));
    return { id: candidates[0].id };
  }
  if (!String(input.surgeryType ?? "").trim())
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Operation type is required",
    });
  const [created] = await tx
    .insert(surgeries)
    .values({
      ...record,
      patientId: input.patientId,
      surgeryDate: record.surgeryDate ?? null,
      status: input.status ?? "scheduled",
    });
  return { id: created.insertId };
}
