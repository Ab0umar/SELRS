import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== FINAL STATE VERIFICATION ===\n");

    // Patients
    const [patientsTotal] = await conn.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT id) as unique_ids, MIN(id) as min_id, MAX(id) as max_id FROM patients`
    ) as any[];

    console.log("Patients:");
    console.log(`  Total: ${patientsTotal[0].total}`);
    console.log(`  ID Range: ${patientsTotal[0].min_id} - ${patientsTotal[0].max_id}`);
    console.log(`  Sample codes: 0001-${String(patientsTotal[0].max_id).padStart(4, '0')}`);

    // Visits
    const [visitsTotal] = await conn.query(
      `SELECT COUNT(*) as total FROM visits`
    ) as any[];

    const [visitsMatched] = await conn.query(
      `SELECT COUNT(*) as total FROM visits WHERE patientId IN (SELECT id FROM patients)`
    ) as any[];

    const [visitsOrphaned] = await conn.query(
      `SELECT COUNT(*) as total FROM visits WHERE patientId NOT IN (SELECT id FROM patients)`
    ) as any[];

    console.log(`\nVisits:`);
    console.log(`  Total: ${visitsTotal[0].total}`);
    console.log(`  Matched: ${visitsMatched[0].total}`);
    console.log(`  Orphaned: ${visitsOrphaned[0].total}`);

    // Examinations
    const [examsTotal] = await conn.query(
      `SELECT COUNT(*) as total FROM examinations`
    ) as any[];

    const [examsMatched] = await conn.query(
      `SELECT COUNT(*) as total FROM examinations WHERE patientId IN (SELECT id FROM patients)`
    ) as any[];

    const [examsOrphaned] = await conn.query(
      `SELECT COUNT(*) as total FROM examinations WHERE patientId NOT IN (SELECT id FROM patients)`
    ) as any[];

    console.log(`\nExaminations:`);
    console.log(`  Total: ${examsTotal[0].total}`);
    console.log(`  Matched: ${examsMatched[0].total}`);
    console.log(`  Orphaned: ${examsOrphaned[0].total}`);

    // Verify sequential IDs
    const [idGaps] = await conn.query(`
      SELECT COUNT(*) as gaps
      FROM (
        SELECT p1.id + 1 as expected_id
        FROM patients p1
        WHERE NOT EXISTS (SELECT 1 FROM patients p2 WHERE p2.id = p1.id + 1)
        AND p1.id < (SELECT MAX(id) FROM patients)
      ) t
    `) as any[];

    console.log(`\nID Sequence:`);
    console.log(`  Gaps: ${idGaps[0].gaps}`);

    // Verify patientCode
    const [dupCodes] = await conn.query(
      `SELECT COUNT(*) as count FROM (
        SELECT patientCode FROM patients GROUP BY patientCode HAVING COUNT(*) > 1
      ) t`
    ) as any[];

    console.log(`\nPatient Codes:`);
    console.log(`  Duplicates: ${dupCodes[0].count}`);

    // Check mapping table
    const [mappingCount] = await conn.query(
      `SELECT COUNT(*) as total FROM patient_id_mapping`
    ) as any[];

    console.log(`\nMapping Table:`);
    console.log(`  Entries: ${mappingCount[0].total}`);

    console.log(`\n✓ Verification complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
