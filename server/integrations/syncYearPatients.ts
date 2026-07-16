/**
 * Standalone core-patient-record sync for legacy year databases.
 *
 * Unlike mssqlPatients.ts (which syncs the *current* year into the main app's
 * shared MySQL database, plus visits/queue/exam-state), this pulls just the
 * core patient record — code, name, contact info, demographics, doctor/service
 * — from a legacy MSSQL year database (op2024, op2025, ...) into its own
 * dedicated MySQL database (selrs24, selrs25, ...). It opens its own MSSQL and
 * MySQL connections and never touches server/db.ts or the main app's pool, so
 * it can run independently of (and without risk to) the live app.
 *
 * Run with:  pnpm tsx server/integrations/syncYearPatients.ts 2024
 *            pnpm tsx server/integrations/syncYearPatients.ts 2025
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { pathToFileURL } from "node:url";

function asBool(value: unknown, fallback = false): boolean {
  if (value == null) return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

async function loadMssqlModule(): Promise<any> {
  try {
    const importer = new Function("return import('mssql')");
    const mod = await importer();
    return (mod as any).default ?? mod;
  } catch {
    throw new Error("Package 'mssql' is not installed. Run: pnpm add mssql");
  }
}

async function createYearMssqlPool(mssqlDatabase: string): Promise<any> {
  const server = String(process.env.MSSQL_SERVER ?? "").trim();
  const user = String(process.env.MSSQL_USER ?? "").trim();
  const password = String(process.env.MSSQL_PASSWORD ?? "");
  const port = Number(process.env.MSSQL_PORT ?? 1433);
  if (!server || !user || !password) {
    throw new Error(
      "Missing MSSQL SQL-auth config. Required: MSSQL_SERVER, MSSQL_USER, MSSQL_PASSWORD",
    );
  }
  const mssql = await loadMssqlModule();
  const pool = new mssql.ConnectionPool({
    server,
    user,
    password,
    database: mssqlDatabase,
    port: Number.isFinite(port) ? port : 1433,
    connectionTimeout: Number(process.env.MSSQL_CONNECTION_TIMEOUT_MS ?? 5000),
    requestTimeout: Number(process.env.MSSQL_REQUEST_TIMEOUT_MS ?? 15000),
    options: {
      encrypt: asBool(process.env.MSSQL_ENCRYPT, false),
      trustServerCertificate: asBool(
        process.env.MSSQL_TRUST_SERVER_CERTIFICATE,
        true,
      ),
      enableArithAbort: true,
    },
  });
  await pool.connect();
  return pool;
}

function buildMysqlUrlForDatabase(mysqlDatabase: string): string {
  const base = String(process.env.DATABASE_URL ?? "").trim();
  if (!base) throw new Error("DATABASE_URL is missing");
  const url = new URL(base);
  url.pathname = `/${mysqlDatabase}`;
  return url.toString();
}

// Core-patient-record query only: name, contact, demographics, doctor/service.
// No visits, queue routing, exam-state, or receipt IDNO/PAY/DUE — those belong
// to the live-year pipeline (mssqlPatients.ts), not this legacy-year sync.
//
// Doctor/service pairing follows the same rule as the main sync (see
// CLAUDE.md "Doctor/Service Matching"): doctorCode and serviceCode must come
// from the SAME PAPAT_SRV row, never DRS_CD picked independently.
function buildQuery(
  mssqlDatabase: string,
  limit: number,
  includePapatSrv: boolean,
): string {
  const db = mssqlDatabase;
  return `
    WITH latest AS (
      SELECT
        PAT_CD, NAM, TEL1, ADDRS, AGE, GNDR, BDT, IDNO, BRNCH, DRS_CD,
        ROW_NUMBER() OVER (
          PARTITION BY PAT_CD
          ORDER BY
            CASE WHEN ISDATE(UPDATEDATE) = 1 THEN CONVERT(datetime, UPDATEDATE) END DESC,
            CASE WHEN ISDATE(ENTRYDATE)  = 1 THEN CONVERT(datetime, ENTRYDATE)  END DESC,
            CASE WHEN ISDATE(VST_DT)     = 1 THEN CONVERT(datetime, VST_DT)     END DESC
        ) AS rn,
        COALESCE(
          CASE WHEN ISDATE(UPDATEDATE) = 1 THEN CONVERT(datetime, UPDATEDATE) END,
          CASE WHEN ISDATE(ENTRYDATE)  = 1 THEN CONVERT(datetime, ENTRYDATE)  END,
          CASE WHEN ISDATE(VST_DT)     = 1 THEN CONVERT(datetime, VST_DT)     END
        ) AS changedAt
      FROM ${db}.dbo.PAJRNRCVH
      WHERE ISNULL(PAT_CD, '') <> ''
    )
    SELECT TOP (${limit})
      l.PAT_CD AS patientCode,
      COALESCE(
        ${includePapatSrv ? "NULLIF(CONVERT(nvarchar(255), srv.PAT_NM_AR), ''), NULLIF(CONVERT(nvarchar(255), srv.PAT_NM_EN), '')," : ""}
        NULLIF(CONVERT(nvarchar(255), l.NAM), ''),
        l.PAT_CD
      ) AS fullName,
      l.TEL1 AS phone,
      l.ADDRS AS address,
      l.AGE AS age,
      l.GNDR AS gender,
      CONVERT(varchar(10), l.BDT, 120) AS dateOfBirth,
      l.IDNO AS nationalId,
      l.BRNCH AS branch,
      ${
        includePapatSrv
          ? `COALESCE(
               NULLIF(CONVERT(varchar(100), srv.SRV_BY1), ''),
               NULLIF(CONVERT(varchar(100), srv.CUR_SRV_BY), ''),
               NULLIF(CONVERT(varchar(100), srv.PRG_BY), ''),
               NULLIF(CONVERT(varchar(100), l.DRS_CD), '')
             ) AS doctorCode,
             srv.SRV_CD AS serviceCode,`
          : `l.DRS_CD AS doctorCode,
             CAST(NULL AS varchar(50)) AS serviceCode,`
      }
      l.changedAt AS lastVisit
    FROM latest l
    ${
      includePapatSrv
        ? `OUTER APPLY (
      SELECT TOP 1 s.SRV_CD, s.SRV_BY1, s.CUR_SRV_BY, s.PRG_BY, s.PAT_NM_AR, s.PAT_NM_EN
      FROM ${db}.dbo.PAPAT_SRV s
      WHERE s.PAT_CD = l.PAT_CD
      ORDER BY s.DT DESC
    ) srv`
        : ""
    }
    WHERE l.rn = 1
  `;
}

function normalizeGender(raw: unknown): string | null {
  const g = String(raw ?? "").trim().toUpperCase();
  if (g === "M" || g === "MALE") return "male";
  if (g === "F" || g === "FEMALE") return "female";
  return null;
}

export interface YearSyncResult {
  year: number;
  mssqlDatabase: string;
  mysqlDatabase: string;
  fetched: number;
  inserted: number;
  updated: number;
  servicesLinked: number;
  errors: string[];
}

export async function syncYearPatients(
  year: 2023 | 2024 | 2025,
  options: { limit?: number; dryRun?: boolean } = {},
): Promise<YearSyncResult> {
  const mssqlDatabase = `op${year}`;
  const mysqlDatabase = `selrs${String(year).slice(2)}`;
  const limit = Math.max(1, Math.min(50000, options.limit ?? 20000));
  const dryRun = Boolean(options.dryRun);

  const result: YearSyncResult = {
    year,
    mssqlDatabase,
    mysqlDatabase,
    fetched: 0,
    inserted: 0,
    updated: 0,
    servicesLinked: 0,
    errors: [],
  };

  const mssqlPool = await createYearMssqlPool(mssqlDatabase);
  const mysqlConn = dryRun
    ? null
    : await mysql.createConnection(buildMysqlUrlForDatabase(mysqlDatabase));

  try {
    let includePapatSrv = true;
    let query = buildQuery(mssqlDatabase, limit, includePapatSrv);
    let fetched: any;
    try {
      fetched = await mssqlPool.request().query(query);
    } catch (error: any) {
      const message = String(error?.message ?? error ?? "");
      if (/Invalid object name\s+'[^']*PAPAT_SRV'|Invalid column name/i.test(message)) {
        includePapatSrv = false;
        query = buildQuery(mssqlDatabase, limit, includePapatSrv);
        result.errors.push(
          `PAPAT_SRV not available in ${mssqlDatabase}; continued with PAJRNRCVH only.`,
        );
        fetched = await mssqlPool.request().query(query);
      } else {
        throw error;
      }
    }

    const rows = Array.isArray(fetched?.recordset) ? fetched.recordset : [];
    result.fetched = rows.length;
    console.log(`[year-sync:${year}] fetched=${rows.length} from ${mssqlDatabase}`);

    for (const row of rows as Array<Record<string, any>>) {
      const patientCode = String(row.patientCode ?? "").trim();
      if (!patientCode) continue;

      const mssqlDob = String(row.dateOfBirth ?? "").trim();
      const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(mssqlDob) ? mssqlDob : null;

      // Same derivation as the live-year sync (createOrSyncPatientFromMssql):
      // IDNO doubles as both a national-ID-like value and a location flag
      // (2 => external). locationType then drives the serviceType default.
      const idno = Number(row.nationalId ?? 0);
      const locationType = idno === 2 ? "external" : "center";
      const serviceType = locationType === "external" ? "external" : "consultant";
      const branchRaw = String(row.branch ?? "").trim().toLowerCase();
      const branch = branchRaw === "surgery" ? "surgery" : "examinations";

      const values = {
        patientCode,
        fullName: String(row.fullName ?? patientCode).trim(),
        phone: String(row.phone ?? "").trim() || null,
        address: String(row.address ?? "").trim() || null,
        age: Number.isFinite(Number(row.age)) && row.age != null ? Number(row.age) : null,
        gender: normalizeGender(row.gender),
        dateOfBirth,
        nationalId: row.nationalId != null ? String(row.nationalId).trim() || null : null,
        branch,
        serviceType,
        locationType,
        status: "new" as const,
        doctorCode: row.doctorCode != null ? String(row.doctorCode).trim() || null : null,
        serviceCode: row.serviceCode != null ? String(row.serviceCode).trim() || null : null,
        lastVisit: row.lastVisit ?? null,
      };

      if (dryRun || !mysqlConn) continue;

      let patientId: number | null = null;
      try {
        const [existing] = await mysqlConn.query(
          `SELECT id FROM patients WHERE patientCode = ? LIMIT 1`,
          [patientCode],
        );
        if ((existing as any[]).length > 0) {
          patientId = Number((existing as any[])[0].id);
          await mysqlConn.query(
            `UPDATE patients SET
               fullName = ?, phone = ?, address = ?, age = ?, gender = ?,
               dateOfBirth = ?, nationalId = ?, branch = ?,
               doctorCode = ?, serviceCode = ?, lastVisit = ?
             WHERE patientCode = ?`,
            [
              values.fullName,
              values.phone,
              values.address,
              values.age,
              values.gender,
              values.dateOfBirth,
              values.nationalId,
              values.branch,
              values.doctorCode,
              values.serviceCode,
              values.lastVisit,
              patientCode,
            ],
          );
          result.updated += 1;
        } else {
          const [insertResult] = await mysqlConn.query(
            `INSERT INTO patients
               (patientCode, fullName, phone, address, age, gender,
                dateOfBirth, nationalId, branch, serviceType, locationType,
                status, doctorCode, serviceCode, lastVisit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              values.patientCode,
              values.fullName,
              values.phone,
              values.address,
              values.age,
              values.gender,
              values.dateOfBirth,
              values.nationalId,
              values.branch,
              values.serviceType,
              values.locationType,
              values.status,
              values.doctorCode,
              values.serviceCode,
              values.lastVisit,
            ],
          );
          patientId = Number((insertResult as any)?.insertId ?? 0);
          result.inserted += 1;
        }
      } catch (error: any) {
        result.errors.push(
          `patient ${patientCode}: ${String(error?.message ?? error)}`,
        );
        continue;
      }

      // Link the service entry — same sourceRef convention as the live-year
      // sync (mssqlPatients.ts: `mssql:PAPAT_SRV:${patientCode}:${code}:${ref}`)
      // so both pipelines produce compatible, dedupable rows.
      if (patientId && values.serviceCode) {
        try {
          const serviceDate =
            values.lastVisit instanceof Date
              ? values.lastVisit.toISOString().slice(0, 10)
              : null;
          const refPart = values.lastVisit instanceof Date
            ? values.lastVisit.toISOString()
            : "row";
          const sourceRef = `mssql:PAPAT_SRV:${patientCode}:${values.serviceCode}:${refPart}`;
          const [existingEntry] = await mysqlConn.query(
            `SELECT id FROM patientServiceEntries WHERE sourceRef = ? LIMIT 1`,
            [sourceRef],
          );
          if ((existingEntry as any[]).length > 0) {
            await mysqlConn.query(
              `UPDATE patientServiceEntries SET patientId = ?, serviceCode = ?, serviceDate = ?, updatedAt = NOW()
               WHERE id = ?`,
              [patientId, values.serviceCode, serviceDate, (existingEntry as any[])[0].id],
            );
          } else {
            await mysqlConn.query(
              `INSERT INTO patientServiceEntries (patientId, serviceCode, source, sourceRef, serviceDate)
               VALUES (?, ?, 'mssql', ?, ?)`,
              [patientId, values.serviceCode, sourceRef, serviceDate],
            );
          }
          result.servicesLinked += 1;
        } catch (error: any) {
          result.errors.push(
            `service-link ${patientCode}: ${String(error?.message ?? error)}`,
          );
        }
      }
    }

    console.log(
      `[year-sync:${year}] inserted=${result.inserted} updated=${result.updated} servicesLinked=${result.servicesLinked} errors=${result.errors.length} -> ${mysqlDatabase}`,
    );
    return result;
  } finally {
    await mssqlPool.close().catch(() => undefined);
    if (mysqlConn) await mysqlConn.end().catch(() => undefined);
  }
}

async function main() {
  const arg = String(process.argv[2] ?? "").trim();
  if (arg !== "2023" && arg !== "2024" && arg !== "2025") {
    console.error("Usage: tsx server/integrations/syncYearPatients.ts <2023|2024|2025> [--dry-run]");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const result = await syncYearPatients(Number(arg) as 2023 | 2024 | 2025, { dryRun });
  console.log(JSON.stringify(result, null, 2));
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[year-sync] Fatal:", err);
      process.exit(1);
    });
}
