import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    console.log(`Marking all visits except ${today} as treated...`);

    // Update all visits that are NOT from today to queueStatus = 'treated'
    const [result] = await conn.query(
      `UPDATE visits
       SET queueStatus = 'treated'
       WHERE DATE(visitDate) != ? AND queueStatus != 'treated'`,
      [today]
    ) as any[];

    const affectedRows = (result as any).affectedRows;
    console.log(`✓ Updated ${affectedRows} visits to treated`);

    // Get summary
    const [summary] = await conn.query(
      `SELECT DATE(visitDate) as visit_date, queueStatus, COUNT(*) as count
       FROM visits
       GROUP BY DATE(visitDate), queueStatus
       ORDER BY DATE(visitDate) DESC`
    ) as any[];

    console.log(`\nVisits summary by date and status:`);
    summary.forEach((row: any) => {
      console.log(`  ${row.visit_date}: ${row.queueStatus} = ${row.count}`);
    });
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
