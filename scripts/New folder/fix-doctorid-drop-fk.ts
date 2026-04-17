import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Fix doctorId Column (Drop FK, Change Type, Add New FK) ===\n");

    // Drop the old foreign key
    console.log("Step 1: Dropping old foreign key constraint...");
    try {
      await conn.query(`
        ALTER TABLE patients DROP FOREIGN KEY fk_patients_doctor_user
      `);
      console.log("✓ Dropped fk_patients_doctor_user\n");
    } catch (err: any) {
      console.log("⚠ Foreign key not found or already dropped\n");
    }

    // Change doctorId to VARCHAR(36)
    console.log("Step 2: Changing doctorId column type to VARCHAR(36)...");
    await conn.query(`
      ALTER TABLE patients MODIFY COLUMN doctorId VARCHAR(36) DEFAULT NULL
    `);
    console.log("✓ Changed doctorId to VARCHAR(36)\n");

    // Add new foreign key to doctors table
    console.log("Step 3: Adding new foreign key to doctors table...");
    try {
      await conn.query(`
        ALTER TABLE patients
        ADD CONSTRAINT fk_patients_doctor_id
        FOREIGN KEY (doctorId) REFERENCES doctors(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✓ Added fk_patients_doctor_id\n");
    } catch (err: any) {
      console.log(`⚠ Could not add foreign key: ${err.message.slice(0, 100)}\n`);
    }

    // Verify
    const [columnInfo] = await conn.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patients' AND COLUMN_NAME = 'doctorId'
    `) as any[];

    console.log(`Final doctorId type: ${columnInfo[0].COLUMN_TYPE}`);
    console.log(`\n✓ COMPLETE! doctorId column fixed and ready for UUID values`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
