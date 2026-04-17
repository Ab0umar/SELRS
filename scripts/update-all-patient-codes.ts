import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Updating all tables with new sequential patient codes...\n");

    // Get all patients with old and new codes
    const [patients] = await conn.query(
      `SELECT id FROM patients ORDER BY id`
    ) as any[];

    // Build mapping based on order
    const codeMapping = new Map<string, string>();
    const patientIdToNewCode = new Map<number, string>();

    for (let i = 0; i < patients.length; i++) {
      const patientId = patients[i].id;
      const newCode = String(i + 1).padStart(4, '0');
      patientIdToNewCode.set(patientId, newCode);
    }

    // Verify mapping
    console.log(`Built mapping for ${patientIdToNewCode.size} patients`);
    console.log(`Sample: ID 39924 -> ${patientIdToNewCode.get(39924)}`);

    // Find all tables with patientCode column
    const [tables] = await conn.query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'patientCode' AND TABLE_SCHEMA = 'selrs26'
    `) as any[];

    console.log(`\nTables with patientCode column: ${tables.length}`);
    const tableNames = new Set(tables.map((t: any) => t.TABLE_NAME));

    for (const tableName of tableNames) {
      console.log(`  - ${tableName}`);
    }

    // Update each table
    let totalUpdated = 0;
    for (const tableName of tableNames) {
      if (tableName === 'patients') continue; // Already updated

      console.log(`\nUpdating ${tableName}...`);

      // Get all patient IDs in this table
      const [rows] = await conn.query(
        `SELECT DISTINCT patientId FROM ${tableName} WHERE patientId IS NOT NULL`
      ) as any[];

      let tableUpdateCount = 0;
      for (const row of rows) {
        const patientId = row.patientId;
        const newCode = patientIdToNewCode.get(patientId);
        if (newCode) {
          const [result] = await conn.query(
            `UPDATE ${tableName} SET patientCode = ? WHERE patientId = ?`,
            [newCode, patientId]
          ) as any[];
          tableUpdateCount += (result as any).affectedRows;
        }
      }

      console.log(`  ✓ Updated ${tableUpdateCount} rows`);
      totalUpdated += tableUpdateCount;
    }

    console.log(`\n✓ Total rows updated: ${totalUpdated}`);

    // Verify consistency
    console.log(`\nVerifying consistency...\n`);

    for (const tableName of tableNames) {
      const [inconsistent] = await conn.query(`
        SELECT COUNT(*) as count
        FROM ${tableName} t
        INNER JOIN patients p ON t.patientId = p.id
        WHERE t.patientCode != p.patientCode
      `) as any[];

      const inconsistencyCount = inconsistent[0].count;
      if (inconsistencyCount > 0) {
        console.log(`  ⚠️  ${tableName}: ${inconsistencyCount} inconsistent rows`);
      } else {
        console.log(`  ✓ ${tableName}: All codes match patients table`);
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
