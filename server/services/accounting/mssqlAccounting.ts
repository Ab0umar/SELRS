import { createMssqlPool } from "../../integrations/mssqlPatients";
import sql from "mssql";

const MSSQL_STRING_PARAM_NAMES = new Set(["patientCode", "doctorCode", "trNo"]);

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
      request.input(name, sql.VarChar(40), String(value));
      continue;
    }
    request.input(name, value);
  }

  const startedAt = Date.now();
  const result = await request.query(sqlText);
  const elapsed = Date.now() - startedAt;
  if (process.env.ACCOUNTING_SQL_DEBUG === "1" && debugLabel) {
    console.debug(`[accounting:mssql] ${debugLabel} ${elapsed}ms`);
  } else {
    console.debug(`[accounting:mssql] query completed in ${elapsed}ms`);
  }

  return Array.isArray(result.recordset) ? (result.recordset as T[]) : [];
}
