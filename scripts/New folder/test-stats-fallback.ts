import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Testing Stats Query with Fallback ===\n");

    const [result] = await conn.query(`
      SELECT
        COUNT(DISTINCT p.id) as total,
        COUNT(DISTINCT CASE WHEN p.locationType = 'center' THEN p.id END) as center,
        COUNT(DISTINCT CASE WHEN p.locationType = 'external' THEN p.id END) as external,
        COUNT(DISTINCT CASE WHEN LOWER(TRIM(pse.serviceCode)) IN ('1501', '1502') THEN p.id END) as lasik
      FROM patients p
      LEFT JOIN patientServiceEntries pse ON pse.patientId = p.id
      WHERE YEAR(COALESCE(pse.serviceDate, DATE(pse.updatedAt), DATE(p.createdAt))) = 2026
    `) as any[];

    console.log("Stats 2026 with LEFT JOIN and createdAt fallback:");
    console.log(`  Total: ${result[0].total}`);
    console.log(`  Center: ${result[0].center}`);
    console.log(`  External: ${result[0].external}`);
    console.log(`  Lasik: ${result[0].lasik}`);

    if (result[0].total === 1115) {
      console.log(`\n✓ FIXED! Now shows 1115 total!`);
    } else {
      console.log(`\n⚠ Still showing ${result[0].total} instead of 1115`);
    }
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
