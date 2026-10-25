import { and, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import {
  medications,
  prescriptionItems,
  prescriptions,
  testRequestItems,
  testRequests,
  visits,
} from "../../drizzle/schema";

type Transaction = Parameters<Parameters<MySql2Database["transaction"]>[0]>[0];

function parseRecordDate(input?: string) {
  const text = input?.trim();
  const date = text
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text)
    : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid record date",
    });
  }
  return date;
}

export type PrescriptionInput = {
  patientId: number;
  visitId?: number;
  doctorId?: number;
  date?: string;
  notes?: string;
  items: Array<{
    medicationId?: number;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
};

async function lockPatientVisit(
  transaction: Transaction,
  patientId: number,
  visitId: number,
) {
  const [visit] = await transaction
    .select({ id: visits.id })
    .from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.patientId, patientId)))
    .for("update");
  if (!visit)
    throw new Error("The selected visit does not belong to this patient");
}

async function insertPrescription(
  transaction: Transaction,
  input: PrescriptionInput,
) {
  const validItems = input.items.filter(
    (item) => (item.medicationId ?? 0) > 0 || item.medicationName.trim(),
  );
  if (validItems.length === 0)
    throw new Error("Cannot create prescription without items");
  const [header] = await transaction.insert(prescriptions).values({
    patientId: input.patientId,
    visitId: input.visitId ?? null,
    doctorId: input.doctorId ?? null,
    notes: input.notes ?? null,
    prescriptionDate: parseRecordDate(input.date),
  });
  const prescriptionId = header.insertId;
  if (!prescriptionId) throw new Error("Failed to create prescription");

  for (const item of validItems) {
    let medicationId = item.medicationId;
    if (medicationId && medicationId > 0) {
      const [existing] = await transaction
        .select({ id: medications.id })
        .from(medications)
        .where(eq(medications.id, medicationId))
        .for("update");
      if (!existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The selected medication no longer exists. Please select it again.",
        });
      }
    } else {
      const name = item.medicationName.trim();
      const [existing] = await transaction
        .select({ id: medications.id })
        .from(medications)
        .where(eq(medications.name, name))
        .limit(1);
      if (existing) medicationId = existing.id;
      else {
        const [medication] = await transaction
          .insert(medications)
          .values({ name, type: "other" });
        medicationId = medication.insertId;
      }
    }
    if (!medicationId)
      throw new Error("Failed to resolve prescription medication");
    await transaction.insert(prescriptionItems).values({
      prescriptionId,
      medicationId,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    });
  }
  return { insertId: prescriptionId, id: prescriptionId };
}

export async function savePrescription(
  connection: MySql2Database,
  input: PrescriptionInput,
) {
  return connection.transaction(async (transaction) => {
    if (input.visitId)
      await lockPatientVisit(transaction, input.patientId, input.visitId);
    return insertPrescription(transaction, input);
  });
}

export async function replaceVisitPrescription(
  connection: MySql2Database,
  input: PrescriptionInput & { visitId: number },
) {
  return connection.transaction(async (transaction) => {
    await lockPatientVisit(transaction, input.patientId, input.visitId);
    const previous = await transaction
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(eq(prescriptions.visitId, input.visitId));
    if (input.items.length > 0) await insertPrescription(transaction, input);
    const previousIds = previous.map((prescription) => prescription.id);
    if (previousIds.length > 0) {
      await transaction
        .delete(prescriptionItems)
        .where(inArray(prescriptionItems.prescriptionId, previousIds));
      await transaction
        .delete(prescriptions)
        .where(inArray(prescriptions.id, previousIds));
    }
  });
}

export async function replaceVisitTestRequests(
  connection: MySql2Database,
  input: {
    patientId: number;
    visitId: number;
    date?: string;
    notes?: string;
    items: Array<{ testId: number; notes?: string }>;
  },
) {
  return connection.transaction(async (transaction) => {
    await lockPatientVisit(transaction, input.patientId, input.visitId);
    const previous = await transaction
      .select({ id: testRequests.id })
      .from(testRequests)
      .where(eq(testRequests.visitId, input.visitId));
    if (input.items.length > 0) {
      const [header] = await transaction.insert(testRequests).values({
        patientId: input.patientId,
        visitId: input.visitId,
        requestDate: parseRecordDate(input.date),
        status: "pending",
      });
      if (!header.insertId) throw new Error("Failed to create test request");
      await transaction.insert(testRequestItems).values(
        input.items.map((item) => ({
          testRequestId: header.insertId,
          testId: item.testId,
          result: item.notes,
        })),
      );
    }
    const previousIds = previous.map((request) => request.id);
    if (previousIds.length > 0) {
      await transaction
        .delete(testRequestItems)
        .where(inArray(testRequestItems.testRequestId, previousIds));
      await transaction
        .delete(testRequests)
        .where(inArray(testRequests.id, previousIds));
    }
  });
}
