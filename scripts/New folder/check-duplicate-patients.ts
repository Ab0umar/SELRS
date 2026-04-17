import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Checking for Duplicate Patients ===\n");

    // Check for duplicate patientCodes
    const [duplicatesByCode] = await conn.query(`
      SELECT patientCode, COUNT(*) as count
      FROM patients
      GROUP BY patientCode
      HAVING count > 1
      ORDER BY count DESC
    `) as any[];

    console.log(`Duplicate patientCodes: ${duplicatesByCode.length}\n`);

    if (duplicatesByCode.length > 0) {
      console.log("Examples:");
      duplicatesByCode.slice(0, 10).forEach((row: any) => {
        console.log(`  ${row.patientCode}: ${row.count} copies`);
      });

      // Show IDs for one duplicate
      const [sampleDup] = await conn.query(`
        SELECT id, patientCode, fullName FROM patients
        WHERE patientCode = ?
      `, [duplicatesByCode[0].patientCode]) as any[];

      console.log(`\nExample (${duplicatesByCode[0].patientCode}):`);
      sampleDup.forEach((p: any) => {
        console.log(`  ID ${p.id}: ${p.fullName}`);
      });
    }

    // Total patients
    const [totalCheck] = await conn.query(`
      SELECT COUNT(*) as total, COUNT(DISTINCT patientCode) as unique_codes
      FROM patients
    `) as any[];

    console.log(`\n\nTotal patient records: ${totalCheck[0].total}`);
    console.log(`Unique patientCodes: ${totalCheck[0].unique_codes}`);

    if (totalCheck[0].total > totalCheck[0].unique_codes) {
      console.log(`\n⚠ ${totalCheck[0].total - totalCheck[0].unique_codes} duplicate records detected`);
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
