type ReportPatientSource = {
  fullName?: unknown;
  dateOfBirth?: unknown;
  birthDate?: unknown;
  dob?: unknown;
  age?: unknown;
  occupation?: unknown;
};

function text(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toLocaleDateString("en-CA");
  }
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function first(...values: unknown[]) {
  return values.map(text).find(Boolean) ?? "";
}

export function resolveWorkflowReportPatient(
  patient: ReportPatientSource | null | undefined,
  sheetPatient: ReportPatientSource | null | undefined,
  visitDate: string,
  queueName?: string | null,
) {
  const dateOfBirth = first(
    patient?.dateOfBirth,
    patient?.birthDate,
    sheetPatient?.dateOfBirth,
    sheetPatient?.birthDate,
    sheetPatient?.dob,
  );
  const birth = new Date(dateOfBirth);
  const visit = new Date(visitDate);
  let age = first(patient?.age, sheetPatient?.age);
  if (!Number.isNaN(birth.getTime()) && !Number.isNaN(visit.getTime())) {
    let years = visit.getFullYear() - birth.getFullYear();
    if (
      visit.getMonth() < birth.getMonth() ||
      (visit.getMonth() === birth.getMonth() &&
        visit.getDate() < birth.getDate())
    )
      years -= 1;
    if (years >= 0) age = String(years);
  }
  return {
    fullName: first(patient?.fullName, sheetPatient?.fullName, queueName),
    dateOfBirth,
    age,
    occupation: first(patient?.occupation, sheetPatient?.occupation),
  };
}
