export type QuickEntryPatientIdResult =
  | { status: "absent" }
  | { status: "valid"; patientId: number }
  | { status: "invalid"; raw: string };

// Deliberately strict: a coerced id ("12abc" read as 12) could file the entry
// under the wrong patient record, so malformed input is rejected, not salvaged.
const PATIENT_ID_PATTERN = /^[1-9]\d*$/;

export function parseQuickEntryPatientId(
  raw: string | undefined | null,
): QuickEntryPatientIdResult {
  if (raw === undefined || raw === null || raw === "") {
    return { status: "absent" };
  }

  if (!PATIENT_ID_PATTERN.test(raw)) {
    return { status: "invalid", raw };
  }

  const patientId = Number(raw);
  if (!Number.isSafeInteger(patientId)) {
    return { status: "invalid", raw };
  }

  return { status: "valid", patientId };
}
