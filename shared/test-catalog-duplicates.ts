import {
  getTestReferenceRanges,
  type TestReferenceRange,
} from "./test-reference-ranges";

export type MergeableTest = {
  id: number;
  name: string;
  type: string;
  category: string | null;
  normalRange: string | null;
  unit: string | null;
  description: string | null;
  priceEgp: string | null;
  durationMinutes: number | null;
  isActive: boolean | number;
  referenceRanges?: unknown;
  noNormalRange?: boolean | number;
};

const catalogNameKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");
const correctedCatalogTypes: Record<string, string> = {
  "occular sonar": "imaging",
  "power pf iol": "examination",
};
const distinctNonempty = (values: (string | null)[]) => [
  ...new Set(values.map((value) => value?.trim() ?? "").filter(Boolean)),
];

export function planTestCatalogMerges(rows: MergeableTest[]) {
  const groups = new Map<string, MergeableTest[]>();
  for (const row of rows) {
    const key = catalogNameKey(row.name);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const merges: {
    keepId: number;
    removeIds: number[];
    name: string;
    updates: {
      type: string;
      category: string;
      description: string;
      normalRange: string;
      unit: string;
      referenceRanges: TestReferenceRange[] | null;
    };
  }[] = [];
  const conflicts: { name: string; ids: number[] }[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const merged = planCompatibleTestMerge(group);
    if (merged) merges.push(merged);
    else
      conflicts.push({ name: group[0]!.name, ids: group.map((row) => row.id) });
  }
  return { merges, conflicts };
}

function planCompatibleTestMerge(group: MergeableTest[]) {
  const correctedType = correctedCatalogTypes[catalogNameKey(group[0]!.name)];
  const types = new Set(group.map((row) => row.type));
  if (
    types.size > 1 &&
    !correctedType &&
    !group.every((row) => ["imaging", "examination"].includes(row.type))
  )
    return null;
  const categories = distinctNonempty(
    group.map((row) => (row.category === row.type ? "" : row.category)),
  );
  const ranges = distinctNonempty(group.map((row) => row.normalRange));
  const units = distinctNonempty(group.map((row) => row.unit));
  const prices = distinctNonempty(group.map((row) => row.priceEgp));
  const durations = new Set(
    group
      .map((row) => row.durationMinutes)
      .filter((duration) => duration != null),
  );
  const structured = group.filter((row) => row.referenceRanges != null);
  const referenceVariants = new Set(
    structured.map((row) => JSON.stringify(getTestReferenceRanges(row))),
  );
  if (
    [categories, ranges, units, prices].some((values) => values.length > 1) ||
    durations.size > 1 ||
    referenceVariants.size > 1
  )
    return null;
  if (
    new Set(group.map((row) => Boolean(row.isActive))).size > 1 ||
    new Set(group.map((row) => Boolean(row.noNormalRange))).size > 1
  )
    return null;
  // Exact-name imaging copies take precedence over copies accidentally placed under examinations.
  const sorted = [...group].sort(
    (a, b) =>
      Number(b.type === "imaging") - Number(a.type === "imaging") ||
      a.id - b.id,
  );
  const keep = sorted[0]!;
  // Do not discard commercial metadata from a populated copy in favor of an empty original.
  if (
    (prices.length && !keep.priceEgp) ||
    (durations.size && keep.durationMinutes == null)
  )
    return null;
  return {
    keepId: keep.id,
    removeIds: sorted.slice(1).map((row) => row.id),
    name: keep.name,
    updates: {
      type: correctedType ?? keep.type,
      category: categories[0] ?? keep.category ?? "",
      description: distinctNonempty(group.map((row) => row.description)).join(
        "\n\n",
      ),
      normalRange: ranges[0] ?? "",
      unit: units[0] ?? "",
      referenceRanges: structured.length
        ? getTestReferenceRanges(structured[0]!)
        : null,
    },
  };
}

export function remapTemplateTestIds(
  templates: unknown,
  mapping: Map<number, number>,
): unknown {
  if (Array.isArray(templates))
    return templates.map((entry) => remapTemplateTestIds(entry, mapping));
  if (!templates || typeof templates !== "object") return templates;
  return Object.fromEntries(
    Object.entries(templates).map(([key, entry]) => [
      key,
      key === "testId" && typeof entry === "number"
        ? (mapping.get(entry) ?? entry)
        : remapTemplateTestIds(entry, mapping),
    ]),
  );
}
