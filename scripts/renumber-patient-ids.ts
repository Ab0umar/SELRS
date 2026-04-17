import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Renumbering patient IDs to sequential format (1, 2, 3...)...\n");

    // Disable foreign key checks
    console.log("Disabling foreign key constraints...");
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Get all patients ordered by current id
    const [patients] = await conn.query(
      `SELECT id FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${patients.length} patients\n`);

    // Build mapping
    const idMapping = new Map<number, number>();
    for (let i = 0; i < patients.length; i++) {
      const oldId = patients[i].id;
      const newId = i + 1;
      idMapping.set(oldId, newId);
    }

    // Show sample mapping
    console.log("Sample ID mapping:");
    let sampleCount = 0;
    for (const [oldId, newId] of idMapping) {
      if (sampleCount < 10) {
        console.log(`  ${oldId} -> ${newId}`);
        sampleCount++;
      } else {
        break;
      }
    }

    // Get all tables with patientId FK
    console.log("\nFinding tables with patientId references...");
    const [tables] = await conn.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'selrs26' AND COLUMN_NAME = 'patientId'
      GROUP BY TABLE_NAME
    `) as any[];

    const tableNames = tables.map((t: any) => t.TABLE_NAME);
    console.log(`Tables to update: ${tableNames.join(", ")}\n`);

    // Update patients table with new IDs using temp column
    console.log("Updating patients table...");
    await conn.query(`ALTER TABLE patients ADD COLUMN temp_id INT`);

    let updateCount = 0;
    for (const [oldId, newId] of idMapping) {
      await conn.query(
        `UPDATE patients SET temp_id = ? WHERE id = ?`,
        [newId, oldId]
      );
      updateCount++;
      if (updateCount % 100 === 0) {
        console.log(`  Updated ${updateCount}/${patients.length}...`);
      }
    }

    // Drop old id and rename temp
    console.log("Finalizing ID changes...");
    await conn.query(`ALTER TABLE patients DROP PRIMARY KEY`);
    await conn.query(`ALTER TABLE patients DROP COLUMN id`);
    await conn.query(`ALTER TABLE patients CHANGE COLUMN temp_id id INT NOT NULL`);
    await conn.query(`ALTER TABLE patients ADD PRIMARY KEY (id)`);
    await conn.query(`ALTER TABLE patients AUTO_INCREMENT = 1109`);

    // Update all child tables
    for (const tableName of tableNames) {
      if (tableName === 'patients') continue;

      console.log(`Updating ${tableName}...`);
      const [rows] = await conn.query(
        `SELECT DISTINCT patientId FROM ${tableName} WHERE patientId IS NOT NULL`
      ) as any[];

      let tableUpdateCount = 0;
      for (const row of rows) {
        const oldId = row.patientId;
        const newId = idMapping.get(oldId);
        if (newId) {
          const [result] = await conn.query(
            `UPDATE ${tableName} SET patientId = ? WHERE patientId = ?`,
            [newId, oldId]
          ) as any[];
          tableUpdateCount += (result as any).affectedRows;
        }
      }
      console.log(`  ✓ Updated ${tableUpdateCount} rows`);
    }

    // Re-enable foreign key checks
    console.log("\nRe-enabling foreign key constraints...");
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [sample] = await conn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id LIMIT 10`
    ) as any[];

    console.log(`\nVerification - first 10 patients:`);
    sample.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    // Check max id
    const [maxId] = await conn.query(
      `SELECT MAX(id) as max_id FROM patients`
    ) as any[];

    console.log(`\n✓ Total patients: ${maxId[0].max_id}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
