import { sql, type SQL } from "drizzle-orm";

/** Calendar date as sent by the date inputs (yyyy-MM-dd). */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `%term%` for LIKE with the wildcards in the user's text taken literally. */
export function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** ASC/DESC from a validated enum; ORDER BY direction cannot be a bound parameter. */
export function sortKeyword(dir: string): SQL {
  return sql.raw(String(dir).toLowerCase() === "asc" ? "ASC" : "DESC");
}

/** LIMIT/OFFSET numbers are validated ints; inlined as digits only. */
export function intLiteral(value: number): SQL {
  return sql.raw(String(Math.max(0, Math.trunc(Number(value) || 0))));
}

/** Conditions for `column >= from` / `column <= to`, every value bound as a parameter. */
export function dateRangeConditions(
  column: string,
  dateFrom?: string,
  dateTo?: string,
): SQL[] {
  const col = sql.raw(column);
  const conds: SQL[] = [];
  if (dateFrom) conds.push(sql`${col} >= ${assertIsoDate(dateFrom)}`);
  if (dateTo) conds.push(sql`${col} <= ${assertIsoDate(dateTo)}`);
  return conds;
}

function assertIsoDate(value: string): string {
  if (!ISO_DATE_RE.test(value)) throw new Error("Invalid date");
  return value;
}

/** ` WHERE a AND b`, or an empty fragment when there are no conditions. */
export function whereClause(conds: SQL[]): SQL {
  return conds.length ? sql` WHERE ${sql.join(conds, sql` AND `)}` : sql``;
}
