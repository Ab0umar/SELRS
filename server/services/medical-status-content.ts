import { sql, type SQLWrapper } from "drizzle-orm";

export function medicalVisitScope(column: SQLWrapper, visitIds?: number[]) {
  if (visitIds === undefined) return undefined;
  if (!visitIds.length) return sql`false`;
  return sql`${column} IN (${sql.join(visitIds.map(id => sql`${id}`), sql`, `)})`;
}

export function hasMedicalContent(columns: SQLWrapper[]) {
  return sql`(${sql.join(columns.map(column =>
    sql`TRIM(COALESCE(${column}, '')) NOT IN ('', '{}', '[]', 'null', '-', '—')`
  ), sql` OR `)})`;
}
