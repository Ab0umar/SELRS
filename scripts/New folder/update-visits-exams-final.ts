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

    // Build mapping from old_id to new patient id
    // First, get all patients with their patientCode
    const [patients] = await conn.query(
      `SELECT id, patientCode FROM patients`
    ) as any[];

    const codeToNewId = new Map<string, number>();
    for (const p of patients) {
      codeToNewId.set(String(p.patientCode).trim(), p.id);
    }

    console.log(`Built mapping for ${codeToNewId.size} patients\n`);

    // Get all visits with old IDs
    const [visitsWithOldIds] = await conn.query(
      `SELECT DISTINCT patientId FROM visits ORDER BY patientId`
    ) as any[];

    console.log(`Updating ${visitsWithOldIds.length} visits...\n`);

    let visitsUpdated = 0;
    for (const row of visitsWithOldIds) {
      const oldId = row.patientId;

      // Get patientCode from mapping table
      const [mapping] = await conn.query(
        `SELECT patientCode FROM patient_id_mapping WHERE old_id = ?`,
        [oldId]
      ) as any[];

      // Update visits
      const [result] = await conn.query(
        `UPDATE visits SET patientId = ? WHERE patientId = ?`,
        [newId, oldId]
      ) as any[];

      visitsUpdated += (result as any).affectedRows;
    }

    console.log(`✓ Updated ${visitsUpdated} visits\n`);

    // Same for examinations
    const [examsWithOldIds] = await conn.query(
      `SELECT DISTINCT patientId FROM examinations ORDER BY patientId`
    ) as any[];

    console.log(`Updating ${examsWithOldIds.length} examinations...\n`);

    let examsUpdated = 0;
    for (const row of examsWithOldIds) {
      const oldId = row.patientId;

      const [mapping] = await conn.query(
        `SELECT patientCode FROM patient_id_mapping WHERE old_id = ?`,
        [oldId]
      ) as any[];

      const [result] = await conn.query(
        `UPDATE examinations SET patientId = ? WHERE patientId = ?`,
        [newId, oldId]
      ) as any[];

      examsUpdated += (result as any).affectedRows;
    }

    console.log(`✓ Updated ${examsUpdated} examinations\n`);

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [visitsTotal] = await conn.query(
      `SELECT COUNT(*) as total FROM visits`
    ) as any[];

    const [visitsMatched] = await conn.query(
      `SELECT COUNT(*) as total FROM visits WHERE patientId IN (SELECT id FROM patients)`
    ) as any[];

    const [examsTotal] = await conn.query(
      `SELECT COUNT(*) as total FROM examinations`
    ) as any[];

    const [examsMatched] = await conn.query(
      `SELECT COUNT(*) as total FROM examinations WHERE patientId IN (SELECT id FROM patients)`
    ) as any[];

    console.log(`Final State:`);
    console.log(`  Visits: ${visitsMatched[0].total}/${visitsTotal[0].total} matched`);
    console.log(`  Exams: ${examsMatched[0].total}/${examsTotal[0].total} matched`);

    const [sampleVisits] = await conn.query(`
      SELECT v.id, v.patientId, p.patientCode, p.fullName
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      LIMIT 5
    `) as any[];

    console.log(`\nSample visits:`);
    sampleVisits.forEach((v: any) => {
      console.log(`  Visit ${v.id}: patientId=${v.patientId} (${v.patientCode} - ${v.fullName})`);
    });

    console.log(`\n✓ Complete!`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
