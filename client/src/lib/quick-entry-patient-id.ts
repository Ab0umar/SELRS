/**
 * Classifies the :id param of /quick-entry/:id.
 *
 * parseInt is deliberately avoided: it accepts "12abc" (-> 12) and "1.5"
 * (-> 1), which would silently attach the form to the wrong patient.
 * Wouter may hand over an already percent-decoded param, so malformed input
 * yields a result instead of throwing.
 */

export type QuickEntryPatientIdResult =
  | { status: "absent" }
  | { status: "valid"; id: number }
  | { status: "invalid"; raw: string };

const PATIENT_ID_PATTERN = /^[1-9]\d*$/;

export function parseQuickEntryPatientId(
  raw: string | undefined | null,
): QuickEntryPatientIdResult {
  if (raw === undefined || raw === null || raw === "") {
    return { status: "absent" };
  }

  if (!PATIENT_ID_PATTERN.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return { status: "invalid", raw };
  }

  return { status: "valid", id: Number(raw) };
}
