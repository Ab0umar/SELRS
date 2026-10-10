/** Count approved leave days intersecting a calendar year. */
export function leaveDaysInYear(
  dateFrom: Date | string,
  dateTo: Date | string,
  year: number,
): number {
  const key = (value: Date | string) =>
    value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
      : String(value).slice(0, 10);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const start = key(dateFrom) < yearStart ? yearStart : key(dateFrom);
  const end = key(dateTo) > yearEnd ? yearEnd : key(dateTo);
  if (start > end) return 0;

  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return (
    Math.floor(
      (Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000,
    ) + 1
  );
}
