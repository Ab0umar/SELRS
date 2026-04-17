import "dotenv/config";
import mysql from "mysql2/promise";

// Tables that have patientId foreign key
const TABLES_WITH_PATIENTID = [
  'appointments',
  'autorefractometrydata',
  'consentforms',
  'doctorreports',
  'examinations',
  'followupsheets',
  'glassesrecords',
  'medicalhistorychecklist',
  'patientpagestates',
  'patientserviceentries',
  'pentacamresults',
  'postopfollowups',
  'prescriptions',
  'sheet_entries',
  'surgeries',
  'testrequests',
  'visits'
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Remapping patientId for ALL tables (NO DELETIONS) ===\n");

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

    // Process each table
    for (const tableName of TABLES_WITH_PATIENTID) {
      console.log(`\n--- Processing ${tableName} ---`);

      // Check if table exists
      const [tableCheck] = await conn.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      ) as any[];

      if (!tableCheck || tableCheck.length === 0) {
        console.log(`  ⚠ Table does not exist, skipping`);
        continue;
      }

      // Get all distinct old patientIds
      const [oldIds] = await conn.query(
        `SELECT DISTINCT patientId FROM \`${tableName}\` ORDER BY patientId`
      ) as any[];

      console.log(`  Found ${oldIds.length} distinct patientIds\n`);

      let updated = 0;
      let skipped = 0;
      const unmappedIds: number[] = [];

      for (const row of oldIds) {
        const oldId = row.patientId;
        const newId = oldToNewId.get(oldId);

        if (newId) {
          const [result] = await conn.query(
            `UPDATE \`${tableName}\` SET patientId = ? WHERE patientId = ?`,
            [newId, oldId]
          ) as any[];
          updated += (result as any).affectedRows;
        } else {
          // Count records with unmapped ID (no auto-delete)
          const [skipResult] = await conn.query(
            `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE patientId = ?`,
            [oldId]
          ) as any[];
          skipped += skipResult[0].count;
          unmappedIds.push(oldId);
        }
      }

      console.log(`  ✓ Updated: ${updated} records`);
      console.log(`  ⚠ Skipped (unmapped): ${skipped} records`);

      if (unmappedIds.length > 0) {
        console.log(`  Unmapped IDs: ${unmappedIds.slice(0, 5).join(', ')}${unmappedIds.length > 5 ? '...' : ''}`);
      }
    }

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Final verification for each table
    console.log(`\n\n=== Final State ===`);
    for (const tableName of TABLES_WITH_PATIENTID) {
      const [tableCheck] = await conn.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      ) as any[];

      if (!tableCheck || tableCheck.length === 0) continue;

      const [totalCount] = await conn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any[];
      const [matchedCount] = await conn.query(
        `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE patientId IN (SELECT id FROM patients)`
      ) as any[];

      console.log(`\n${tableName}:`);
      console.log(`  Total records: ${totalCount[0].count}`);
      console.log(`  Matched to patients: ${matchedCount[0].count}`);
      if (totalCount[0].count > matchedCount[0].count) {
        console.log(`  ⚠ Unmatched: ${totalCount[0].count - matchedCount[0].count}`);
      }
    }

    console.log(`\n✓ COMPLETE! All patientIds remapped (no data deleted)`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
