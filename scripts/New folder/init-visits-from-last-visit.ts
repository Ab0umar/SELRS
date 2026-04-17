import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Get the date range - find the date with most patient lastVisits
    const [dateRows] = await conn.query(
      `SELECT DATE(lastVisit) as visit_date, COUNT(*) as count
       FROM patients
       WHERE lastVisit IS NOT NULL
       GROUP BY DATE(lastVisit)
       ORDER BY count DESC
       LIMIT 5`
    ) as any[];

    if (dateRows.length === 0) {
      console.log("No patient lastVisit dates found");
      return;
    }

    console.log("Dates with most patients:");
    dateRows.forEach((r: any) => console.log(`  ${r.visit_date}: ${r.count} patients`));

    const targetDate = dateRows[0].visit_date;
    console.log(`\nCreating visits for date: ${targetDate}`);

    // Get ONLY patients WITHOUT ANY visits
    const [patients] = await conn.query(
      `SELECT id, patientCode, fullName, branch, lastVisit, createdAt
       FROM patients
       WHERE id NOT IN (SELECT DISTINCT patientId FROM visits)
       ORDER BY id`
    ) as any[];

    console.log(`\nProcessing ${patients.length} patients without visits\n`);

    let createdCount = 0;

    for (const patient of patients) {
      // Create a visit for existing patient with:
      // visitDate = patient.lastVisit (تاريخ الزيارة/المتابعة)
      // queueStatus = 'treated' (existing patients already treated)
      // checkedInAt = patient.createdAt (تاريخ الفحص/الكشف - examination date)
      try {
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
        if (createdCount % 100 === 0) {
          console.log(`  Created ${createdCount} visits...`);
        }
      } catch (err: any) {
        console.error(`Error for patient ${patient.patientCode}: ${err.message.slice(0, 100)}`);
      }
    }

    console.log(`\n✓ Created ${createdCount} visits for patients without any visits`);

    // Count visits by queueStatus for the target date
    const [counts] = await conn.query(
      `SELECT queueStatus, COUNT(*) as count
       FROM visits
       WHERE DATE(createdAt) = ?
       GROUP BY queueStatus`,
      [targetDate]
    ) as any[];

    console.log(`\nVisits for ${targetDate}:`);
    counts.forEach((c: any) => console.log(`  ${c.queueStatus}: ${c.count}`));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
