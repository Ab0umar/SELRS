/**
 * Fix visits stored at exactly midnight (00:00:00) — a signature of the
 * "date-only picker -> local midnight Date" bug where UTC-based display
 * code (.toISOString().split("T")[0]) rolled the date back by one day on
 * servers in UTC+2/+3 (Cairo). The fix in the app code now stores new
 * visits at noon instead of midnight; this script nudges the time-of-day
 * of already-stored midnight rows to noon too, WITHOUT changing which
 * calendar day they represent, so all display code reads them correctly.
 *
 * Dry-run by default — shows counts only.
 * Pass --execute to actually update.
 *
 * Usage:
 *   npx tsx server/scripts/fix-midnight-visit-dates.ts           (dry-run)
 *   npx tsx server/scripts/fix-midnight-visit-dates.ts --execute (update)
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

config();

const EXECUTE = process.argv.includes("--execute");

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  console.log(
    `\n=== Fix Midnight Visit Dates (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ===\n`,
  );

  const countRows = await db.execute(
    sql.raw(
      `SELECT COUNT(*) AS n FROM visits WHERE TIME(visitDate) = '00:00:00'`,
    ),
  );
  const affected = Number(
    (countRows as any)[0]?.[0]?.n ?? (countRows as any)[0]?.n ?? 0,
  );
  console.log(`visits at exactly 00:00:00 — ${affected}`);

  if (EXECUTE && affected > 0) {
    const result = await db.execute(
      sql.raw(
        `UPDATE visits SET visitDate = DATE(visitDate) + INTERVAL 12 HOUR WHERE TIME(visitDate) = '00:00:00'`,
      ),
    );
    const updated = Number((result as any)[0]?.affectedRows ?? 0);
    console.log(`  ✓ Updated ${updated} row(s) to 12:00:00 on the same date`);
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
