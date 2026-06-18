/**
 * Migrates visits.visitType='followup' → followupSheets + followupItems
 *
 * For each followup visit:
 *  1. Determines sheetType from patient.serviceType
 *  2. Gets or creates a followupSheet for that patient+sheetType
 *     (creates a new version when current sheet already has 4 items)
 *  3. Inserts a followupItem with date + any clinical data from examinations/doctorReports
 *
 * Safe to re-run: skips visits whose visitDate already exists as a followupItem
 * for that patient.
 */
import { config } from "dotenv";
config();
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) { console.error("no db"); process.exit(1); }

// ── sheetType mapping ─────────────────────────────────────────────────────────
function toSheetType(serviceType: string | null): "consultant" | "specialist" | "lasik" | "external" {
  const s = String(serviceType ?? "").trim().toLowerCase();
  if (s === "consultant") return "consultant";
  if (s === "specialist") return "specialist";
  if (s === "lasik") return "lasik";
  if (s === "external" || s === "surgery_external" || s.includes("external")) return "external";
  if (s === "surgery" || s === "surgery_center") return "specialist";
  if (s.startsWith("pentacam")) return "consultant";
  return "consultant";
}

// ── Fetch all followup visits with patient + clinical data ────────────────────
const [rows] = await db.execute(sql`
  SELECT
    v.id            AS visitId,
    v.patientId,
    v.visitDate,
    p.serviceType,
    -- examinations
    e.bcvaOD, e.bcvaOS,
    e.ucvaOD, e.ucvaOS,
    e.iopOD,  e.iopOS,
    e.sphereOD, e.cylinderOD, e.axisOD,
    e.sphereOS, e.cylinderOS, e.axisOS,
    -- doctorReports
    dr.treatment, dr.recommendations
  FROM visits v
  JOIN patients p ON p.id = v.patientId
  LEFT JOIN examinations e ON e.visitId = v.id
  LEFT JOIN doctorReports dr ON dr.visitId = v.id
  WHERE v.visitType = 'followup'
  ORDER BY v.patientId, v.visitDate ASC
`) as any[][];

console.log(`Found ${rows.length} followup visits to migrate`);

// ── Already-migrated guard: collect existing followupItem dates per patient ───
const [existingItems] = await db.execute(sql`
  SELECT fi.followupDate, fs.patientId
  FROM followupItems fi
  JOIN followupSheets fs ON fs.id = fi.followupSheetId
  WHERE fi.followupDate IS NOT NULL
`) as any[][];

const existingKey = new Set(
  existingItems.map((r: any) =>
    `${r.patientId}__${new Date(r.followupDate).toISOString().split("T")[0]}`
  )
);

// ── Migrate ───────────────────────────────────────────────────────────────────
let inserted = 0;
let skipped  = 0;

for (const row of rows as any[]) {
  const patientId  = Number(row.patientId);
  const visitDate  = row.visitDate ? new Date(row.visitDate) : null;
  if (!visitDate) { skipped++; continue; }

  const dateKey = `${patientId}__${visitDate.toISOString().split("T")[0]}`;
  if (existingKey.has(dateKey)) { skipped++; continue; }

  const sheetType = toSheetType(row.serviceType);

  // ── Get or create sheet (max 4 items per sheet) ───────────────────────────
  const [sheets] = await db.execute(sql`
    SELECT id, version FROM followupSheets
    WHERE patientId = ${patientId} AND sheetType = ${sheetType}
    ORDER BY version DESC LIMIT 1
  `) as any[][];

  let sheetId: number;
  let tableIndex: number;

  if (sheets.length === 0) {
    // No sheet yet — create version 1
    const [ins] = await db.execute(sql`
      INSERT INTO followupSheets (patientId, sheetType, version) VALUES (${patientId}, ${sheetType}, 1)
    `) as any[];
    sheetId = ins.insertId;
    tableIndex = 0;
  } else {
    const sheet = sheets[0];
    const [countRes] = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM followupItems WHERE followupSheetId = ${sheet.id}
    `) as any[][];
    const count = Number(countRes[0].cnt);

    if (count < 4) {
      sheetId    = sheet.id;
      tableIndex = count; // next slot
    } else {
      // Sheet full — create next version
      const nextVer = Number(sheet.version) + 1;
      const [ins] = await db.execute(sql`
        INSERT INTO followupSheets (patientId, sheetType, version) VALUES (${patientId}, ${sheetType}, ${nextVer})
      `) as any[];
      sheetId    = ins.insertId;
      tableIndex = 0;
    }
  }

  // ── Build clinical data ───────────────────────────────────────────────────
  const vaOD = row.bcvaOD || row.ucvaOD || null;
  const vaOS = row.bcvaOS || row.ucvaOS || null;

  const refracOD = (row.sphereOD || row.cylinderOD || row.axisOD)
    ? JSON.stringify({ s: row.sphereOD ?? "", c: row.cylinderOD ?? "", a: row.axisOD ?? "" })
    : null;
  const refracOS = (row.sphereOS || row.cylinderOS || row.axisOS)
    ? JSON.stringify({ s: row.sphereOS ?? "", c: row.cylinderOS ?? "", a: row.axisOS ?? "" })
    : null;

  const followupName = `متابعة ${tableIndex + 1}`;
  const notes = row.recommendations || null;
  const treatment = row.treatment || null;

  await db.execute(sql`
    INSERT INTO followupItems
      (followupSheetId, tableIndex, followupDate, followupName,
       vaOD, vaOS, refracOD, refracOS, iopOD, iopOS, treatment, notes)
    VALUES
      (${sheetId}, ${tableIndex}, ${visitDate}, ${followupName},
       ${vaOD}, ${vaOS}, ${refracOD}, ${refracOS},
       ${row.iopOD ?? null}, ${row.iopOS ?? null}, ${treatment}, ${notes})
  `);

  existingKey.add(dateKey);
  inserted++;
}

console.log(`\nDone — inserted: ${inserted}, skipped (already migrated or no date): ${skipped}`);

// ── Summary ───────────────────────────────────────────────────────────────────
const [[countSheets], [countItems]] = await Promise.all([
  db.execute(sql`SELECT COUNT(*) as cnt FROM followupSheets`) as any,
  db.execute(sql`SELECT COUNT(*) as cnt FROM followupItems`) as any,
]);
console.log(`followupSheets total: ${(countSheets as any)[0].cnt}`);
console.log(`followupItems  total: ${(countItems  as any)[0].cnt}`);

process.exit(0);
