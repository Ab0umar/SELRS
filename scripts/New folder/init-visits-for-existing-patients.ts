import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Get today's date for summary reporting
    const today = new Date().toISOString().split("T")[0];

    // Get ONLY patients WITHOUT ANY visits
    const [patients] = await conn.query(
      `SELECT id, patientCode, fullName, branch, lastVisit, createdAt
       FROM patients
       WHERE id NOT IN (SELECT DISTINCT patientId FROM visits)
       ORDER BY id`
    ) as any[];

    console.log(`Processing ${patients.length} patients`);

    let createdCount = 0;

    for (const patient of patients) {
      // Create a visit for existing patient with:
      // visitDate = patient.lastVisit (تاريخ الزيارة/المتابعة)
      // queueStatus = 'treated' (existing patients already treated)
      // checkedInAt = patient.createdAt (تاريخ الفحص/الكشف - examination date)
      const [result] = await conn.query(
        `INSERT INTO visits (patientId, visitDate, visitType, branch, queueStatus, checkedInAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          patient.id,
          patient.lastVisit,
          'consultation',
          patient.branch || 'examinations',
          'treated',
          patient.createdAt
        ]
      ) as any[];

      createdCount++;
      console.log(`✓ Created visit for patient ${patient.patientCode} (${patient.fullName}) - Exam date: ${patient.lastVisit}`);
    }

    console.log(`\nSummary:`);
    console.log(`  Created: ${createdCount} visits for patients without any visits`);

    // Count visits by queueStatus created today
    const [counts] = await conn.query(
      `SELECT queueStatus, COUNT(*) as count
       FROM visits
       WHERE DATE(createdAt) = ?
       GROUP BY queueStatus`,
      [today]
    ) as any[];

    console.log(`\nVisits created today (${today}):`);
    counts.forEach((c: any) => console.log(`  ${c.queueStatus}: ${c.count}`));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
