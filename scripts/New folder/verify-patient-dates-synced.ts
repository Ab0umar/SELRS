import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Verifying Patient Dates Were Synced ===\n");

    // Check if createdAt values were updated
    const [stats] = await conn.query(`
      SELECT
        COUNT(*) as total_patients,
        SUM(CASE WHEN createdAt IS NOT NULL THEN 1 ELSE 0 END) as with_createdAt,
        SUM(CASE WHEN createdAt = CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as current_timestamp_count,
        MIN(createdAt) as min_createdAt,
        MAX(createdAt) as max_createdAt
      FROM patients
    `) as any[];

    console.log("Patient createdAt status:");
    console.log(`  Total patients: ${stats[0].total_patients}`);
    console.log(`  With createdAt: ${stats[0].with_createdAt}`);
    console.log(`  Min createdAt: ${stats[0].min_createdAt}`);
    console.log(`  Max createdAt: ${stats[0].max_createdAt}`);

    // Sample patients with their dates
    const [samples] = await conn.query(`
      SELECT
        id,
        patientCode,
        fullName,
        createdAt,
        updatedAt,
        lastVisit
      FROM patients
      WHERE createdAt IS NOT NULL
      LIMIT 10
    `) as any[];

    console.log("\nSample patients:");
    samples.forEach((p: any) => {
      console.log(`  ${p.patientCode}: createdAt=${p.createdAt}, lastVisit=${p.lastVisit}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
