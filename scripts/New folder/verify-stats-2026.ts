import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Verifying 2026 Statistics ===\n");

    // Total patients in 2026
    const [total] = await conn.query(`
      SELECT COUNT(DISTINCT id) as total
      FROM patients
      WHERE YEAR(createdAt) = 2026
    `) as any[];

    console.log(`Total patients in 2026: ${total[0].total}`);

    // By service type
    const [byService] = await conn.query(`
      SELECT serviceType, COUNT(DISTINCT id) as count
      FROM patients
      WHERE YEAR(createdAt) = 2026
      GROUP BY serviceType
      ORDER BY count DESC
    `) as any[];

    console.log(`\nBy service type:`);
    let summedTotal = 0;
    byService.forEach((row: any) => {
      console.log(`  ${row.serviceType || 'null'}: ${row.count}`);
      summedTotal += row.count;
    });

    console.log(`\nSum of all service types: ${summedTotal}`);
    console.log(`Expected: 744`);
    console.log(`Match: ${summedTotal === 744 ? '✓' : '✗'}`);

    // Check which service type codes are present
    console.log(`\nAll unique service types in database:`);
    const [allServices] = await conn.query(`
      SELECT DISTINCT serviceType, COUNT(*) as count
      FROM patients
      GROUP BY serviceType
      ORDER BY count DESC
    `) as any[];

    allServices.forEach((row: any) => {
      console.log(`  ${row.serviceType || 'null'}: ${row.count} patients`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
