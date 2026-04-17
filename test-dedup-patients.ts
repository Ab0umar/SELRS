import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Testing Patient Deduplication ===\n");

    const today = new Date().toISOString().split('T')[0];

    // Test each queue status
    const statuses = ["checkedIn", "next", "clinic", "treated"];

    for (const status of statuses) {
      const [visits] = await conn.query(`
        SELECT 
          p.id,
          p.patientCode,
          p.fullName,
          v.queueStatus,
          COUNT(*) as visit_count
        FROM visits v
        JOIN patients p ON v.patientId = p.id
        WHERE DATE(p.createdAt) = ? AND v.queueStatus = ?
        GROUP BY p.id, p.patientCode, p.fullName, v.queueStatus
        HAVING COUNT(*) > 1
        LIMIT 5
      `, [today, status]) as any[];

      console.log(`${status.toUpperCase()} Queue - Patients with multiple visits in same status:`);
      if (visits.length === 0) {
        console.log("  ✓ No patients with duplicate visits in this queue");
      } else {
        visits.forEach((p: any) => {
          console.log(`  ⚠️ Patient ${p.patientCode} has ${p.visit_count} visits with status "${p.queueStatus}"`);
        });
      }
      console.log();
    }

    // Check patients appearing in multiple queues (expected behavior - different visits)
    console.log("Patients appearing in MULTIPLE queue statuses (expected if they have different visits):");
    const [multiQueue] = await conn.query(`
      SELECT 
        p.id,
        p.patientCode,
        p.fullName,
        GROUP_CONCAT(DISTINCT v.queueStatus) as statuses,
        COUNT(DISTINCT v.queueStatus) as status_count
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      WHERE DATE(p.createdAt) = ?
      GROUP BY p.id, p.patientCode, p.fullName
      HAVING COUNT(DISTINCT v.queueStatus) > 1
      LIMIT 5
    `, [today]) as any[];

    if (multiQueue.length === 0) {
      console.log("  No patients in multiple queue statuses");
    } else {
      multiQueue.forEach((p: any) => {
        console.log(`  Patient ${p.patientCode}: appears in ${p.status_count} queues (${p.statuses})`);
      });
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
