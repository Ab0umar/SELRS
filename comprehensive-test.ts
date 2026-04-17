import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Comprehensive Queue Cascade Test ===\n");

    const today = new Date().toISOString().split('T')[0];

    // Show stats
    const [stats] = await conn.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN queueStatus = 'checkedIn' THEN 1 ELSE 0 END) as checkedIn,
        SUM(CASE WHEN queueStatus = 'next' THEN 1 ELSE 0 END) as next,
        SUM(CASE WHEN queueStatus = 'clinic' THEN 1 ELSE 0 END) as clinic,
        SUM(CASE WHEN queueStatus = 'treated' THEN 1 ELSE 0 END) as treated
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      WHERE DATE(p.createdAt) = ?
    `, [today]) as any[];

    console.log("Queue Status Summary:");
    console.log(`  Total visits: ${stats[0].total}`);
    console.log(`  Checked in: ${stats[0].checkedIn || 0}`);
    console.log(`  Next: ${stats[0].next || 0}`);
    console.log(`  Clinic: ${stats[0].clinic || 0}`);
    console.log(`  Treated: ${stats[0].treated || 0}\n`);

    // Show timing analysis - sample visits with timing
    const [timings] = await conn.query(`
      SELECT
        v.id,
        v.queueStatus,
        TIME(v.checkedInAt) as checked_in,
        TIME(v.movedToNextAt) as moved_to_next,
        TIME(v.movedToClinicAt) as moved_to_clinic,
        TIME(v.treatedAt) as treated
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      WHERE DATE(p.createdAt) = ?
      ORDER BY v.visitDate
      LIMIT 10
    `, [today]) as any[];

    console.log("Sample Visits Timing:");
    timings.forEach((v: any, i: number) => {
      console.log(`Visit ${i + 1} (${v.queueStatus}):`);
      console.log(`  checked_in: ${v.checked_in}`);
      if (v.moved_to_next) {
        console.log(`  moved_to_next: ${v.moved_to_next}`);
        
        // Calculate time differences
        if (v.checked_in && v.moved_to_next) {
          const [h1, m1] = v.checked_in.split(':').map(Number);
          const [h2, m2] = v.moved_to_next.split(':').map(Number);
          const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          console.log(`  → Time to next: ${diff} min (expected: 5)`);
        }
      }
      if (v.moved_to_clinic) {
        console.log(`  moved_to_clinic: ${v.moved_to_clinic}`);
        
        if (v.moved_to_next && v.moved_to_clinic) {
          const [h1, m1] = v.moved_to_next.split(':').map(Number);
          const [h2, m2] = v.moved_to_clinic.split(':').map(Number);
          const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          console.log(`  → Time from next to clinic: ${diff} min (expected: 10)`);
        }
      }
      if (v.treated) {
        console.log(`  treated: ${v.treated}`);
      }
      console.log();
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
