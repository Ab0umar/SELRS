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
  patients,
  tests,
} from "../../drizzle/schema";
import {
  clinicalDate,
  selectClinicalVisit,
} from "../../shared/clinical-record";
import { cairoDateIso } from "../../shared/visitSchedule";
import { persistVisitSections } from "./clinical-sections";
import type { InvestigationInput } from "../../shared/clinical-catalog-items";

type Transaction = Parameters<Parameters<MySql2Database["transaction"]>[0]>[0];

async function validateTests(
  transaction: Transaction,
  items: InvestigationInput[],
) {
  for (const item of items) {
    if (item.testId != null) {
      if (!Number.isSafeInteger(item.testId) || item.testId <= 0)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid test catalog ID",
        });
    } else if (
      item.catalogConfirmed !== true ||
      !item.testName?.trim() ||
      item.testName.trim().length > 255
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Confirm the uncatalogued investigation name before saving",
      });
    }
  }
  const ids = [
    ...new Set(
      items.flatMap((item) => (item.testId == null ? [] : [item.testId])),
    ),
  ];
  const existing = ids.length
    ? await transaction
        .select({ id: tests.id, name: tests.name, type: tests.type })
        .from(tests)
        .where(inArray(tests.id, ids))
    : [];
  if (existing.length !== ids.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A selected test no longer exists in the catalog",
    });
  return items.map((item) => {
    const selected = existing.find((row) => row.id === item.testId);
    return {
      ...item,
      testId: selected?.id ?? null,
      testName: selected?.name ?? item.testName!.trim(),
      testType: selected?.type ?? item.testType ?? ("other" as const),
    };
  });
}

function preservedNote(
  submitted: string | undefined,
  stored: Array<string | null | undefined>,
): string | undefined {
  if (submitted !== undefined) return submitted;
  const values = [...new Set(stored.map((value) => value ?? ""))];
  if (values.length > 1)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Existing instructions differ; review and provide the intended instructions explicitly",
    });
  return values[0] || undefined;
}

async function resolveRecordVisit(
  tx: Transaction,
  input: { patientId: number; visitId?: number; date?: string },
) {
  const [patient] = await tx
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .for("update");
  if (!patient)
    throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
  const date = parseRecordDate(input.date ?? cairoDateIso());
  const rows = await tx
    .select()
    .from(visits)
    .where(eq(visits.patientId, input.patientId));
  let selected;
  try {
    selected = selectClinicalVisit(
      rows,
      input.patientId,
      input.visitId,
      clinicalDate(date),
    );
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: (error as Error).message,
    });
  }
  if (selected) return selected.id;
  const [visit] = await tx.insert(visits).values({
    patientId: input.patientId,
    visitDate: date,
    visitType: "examination",
    branch: "examinations",
  });
  return visit.insertId;
}

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
  diagnosis?: string;
  items: Array<{
    medicationId?: number;
    medicationName: string;
    catalogConfirmed?: true;
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
    if (
      item.medicationId != null &&
      item.medicationId !== 0 &&
      (!Number.isSafeInteger(item.medicationId) || item.medicationId < 0)
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid medication catalog ID",
      });
    let medicationId = item.medicationId;
    let medicationName = item.medicationName.trim();
    if (medicationId && medicationId > 0) {
      const [existing] = await transaction
        .select({ id: medications.id, name: medications.name })
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
      medicationName = existing.name;
    } else if (item.catalogConfirmed === true) {
      if (!medicationName || medicationName.length > 255)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Review the uncatalogued medication name",
        });
      medicationId = undefined;
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
    if (!medicationId && item.catalogConfirmed !== true)
      throw new Error("Failed to resolve prescription medication");
    await transaction.insert(prescriptionItems).values({
      prescriptionId,
      medicationId: medicationId ?? null,
      medicationName,
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
    const visitId = await resolveRecordVisit(transaction, input);
    if (input.diagnosis !== undefined)
      await persistVisitSections(
        transaction,
        { patientId: input.patientId, visitId, doctorId: input.doctorId },
        { diagnosis: input.diagnosis },
      );
    return insertPrescription(transaction, { ...input, visitId });
  });
}

export async function saveTestRequest(
  connection: MySql2Database,
  input: {
    patientId: number;
    visitId?: number;
    date?: string;
    notes?: string;
    diagnosis?: string;
    items: InvestigationInput[];
  },
) {
  return connection.transaction(async (tx) => {
    const items = await validateTests(tx, input.items);
    const visitId = await resolveRecordVisit(tx, input);
    if (input.diagnosis !== undefined)
      await persistVisitSections(
        tx,
        { patientId: input.patientId, visitId },
        { diagnosis: input.diagnosis },
      );
    const [header] = await tx.insert(testRequests).values({
      patientId: input.patientId,
      visitId,
      requestDate: parseRecordDate(input.date),
      notes: input.notes,
      status: "pending",
    });
    if (input.items.length)
      await tx.insert(testRequestItems).values(
        items.map((item) => ({
          testRequestId: header.insertId,
          testId: item.testId,
          testName: item.testName,
          testType: item.testType,
          result: item.notes,
        })),
      );
    return { id: header.insertId, visitId };
  });
}

