export const consultantBooleanFields = [
  "externalPtosis",
  "externalSquint",
  "externalOthers",
  "muscleNormal",
  "muscleAbnormal",
  "fundusNormal",
  "fundusAbnormal",
] as const;
export const consultantTextFields = [
  "externalOthersNote",
  "muscleAbnormalNote",
  "otherAbnormalities",
  "fundusAbnormalNote",
] as const;
export const procedurePlanFields = {
  target: "planTarget",
  beforeFlap: "planBeforeFlap",
  afterFlap: "planAfterFlap",
  afterTreatment: "planAfterTreatment",
  flapReposition: "planFlapReposition",
  ciclo: "planCiclo",
  note: "planNote",
} as const;
export const fundusFields = [
  "discStatus",
  "cupDiscRatio",
  "macuaStatus",
  "vesselStatus",
  "otherFindings",
] as const;
export function clinicalObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function examinationFieldPatch(
  content: Record<string, unknown>,
  sheetType: string,
): Record<string, string | boolean | null> {
  const patch: Record<string, string | boolean | null> = {};
  const findings = clinicalObject(content.consultantExam);
  for (const key of consultantBooleanFields)
    if (Object.hasOwn(findings, key)) patch[key] = Boolean(findings[key]);
  for (const key of consultantTextFields)
    if (Object.hasOwn(findings, key)) patch[key] = String(findings[key] ?? "");
  for (const key of [
    "consultantDrawing",
    "consultantDrawingDescription",
    "readingValue",
  ] as const)
    if (Object.hasOwn(content, key)) patch[key] = String(content[key] ?? "");
  const noteKey = sheetType === "specialist" ? "notes" : "officeNotes";
  if (Object.hasOwn(content, noteKey))
    patch.clinicNotes = String(content[noteKey] ?? "");
  const plan = clinicalObject(content.treatmentPlan);
  const fundus = clinicalObject(content.fundus);
  for (const eye of ["OD", "OS"] as const) {
    const eyePlan = clinicalObject(plan[eye]);
    for (const [source, column] of Object.entries(procedurePlanFields))
      if (Object.hasOwn(eyePlan, source))
        patch[`${column}${eye}`] = String(eyePlan[source] ?? "");
    const eyeFundus = fundus[eye.toLowerCase()];
    if (typeof eyeFundus === "string" || eyeFundus === null)
      patch[`otherFindings${eye}`] = String(eyeFundus ?? "");
    else {
      const fields = clinicalObject(eyeFundus);
      for (const key of fundusFields)
        if (Object.hasOwn(fields, key))
          patch[`${key}${eye}`] = String(fields[key] ?? "");
    }
  }
  const checks = clinicalObject(content.checks);
  if (Object.hasOwn(checks, "glasses"))
    patch.glassesCheck = Boolean(checks.glasses);
  if (Object.hasOwn(checks, "xray")) patch.xrayCheck = Boolean(checks.xray);
  return patch;
}

export function examinationSheetFields(
  record: Record<string, unknown>,
  legacy: Record<string, unknown> = {},
) {
  const findings = { ...clinicalObject(legacy.consultantExam) };
  for (const key of [...consultantBooleanFields, ...consultantTextFields])
    if (record[key] !== null && record[key] !== undefined)
      findings[key] = record[key];
  const plan: Record<string, Record<string, unknown>> = {};
  for (const eye of ["OD", "OS"] as const) {
    plan[eye] = {
      ...clinicalObject(clinicalObject(legacy.treatmentPlan)[eye]),
    };
    for (const [source, column] of Object.entries(procedurePlanFields))
      if (record[`${column}${eye}`] != null)
        plan[eye][source] = record[`${column}${eye}`];
  }
  return {
    consultantExam: findings,
    treatmentPlan: plan,
    readingValue: record.readingValue ?? legacy.readingValue ?? "",
    notes: record.clinicNotes ?? legacy.notes ?? "",
    officeNotes: record.clinicNotes ?? legacy.officeNotes ?? "",
    consultantDrawing:
      record.consultantDrawing ?? legacy.consultantDrawing ?? "",
    consultantDrawingDescription:
      record.consultantDrawingDescription ??
      legacy.consultantDrawingDescription ??
      "",
    checks: {
      glasses:
        record.glassesCheck ?? clinicalObject(legacy.checks).glasses ?? false,
      xray: record.xrayCheck ?? clinicalObject(legacy.checks).xray ?? false,
    },
  };
}
