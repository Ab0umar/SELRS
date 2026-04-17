import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Get all patients without exams
    const [patientsWithoutExams] = await conn.query(`
      SELECT p.id, p.patientCode, p.fullName, p.lastVisit, p.createdAt
      FROM patients p
      WHERE p.id NOT IN (SELECT DISTINCT patientId FROM examinations)
      ORDER BY p.id
    `) as any[];

    console.log(`Processing ${patientsWithoutExams.length} patients without exams`);

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const patient of patientsWithoutExams) {
      try {
        // Find a visit for this patient
        const [visits] = await conn.query(
          `SELECT id, visitDate, createdAt FROM visits
           WHERE patientId = ?
           ORDER BY createdAt DESC
           LIMIT 1`,
          [patient.id]
        ) as any[];

        if (visits.length === 0) {
          skippedCount++;
          continue;
        }

        const visit = visits[0];

        // Create exam linked to this visit
        // All exam fields are optional, so we can leave them null
        const [result] = await conn.query(
          `INSERT INTO examinations (visitId, patientId, createdAt, updatedAt)
           VALUES (?, ?, ?, NOW())`,
          [
            visit.id,
            patient.id,
            visit.createdAt || patient.lastVisit || new Date()
          ]
        ) as any[];

        createdCount++;
        if (createdCount % 100 === 0) {
          console.log(`  Created ${createdCount} exams...`);
        }
      } catch (err: any) {
        errors.push(`${patient.patientCode}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Created: ${createdCount} exams`);
    console.log(`  Skipped: ${skippedCount} patients (no visits found)`);

    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      errors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    // Verify
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [patientsWithExams] = await conn.query(
      `SELECT COUNT(DISTINCT patientId) as count FROM examinations`
    ) as any[];

    console.log(`\nFinal state:`);
    console.log(`  Total exams: ${examsCount[0].count}`);
    console.log(`  Patients with exams: ${patientsWithExams[0].count}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
