import { TRPCError } from "@trpc/server";
import { clinicalObject } from "../../shared/examination-fields";
import { cairoDateIso } from "../../shared/visitSchedule";
import type { ClinicalVisitInput } from "./clinical-visit";

function list(value: unknown): unknown[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Expected a list of catalog selections",
  });
}
function catalogId(value: unknown, key: string) {
  const record = clinicalObject(value);
  const id = Number(record[key] ?? record.id ?? value);
  if (!Number.isInteger(id) || id <= 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid catalog selection",
    });
  return id;
}

export function medicalVisitInput(
  input: Record<string, unknown>,
): ClinicalVisitInput {
  const content: Record<string, unknown> = {
    formData: { examinationDate: input.visitDate ?? cairoDateIso() },
  };
  const form = content.formData as Record<string, unknown>;
  if (input.diagnosis !== undefined) form.diagnosis = input.diagnosis;
  if (input.recommendations !== undefined || input.report !== undefined)
    content.finalDecisionText = input.recommendations ?? input.report;
  if (input.chiefComplaint !== undefined) {
    content.consultantExam = { complains: input.chiefComplaint };
  }
  if (input.symptoms !== undefined) content.symptoms = input.symptoms;
  if (input.diseases !== undefined) content.diseases = list(input.diseases);
  const auto: Record<string, Record<string, unknown>> = { od: {}, os: {} };
  for (const eye of ["od", "os"]) {
    const fields = clinicalObject(clinicalObject(input.autoref)[eye]);
    Object.assign(auto[eye], fields);
    const iop = clinicalObject(input.iop);
    if (Object.hasOwn(iop, eye)) auto[eye].iop = iop[eye];
    const after = clinicalObject(clinicalObject(input.after)[eye]);
    for (const [source, target] of Object.entries({
      s: "afterS",
      c: "afterC",
      axis: "afterA",
    }))
      if (Object.hasOwn(after, source)) auto[eye][target] = after[source];
  }
  content.examData = {
    autorefraction: auto,
    ...(input.glasses !== undefined ? { glasses: input.glasses } : {}),
    ...(input.pentacam !== undefined ? { pentacam: input.pentacam } : {}),
  };
  if (input.fundus !== undefined) content.fundus = input.fundus;
  if (input.radiologyLabs !== undefined) {
    const text = String(input.radiologyLabs ?? "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    content.examinationNotes =
      typeof parsed === "string"
        ? parsed
        : String(clinicalObject(parsed).notes ?? "");
  }
  const result: ClinicalVisitInput = {
    patientId: Number(input.patientId),
    visitId: input.visitId === undefined ? undefined : Number(input.visitId),
    sheetType: "clinical",
    content: "",
  };
  if (input.isFollowup !== undefined)
    result.visitType = input.isFollowup ? "followup" : "examination";
  if (input.appointmentId !== undefined)
    result.appointmentId = Number(input.appointmentId);
  const treatmentIsList =
    (typeof input.treatment === "string" &&
      input.treatment.trim().startsWith("[")) ||
    Array.isArray(input.treatment);
  if (input.medicationItems !== undefined || treatmentIsList) {
    result.prescriptionItems = list(
      input.medicationItems ?? input.treatment,
    ).map((value) => {
      const item = clinicalObject(value);
      return {
        medicationId: catalogId(value, "medicationId"),
        medicationName: "",
        ...Object.fromEntries(
          ["dosage", "frequency", "duration", "instructions"]
            .filter((key) => item[key] !== undefined)
            .map((key) => [key, String(item[key] ?? "")]),
        ),
      };
    });
  } else if (input.treatment !== undefined)
    content.treatmentPlan = String(input.treatment ?? "");
  if (input.tests !== undefined)
    result.testItems = list(input.tests).map((value) => ({
      testId: catalogId(value, "testId"),
      ...(clinicalObject(value).notes !== undefined
        ? { notes: String(clinicalObject(value).notes ?? "") }
        : {}),
    }));
  result.content = JSON.stringify(content);
  return result;
}
