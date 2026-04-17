import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Set queueStatus to 'checkedIn' for all visits that don't have it set
    const [result] = await conn.query(
      `UPDATE visits
       SET queueStatus = 'checkedIn',
           checkedInAt = visitDate
       WHERE queueStatus IS NULL OR queueStatus = ''`
    ) as any[];

    console.log(`✓ Updated ${result.affectedRows} visits with default queue status`);

    // Check today's visits
    const today = (() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    })();

    const [todayVisits] = await conn.query(
      `SELECT COUNT(*) as count, queueStatus
       FROM visits
       WHERE DATE(visitDate) = ?
       GROUP BY queueStatus`,
      [today]
    ) as any[];

    console.log(`\nToday's visits (${today}):`);
    if (todayVisits.length === 0) {
      console.log("  No visits found for today");
    } else {
      for (const row of todayVisits) {
        console.log(`  ${row.queueStatus}: ${row.count} visits`);
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
