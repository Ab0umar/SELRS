import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Verifying restored patients match mapping...\n");

    // Count current patients
    const [patientsCount] = await conn.query(
      `SELECT COUNT(*) as count FROM patients`
    ) as any[];

    // Count mapping entries
    const [mappingCount] = await conn.query(
      `SELECT COUNT(*) as count FROM patient_id_mapping_correct`
    ) as any[];

    console.log(`Current patients: ${patientsCount[0].count}`);
    console.log(`Mapping entries: ${mappingCount[0].count}\n`);

    // Check if current patients match mapping by patientCode
    const [matches] = await conn.query(`
      SELECT COUNT(*) as count
      FROM patients p
      INNER JOIN patient_id_mapping_correct m ON p.patientCode = m.patientCode
    `) as any[];

    console.log(`Patients matching mapping by patientCode: ${matches[0].count}`);

    // Sample
    const [sample] = await conn.query(`
      SELECT p.id, p.patientCode, p.fullName, m.old_id
      FROM patients p
      LEFT JOIN patient_id_mapping_correct m ON p.patientCode = m.patientCode
      LIMIT 5
    `) as any[];

    console.log(`\nSample current patients with mapping:`);
    sample.forEach((row: any) => {
      console.log(`  ID ${row.id}: ${row.patientCode} | Old ID: ${row.old_id} (${row.fullName})`);
    });

    // Check visits coverage
    const [visitsMatched] = await conn.query(`
      SELECT COUNT(*) as count
      FROM visits v
      INNER JOIN patient_id_mapping_correct m ON v.patientId = m.old_id
      INNER JOIN patients p ON m.patientCode = p.patientCode
    `) as any[];

    console.log(`\nVisits that can be matched: ${visitsMatched[0].count}`);

    console.log(`\n✓ Verification complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
