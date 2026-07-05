type SheetDateValue = string | Date | null | undefined;

export type PatientDateSource = {
  dateOfBirth?: SheetDateValue;
  date_of_birth?: SheetDateValue;
  birthDate?: SheetDateValue;
  dob?: SheetDateValue;
  birth?: SheetDateValue;
  BDT?: SheetDateValue;
};

export function formatSheetDate(value?: SheetDateValue) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, "0");
      const month = dmy[2].padStart(2, "0");
      return `${dmy[3]}-${month}-${day}`;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString().split("T")[0];
}

export function getPatientSheetDateOfBirth(patient: PatientDateSource) {
  return formatSheetDate(
    patient.dateOfBirth ??
      patient.date_of_birth ??
      patient.birthDate ??
      patient.dob ??
      patient.birth ??
      patient.BDT,
  );
}

export function displaySheetDate(value?: SheetDateValue) {
  const normalized = formatSheetDate(value);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  return year && month && day ? `${day}/${month}/${year}` : normalized;
}