export async function replaceVisitPrescription(
  connection: MySql2Database,
  input: PrescriptionInput & { visitId: number },
) {
  return connection.transaction((transaction) =>
    persistVisitPrescription(transaction, input),
  );
}

export async function replaceVisitTestRequests(
  connection: MySql2Database,
  input: {
    patientId: number;
    visitId: number;
    date?: string;
    notes?: string;
    diagnosis?: string;
    items: InvestigationInput[];
  },
) {
  return connection.transaction((transaction) =>
    persistVisitTestRequests(transaction, input),
  );
}

export async function persistVisitPrescription(
  transaction: Transaction,
  input: Parameters<typeof replaceVisitPrescription>[1],
) {
  await lockPatientVisit(transaction, input.patientId, input.visitId);
  if (input.diagnosis !== undefined)
    await persistVisitSections(
      transaction,
      {
        patientId: input.patientId,
        visitId: input.visitId,
        doctorId: input.doctorId,
      },
      { diagnosis: input.diagnosis },
    );
  const previous = await transaction
    .select({ id: prescriptions.id, notes: prescriptions.notes })
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.visitId, input.visitId),
        eq(prescriptions.patientId, input.patientId),
      ),
    );
  const previousIds = previous.map((prescription) => prescription.id);
  const stored = previousIds.length
    ? await transaction
        .select()
        .from(prescriptionItems)
        .where(inArray(prescriptionItems.prescriptionId, previousIds))
    : [];
  const items = input.items.map((item) => {
    const matches = stored.filter((record) =>
      item.medicationId != null
        ? record.medicationId === item.medicationId
        : record.medicationId == null &&
          record.medicationName?.trim().toLowerCase() ===
            item.medicationName.trim().toLowerCase(),
    );
    const next = { ...item };
    for (const key of [
      "dosage",
      "frequency",
      "duration",
      "instructions",
    ] as const)
      next[key] = preservedNote(
        item[key],
        matches.map((record) => record[key]),
      );
    return next;
  });
  if (items.length > 0)
    await insertPrescription(transaction, {
      ...input,
      items,
      notes: preservedNote(
        input.notes,
        previous.map((record) => record.notes),
      ),
    });
  if (previousIds.length > 0) {
    await transaction
      .delete(prescriptionItems)
      .where(inArray(prescriptionItems.prescriptionId, previousIds));
    await transaction
      .delete(prescriptions)
      .where(inArray(prescriptions.id, previousIds));
  }
}

export async function persistVisitTestRequests(
  transaction: Transaction,
  input: Parameters<typeof replaceVisitTestRequests>[1],
) {
  const items = await validateTests(transaction, input.items);
  await lockPatientVisit(transaction, input.patientId, input.visitId);
  if (input.diagnosis !== undefined)
    await persistVisitSections(
      transaction,
      { patientId: input.patientId, visitId: input.visitId },
      { diagnosis: input.diagnosis },
    );
  const previous = await transaction
    .select({ id: testRequests.id, notes: testRequests.notes })
    .from(testRequests)
    .where(
      and(
        eq(testRequests.visitId, input.visitId),
        eq(testRequests.patientId, input.patientId),
      ),
    );
  const previousIds = previous.map((request) => request.id);
  const stored = previousIds.length
    ? await transaction
        .select()
        .from(testRequestItems)
        .where(inArray(testRequestItems.testRequestId, previousIds))
    : [];
  if (input.items.length > 0) {
    const [header] = await transaction.insert(testRequests).values({
      patientId: input.patientId,
      visitId: input.visitId,
      requestDate: parseRecordDate(input.date),
      notes: preservedNote(
        input.notes,
        previous.map((record) => record.notes),
      ),
      status: "pending",
    });
    if (!header.insertId) throw new Error("Failed to create test request");
    await transaction.insert(testRequestItems).values(
      items.map((item) => ({
        testRequestId: header.insertId,
        testId: item.testId,
        testName: item.testName,
        testType: item.testType,
        result: preservedNote(
          item.notes,
          stored
            .filter((record) =>
              item.testId != null
                ? record.testId === item.testId
                : record.testId == null &&
                  record.testName?.trim().toLowerCase() ===
                    item.testName.trim().toLowerCase(),
            )
            .map((record) => record.result),
        ),
      })),
    );
  }
  if (previousIds.length > 0) {
    await transaction
      .delete(testRequestItems)
      .where(inArray(testRequestItems.testRequestId, previousIds));
    await transaction
      .delete(testRequests)
      .where(inArray(testRequests.id, previousIds));
  }
}
