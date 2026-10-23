/** Minimal queue row shape the summary needs (subset of TodayQueuePatient). */
export type TodaySummaryQueueRow = { queueStatus?: string };

/** One operation-list row as returned by `medical.getTodayOperationLists`. */
export type TodaySummaryOperationList = { items?: unknown[] };

export type TodaySummary = {
  total: number;
  treated: number;
  waiting: number;
  completionRate: number;
  opsCount: number;
};

/**
 * Today Patients at-a-glance counts.
 *
 * `opsCount` sums the operations inside each list (not the number of lists) so
 * the summary strip agrees with the Operations tab badge, which flattens the
 * same `items` arrays.
 */
export function summarizeToday(
  queue: TodaySummaryQueueRow[] | undefined,
  operationLists: TodaySummaryOperationList[] | undefined,
): TodaySummary {
  const rows = Array.isArray(queue) ? queue : [];
  const total = rows.length;
  const treated = rows.filter((row) => row?.queueStatus === "treated").length;
  const waiting = total - treated;
  const completionRate = total > 0 ? Math.round((treated / total) * 100) : 0;

  const lists = Array.isArray(operationLists) ? operationLists : [];
  const opsCount = lists.reduce(
    (sum, list) => sum + (Array.isArray(list?.items) ? list.items.length : 0),
    0,
  );

  return { total, treated, waiting, completionRate, opsCount };
}

/** Format a count with Arabic-Indic digits for the on-screen tiles. */
export function formatCount(n: number): string {
  return n.toLocaleString("ar-EG");
}
