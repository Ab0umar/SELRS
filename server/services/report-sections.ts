import { clinicalArray } from "../../shared/clinical-record";
import type { ClinicalVisitPatch } from "./clinical-sections";

export function reportSectionPatch(
  record: Record<string, unknown>,
): ClinicalVisitPatch {
  const patch: ClinicalVisitPatch = {};
  for (const [source, target] of Object.entries({
    clinicalOpinion: "complaint",
    symptoms: "symptoms",
    diagnosis: "diagnosis",
    treatment: "treatment",
    recommendedTreatment: "treatment",
    recommendations: "decision",
    additionalNotes: "history",
  })) {
    if (Object.hasOwn(record, source) && record[source] !== undefined)
      (patch as Record<string, unknown>)[target] = String(record[source] ?? "");
  }
  if (Object.hasOwn(record, "diseases") && record.diseases !== undefined) {
    patch.diseaseIds = [];
    patch.diseaseLabels = [];
    for (const code of clinicalArray(record.diseases)) {
      const value =
        typeof code === "object" && code !== null
          ? ((code as Record<string, unknown>).id ??
            (code as Record<string, unknown>).name ??
            (code as Record<string, unknown>).abbrev)
          : code;
      if (
        (typeof value === "number" ||
          (typeof value === "string" && /^\d+$/.test(value))) &&
        Number.isInteger(Number(value)) &&
        Number(value) > 0
      )
        patch.diseaseIds.push(Number(value));
      else if (typeof value === "string" && value.trim())
        patch.diseaseLabels.push(value.trim());
      else throw new Error("Invalid diagnosis catalog selection");
    }
  }
  if (
    Object.hasOwn(record, "followUpDate") &&
    record.followUpDate !== undefined
  )
    patch.followUpDate = record.followUpDate
      ? new Date(record.followUpDate as string | Date)
      : null;
  return patch;
}

export function reportHeaderPatch(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const header = { ...record };
  for (const key of [
    "clinicalOpinion",
    "symptoms",
    "diagnosis",
    "treatment",
    "recommendedTreatment",
    "recommendations",
    "additionalNotes",
    "diseases",
    "followUpDate",
    "operationType",
    "surgeryType",
    "surgeryScheduledDate",
    "prescription",
    "visitDate",
  ])
    delete header[key];
  return header;
}
