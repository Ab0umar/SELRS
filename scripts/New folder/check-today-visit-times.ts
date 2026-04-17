import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`=== Checking Visit Times for ${today} ===\n`);

    // Get visits created today with their times
    const [visits] = await conn.query(`
      SELECT
        v.id,
        p.patientCode,
        p.fullName,
        DATE(p.createdAt) as patient_created_date,
        TIME(p.createdAt) as patient_created_time,
        DATE(v.visitDate) as visit_date,
        TIME(v.visitDate) as visit_time,
        TIME(v.checkedInAt) as checked_in_time,
        v.queueStatus,
        TIME(v.movedToNextAt) as moved_to_next_time,
        TIME(v.movedToClinicAt) as moved_to_clinic_time,
        TIME(v.treatedAt) as treated_time
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      WHERE DATE(p.createdAt) = ?
      LIMIT 10
    `, [today]) as any[];

    if (visits.length === 0) {
      console.log(`No visits found for patients created on ${today}`);

      // Check what dates we have
      const [recentDates] = await conn.query(`
        SELECT DISTINCT DATE(p.createdAt) as date
        FROM patients p
        ORDER BY p.createdAt DESC
        LIMIT 5
      `) as any[];

      console.log(`\nMost recent patient creation dates:`);
      recentDates.forEach((row: any) => {
        console.log(`  ${row.date}`);
      });
    } else {
      console.log(`Found ${visits.length} visits:\n`);
      visits.forEach((v: any) => {
        console.log(`Patient ${v.patientCode}: ${v.fullName}`);
        console.log(`  Patient created: ${v.patient_created_date} ${v.patient_created_time}`);
        console.log(`  Visit date: ${v.visit_date} ${v.visit_time}`);
        console.log(`  Checked in: ${v.checked_in_time}`);
        console.log(`  Queue status: ${v.queueStatus}`);
        console.log(`  Moved to next: ${v.moved_to_next_time}`);
        console.log(`  Moved to clinic: ${v.moved_to_clinic_time}`);
        console.log(`  Treated: ${v.treated_time}`);
        console.log();
      });
    }

    // Check auto-advance logic
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    console.log(`\n=== Auto-Advance Logic Check ===`);
    console.log(`Now: ${now.toISOString()}`);
    console.log(`5 min ago: ${fiveMinutesAgo.toISOString()}`);
    console.log(`10 min ago: ${tenMinutesAgo.toISOString()}`);

    const [checkedInOld] = await conn.query(`
      SELECT COUNT(*) as count FROM visits
      WHERE queueStatus = 'checkedIn'
      AND DATE(visitDate) = ?
      AND checkedInAt <= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `, [today]) as any[];

    console.log(`\nPatients ready to auto-advance (checkedIn > 5 min): ${checkedInOld[0].count}`);

    const [nextOld] = await conn.query(`
      SELECT COUNT(*) as count FROM visits
      WHERE queueStatus = 'next'
      AND DATE(visitDate) = ?
      AND movedToNextAt <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
    `, [today]) as any[];

    console.log(`Patients ready to auto-advance (next > 10 min): ${nextOld[0].count}`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
