import { createMssqlPool } from "./mssqlPatients";
import {
  currentMssqlYear,
  isValidMssqlYear,
  runWithMssqlYear,
} from "./mssqlYear";

const CACHE_MS = 5 * 60_000;
let cached: { at: number; years: number[] } | null = null;

/** Years whose database (opYYYY) exists on the SQL Server, newest first. Always includes the current year. */
export async function listAvailableMssqlYears(now = Date.now()): Promise<number[]> {
  if (cached && now - cached.at < CACHE_MS) return cached.years;
  const current = currentMssqlYear();
  let years: number[] = [];
  try {
    // Queried through the current-year pool; sys.databases lists every year database.
    const rows = await runWithMssqlYear(null, async () => {
      const pool = await createMssqlPool();
      await pool.connect();
      const result = await pool
        .request()
        .query(
          "SELECT name FROM sys.databases WHERE name LIKE 'op[0-9][0-9][0-9][0-9]'",
        );
      return (result?.recordset ?? []) as Array<{ name: string }>;
    });
    years = rows
      .map((row) => Number(String(row.name).slice(2)))
      .filter(isValidMssqlYear);
  } catch {
    // MSSQL unreachable: fall back to the current year only (nothing is cached).
    return [current];
  }
  const merged = Array.from(new Set([...years, current])).sort((a, b) => b - a);
  cached = { at: now, years: merged };
  return merged;
}

export function resetMssqlYearsCache() {
  cached = null;
}

/**
 * Login `year` field → value stored in the session. Empty/"auto" or the current
 * year mean "automatic" (null) so the session follows the calendar at New Year.
 * Anything else must be a year that exists on the server.
 */
export async function resolveLoginYear(
  raw: unknown,
  available: () => Promise<number[]> = listAvailableMssqlYears,
): Promise<{ ok: true; year: number | null } | { ok: false }> {
  if (raw === undefined || raw === null || raw === "" || raw === "auto") {
    return { ok: true, year: null };
  }
  if (typeof raw !== "number" && typeof raw !== "string") return { ok: false };
  const year = typeof raw === "number" ? raw : Number(raw.trim());
  if (!isValidMssqlYear(year)) return { ok: false };
  if (year === currentMssqlYear()) return { ok: true, year: null };
  const years = await available();
  return years.includes(year) ? { ok: true, year } : { ok: false };
}
