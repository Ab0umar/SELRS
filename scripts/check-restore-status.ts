import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Check patients
    const [patients] = await conn.query(`SELECT COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM patients`) as any[];
    console.log(`Patients: ${patients[0].count} (IDs: ${patients[0].min_id}-${patients[0].max_id})`);

    // Check visits
    const [visitsTotal] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [visitsMatched] = await conn.query(`SELECT COUNT(*) as count FROM visits WHERE patientId IN (SELECT id FROM patients)`) as any[];
    const [visitsOrphaned] = await conn.query(`SELECT COUNT(*) as count FROM visits WHERE patientId NOT IN (SELECT id FROM patients)`) as any[];

    console.log(`\nVisits: ${visitsTotal[0].count} total`);
    console.log(`  Matched: ${visitsMatched[0].count}`);
    console.log(`  Orphaned (old IDs): ${visitsOrphaned[0].count}`);

    // Check examinations
    const [examsTotal] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [examsMatched] = await conn.query(`SELECT COUNT(*) as count FROM examinations WHERE patientId IN (SELECT id FROM patients)`) as any[];
    const [examsOrphaned] = await conn.query(`SELECT COUNT(*) as count FROM examinations WHERE patientId NOT IN (SELECT id FROM patients)`) as any[];

    console.log(`\nExaminations: ${examsTotal[0].count} total`);
    console.log(`  Matched: ${examsMatched[0].count}`);
    console.log(`  Orphaned (old IDs): ${examsOrphaned[0].count}`);

    // Sample orphaned visits
    const [sampleVisits] = await conn.query(`
      SELECT DISTINCT patientId FROM visits
      WHERE patientId NOT IN (SELECT id FROM patients)
      LIMIT 5
    `) as any[];

    console.log(`\nSample orphaned visit patientIds: ${sampleVisits.map((v: any) => v.patientId).join(', ')}`);

    // Sample current patients
    const [samplePatients] = await conn.query(`
      SELECT id, patientCode FROM patients
      LIMIT 5
    `) as any[];

    console.log(`\nSample current patients:`);
    samplePatients.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
