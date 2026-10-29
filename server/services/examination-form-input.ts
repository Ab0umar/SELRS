import { clinicalObject } from "../../shared/examination-fields";
import { medicalVisitInput } from "./medical-visit-input";

type FormInput = {
  patientId: number;
  visitId?: number;
  visitDate: string;
  visitType: string;
  appointmentId?: number;
  data: Record<string, unknown>;
};

export function examinationFormInput(input: FormInput, role: string) {
  const data = input.data;
  const values: Record<string, unknown> = {
    patientId: input.patientId,
    visitId: input.visitId,
    visitDate: input.visitDate,
    isFollowup: input.visitType === "followup",
    appointmentId: input.appointmentId,
  };
  for (const [target, aliases] of Object.entries({
    diagnosis: ["diagnosis", "doctor-diagnosis", "medical-diagnosis"],
    recommendations: ["recommendations", "report", "doctor-report"],
    chiefComplaint: ["chiefComplaint", "complains", "complaint"],
    symptoms: ["symptoms"],
    diseases: ["diseases"],
    tests: ["tests"],
    treatment: [
      "treatment",
      "recommended-treatment",
      "doctor-treatment",
      "prescription",
    ],
    glasses: ["glasses"],
    pentacam: ["pentacam"],
    fundus: ["fundus"],
    radiologyLabs: ["radiologyLabsNotes"],
  })) {
    const key = aliases.find((key) => data[key] !== undefined);
    if (key) values[target] = data[key];
  }
  if (role === "reception") delete values.treatment;
  const normalized = medicalVisitInput(values);
  const content = JSON.parse(normalized.content) as Record<string, unknown>;
  const auto: Record<string, Record<string, unknown>> = {};
  const firstDefined = (...items: unknown[]) =>
    items.find((item) => item !== undefined);
  for (const eye of ["od", "os"]) {
    const suffix = eye.toUpperCase();
    const fields = clinicalObject(
      data[`autoref-${eye}`] ??
        clinicalObject(data.autoref)[eye] ??
        clinicalObject(data.autorefraction)[eye],
    );
    auto[eye] = { ...fields };
    for (const [column, aliases] of Object.entries({
      s: [fields.s, fields.s1, data[`sphere${suffix}`]],
      c: [fields.c, fields.c1, data[`cylinder${suffix}`]],
      axis: [fields.axis, fields.a1, data[`axis${suffix}`]],
      ucva: [fields.ucva, data[`ucva${suffix}`]],
      bcva: [fields.bcva, data[`bcva${suffix}`]],
      iop: [
        fields.iop,
        fields.airPuff1,
        data[`iop${suffix}`],
        data[`airPuff${suffix}`],
      ],
      afterS: [
        fields.afterS,
        clinicalObject(clinicalObject(data.afterRefraction)[eye]).s,
      ],
      afterC: [
        fields.afterC,
        clinicalObject(clinicalObject(data.afterRefraction)[eye]).c,
      ],
      afterA: [
        fields.afterA,
        clinicalObject(clinicalObject(data.afterRefraction)[eye]).axis,
        clinicalObject(clinicalObject(data.afterRefraction)[eye]).a,
      ],
    })) {
      const value = firstDefined(...aliases);
      if (value !== undefined) auto[eye][column] = value === "---" ? "" : value;
    }
    for (const [key, value] of Object.entries(auto[eye]))
      if (value === "---") auto[eye][key] = "";
  }
  content.examData = {
    ...clinicalObject(content.examData),
    autorefraction: auto,
  };
  if (data.medicalChecklist !== undefined)
    content.medicalChecklist = data.medicalChecklist;
  const historyKey = ["additional-notes", "notes"].find(
    (key) => data[key] !== undefined,
  );
  if (historyKey) content.historyNotes = String(data[historyKey] ?? "");
  if (data.signatures !== undefined) content.signatures = data.signatures;
  for (const key of [
    "historyNotes",
    "treatmentPlan",
    "readingValue",
    "consultantExam",
    "consultantDrawing",
    "consultantDrawingDescription",
    "medicalHistory",
    "diabetesDuration",
    "medicalHistoryOther",
    "checks",
    "symptomIds",
  ])
    if (data[key] !== undefined) content[key] = data[key];
  normalized.content = JSON.stringify(content);
  normalized.sheetMetadataTypes = [
    "consultant",
    "specialist",
    "lasik",
    "external",
  ];
  return normalized;
}
