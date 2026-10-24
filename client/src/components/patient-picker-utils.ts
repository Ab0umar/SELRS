// Phone formatting for patient rows. The combobox keyboard/aria helpers live
// in patientPickerCombobox.ts.

/** Group 11-digit phone numbers as 3/4/4; any other value is returned as-is. */
export function formatPatientPhone(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return value;
}
