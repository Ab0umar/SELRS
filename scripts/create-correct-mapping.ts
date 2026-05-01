import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Creating correct mapping from backup data...\n");

    // Create mapping table from current patients data (from backup)
    await conn.query(`DROP TABLE IF EXISTS patient_id_mapping_correct`);
    await conn.query(`
      CREATE TABLE patient_id_mapping_correct (
        old_id INT PRIMARY KEY,
        patientCode VARCHAR(50) NOT NULL UNIQUE,
        fullName VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all patients (from restored backup)
    const [patients] = await conn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${patients.length} patients in restored backup\n`);

    // Insert mapping
    let insertCount = 0;
    for (const patient of patients) {
      await conn.query(
        `INSERT INTO patient_id_mapping_correct (old_id, patientCode, fullName) VALUES (?, ?, ?)`,
        [patient.id, patient.patientCode, patient.fullName]
      );
      insertCount++;
      if (insertCount % 100 === 0) {
        console.log(`  Inserted ${insertCount}/${patients.length}...`);
      }
    }

    console.log(`\n✓ Created mapping table with ${insertCount} entries`);

    // Verify coverage
    const [visitsMatched] = await conn.query(`
      SELECT COUNT(*) as count
      FROM visits v
      INNER JOIN patient_id_mapping_correct m ON v.patientId = m.old_id
    `) as any[];

    const [examsMatched] = await conn.query(`
      SELECT COUNT(*) as count
      FROM examinations e
      INNER JOIN patient_id_mapping_correct m ON e.patientId = m.old_id
    `) as any[];

    console.log(`\nCoverage:`);
    console.log(`  Visits with mapping: ${visitsMatched[0].count}`);
    console.log(`  Exams with mapping: ${examsMatched[0].count}`);

    // Sample
    const [sample] = await conn.query(
      `SELECT old_id, patientCode, fullName FROM patient_id_mapping_correct LIMIT 5`
    ) as any[];

    console.log(`\nSample mapping:`);
    sample.forEach((row: any) => {
      console.log(`  old_id=${row.old_id} -> ${row.patientCode} (${row.fullName})`);
    });

    console.log(`\n✓ Correct mapping created successfully`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
