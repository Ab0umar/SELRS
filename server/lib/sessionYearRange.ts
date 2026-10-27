import { getMssqlYear, isMssqlYearAuto } from "../integrations/mssqlYear";

/**
 * Treasury rows (accLedger and friends) live in MySQL across all years. A session that
 * picked an older year at login only sees that calendar year; automatic sessions are untouched.
 */
export function clampToSessionYear(
  dateFrom?: string,
  dateTo?: string,
): { dateFrom?: string; dateTo?: string } {
  if (isMssqlYearAuto()) return { dateFrom, dateTo };
  const year = getMssqlYear();
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  return {
    dateFrom: dateFrom && dateFrom > first ? dateFrom : first,
    dateTo: dateTo && dateTo < last ? dateTo : last,
  };
}
