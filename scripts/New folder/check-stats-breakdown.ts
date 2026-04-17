import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Checking Stats Breakdown ===\n");

    // Breakdown by location type for patients with 2026 service entries
    const [breakdown] = await conn.query(`
      SELECT
        p.locationType,
        COUNT(DISTINCT p.id) as patient_count
      FROM patientServiceEntries pse
      JOIN patients p ON pse.patientId = p.id
      WHERE YEAR(COALESCE(pse.serviceDate, pse.updatedAt)) = 2026
      GROUP BY p.locationType
    `) as any[];

    console.log("Breakdown by location type (2026 service entries):");
    let total = 0;
    breakdown.forEach((row: any) => {
      console.log(`  ${row.locationType || 'null'}: ${row.patient_count}`);
      total += row.patient_count;
    });
    console.log(`  Total: ${total}`);

    // Check Lasik
    const [lasik] = await conn.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM patientServiceEntries pse
      JOIN patients p ON pse.patientId = p.id
      WHERE YEAR(COALESCE(pse.serviceDate, pse.updatedAt)) = 2026
      AND LOWER(TRIM(pse.serviceCode)) IN ('1501', '1502')
    `) as any[];

    console.log(`\nLasik patients (service codes 1501/1502): ${lasik[0].count}`);

    // Sample breakdown
    console.log(`\nExpected from your stats: Total: 744, Center: 332, External: 412, Lasik: 49`);
    console.log(`Actual from database: Total: ${total}, Lasik: ${lasik[0].count}`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
