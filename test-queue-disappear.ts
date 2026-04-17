import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Testing Queue Status Visibility ===\n");

    const today = new Date().toISOString().split('T')[0];
    
    // Get a patient with multiple visits in different states
    const [visits] = await conn.query(`
      SELECT 
        v.id,
        v.queueStatus,
        p.patientCode,
        p.fullName,
        TIME(v.checkedInAt) as checked_in,
        TIME(v.movedToNextAt) as moved_to_next,
        TIME(v.movedToClinicAt) as moved_to_clinic,
        TIME(v.treatedAt) as treated
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      WHERE DATE(p.createdAt) = ?
      ORDER BY p.id, v.visitDate
      LIMIT 10
    `, [today]) as any[];

    if (visits.length === 0) {
      console.log("No visits found for today");
      return;
    }

    console.log(`Found ${visits.length} sample visits today:\n`);
    
    // Group by patient
    const patientMap = new Map();
    visits.forEach(v => {
      if (!patientMap.has(v.patientCode)) {
        patientMap.set(v.patientCode, []);
      }
      patientMap.get(v.patientCode).push(v);
    });

    for (const [patientCode, patientVisits] of Array.from(patientMap.entries()).slice(0, 3)) {
      console.log(`Patient ${patientCode}:`);
      patientVisits.forEach((v: any, i: number) => {
        console.log(`  Visit ${i + 1}: Status=${v.queueStatus}`);
      });
      
      // Check if patient appears in multiple queues
      const statuses = new Set(patientVisits.map((v: any) => v.queueStatus));
      if (statuses.size > 1) {
        console.log(`  ⚠️ WARNING: This patient has visits in MULTIPLE queue statuses: ${Array.from(statuses).join(', ')}`);
      } else if (statuses.size === 1) {
        console.log(`  ✓ All visits in same queue status: ${Array.from(statuses)[0]}`);
      }
      console.log();
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
