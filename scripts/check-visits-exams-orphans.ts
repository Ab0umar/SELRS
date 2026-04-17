import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking visits and exams relationships...\n");

    // Count totals
    const [visitsTotal] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsTotal] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [patientsTotal] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    console.log(`Total counts:`);
    console.log(`  Patients: ${patientsTotal[0].count}`);
    console.log(`  Visits: ${visitsTotal[0].count}`);
    console.log(`  Exams: ${examsTotal[0].count}\n`);

    // Visits with matching patients
    const [visitsWithPatient] = await conn.query(`
      SELECT COUNT(*) as count FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
    `) as any[];

    console.log(`Visits with valid patient:`);
    console.log(`  ${visitsWithPatient[0].count}/${visitsTotal[0].count}`);
    console.log(`  Orphaned: ${visitsTotal[0].count - visitsWithPatient[0].count}\n`);

    // Exams with matching patients
    const [examsWithPatient] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations e
      INNER JOIN patients p ON e.patientId = p.id
    `) as any[];

    console.log(`Exams with valid patient:`);
    console.log(`  ${examsWithPatient[0].count}/${examsTotal[0].count}`);
    console.log(`  Orphaned: ${examsTotal[0].count - examsWithPatient[0].count}\n`);

    // Visits with exams
    const [visitsWithExams] = await conn.query(`
      SELECT COUNT(DISTINCT v.id) as count FROM visits v
      INNER JOIN examinations e ON v.id = e.visitId
    `) as any[];

    console.log(`Visits with exams:`);
    console.log(`  ${visitsWithExams[0].count}/${visitsTotal[0].count}`);
    console.log(`  Visits without exams: ${visitsTotal[0].count - visitsWithExams[0].count}\n`);

    // Exams with visits
    const [examsWithVisits] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations e
      INNER JOIN visits v ON e.visitId = v.id
    `) as any[];

    console.log(`Exams with visits:`);
    console.log(`  ${examsWithVisits[0].count}/${examsTotal[0].count}`);
    console.log(`  Exams without visits: ${examsTotal[0].count - examsWithVisits[0].count}\n`);

    // EXAMS WITHOUT VISITS (orphaned)
    const [examsWithoutVisits] = await conn.query(`
      SELECT e.id, e.patientId, p.patientCode, p.fullName
      FROM examinations e
      LEFT JOIN visits v ON e.visitId = v.id
      LEFT JOIN patients p ON e.patientId = p.id
      WHERE v.id IS NULL
      LIMIT 20
    `) as any[];

    if (examsWithoutVisits.length > 0) {
      console.log(`Exams WITHOUT visits (first 20):`);
      examsWithoutVisits.forEach((e: any) => {
        console.log(`  Exam ${e.id}: patientId=${e.patientId} (${e.patientCode} - ${e.fullName})`);
      });
      console.log();
    }

    // VISITS WITHOUT EXAMS (orphaned)
    const [visitsWithoutExams] = await conn.query(`
      SELECT v.id, v.patientId, p.patientCode, p.fullName
      FROM visits v
      LEFT JOIN examinations e ON v.id = e.visitId
      LEFT JOIN patients p ON v.patientId = p.id
      WHERE e.id IS NULL
      LIMIT 20
    `) as any[];

    if (visitsWithoutExams.length > 0) {
      console.log(`Visits WITHOUT exams (first 20):`);
      visitsWithoutExams.forEach((v: any) => {
        console.log(`  Visit ${v.id}: patientId=${v.patientId} (${v.patientCode} - ${v.fullName})`);
      });
      console.log();
    }

    // Summary
    console.log(`✓ Analysis complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
