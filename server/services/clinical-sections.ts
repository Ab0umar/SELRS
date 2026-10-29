import { and, eq, inArray, or } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import {
  visitComplaints,
  visitSymptoms,
  visitDiagnoses,
  visitDiagnosisCodes,
  visitTreatmentPlans,
  visitDecisions,
  visitMedicalHistory,
  visitSymptomCodes,
} from "../../drizzle/clinical";
import { visits, diseases, symptomCatalog } from "../../drizzle/schema";

type Transaction = Parameters<Parameters<MySql2Database["transaction"]>[0]>[0];
export type ClinicalVisitPatch = {
  complaint?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  decision?: string | null;
  history?: string | null;
  followUpDate?: Date | null;
  diseaseIds?: number[];
  diseaseLabels?: string[];
  symptomIds?: string[];
};
const sections = [
  { key: "complaint", table: visitComplaints, column: "complaint" },
  { key: "symptoms", table: visitSymptoms, column: "symptoms" },
  { key: "diagnosis", table: visitDiagnoses, column: "diagnosis" },
  { key: "treatment", table: visitTreatmentPlans, column: "treatment" },
  { key: "decision", table: visitDecisions, column: "decision" },
  { key: "history", table: visitMedicalHistory, column: "history" },
] as const;

export async function persistVisitSections(
  tx: Transaction,
  identity: { patientId: number; visitId: number; doctorId?: number },
  patch: ClinicalVisitPatch,
) {
  const [visit] = await tx
    .select({ id: visits.id })
    .from(visits)
    .where(
      and(
        eq(visits.id, identity.visitId),
        eq(visits.patientId, identity.patientId),
      ),
    )
    .for("update");
  if (!visit)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected visit does not belong to this patient",
    });
  for (const section of sections) {
    if (
      !Object.hasOwn(patch, section.key) &&
      !(section.key === "decision" && Object.hasOwn(patch, "followUpDate"))
    )
      continue;
    const fields: Record<string, unknown> = {};
    if (Object.hasOwn(patch, section.key))
      fields[section.column] = String(patch[section.key] ?? "");
    if (section.key === "decision" && Object.hasOwn(patch, "followUpDate"))
      fields.followUpDate = patch.followUpDate;
    const [existing] = await tx
      .select({ id: section.table.id })
      .from(section.table)
      .where(eq(section.table.visitId, identity.visitId))
      .limit(1);
    if (existing)
      await tx
        .update(section.table)
        .set(fields)
        .where(eq(section.table.id, existing.id));
    else await tx.insert(section.table).values({ ...identity, ...fields });
  }
  if (patch.diseaseIds !== undefined || patch.diseaseLabels !== undefined) {
    const [marker] = await tx
      .select({ id: visitDiagnoses.id })
      .from(visitDiagnoses)
      .where(eq(visitDiagnoses.visitId, identity.visitId))
      .limit(1);
    if (!marker)
      await tx.insert(visitDiagnoses).values({ ...identity, diagnosis: null });
    const resolved: number[] = [];
    for (const label of patch.diseaseLabels ?? []) {
      const matches = await tx
        .select({
          id: diseases.id,
          name: diseases.name,
          abbrev: diseases.abbrev,
        })
        .from(diseases)
        .where(or(eq(diseases.name, label), eq(diseases.abbrev, label)));
      const exact = matches.filter(
        (row) => row.name === label || row.abbrev === label,
      );
      if (exact.length !== 1)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Select the diagnosis explicitly from the catalog; its name is missing or ambiguous",
        });
      resolved.push(exact[0].id);
    }
    const ids = [...new Set([...(patch.diseaseIds ?? []), ...resolved])];
    if (ids.length) {
      const valid = await tx
        .select({ id: diseases.id })
        .from(diseases)
        .where(inArray(diseases.id, ids));
      if (valid.length !== ids.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A selected diagnosis code no longer exists",
        });
    }
    await tx
      .delete(visitDiagnosisCodes)
      .where(eq(visitDiagnosisCodes.visitId, identity.visitId));
    if (ids.length)
      await tx
        .insert(visitDiagnosisCodes)
        .values(ids.map((diseaseId) => ({ ...identity, diseaseId })));
  }
  if (patch.symptomIds !== undefined) {
    const [marker] = await tx
      .select({ id: visitSymptoms.id })
      .from(visitSymptoms)
      .where(eq(visitSymptoms.visitId, identity.visitId))
      .limit(1);
    if (!marker)
      await tx.insert(visitSymptoms).values({ ...identity, symptoms: null });
    const ids = [...new Set(patch.symptomIds)];
    if (ids.length) {
      const valid = await tx
        .select({ id: symptomCatalog.id })
        .from(symptomCatalog)
        .where(inArray(symptomCatalog.id, ids));
      if (valid.length !== ids.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A selected symptom no longer exists",
        });
    }
    await tx
      .delete(visitSymptomCodes)
      .where(eq(visitSymptomCodes.visitId, identity.visitId));
    if (ids.length)
      await tx
        .insert(visitSymptomCodes)
        .values(ids.map((symptomId) => ({ ...identity, symptomId })));
  }
}

export async function readVisitSections(
  connection: MySql2Database,
  visitIds: number[],
) {
  const ids = [...new Set(visitIds)];
  const summaries = new Map<number, Record<string, unknown>>();
  if (!ids.length) return summaries;
  for (const id of ids) summaries.set(id, {});
  const add = (id: number, key: string, value: unknown) => {
    if (!summaries.has(id)) summaries.set(id, {});
    summaries.get(id)![key] = value;
  };
  for (const section of sections) {
    const rows = await connection
      .select()
      .from(section.table)
      .where(inArray(section.table.visitId, ids));
    for (const row of rows) {
      add(
        row.visitId,
        section.key,
        (row as Record<string, unknown>)[section.column] ?? "",
      );
      if (section.key === "decision")
        add(
          row.visitId,
          "followUpDate",
          (row as Record<string, unknown>).followUpDate ?? null,
        );
    }
  }
  const codes = await connection
    .select()
    .from(visitDiagnosisCodes)
    .where(inArray(visitDiagnosisCodes.visitId, ids));
  for (const id of ids)
    if (summaries.has(id))
      add(
        id,
        "diseaseIds",
        codes.filter((row) => row.visitId === id).map((row) => row.diseaseId),
      );
  const symptoms = await connection
    .select()
    .from(visitSymptomCodes)
    .where(inArray(visitSymptomCodes.visitId, ids));
  for (const id of ids)
    add(
      id,
      "symptomIds",
      symptoms.filter((row) => row.visitId === id).map((row) => row.symptomId),
    );
  return summaries;
}
