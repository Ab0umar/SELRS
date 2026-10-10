import {
  getTestReferenceRanges,
  parseSimpleReferenceRange,
  referenceIsDisabled,
} from "@shared/test-reference-ranges";

export type MedicalReferenceState = "low" | "high" | "normal" | "unknown";

type ReferenceRow = {
  name?: unknown;
  category?: unknown;
  normalRange?: unknown;
  unit?: unknown;
  isActive?: unknown;
  referenceRanges?: unknown;
  noNormalRange?: unknown;
};

export type MedicalReference = {
  name: string;
  min: number;
  max: number;
  unit: string;
};

function normalizeReferenceKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]/g, "");
}

function rowActive(row: ReferenceRow): boolean {
  if (typeof row.isActive === "boolean") return row.isActive;
  return row.isActive !== false;
}

export function parseReferenceRange(
  raw: unknown,
): { min: number; max: number } | null {
  const range = parseSimpleReferenceRange(raw);
  if (!range || Number(range.min) > Number(range.max)) return null;
  return { min: Number(range.min), max: Number(range.max) };
}

export function parseMeasurementValue(raw: unknown): number | null {
  const match = String(raw ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function findMedicalReference(
  rows: ReferenceRow[],
  aliases: string[],
): MedicalReference | null {
  const wanted = aliases.map(normalizeReferenceKey).filter(Boolean);
  if (!wanted.length) return null;

  for (const row of rows) {
    if (!rowActive(row) || referenceIsDisabled(row)) continue;
    const nameKey = normalizeReferenceKey(row.name);
    const categoryKey = normalizeReferenceKey(row.category);
    const haystack = `${nameKey} ${categoryKey}`;
    const parentMatches = wanted.some(
      (alias) => nameKey === alias || haystack.includes(alias),
    );
    const entries = getTestReferenceRanges(row);
    const candidates = entries.filter((entry) =>
      entry.name
        ? wanted.some((alias) => normalizeReferenceKey(entry.name) === alias)
        : parentMatches,
    );
    // A bare panel name cannot choose between measurements or patient-specific ranges.
    if (candidates.length !== 1) continue;
    const entry = candidates[0]!;
    const range = entry.text
      ? null
      : parseReferenceRange(`${entry.min} - ${entry.max}`);
    if (!range) continue;
    return {
      name: entry.name || String(row.name ?? ""),
      min: range.min,
      max: range.max,
      unit: entry.unit,
    };
  }

  return null;
}

export function evaluateMedicalReference(
  value: unknown,
  reference: MedicalReference | null,
): MedicalReferenceState {
  const n = parseMeasurementValue(value);
  if (n == null || !reference) return "unknown";
  if (n < reference.min) return "low";
  if (n > reference.max) return "high";
  return "normal";
}

export function medicalReferenceClass(state: MedicalReferenceState): string {
  if (state === "low" || state === "high") {
    return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
  }
  if (state === "normal") {
    return "bg-success/10 text-success";
  }
  return "";
}
