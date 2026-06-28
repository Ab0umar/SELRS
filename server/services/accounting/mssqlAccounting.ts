import { createMssqlPool } from "../../integrations/mssqlPatients";
import sql from "mssql";

const MSSQL_STRING_PARAM_NAMES = new Set(["patientCode", "doctorCode", "trNo"]);
const MSSQL_DATE_PARAM_NAMES = new Set(["fromDate", "toDate", "viewDate"]);

/** When `ACCOUNTING_SQL_DEBUG=1`, logs labeled query duration (no SQL text or params). */
export async function mssqlQuery<T>(
  sqlText: string,
  params: Record<string, unknown>,
  debugLabel?: string,
): Promise<T[]> {
  const pool = await createMssqlPool();
  await pool.connect();

  const request = pool.request();
  request.arrayRowMode = false;

  for (const [name, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (MSSQL_STRING_PARAM_NAMES.has(name)) {
      request.input(name, (sql as any).VarChar(40), String(value));
      continue;
    }
    if (MSSQL_DATE_PARAM_NAMES.has(name)) {
      // Pass as Date so MSSQL gets a typed datetime, avoiding implicit
      // NVarChar→datetime conversion issues under non-English server collations.
      const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
      request.input(name, (sql as any).DateTime, d);
      continue;
    }
    request.input(name, value);
  }

  const startedAt = Date.now();
  const result = await request.query(sqlText);
  const elapsed = Date.now() - startedAt;
  const rowCount = Array.isArray(result.recordset) ? result.recordset.length : 0;
  console.debug(`[accounting:mssql] ${debugLabel ?? "query"} ${elapsed}ms → ${rowCount} rows`);
  if (rowCount === 0) {
    console.debug(`[accounting:mssql] params: ${JSON.stringify(params)}`);
    console.debug(`[accounting:mssql] sql: ${sqlText.replace(/\s+/g, " ").slice(0, 800)}`);
  }

  return Array.isArray(result.recordset) ? (result.recordset as T[]) : [];
}
