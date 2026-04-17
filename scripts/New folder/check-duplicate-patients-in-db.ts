import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Checking for Duplicate Patients in Database ===\n");

    // Check total patients vs unique by code
    const [totalStats] = await conn.query(`
      SELECT
        COUNT(*) as total_rows,
        COUNT(DISTINCT id) as unique_ids,
        COUNT(DISTINCT patientCode) as unique_codes
      FROM patients
    `) as any[];

    console.log("Patient table statistics:");
    console.log(`  Total rows: ${totalStats[0].total_rows}`);
    console.log(`  Unique IDs: ${totalStats[0].unique_ids}`);
    console.log(`  Unique patient codes: ${totalStats[0].unique_codes}`);

    // Check for duplicate patient codes
    const [duplicates] = await conn.query(`
      SELECT
        patientCode,
        COUNT(*) as count,
        GROUP_CONCAT(id) as ids
      FROM patients
      GROUP BY patientCode
      HAVING count > 1
    `) as any[];

    if (duplicates.length > 0) {
      console.log(`\n⚠️ Found ${duplicates.length} duplicate patient codes:`);
      duplicates.slice(0, 10).forEach((row: any) => {
        console.log(`  Code ${row.patientCode}: ${row.count} copies (IDs: ${row.ids})`);
      });
    } else {
      console.log(`\n✓ No duplicate patient codes found`);
    }

    // Check patientServiceEntries per patient
    const [serviceStats] = await conn.query(`
      SELECT
        patientId,
        p.patientCode,
        p.fullName,
        COUNT(*) as service_count
      FROM patientServiceEntries pse
      JOIN patients p ON pse.patientId = p.id
      GROUP BY patientId
      HAVING service_count > 1
      ORDER BY service_count DESC
      LIMIT 10
    `) as any[];

    console.log(`\nPatients with multiple service entries:`);
    serviceStats.forEach((row: any) => {
      console.log(`  ${row.patientCode} (${row.fullName}): ${row.service_count} services`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
