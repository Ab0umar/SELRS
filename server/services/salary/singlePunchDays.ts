export interface AttendancePunchForPayroll {
  empCd: string;
  punchAt: Date | string;
  direction?: "in" | "out" | "unknown";
}

function localDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Returns employee/date pairs with exactly one raw device scan.
 *
 * Device In/Out modes are intentionally not consulted: FK and ZK direction
 * metadata is not reliable enough to decide whether a single scan was entry
 * or exit. A single raw scan is therefore treated consistently either way.
 */
export function getSinglePunchDayKeys(
  punches: AttendancePunchForPayroll[],
): Set<string> {
  const counts = new Map<string, number>();

  for (const punch of punches) {
    const key = `${punch.empCd}|${localDateKey(punch.punchAt)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    [...counts].filter(([, count]) => count === 1).map(([key]) => key),
  );
}

export function getWorkDateForPunch(punchAt: Date | string): string {
  return localDateKey(punchAt);
}
