// Pure PatientPicker combobox helpers. Focus stays on the input (APG manual
// selection), so ArrowUp/Down drive the active option; Home/End/Left/Right
// stay unhandled on purpose because they move the text caret.

/** Next active option for an arrow key, wrapping at both ends. current is -1 when nothing is active, and stale values (result list shrank) are clamped first. */
export function getNextActiveIndex(
  current: number,
  key: "ArrowDown" | "ArrowUp",
  count: number,
): number {
  if (count <= 0) return -1;
  const clamped = Math.min(Math.max(current, -1), count - 1);
  if (key === "ArrowDown") {
    const next = clamped + 1;
    return next >= count ? 0 : next;
  }
  const next = clamped - 1;
  return next < 0 ? count - 1 : next;
}

/** DOM id of a listbox option, used for aria-activedescendant and scrollIntoView. */
export function getPatientOptionId(
  listboxId: string,
  patientId: number,
): string {
  return `${listboxId}-option-${patientId}`;
}

/** Group 11-digit phone numbers as 3/4/4; any other value is returned as-is. */
export function formatPatientPhone(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return value;
}
