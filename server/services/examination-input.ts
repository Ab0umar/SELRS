import { fundusRecord } from "../../shared/clinical-record";
export function examinationInput(updates: Record<string, unknown>) {
  const content: Record<string, unknown> = {};
  const auto: Record<string, Record<string, unknown>> = { od: {}, os: {} };
  for (const eye of ["OD", "OS"] as const) {
    const fields = auto[eye.toLowerCase()];
    for (const [source, target] of Object.entries({
      sphere: "s",
      cylinder: "c",
      axis: "axis",
      ucva: "ucva",
      bcva: "bcva",
      iop: "iop",
    }))
      if (Object.hasOwn(updates, `${source}${eye}`))
        fields[target] = updates[`${source}${eye}`];
  }
  const examData: Record<string, unknown> = { autorefraction: auto };
  if (Object.hasOwn(updates, "glassesData"))
    examData.glasses =
      typeof updates.glassesData === "string"
        ? JSON.parse(updates.glassesData)
        : updates.glassesData;
  content.examData = examData;
  const fundus: Record<string, unknown> = {};
  for (const eye of ["OD", "OS"])
    if (Object.hasOwn(updates, `posteriorSegment${eye}`))
      fundus[eye.toLowerCase()] = fundusRecord(
        updates[`posteriorSegment${eye}`],
      );
  if (Object.keys(fundus).length) content.fundus = fundus;
  if (Object.hasOwn(updates, "radiologyLabsNotes"))
    content.examinationNotes = updates.radiologyLabsNotes;
  return content;
}
