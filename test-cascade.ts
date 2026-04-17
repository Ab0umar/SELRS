import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Testing Cascade Queue Status ===\n");

    // Create test visits with specific times for testing
    const testPatientId = 1093;
    const today = "2026-04-12";

    // Get current visits for this patient on this date
    const [visits] = await conn.query(`
      SELECT
        v.id,
        v.queueStatus,
        TIME(v.checkedInAt) as checked_in_time,
        TIME(v.movedToNextAt) as moved_to_next_time,
        TIME(v.movedToClinicAt) as moved_to_clinic_time,
        TIME(v.treatedAt) as treated_time
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      WHERE v.patientId = ? AND DATE(p.createdAt) = ?
      ORDER BY v.visitDate
    `, [testPatientId, today]) as any[];

    console.log(`Found ${visits.length} visits for patient ${testPatientId}:`);
    visits.forEach((v: any, i: number) => {
      console.log(`\nVisit ${i + 1}:`);
      console.log(`  Status: ${v.queueStatus}`);
      console.log(`  Checked in: ${v.checked_in_time}`);
      console.log(`  Moved to next: ${v.moved_to_next_time}`);
      console.log(`  Moved to clinic: ${v.moved_to_clinic_time}`);
      console.log(`  Treated: ${v.treated_time}`);
      
      // Calculate time differences
      if (v.checked_in_time && v.moved_to_next_time) {
        const [h1, m1, s1] = v.checked_in_time.split(':').map(Number);
        const [h2, m2, s2] = v.moved_to_next_time.split(':').map(Number);
        const diff1 = (h2 * 60 + m2) - (h1 * 60 + m1);
        console.log(`  Time diff (checkedIn → next): ${diff1} min`);
      }
      if (v.moved_to_next_time && v.moved_to_clinic_time) {
        const [h1, m1, s1] = v.moved_to_next_time.split(':').map(Number);
        const [h2, m2, s2] = v.moved_to_clinic_time.split(':').map(Number);
        const diff2 = (h2 * 60 + m2) - (h1 * 60 + m1);
        console.log(`  Time diff (next → clinic): ${diff2} min`);
      }
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
