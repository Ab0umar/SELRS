import { and, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import {
  afterRefractionData,
  autorefractometryData,
  examinations,
  glassesRecords,
  doctorReports,
  medicalHistoryChecklist,
  patients,
  pentacamResults,
  sheetEntries,
  visits,
  examinationChecklistItems,
} from "../../drizzle/schema";
import {
  clinicalDate,
  selectClinicalVisit,
  fundusRecord,
} from "../../shared/clinical-record";
import { cairoDateIso } from "../../shared/visitSchedule";
import {
  examinationFieldPatch,
  clinicalObject,
  fundusFields,
  procedurePlanFields,
} from "../../shared/examination-fields";
import {
  examinationFindings,
  examinationProcedurePlans,
  fundusFindings,
  airPuffMeasurements,
} from "../../drizzle/clinical";
import {
  persistVisitSections,
  type ClinicalVisitPatch,
} from "./clinical-sections";
import { persistClinicalOperation } from "./clinical-operations";
import { reportSectionPatch } from "./report-sections";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
const text = (value: unknown) => (value === null ? null : String(value ?? ""));
type ClinicalTransaction = Parameters<
  Parameters<MySql2Database["transaction"]>[0]
>[0];

async function saveMeasurement(
  tx: ClinicalTransaction,
  table:
    | typeof autorefractometryData
    | typeof afterRefractionData
    | typeof glassesRecords,
  identity: { patientId: number; examinationId: number },
  measurements: Record<string, string | null>,
) {
  if (!Object.keys(measurements).length) return;
  const [existing] = await tx
    .select({ id: table.id })
    .from(table)
    .where(eq(table.examinationId, identity.examinationId))
    .orderBy(desc(table.id))
    .limit(1);
  if (existing)
    await tx.update(table).set(measurements).where(eq(table.id, existing.id));
  else await tx.insert(table).values({ ...measurements, ...identity });
}

export type ClinicalSheetInput = {
  patientId: number;
  visitId?: number;
  sheetType: string;
  content: string;
};
export async function saveClinicalSheet(
  connection: MySql2Database,
  input: ClinicalSheetInput,
  doctorId: number,
  role = "doctor",
) {
  return connection.transaction((tx) =>
    persistClinicalSheet(tx, input, { doctorId, role }),
  );
}

export async function persistClinicalSheet(
  tx: ClinicalTransaction,
  input: ClinicalSheetInput,
  actor: { doctorId: number; role: string },
) {
  const { doctorId, role } = actor;
  let content: JsonObject;
  try {
    const parsed: unknown = JSON.parse(input.content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new SyntaxError("Sheet content must be an object");
    content = object(parsed);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid sheet JSON" });
  }
  const [patient] = await tx
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .for("update");
  if (!patient)
    throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
  const form = object(content.formData);
  const rows = await tx
    .select()
    .from(visits)
    .where(eq(visits.patientId, input.patientId));
  const requestedId = input.visitId ?? (Number(content.visitId) || undefined);
  let visit: { id: number; patientId: number; visitDate: Date } | undefined;
  try {
    visit = selectClinicalVisit(
      rows,
      input.patientId,
      requestedId,
      clinicalDate(form.examinationDate || form.visitDate || cairoDateIso()),
    );
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: (error as Error).message,
    });
  }
  if (!visit) {
    const date = clinicalDate(
      form.examinationDate || form.visitDate || cairoDateIso(),
    );
    const parsedDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime()))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid visit date",
      });
    const [created] = await tx.insert(visits).values({
      patientId: input.patientId,
      visitDate: parsedDate,
      visitType: "examination",
      branch: "examinations",
    });
    visit = {
      id: created.insertId,
      patientId: input.patientId,
      visitDate: parsedDate,
    };
  }
  const visitId = visit.id;
  content.visitId = visitId;
  const operation = clinicalObject(content.operationDetails);
  if (String(operation.type ?? "").trim()) {
    const eyes = clinicalObject(operation.eyes);
    const saved = await persistClinicalOperation(tx, {
      patientId: input.patientId,
      visitId,
      surgeryId: Number(operation.surgeryId) || undefined,
      surgeryType: String(operation.type),
      surgeryDate: operation.date ? String(operation.date) : undefined,
      eye:
        eyes.both || (eyes.right && eyes.left)
          ? "OU"
          : eyes.right
            ? "OD"
            : eyes.left
              ? "OS"
              : undefined,
    });
    content.operationDetails = { surgeryId: saved.id };
  }
  const [existingExam] = await tx
    .select()
    .from(examinations)
    .where(
      and(
        eq(examinations.visitId, visitId),
        eq(examinations.patientId, input.patientId),
      ),
    )
    .orderBy(desc(examinations.id))
    .limit(1);
  let examinationId = existingExam?.id;
  if (!examinationId) {
    const [created] = await tx
      .insert(examinations)
      .values({ patientId: input.patientId, visitId });
    examinationId = created.insertId;
  }
  const fundus = object(content.fundus);
  const checklist = object(content.medicalChecklist);
  const checklistValues: Record<string, boolean | null> = {};
  for (const key of [
    "generalDiseases",
    "pregnancyOrLactation",
    "usesAllergySupplementsSteroidsOrPressureMeds",
    "acneTreatment",
    "familyKeratoconus",
    "usesTearSubstituteOrExcessTearsOrSandySensation",
    "symptomsWorseWithAirOrAC",
    "glaucomaTreatment",
  ]) {
    if (!Object.hasOwn(checklist, key)) continue;
    if (typeof checklist[key] !== "boolean" && checklist[key] !== null)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid examination checklist value",
      });
    checklistValues[key] = checklist[key] as boolean | null;
  }
  if (Object.keys(checklistValues).length) {
    const [existing] = await tx
      .select({ id: examinationChecklistItems.id })
      .from(examinationChecklistItems)
      .where(eq(examinationChecklistItems.examinationId, examinationId))
      .orderBy(desc(examinationChecklistItems.id))
      .limit(1);
    if (existing)
      await tx
        .update(examinationChecklistItems)
        .set(checklistValues)
        .where(eq(examinationChecklistItems.id, existing.id));
    else
      await tx
        .insert(examinationChecklistItems)
        .values({
          patientId: input.patientId,
          examinationId,
          ...checklistValues,
        });
  }
  const flatPatch = examinationFieldPatch(content, input.sheetType);
  const findingsPatch: Record<string, unknown> = {};
  if (Object.hasOwn(content, "examinationNotes"))
    findingsPatch.investigationNotes = String(content.examinationNotes ?? "");
  for (const [key, value] of Object.entries(
    clinicalObject(content.followupFindings),
  ))
    if (["flapEdgesOD", "flapEdgesOS", "flapBedOD", "flapBedOS"].includes(key))
      findingsPatch[key] = String(value ?? "");
  for (const [key, value] of Object.entries(flatPatch))
    if (key in examinationFindings) findingsPatch[key] = value;
  if (Object.keys(findingsPatch).length) {
    const [existing] = await tx
      .select({ id: examinationFindings.id })
      .from(examinationFindings)
      .where(eq(examinationFindings.examinationId, examinationId))
      .limit(1);
    if (existing)
      await tx
        .update(examinationFindings)
        .set(findingsPatch)
        .where(eq(examinationFindings.id, existing.id));
    else
      await tx.insert(examinationFindings).values({
        patientId: input.patientId,
        visitId,
        examinationId,
        ...findingsPatch,
      });
  }
  for (const eye of ["OD", "OS"] as const) {
    const plan = clinicalObject(clinicalObject(content.treatmentPlan)[eye]);
    if (Object.keys(plan).length) {
      const patch: Record<string, string> = {};
      for (const key of Object.keys(procedurePlanFields))
        if (Object.hasOwn(plan, key)) patch[key] = String(plan[key] ?? "");
      const [existing] = await tx
        .select({ id: examinationProcedurePlans.id })
        .from(examinationProcedurePlans)
        .where(
          and(
            eq(examinationProcedurePlans.examinationId, examinationId),
            eq(examinationProcedurePlans.eye, eye),
          ),
        )
        .limit(1);
      if (existing)
        await tx
          .update(examinationProcedurePlans)
          .set(patch)
          .where(eq(examinationProcedurePlans.id, existing.id));
      else
        await tx.insert(examinationProcedurePlans).values({
          patientId: input.patientId,
          visitId,
          examinationId,
          eye,
          ...patch,
        });
    }
    const fields: Record<string, string> = {};
    const eyeFundus = fundus[eye.toLowerCase()];
    if (typeof eyeFundus === "string" || eyeFundus === null)
      fields.otherFindings = String(eyeFundus ?? "");
    else
      for (const key of fundusFields)
        if (Object.hasOwn(clinicalObject(eyeFundus), key))
          fields[key] = String(clinicalObject(eyeFundus)[key] ?? "");
    if (Object.keys(fields).length) {
      const [existing] = await tx
        .select({ id: fundusFindings.id })
        .from(fundusFindings)
        .where(
          and(
            eq(fundusFindings.examinationId, examinationId),
            eq(fundusFindings.eye, eye),
          ),
        )
        .limit(1);
      if (existing)
        await tx
          .update(fundusFindings)
          .set(fields)
          .where(eq(fundusFindings.id, existing.id));
      else
        await tx.insert(fundusFindings).values({
          patientId: input.patientId,
          visitId,
          examinationId,
          eye,
          ...fields,
        });
    }
  }
  const report: Partial<typeof doctorReports.$inferInsert> = {};
  const history = object(content.medicalHistory);
  const historyPatch: Partial<typeof medicalHistoryChecklist.$inferInsert> = {};
  if (Object.hasOwn(content, "diabetesDuration"))
    historyPatch.diabetesDuration = String(content.diabetesDuration ?? "");
  if (Object.hasOwn(content, "medicalHistoryOther"))
    historyPatch.otherHistory = String(content.medicalHistoryOther ?? "");
  for (const [label, key] of Object.entries({
    "سكر؟": "diabetes",
    "ضغط؟": "hypertension",
    "الغدة الدرقية؟": "thyroid",
    "أمراض مناعة؟": "autoimmune",
    "ماء زرقاء؟": "glaucoma",
    "قرنية مخروطية بالعائلة؟": "familyKeratoconus",
  }) as Array<
    [
      string,
      (
        | "diabetes"
        | "hypertension"
        | "thyroid"
        | "autoimmune"
        | "glaucoma"
        | "familyKeratoconus"
      ),
    ]
  >) {
    if (history[label] === "yes" || history[label] === "no")
      historyPatch[key] = history[label] === "yes";
  }
  if (Object.keys(historyPatch).length) {
    const [existing] = await tx
      .select({ id: medicalHistoryChecklist.id })
      .from(medicalHistoryChecklist)
      .where(eq(medicalHistoryChecklist.patientId, input.patientId))
      .limit(1);
    if (existing)
      await tx
        .update(medicalHistoryChecklist)
        .set(historyPatch)
        .where(eq(medicalHistoryChecklist.id, existing.id));
    else
      await tx
        .insert(medicalHistoryChecklist)
        .values({ ...historyPatch, patientId: input.patientId });
    delete content.medicalHistory;
  }
  const assign = (
    key: "diagnosis" | "treatment" | "recommendations",
    source: JsonObject,
    sourceKey: string,
  ) => {
    if (
      Object.hasOwn(source, sourceKey) &&
      (typeof source[sourceKey] === "string" || source[sourceKey] === null)
    )
      report[key] = text(source[sourceKey]);
  };
  assign("diagnosis", form, "diagnosis");
  assign("diagnosis", content, "diagnosisText");
  assign("treatment", form, "treatmentPlan");
  assign("treatment", content, "treatmentPlan");
  assign("recommendations", form, "recommendations");
  assign("recommendations", content, "finalDecision");
  assign("recommendations", content, "finalDecisionText");
  if (input.sheetType === "specialist")
    assign("recommendations", content, "finalDecision");
  if (Object.hasOwn(content, "historyNotes"))
    report.additionalNotes = text(content.historyNotes);
  const consultant = object(content.consultantExam);
  const sections: ClinicalVisitPatch = {};
  if (Object.hasOwn(consultant, "complains"))
    sections.complaint = String(consultant.complains ?? "");
  if (Object.hasOwn(content, "symptoms"))
    sections.symptoms = String(content.symptoms ?? "");
  if (Array.isArray(content.symptomIds))
    sections.symptomIds = content.symptomIds.map(String);
  if (
    (Object.keys(report).length || Array.isArray(content.diseases)) &&
    ["doctor", "admin", "manager"].includes(role)
  ) {
    for (const [source, target] of Object.entries({
      diagnosis: "diagnosis",
      treatment: "treatment",
      recommendations: "decision",
      additionalNotes: "history",
    })) {
      if (Object.hasOwn(report, source))
        (sections as Record<string, unknown>)[target] = (
          report as Record<string, unknown>
        )[source];
    }
    if (Array.isArray(content.diseases))
      Object.assign(
        sections,
        reportSectionPatch({ diseases: content.diseases }),
      );
    const [existing] = await tx
      .select({ id: doctorReports.id })
      .from(doctorReports)
      .where(
        and(
          eq(doctorReports.visitId, visitId),
          eq(doctorReports.patientId, input.patientId),
        ),
      )
      .orderBy(desc(doctorReports.id))
      .limit(1);
    if (existing)
      await tx
        .update(doctorReports)
        .set({ doctorId })
        .where(eq(doctorReports.id, existing.id));
    else
      await tx
        .insert(doctorReports)
        .values({ patientId: input.patientId, visitId, doctorId });
  }
  if (Object.keys(sections).length)
    await persistVisitSections(
      tx,
      { patientId: input.patientId, visitId, doctorId },
      sections,
    );
  const examData = object(content.examData);
  const auto = object(examData.autorefraction);
  const autoValues: Record<string, string | null> = {};
  for (const eye of ["od", "os"] as const) {
    const values = object(auto[eye]);
    for (const [source, target] of Object.entries({
      s: "sphere",
      c: "cylinder",
      axis: "axis",
      ucva: "ucva",
    })) {
      if (Object.hasOwn(values, source))
        autoValues[`${target}${eye.toUpperCase()}`] = text(values[source]);
    }
    for (const number of [2, 3])
      for (const [source, target] of Object.entries({
        s: "sphere",
        c: "cylinder",
        a: "axis",
      }))
        if (Object.hasOwn(values, `${source}${number}`))
          autoValues[`${target}${number}${eye.toUpperCase()}`] = String(
            values[`${source}${number}`] ?? "",
          );
  }
  const identity = { patientId: input.patientId, examinationId };
  await saveMeasurement(tx, autorefractometryData, identity, autoValues);
  const airValues: Record<string, string | null> = {};
  for (const eye of ["od", "os"] as const) {
    const fields = object(auto[eye]);
    for (const [key, column] of Object.entries({
      iop: "iop",
      airPuff1: "iop",
      airPuff2: "iop2",
      airPuff3: "iop3",
    })) {
      if (
        Object.hasOwn(fields, key) &&
        !(key === "airPuff1" && Object.hasOwn(fields, "iop"))
      )
        airValues[`${column}${eye.toUpperCase()}`] = text(fields[key]);
    }
  }
  if (Object.keys(airValues).length) {
    const [existing] = await tx
      .select({ id: airPuffMeasurements.id })
      .from(airPuffMeasurements)
      .where(eq(airPuffMeasurements.examinationId, examinationId))
      .limit(1);
    if (existing)
      await tx
        .update(airPuffMeasurements)
        .set(airValues)
        .where(eq(airPuffMeasurements.id, existing.id));
    else
      await tx
        .insert(airPuffMeasurements)
        .values({ ...identity, visitId, ...airValues });
  }
  const afterValues: Record<string, string | null> = {};
  const glassValues: Record<string, string | null> = {};
  const glasses = object(examData.glasses);
  for (const eye of ["od", "os"] as const) {
    const autoEye = object(auto[eye]);
    const glassEye = object(
      glasses[eye] ?? form[eye === "od" ? "refractionOD" : "refractionOS"],
    );
    if (!Object.hasOwn(glassEye, "bcva") && Object.hasOwn(autoEye, "bcva"))
      glassValues[`bcva${eye.toUpperCase()}`] = text(autoEye.bcva);
    for (const [source, target] of Object.entries({
      afterS: "sphere",
      afterC: "cylinder",
      afterA: "axis",
    })) {
      if (Object.hasOwn(autoEye, source))
        afterValues[`${target}${eye.toUpperCase()}`] = text(autoEye[source]);
    }
    for (const [source, target] of Object.entries({
      s: "s",
      c: "c",
      a: "axis",
      axis: "axis",
      pd: "pd",
      add: "add",
      bcva: "bcva",
    })) {
      if (Object.hasOwn(glassEye, source))
        glassValues[`${target}${eye.toUpperCase()}`] = text(glassEye[source]);
    }
  }
  await saveMeasurement(tx, afterRefractionData, identity, afterValues);
  await saveMeasurement(tx, glassesRecords, identity, glassValues);
  const penta = object(examData.pentacam);
  const pentaValues: Record<string, string | null> = {};
  for (const eye of ["od", "os"] as const) {
    const values = object(penta[eye]);
    for (const [source, target] of Object.entries({
      k1: "k1",
      k2: "k2",
      ax1: "axis",
      axis: "axis",
      ax2: "axis2",
      thinnest: "thinnestPoint",
      pachymetry: "pachymetry",
      apex: "apex",
      residual: "residual",
      ttt: "ttt",
      ablation: "ablation",
    })) {
      if (Object.hasOwn(values, source))
        pentaValues[`${target}${eye.toUpperCase()}`] =
          source === "ax2"
            ? String(values[source] ?? "")
            : text(values[source]);
    }
  }
  if (Object.keys(pentaValues).length) {
    const [existing] = await tx
      .select({ id: pentacamResults.id })
      .from(pentacamResults)
      .where(
        and(
          eq(pentacamResults.visitId, visitId),
          eq(pentacamResults.patientId, input.patientId),
        ),
      )
      .orderBy(desc(pentacamResults.id))
      .limit(1);
    if (existing)
      await tx
        .update(pentacamResults)
        .set(pentaValues)
        .where(eq(pentacamResults.id, existing.id));
    else
      await tx.insert(pentacamResults).values({
        ...pentaValues,
        patientId: input.patientId,
        visitId,
        recordedBy: doctorId,
      });
  }
  for (const key of [
    "diagnosisText",
    "finalDecisionText",
    "finalDecision",
    "historyNotes",
    "diseases",
    "consultantExam",
    "consultantDrawing",
    "consultantDrawingDescription",
    "readingValue",
    "officeNotes",
    "notes",
    "diabetesDuration",
    "medicalHistoryOther",
  ])
    delete content[key];
  delete content.treatmentPlan;
  for (const key of ["diagnosis", "treatmentPlan", "recommendations"])
    delete form[key];
  for (const eye of ["od", "os"]) {
    for (const key of [
      "s",
      "s1",
      "s2",
      "s3",
      "c",
      "c1",
      "c2",
      "c3",
      "axis",
      "a1",
      "a2",
      "a3",
      "ucva",
      "bcva",
      "iop",
      "airPuff1",
      "airPuff2",
      "airPuff3",
    ])
      delete object(auto[eye])[key];
    for (const key of [
      "k1",
      "k2",
      "axis",
      "ax1",
      "thinnest",
      "pachymetry",
      "apex",
      "residual",
      "ttt",
      "ablation",
    ])
      delete object(penta[eye])[key];
    for (const key of ["afterS", "afterC", "afterA"])
      delete object(auto[eye])[key];
  }
  delete examData.glasses;
  delete content.fundus;
  delete content.examinationNotes;
  for (const key of [
    "refractionOD",
    "refractionOS",
    "ucvaOD",
    "ucvaOS",
    "bcvaOD",
    "bcvaOS",
    "iopOD",
    "iopOS",
  ])
    delete form[key];
  delete consultant.complains;
  if (
    !["consultant", "specialist", "lasik", "external"].includes(input.sheetType)
  )
    return { success: true, visitId, examinationId };
  const sheets = await tx
    .select()
    .from(sheetEntries)
    .where(
      and(
        eq(sheetEntries.patientId, input.patientId),
        eq(sheetEntries.visitId, visitId),
        eq(
          sheetEntries.sheetType,
          input.sheetType as typeof sheetEntries.$inferInsert.sheetType,
        ),
      ),
    )
    .orderBy(desc(sheetEntries.id))
    .limit(1);
  const existing = sheets[0];
  const metadata = {
    visitId,
    operationId: clinicalObject(content.operationDetails).surgeryId,
    signatures: content.signatures,
    layout: content.layout,
    printLayout: content.printLayout,
  };
  const record = {
    visitId,
    content: JSON.stringify(metadata),
    updatedAt: new Date(),
  };
  if (existing)
    await tx
      .update(sheetEntries)
      .set(record)
      .where(eq(sheetEntries.id, existing.id));
  else
    await tx.insert(sheetEntries).values({
      ...record,
      patientId: input.patientId,
      sheetType: input.sheetType as typeof sheetEntries.$inferInsert.sheetType,
    });
  return { success: true, visitId, examinationId };
}
