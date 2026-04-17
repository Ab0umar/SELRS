import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Creating mapping of old patient IDs to patientCode...\n");

    // Get all patients with their codes
    const [patients] = await conn.query(
      `SELECT id, patientCode FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${patients.length} patients`);

    // Create mapping table
    console.log("\nCreating mapping table...");
    await conn.query(`DROP TABLE IF EXISTS patient_id_mapping`);
    await conn.query(`
      CREATE TABLE patient_id_mapping (
        old_id INT PRIMARY KEY,
        patientCode VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert mapping
    console.log("Inserting mapping data...");
    let insertCount = 0;
    for (const patient of patients) {
      await conn.query(
        `INSERT INTO patient_id_mapping (old_id, patientCode) VALUES (?, ?)`,
        [patient.id, patient.patientCode]
      );
      insertCount++;
      if (insertCount % 100 === 0) {
        console.log(`  Inserted ${insertCount}/${patients.length}...`);
      }
    }

    // Verify mapping
    const [mappingCheck] = await conn.query(
      `SELECT COUNT(*) as total FROM patient_id_mapping`
    ) as any[];

    console.log(`\n✓ Created mapping table with ${mappingCheck[0].total} entries`);

    // Show sample
    const [sample] = await conn.query(
      `SELECT * FROM patient_id_mapping LIMIT 10`
    ) as any[];

    console.log(`\nSample mapping:`);
    sample.forEach((row: any) => {
      console.log(`  old_id=${row.old_id} -> patientCode=${row.patientCode}`);
    });

    // Verify visits are covered
    const [visitCheck] = await conn.query(`
      SELECT COUNT(*) as covered,
             (SELECT COUNT(DISTINCT patientId) FROM visits) as total
      FROM visits v
      INNER JOIN patient_id_mapping m ON v.patientId = m.old_id
    `) as any[];

    console.log(`\nVisits coverage:`);
    console.log(`  Covered: ${visitCheck[0].covered}`);
    console.log(`  Total unique patients in visits: ${visitCheck[0].total}`);

    // Verify examinations are covered
    const [examCheck] = await conn.query(`
      SELECT COUNT(*) as covered,
             (SELECT COUNT(DISTINCT patientId) FROM examinations) as total
      FROM examinations e
      INNER JOIN patient_id_mapping m ON e.patientId = m.old_id
    `) as any[];

    console.log(`\nExaminations coverage:`);
    console.log(`  Covered: ${examCheck[0].covered}`);
    console.log(`  Total unique patients in examinations: ${examCheck[0].total}`);

    console.log(`\n✓ Mapping created successfully. Ready for patient deletion and resync.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
