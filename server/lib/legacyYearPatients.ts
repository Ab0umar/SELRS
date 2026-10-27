import mysql from "mysql2/promise";
import {
  currentMssqlYear,
  getMssqlYear,
  isMssqlYearAuto,
} from "../integrations/mssqlYear";

/**
 * Patients of 2013-2025 live in their own MySQL databases (selrs13 ... selrs25, filled by
 * syncYearPatients.ts). A session that picked one of those years at login reads patients
 * from there, read-only.
 *
 * Row ids are encoded as -(year * ID_BLOCK + id). The live database never has negative ids, so
 * a mutation that reuses a legacy row's id finds nothing instead of editing another patient.
 */
export const MIN_LEGACY_YEAR = 2013;
export const MAX_LEGACY_YEAR = 2025;
const ID_BLOCK = 1_000_000;

export function legacyYearForSession(): number | null {
  if (isMssqlYearAuto()) return null;
  const year = getMssqlYear();
  return year >= MIN_LEGACY_YEAR && year <= MAX_LEGACY_YEAR && year < currentMssqlYear()
    ? year
    : null;
}

export function legacyDatabaseName(year: number): string {
  if (!Number.isInteger(year) || year < MIN_LEGACY_YEAR || year > MAX_LEGACY_YEAR) {
    throw new Error("Invalid legacy year");
  }
  return `selrs${String(year).slice(2)}`;
}

export function encodeLegacyPatientId(year: number, id: number): number {
  return -(year * ID_BLOCK + id);
}

export function decodeLegacyPatientId(
  encoded: number,
): { year: number; id: number } | null {
  if (!Number.isInteger(encoded) || encoded >= 0) return null;
  const value = -encoded;
  const year = Math.floor(value / ID_BLOCK);
  const id = value % ID_BLOCK;
  if (year < MIN_LEGACY_YEAR || year > MAX_LEGACY_YEAR || id < 1) return null;
  return { year, id };
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

const pools = new Map<number, mysql.Pool>();

function poolFor(year: number): mysql.Pool {
  let pool = pools.get(year);
  if (!pool) {
    const url = new URL(String(process.env.DATABASE_URL ?? ""));
    url.pathname = `/${legacyDatabaseName(year)}`;
    pool = mysql.createPool({ uri: url.toString(), connectionLimit: 3 });
    pools.set(year, pool);
  }
  return pool;
}

type LegacyRow = Record<string, any> & { id: number };

function withEncodedId(year: number, row: LegacyRow) {
  return { ...row, id: encodeLegacyPatientId(year, Number(row.id)), legacyYear: year };
}

async function doctorNameMap(): Promise<Map<string, string>> {
  const [{ getDb }, { doctorsLookup }] = await Promise.all([
    import("../db"),
    import("../../drizzle/schema"),
  ]);
  const db = await getDb();
  const map = new Map<string, string>();
  if (!db) return map;
  const rows = await db
    .select({ code: doctorsLookup.code, name: doctorsLookup.name })
    .from(doctorsLookup);
  for (const row of rows) if (row.code && row.name) map.set(row.code, row.name);
  return map;
}

async function withDoctorNames(year: number, rows: LegacyRow[]) {
  const names = await doctorNameMap();
  return rows.map((row) => ({
    ...withEncodedId(year, row),
    doctorName: row.doctorCode ? (names.get(String(row.doctorCode)) ?? null) : null,
  }));
}

export async function legacyGetPatientById(encodedId: number) {
  const decoded = decodeLegacyPatientId(encodedId);
  if (!decoded) return null;
  const [rows] = await poolFor(decoded.year).query(
    "SELECT * FROM patients WHERE id = ? LIMIT 1",
    [decoded.id],
  );
  const [row] = await withDoctorNames(decoded.year, rows as LegacyRow[]);
  return row ?? null;
}

export async function legacySearchPatients(
  year: number,
  searchTerm: string,
  limit: number,
) {
  const tokens = searchTerm.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const clauses: string[] = [];
  const params: unknown[] = [];
  for (const token of tokens) {
    const like = `%${escapeLike(token)}%`;
    clauses.push("(fullName LIKE ? OR patientCode LIKE ? OR phone LIKE ? OR alternatePhone LIKE ?)");
    params.push(like, like, like, like);
  }
  const [rows] = await poolFor(year).query(
    `SELECT * FROM patients WHERE ${clauses.join(" AND ")}
     ORDER BY CAST(patientCode AS UNSIGNED) ASC, patientCode ASC LIMIT ?`,
    [...params, limit],
  );
  return withDoctorNames(year, rows as LegacyRow[]);
}

export type LegacyListOptions = {
  branch?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  doctorName?: string;
  serviceType?: string;
  locationType?: string;
  limit?: number;
  cursor?: { codeNum: number; patientCode: string; id: number };
};

export async function legacyGetAllPatients(year: number, options: LegacyListOptions = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.branch) {
    clauses.push("branch = ?");
    params.push(options.branch);
  }
  if (options.serviceType) {
    clauses.push("serviceType = ?");
    params.push(options.serviceType);
  }
  if (options.locationType) {
    clauses.push("locationType = ?");
    params.push(options.locationType);
  }
  if (options.dateFrom) {
    clauses.push("lastVisit >= ?");
    params.push(options.dateFrom);
  }
  if (options.dateTo) {
    clauses.push("lastVisit < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(options.dateTo);
  }
  const term = options.searchTerm?.trim();
  if (term) {
    const like = `%${escapeLike(term)}%`;
    clauses.push("(fullName LIKE ? OR patientCode LIKE ? OR phone LIKE ?)");
    params.push(like, like, like);
  }
  const doctor = options.doctorName?.trim();
  if (doctor) {
    const names = await doctorNameMap();
    const codes = [...names].filter(([, name]) => name === doctor).map(([code]) => code);
    if (!codes.length) return { rows: [], hasMore: false, nextCursor: null, limit: 0 };
    clauses.push(`doctorCode IN (${codes.map(() => "?").join(",")})`);
    params.push(...codes);
  }
  const cursor = options.cursor;
  if (cursor && Number.isFinite(cursor.codeNum) && Number.isFinite(cursor.id)) {
    clauses.push(`(
      CAST(patientCode AS UNSIGNED) > ?
      OR (CAST(patientCode AS UNSIGNED) = ? AND patientCode > ?)
      OR (CAST(patientCode AS UNSIGNED) = ? AND patientCode = ? AND id > ?)
    )`);
    params.push(
      cursor.codeNum,
      cursor.codeNum,
      cursor.patientCode,
      cursor.codeNum,
      cursor.patientCode,
      cursor.id,
    );
  }
  const limit = Math.max(1, Math.min(500, Number(options.limit ?? 120)));
  const [found] = await poolFor(year).query(
    `SELECT * FROM patients ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY CAST(patientCode AS UNSIGNED) ASC, patientCode ASC, id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  const all = found as LegacyRow[];
  const hasMore = all.length > limit;
  const page = hasMore ? all.slice(0, limit) : all;
  const last = page[page.length - 1];
  const leading = String(last?.patientCode ?? "").match(/^\d+/);
  return {
    rows: await withDoctorNames(year, page),
    hasMore,
    // The cursor keeps the real (positive) id: that is what the list endpoint validates.
    nextCursor: last
      ? {
          codeNum: leading ? Number(leading[0]) : 0,
          patientCode: String(last.patientCode ?? ""),
          id: Number(last.id),
        }
      : null,
    limit,
  };
}
