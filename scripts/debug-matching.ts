import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Debugging ID and patientCode matching...\n");

    // Check mapping table
    const [mappingSample] = await conn.query(
      `SELECT old_id, patientCode FROM patient_id_mapping_correct LIMIT 10`
    ) as any[];

    console.log("Sample from mapping table:");
    mappingSample.forEach((row: any) => {
      console.log(`  old_id=${row.old_id} -> patientCode=${row.patientCode}`);
    });

    // Check current patients
    const [patientsSample] = await conn.query(
      `SELECT id, patientCode FROM patients LIMIT 10`
    ) as any[];

    console.log("\nSample from patients table:");
    patientsSample.forEach((row: any) => {
      console.log(`  id=${row.id} -> patientCode=${row.patientCode}`);
    });

    // Check if patientCodes match
    const [mappingCodes] = await conn.query(
      `SELECT DISTINCT patientCode FROM patient_id_mapping_correct ORDER BY patientCode LIMIT 10`
    ) as any[];

    const [patientCodes] = await conn.query(
      `SELECT DISTINCT patientCode FROM patients ORDER BY patientCode LIMIT 10`
    ) as any[];

    console.log("\nMapping patientCodes (first 10):");
    mappingCodes.forEach((row: any) => console.log(`  ${row.patientCode}`));

    console.log("\nCurrent patient patientCodes (first 10):");
    patientCodes.forEach((row: any) => console.log(`  ${row.patientCode}`));

    // Count unique values
    const [mappingUnique] = await conn.query(
      `SELECT COUNT(DISTINCT patientCode) as count FROM patient_id_mapping_correct`
    ) as any[];

    const [patientsUnique] = await conn.query(
      `SELECT COUNT(DISTINCT patientCode) as count FROM patients`
    ) as any[];

    console.log(`\nUnique patientCodes:`);
    console.log(`  Mapping: ${mappingUnique[0].count}`);
    console.log(`  Patients: ${patientsUnique[0].count}`);

    // Check for matching patientCodes
    const [matchingCodes] = await conn.query(`
      SELECT COUNT(DISTINCT m.patientCode) as count
      FROM patient_id_mapping_correct m
      INNER JOIN patients p ON m.patientCode = p.patientCode
    `) as any[];

    console.log(`\nPatientCodes that exist in both tables: ${matchingCodes[0].count}`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
