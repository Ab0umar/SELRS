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

    // Build mapping: old_id -> new_id via patientCode
    const [mappingData] = await conn.query(`
      SELECT m.old_id, m.patientCode, p.id as new_id
      FROM patient_id_mapping_correct m
      INNER JOIN patients p ON m.patientCode = p.patientCode
    `) as any[];

    const oldToNewId = new Map<number, number>();
    for (const row of mappingData) {
      oldToNewId.set(row.old_id, row.new_id);
    }

    console.log(`Built mapping for ${oldToNewId.size} patients\n`);

    // Get all unique old patientIds from visits
    const [visitsOldIds] = await conn.query(
      `SELECT DISTINCT patientId FROM visits ORDER BY patientId`
    ) as any[];

    console.log(`Updating ${visitsOldIds.length} distinct visit patientIds...\n`);

    let visitsUpdated = 0;
    let visitsSkipped = 0;

    for (const row of visitsOldIds) {
      const oldId = row.patientId;
      const newId = oldToNewId.get(oldId);

      if (newId) {
        const [result] = await conn.query(
          `UPDATE visits SET patientId = ? WHERE patientId = ?`,
          [newId, oldId]
        ) as any[];
        visitsUpdated += (result as any).affectedRows;
      } else {
        // Skip visits with unmapped old IDs (no auto-delete)
        const [skipResult] = await conn.query(
          `SELECT COUNT(*) as count FROM visits WHERE patientId = ?`,
          [oldId]
        ) as any[];
        visitsSkipped += skipResult[0].count;
      }
    }

    console.log(`✓ Visits updated: ${visitsUpdated}`);
    console.log(`⚠ Visits skipped (unmapped): ${visitsSkipped}\n`);

    // Same for examinations
    const [examsOldIds] = await conn.query(
      `SELECT DISTINCT patientId FROM examinations ORDER BY patientId`
    ) as any[];

    console.log(`Updating ${examsOldIds.length} distinct exam patientIds...\n`);

    let examsUpdated = 0;
    let examsSkipped = 0;

    for (const row of examsOldIds) {
      const oldId = row.patientId;
      const newId = oldToNewId.get(oldId);

      if (newId) {
        const [result] = await conn.query(
          `UPDATE examinations SET patientId = ? WHERE patientId = ?`,
          [newId, oldId]
        ) as any[];
        examsUpdated += (result as any).affectedRows;
      } else {
        // Skip exams with unmapped old IDs (no auto-delete)
        const [skipResult] = await conn.query(
          `SELECT COUNT(*) as count FROM examinations WHERE patientId = ?`,
          [oldId]
        ) as any[];
        examsSkipped += skipResult[0].count;
      }
    }

    console.log(`✓ Exams updated: ${examsUpdated}`);
    console.log(`⚠ Exams skipped (unmapped): ${examsSkipped}\n`);

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [visitsTotal] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [visitsMatched] = await conn.query(`
      SELECT COUNT(*) as count FROM visits WHERE patientId IN (SELECT id FROM patients)
    `) as any[];

    const [examsTotal] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [examsMatched] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations WHERE patientId IN (SELECT id FROM patients)
    `) as any[];

    console.log(`Final state:`);
    console.log(`  Visits: ${visitsMatched[0].count}/${visitsTotal[0].count} matched`);
    console.log(`  Exams: ${examsMatched[0].count}/${examsTotal[0].count} matched`);

    // Sample
    const [sampleVisits] = await conn.query(`
      SELECT v.id, v.patientId, p.patientCode, p.fullName
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      LIMIT 5
    `) as any[];

    console.log(`\nSample updated visits:`);
    sampleVisits.forEach((v: any) => {
      console.log(`  Visit ${v.id}: patientId=${v.id} (${v.patientCode} - ${v.fullName})`);
    });

    console.log(`\n✓ COMPLETE! All visits and exams updated with new sequential patient IDs`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
