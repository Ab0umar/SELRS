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

    console.log(`Syncing existing visits createdAt with visitDate (except today)...`);

    // Update all visits that are NOT from today: set createdAt = visitDate
    const [result] = await conn.query(
      `UPDATE visits
       SET createdAt = visitDate
       WHERE DATE(visitDate) != ?`,
      [today]
    ) as any[];

    const affectedRows = (result as any).affectedRows;
    console.log(`✓ Updated ${affectedRows} visits (createdAt = visitDate)`);

    // Verify
    const [sample] = await conn.query(
      `SELECT id, patientId, visitDate, createdAt, queueStatus
       FROM visits
       WHERE DATE(visitDate) != ?
       LIMIT 5`,
      [today]
    ) as any[];

    console.log(`\nSample of updated visits:`);
    sample.forEach((v: any) => {
      console.log(`  Visit ${v.id}: visitDate=${v.visitDate}, createdAt=${v.createdAt}, status=${v.queueStatus}`);
    });
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
