import { resolveCanonicalOpType } from "../../shared/opTypes";

type OperationHistoryRow = {
  patientId: number;
  operationType: string;
  operationDate: string | Date | null;
  source: string;
};

const SOURCE_PRIORITY: Record<string, number> = {
  service_code: 0,
  operation_list: 1,
  manual: 2,
  surgery: 3,
  sheet: 4,
  followup: 5,
};

export function deduplicateOperationHistory<T extends OperationHistoryRow>(
  rows: T[],
): T[] {
  const typeKey = (row: T) => {
    const canonical = resolveCanonicalOpType(row.operationType);
    return `${row.patientId}:${canonical === "Others" ? row.operationType.trim().toLowerCase() : canonical}`;
  };
  const preferredSources = new Map<string, number>();
  for (const row of rows) {
    const key = typeKey(row);
    preferredSources.set(
      key,
      Math.min(
        preferredSources.get(key) ?? 99,
        SOURCE_PRIORITY[row.source] ?? 99,
      ),
    );
  }
  const unique = new Map<string, T>();
  for (const row of rows) {
    if (
      (SOURCE_PRIORITY[row.source] ?? 99) !== preferredSources.get(typeKey(row))
    )
      continue;
    const date =
      row.operationDate instanceof Date
        ? row.operationDate.toISOString().slice(0, 10)
        : String(row.operationDate ?? "").slice(0, 10);
    const key = `${typeKey(row)}:${date}`;
    const existing = unique.get(key);
    if (
      !existing ||
      (SOURCE_PRIORITY[row.source] ?? 99) <
        (SOURCE_PRIORITY[existing.source] ?? 99)
    ) {
      unique.set(key, row);
    }
  }
  return Array.from(unique.values());
}
