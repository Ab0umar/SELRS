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
      `SELECT COUNT(DISTINCT patientId) as unique_patients FROM examinations`
    ) as any[];

    console.log(`Unique patients with examinations: ${result[0].unique_patients}`);

    // Also check total examinations
    const [totalResult] = await conn.query(
      `SELECT COUNT(*) as total_examinations FROM examinations`
    ) as any[];

    console.log(`Total examinations: ${totalResult[0].total_examinations}`);

    // Check for duplicate examinations per patient
    const [duplicates] = await conn.query(`
      SELECT patientId, COUNT(*) as examination_count
      FROM examinations
      GROUP BY patientId
      HAVING examination_count > 1
      ORDER BY examination_count DESC
      LIMIT 10
    `) as any[];

    if (duplicates.length > 0) {
      console.log(`\nPatients with multiple examinations:`);
      duplicates.forEach((d: any) => {
        console.log(`  Patient ${d.patientId}: ${d.examination_count} examinations`);
      });
    } else {
      console.log(`\nNo patients have duplicate examinations`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
