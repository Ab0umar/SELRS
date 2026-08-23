/**
 * Fix visits whose visitDate calendar day is exactly one day off from the
 * real Cairo-local calendar day of their createdAt timestamp — the
 * signature of the "date-only picker -> local midnight -> UTC read" bug
 * (see server/routers/medical-examinations.ts / medical-ops.ts fixes).
 *
 * createdAt is written via defaultNow() and is NOT affected by the bug, so
 * it's used as ground truth. Only rows off by EXACTLY 1 day are touched —
 * larger gaps are left alone since those are legitimate backdated visits
 * (manual date corrections), not the bug.
 *
 * Dry-run by default — shows counts and a sample only.
 * Pass --execute to actually update.
 *
 * Usage:
 *   npx tsx server/scripts/fix-visit-date-off-by-one.ts           (dry-run)
 *   npx tsx server/scripts/fix-visit-date-off-by-one.ts --execute (update)
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

config();

const EXECUTE = process.argv.includes("--execute");

const WHERE_CLAUSE = `
  ABS(DATEDIFF(DATE(visitDate), DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')))) = 1
`;

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  console.log(
    `\n=== Fix Visit Dates Off By One Day (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ===\n`,
  );

  const countRows = await db.execute(
    sql.raw(`SELECT COUNT(*) AS n FROM visits WHERE ${WHERE_CLAUSE}`),
  );
  const affected = Number(
    (countRows as any)[0]?.[0]?.n ?? (countRows as any)[0]?.n ?? 0,
  );
  console.log(`Visits exactly 1 day off from createdAt's Cairo day: ${affected}`);

  const sampleRows = await db.execute(
    sql.raw(`
      SELECT id, patientId, visitDate, createdAt,
             DATE(visitDate) AS oldDay,
             DATE(CONVERT_TZ(createdAt,'+00:00','+03:00')) AS correctedDay
      FROM visits WHERE ${WHERE_CLAUSE}
      ORDER BY id DESC LIMIT 10
    `),
  );
  console.log("\nSample (up to 10):");
  console.table((sampleRows as any)[0] ?? sampleRows);

  if (EXECUTE && affected > 0) {
    const result = await db.execute(
      sql.raw(`
        UPDATE visits
        SET visitDate = TIMESTAMP(DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')), '12:00:00')
        WHERE ${WHERE_CLAUSE}
      `),
    );
    const updated = Number((result as any)[0]?.affectedRows ?? 0);
    console.log(`\n  ✓ Updated ${updated} row(s) — visitDate corrected to createdAt's Cairo day at 12:00:00`);
  }

  console.log(
    `\n${EXECUTE ? "✅ Fix complete." : "ℹ️  Dry-run complete. Re-run with --execute to update."}\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
