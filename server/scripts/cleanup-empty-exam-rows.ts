/**
 * Cleanup script: removes empty sub-table rows from exam data.
 *
 * Dry-run by default — shows counts only.
 * Pass --execute to actually delete.
 *
 * Usage:
 *   npx tsx server/scripts/cleanup-empty-exam-rows.ts           (dry-run)
 *   npx tsx server/scripts/cleanup-empty-exam-rows.ts --execute (delete)
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

config();

const EXECUTE = process.argv.includes("--execute");

// Helper: run a count query and return the number
async function count(db: any, query: string): Promise<number> {
  const rows = await db.execute(sql.raw(query));
  const row = (rows as any)[0]?.[0] ?? (rows as any)[0];
  return Number(row?.n ?? row?.count ?? 0);
}

// Helper: run a delete query and return affected rows
async function del(db: any, query: string): Promise<number> {
  const result = await db.execute(sql.raw(query));
  return Number((result as any)[0]?.affectedRows ?? 0);
}

// A field is "blank" when it is NULL or an empty string after trimming.
const BLANK = (col: string) => `(${col} IS NULL OR TRIM(${col}) = '')`;

function allBlank(cols: string[]): string {
  return cols.map(BLANK).join(" AND ");
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  console.log(`\n=== Exam Empty-Row Cleanup (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ===\n`);

  // ── 1. autorefractometryData ──────────────────────────────────────────────
  const autorefCols = [
    "sphereOD","cylinderOD","axisOD","ucvaOD","bcvaOD","iopOD",
    "sphereOS","cylinderOS","axisOS","ucvaOS","bcvaOS","iopOS",
  ];
  const autorefWhere = allBlank(autorefCols);
  const autorefCount = await count(db, `SELECT COUNT(*) AS n FROM autorefractometryData WHERE ${autorefWhere}`);
  console.log(`autorefractometryData  — empty rows: ${autorefCount}`);
  if (EXECUTE && autorefCount > 0) {
    const deleted = await del(db, `DELETE FROM autorefractometryData WHERE ${autorefWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  // ── 2. afterRefractionData ────────────────────────────────────────────────
  const afterCols = ["sphereOD","cylinderOD","axisOD","sphereOS","cylinderOS","axisOS"];
  const afterWhere = allBlank(afterCols);
  const afterCount = await count(db, `SELECT COUNT(*) AS n FROM afterRefractionData WHERE ${afterWhere}`);
  console.log(`afterRefractionData    — empty rows: ${afterCount}`);
  if (EXECUTE && afterCount > 0) {
    const deleted = await del(db, `DELETE FROM afterRefractionData WHERE ${afterWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  // ── 3. glassesRecords ─────────────────────────────────────────────────────
  const glassesCols = ["sOD","cOD","axisOD","pdOD","addOD","bcvaOD","sOS","cOS","axisOS","pdOS","addOS","bcvaOS"];
  const glassesWhere = allBlank(glassesCols);
  const glassesCount = await count(db, `SELECT COUNT(*) AS n FROM glassesRecords WHERE ${glassesWhere}`);
  console.log(`glassesRecords         — empty rows: ${glassesCount}`);
  if (EXECUTE && glassesCount > 0) {
    const deleted = await del(db, `DELETE FROM glassesRecords WHERE ${glassesWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  // ── 4. pentacamResults ────────────────────────────────────────────────────
  const pentacamCols = [
    "k1OD","k2OD","axisOD","thinnestPointOD","apexOD","residualOD","tttOD","ablationOD",
    "k1OS","k2OS","axisOS","thinnestPointOS","apexOS","residualOS","tttOS","ablationOS",
    "pachymetryOD","pachymetryOS","notes",
  ];
  const pentacamWhere = allBlank(pentacamCols);
  const pentacamCount = await count(db, `SELECT COUNT(*) AS n FROM pentacamResults WHERE ${pentacamWhere}`);
  console.log(`pentacamResults        — empty rows: ${pentacamCount}`);
  if (EXECUTE && pentacamCount > 0) {
    const deleted = await del(db, `DELETE FROM pentacamResults WHERE ${pentacamWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  // ── 5. doctorReports ─────────────────────────────────────────────────────
  // "Empty" = all text fields blank AND diseases is NULL / '[]' / '{}'
  const reportTextCols = ["diagnosis","treatment","recommendations","clinicalOpinion","additionalNotes"];
  const reportWhere = `${allBlank(reportTextCols)} AND (diseases IS NULL OR TRIM(diseases) = '' OR TRIM(diseases) = '[]' OR TRIM(diseases) = '{}')`;
  const reportCount = await count(db, `SELECT COUNT(*) AS n FROM doctorReports WHERE ${reportWhere}`);
  console.log(`doctorReports          — empty rows: ${reportCount}`);
  if (EXECUTE && reportCount > 0) {
    const deleted = await del(db, `DELETE FROM doctorReports WHERE ${reportWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  // ── 6. examinations ───────────────────────────────────────────────────────
  // Empty exam = radiologyLabsNotes is NULL/'{}'/'' AND no linked autoref/after/glasses rows remain.
  // (pentacam & doctorReports link by visitId so they don't factor here.)
  const examWhere = `
    (radiologyLabsNotes IS NULL OR TRIM(radiologyLabsNotes) = '' OR TRIM(radiologyLabsNotes) = '{}' OR TRIM(radiologyLabsNotes) = '[]')
    AND NOT EXISTS (SELECT 1 FROM autorefractometryData a WHERE a.examinationId = examinations.id)
    AND NOT EXISTS (SELECT 1 FROM afterRefractionData af WHERE af.examinationId = examinations.id)
    AND NOT EXISTS (SELECT 1 FROM glassesRecords g WHERE g.examinationId = examinations.id)
  `;
  const examCount = await count(db, `SELECT COUNT(*) AS n FROM examinations WHERE ${examWhere}`);
  console.log(`examinations           — empty rows: ${examCount}`);
  if (EXECUTE && examCount > 0) {
    const deleted = await del(db, `DELETE FROM examinations WHERE ${examWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  // ── 7. visits ─────────────────────────────────────────────────────────────
  // Empty visit = no data linked by visitId in ANY table that uses it.
  const visitWhere = `
    NOT EXISTS (SELECT 1 FROM examinations e WHERE e.visitId = visits.id)
    AND NOT EXISTS (SELECT 1 FROM pentacamResults p WHERE p.visitId = visits.id)
    AND NOT EXISTS (SELECT 1 FROM doctorReports dr WHERE dr.visitId = visits.id)
    AND NOT EXISTS (SELECT 1 FROM prescriptions pr WHERE pr.visitId = visits.id)
    AND NOT EXISTS (SELECT 1 FROM testRequests tr WHERE tr.visitId = visits.id)
  `;
  const visitCount = await count(db, `SELECT COUNT(*) AS n FROM visits WHERE ${visitWhere}`);
  console.log(`visits                 — empty rows: ${visitCount}`);
  if (EXECUTE && visitCount > 0) {
    const deleted = await del(db, `DELETE FROM visits WHERE ${visitWhere}`);
    console.log(`  ✓ Deleted ${deleted}`);
  }

  console.log(`\n${EXECUTE ? "✅ Cleanup complete." : "ℹ️  Dry-run complete. Re-run with --execute to delete."}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
