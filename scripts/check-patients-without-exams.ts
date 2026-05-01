import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking patients without exams...\n");

    // Get total patients
    const [totalPatients] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    // Get patients with at least one exam
    const [patientsWithExams] = await conn.query(`
      SELECT COUNT(DISTINCT patientId) as count FROM examinations
    `) as any[];

    const patientsWithout = totalPatients[0].count - patientsWithExams[0].count;

    console.log(`Total patients: ${totalPatients[0].count}`);
    console.log(`Patients WITH exams: ${patientsWithExams[0].count}`);
    console.log(`Patients WITHOUT exams: ${patientsWithout}\n`);

    // Get sample of patients without exams
    const [patientsNoExams] = await conn.query(`
      SELECT p.id, p.patientCode, p.fullName
      FROM patients p
      WHERE p.id NOT IN (SELECT DISTINCT patientId FROM examinations)
      ORDER BY p.id
      LIMIT 20
    `) as any[];

    console.log(`Sample of patients without exams (first 20):`);
    patientsNoExams.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    console.log(`\n✓ Analysis complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
