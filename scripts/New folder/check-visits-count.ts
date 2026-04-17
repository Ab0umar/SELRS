import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const [result] = await conn.query(
      `SELECT COUNT(DISTINCT patientId) as unique_patients FROM visits`
    ) as any[];

    console.log(`Unique patients with visits: ${result[0].unique_patients}`);

    // Also check total visits
    const [totalResult] = await conn.query(
      `SELECT COUNT(*) as total_visits FROM visits`
    ) as any[];

    console.log(`Total visits: ${totalResult[0].total_visits}`);

    // Check for duplicate visits per patient
    const [duplicates] = await conn.query(`
      SELECT patientId, COUNT(*) as visit_count
      FROM visits
      GROUP BY patientId
      HAVING visit_count > 1
      ORDER BY visit_count DESC
      LIMIT 10
    `) as any[];

    if (duplicates.length > 0) {
      console.log(`\nPatients with multiple visits:`);
      duplicates.forEach((d: any) => {
        console.log(`  Patient ${d.patientId}: ${d.visit_count} visits`);
      });
    } else {
      console.log(`\nNo patients have duplicate visits`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
