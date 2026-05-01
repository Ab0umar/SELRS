import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Fixing patient IDs to be truly sequential (1, 2, 3...)...\n");

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Get all patients ordered by patientCode
    const [patients] = await conn.query(
      `SELECT id, patientCode FROM patients ORDER BY patientCode`
    ) as any[];

    console.log(`Found ${patients.length} patients\n`);

    // Build mapping of old IDs to new sequential IDs
    const idMapping = new Map<number, number>();
    for (let i = 0; i < patients.length; i++) {
      const oldId = patients[i].id;
      const newId = i + 1;
      idMapping.set(oldId, newId);
    }

    console.log(`Remapping IDs...`);

    // Add temporary column
    await conn.query(`ALTER TABLE patients ADD COLUMN temp_id INT`);

    // Update with temporary IDs
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
    await conn.query(`ALTER TABLE patients DROP PRIMARY KEY`);
    await conn.query(`ALTER TABLE patients DROP COLUMN id`);
    await conn.query(`ALTER TABLE patients CHANGE COLUMN temp_id id INT NOT NULL`);
    await conn.query(`ALTER TABLE patients ADD PRIMARY KEY (id)`);
    await conn.query(`ALTER TABLE patients AUTO_INCREMENT = 1090`);

    console.log(`✓ Patient IDs remapped`);

    // Update visits
    console.log(`Updating visits with new IDs...`);
    for (const [oldId, newId] of idMapping) {
      await conn.query(
        `UPDATE visits SET patientId = ? WHERE patientId = ?`,
        [newId, oldId]
      );
    }
    console.log(`✓ Visits updated`);

    // Update examinations
    console.log(`Updating examinations with new IDs...`);
    for (const [oldId, newId] of idMapping) {
      await conn.query(
        `UPDATE examinations SET patientId = ? WHERE patientId = ?`,
        [newId, oldId]
      );
    }
    console.log(`✓ Examinations updated`);

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [sample] = await conn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id LIMIT 10`
    ) as any[];

    console.log(`\nFirst 10 patients:`);
    sample.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    // Check max id
    const [maxId] = await conn.query(
      `SELECT MAX(id) as max_id FROM patients`
    ) as any[];

    console.log(`\nFinal state:`);
    console.log(`  Patient count: ${patients.length}`);
    console.log(`  Max ID: ${maxId[0].max_id}`);
    console.log(`  Sequential: ${patients.length === maxId[0].max_id ? "✓ YES" : "✗ NO"}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
