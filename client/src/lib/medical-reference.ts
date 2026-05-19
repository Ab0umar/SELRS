export type MedicalReferenceState = "low" | "high" | "normal" | "unknown";

type ReferenceRow = {
  name?: unknown;
  category?: unknown;
  normalRange?: unknown;
  unit?: unknown;
  isActive?: unknown;
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

export function parseReferenceRange(raw: unknown): { min: number; max: number } | null {
  const nums = String(raw ?? "")
    .replace(/[<>]/g, " ")
    .replace(/[–—]/g, "-")
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((n) => Number.isFinite(n));

  if (!nums || nums.length < 2) return null;
  const [a, b] = nums;
  return { min: Math.min(a!, b!), max: Math.max(a!, b!) };
}

export function parseMeasurementValue(raw: unknown): number | null {
  const match = String(raw ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function findMedicalReference(rows: ReferenceRow[], aliases: string[]): MedicalReference | null {
  const wanted = aliases.map(normalizeReferenceKey).filter(Boolean);
  if (!wanted.length) return null;

  for (const row of rows) {
    if (!rowActive(row)) continue;
    const nameKey = normalizeReferenceKey(row.name);
    const categoryKey = normalizeReferenceKey(row.category);
    const haystack = `${nameKey} ${categoryKey}`;
    if (!wanted.some((alias) => nameKey === alias || haystack.includes(alias))) continue;

    const range = parseReferenceRange(row.normalRange);
    if (!range) continue;
    return {
      name: String(row.name ?? ""),
      min: range.min,
      max: range.max,
      unit: String(row.unit ?? "").trim(),
    };
  }

  return null;
}

export function evaluateMedicalReference(value: unknown, reference: MedicalReference | null): MedicalReferenceState {
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
