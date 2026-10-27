/** Keys whose values must never be written to the audit log (credentials, tokens, file contents). */
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|base64|filedata|signature/i;
const MAX_STRING = 300;
const MAX_ITEMS = 20;
const MAX_DEPTH = 4;
const MAX_JSON = 4000;

function redact(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…(${value.length})` : value;
  }
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ITEMS).map((item) => redact(item, depth + 1));
    return value.length > MAX_ITEMS ? [...items, `…+${value.length - MAX_ITEMS} more`] : items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(item, depth + 1);
  }
  return out;
}

/** Compact, secret-free JSON of a mutation's input for the audit trail. */
export function summarizeAuditInput(input: unknown): string {
  const text = JSON.stringify(redact(input, 0)) ?? "null";
  return text.length > MAX_JSON ? `${text.slice(0, MAX_JSON)}…` : text;
}

/** First numeric id-like field of the input, used as the audit entity id (0 when none). */
export function auditEntityId(input: unknown): number {
  if (!input || typeof input !== "object") return 0;
  const record = input as Record<string, unknown>;
  for (const key of ["id", "patientId", "visitId", "userId", "staffId", "itemId", "kfPatientId"]) {
    const value = Number(record[key]);
    if (Number.isInteger(value) && value > 0) return value;
  }
  return 0;
}
