export function accountingRevenuePeriods(now = new Date()) {
  const parts = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const year = parts.get("year");
  const month = parts.get("month");
  const day = `${year}-${month}-${parts.get("day")}`;
  const monthEnd = new Date(Date.UTC(Number(year), Number(month), 0))
    .toISOString()
    .slice(0, 10);
  return {
    day: { dateFrom: day, dateTo: day },
    month: { dateFrom: `${year}-${month}-01`, dateTo: monthEnd },
  };
}

export function accountingRevenuePeriodsForDate(isoDate: string | null) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== isoDate
  )
    return null;
  return accountingRevenuePeriods(date);
}
