import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Updating visits and examinations with new patient IDs...\n");

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Update visits
    console.log("Updating visits...");
    const [visitsResult] = await conn.query(`
      UPDATE visits v
      INNER JOIN patient_id_mapping m ON v.patientId = m.old_id
      INNER JOIN patients p ON m.patientCode = p.patientCode
      SET v.patientId = p.id
    `) as any[];

    const visitsUpdated = (visitsResult as any).affectedRows;
    console.log(`  ✓ Updated ${visitsUpdated} visits`);

    // Update examinations
    console.log("Updating examinations...");
    const [examsResult] = await conn.query(`
      UPDATE examinations e
      INNER JOIN patient_id_mapping m ON e.patientId = m.old_id
      INNER JOIN patients p ON m.patientCode = p.patientCode
      SET e.patientId = p.id
    `) as any[];

    const examsUpdated = (examsResult as any).affectedRows;
    console.log(`  ✓ Updated ${examsUpdated} examinations`);

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Check for orphaned records
    const [orphanedVisits] = await conn.query(
      `SELECT COUNT(*) as count FROM visits WHERE patientId NOT IN (SELECT id FROM patients)`
    ) as any[];

    const [orphanedExams] = await conn.query(
      `SELECT COUNT(*) as count FROM examinations WHERE patientId NOT IN (SELECT id FROM patients)`
    ) as any[];

    console.log(`\nOrphaned records (not matched with patients):`);
    console.log(`  Visits: ${orphanedVisits[0].count}`);
    console.log(`  Examinations: ${orphanedExams[0].count}`);

    // Verify sample
    const [sampleVisits] = await conn.query(`
      SELECT v.id, v.patientId, p.patientCode, p.fullName
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      LIMIT 5
    `) as any[];

    console.log(`\nSample updated visits:`);
    sampleVisits.forEach((v: any) => {
      console.log(`  Visit ${v.id}: patientId=${v.patientId} (${v.patientCode} - ${v.fullName})`);
    });

    console.log(`\n✓ Update complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
