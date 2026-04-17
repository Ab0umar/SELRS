import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Checking patientServiceEntries Dates ===\n");

    // Check serviceDate vs updatedAt in patientServiceEntries
    const [stats] = await conn.query(`
      SELECT
        COUNT(*) as total_entries,
        SUM(CASE WHEN serviceDate IS NOT NULL THEN 1 ELSE 0 END) as with_serviceDate,
        SUM(CASE WHEN serviceDate IS NULL THEN 1 ELSE 0 END) as null_serviceDate,
        MIN(COALESCE(serviceDate, updatedAt)) as min_date,
        MAX(COALESCE(serviceDate, updatedAt)) as max_date
      FROM patientServiceEntries
    `) as any[];

    console.log("patientServiceEntries statistics:");
    console.log(`  Total entries: ${stats[0].total_entries}`);
    console.log(`  With serviceDate: ${stats[0].with_serviceDate}`);
    console.log(`  NULL serviceDate: ${stats[0].null_serviceDate}`);
    console.log(`  Min date: ${stats[0].min_date}`);
    console.log(`  Max date: ${stats[0].max_date}`);

    // Count entries in 2026
    const [count2026] = await conn.query(`
      SELECT
        COUNT(*) as count,
        COUNT(DISTINCT patientId) as unique_patients
      FROM patientServiceEntries
      WHERE YEAR(COALESCE(serviceDate, updatedAt)) = 2026
    `) as any[];

    console.log(`\nEntries in 2026:`);
    console.log(`  Service entries: ${count2026[0].count}`);
    console.log(`  Unique patients: ${count2026[0].unique_patients}`);

    // Sample entries
    const [samples] = await conn.query(`
      SELECT
        patientId,
        serviceCode,
        serviceDate,
        updatedAt,
        COALESCE(serviceDate, updatedAt) as effective_date
      FROM patientServiceEntries
      LIMIT 5
    `) as any[];

    console.log(`\nSample entries:`);
    samples.forEach((row: any) => {
      console.log(`  Patient ${row.patientId}, Service ${row.serviceCode}: serviceDate=${row.serviceDate}, effective=${row.effective_date}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
