import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Add doctorCode and serviceCode columns to patients ===\n");

    // Check if columns exist
    const [columns] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patients' AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('doctorCode', 'serviceCode')
    `) as any[];

    const existingColumns = columns.map((c: any) => c.COLUMN_NAME);

    if (!existingColumns.includes('doctorCode')) {
      console.log("Adding doctorCode column...");
      await conn.query(`
        ALTER TABLE patients 
        ADD COLUMN doctorCode VARCHAR(50) NULL,
        ADD KEY idx_doctor_code (doctorCode)
      `);
      console.log("✓ Added doctorCode column\n");
    } else {
      console.log("✓ doctorCode column already exists\n");
    }

    if (!existingColumns.includes('serviceCode')) {
      console.log("Adding serviceCode column...");
      await conn.query(`
        ALTER TABLE patients 
        ADD COLUMN serviceCode VARCHAR(50) NULL,
        ADD KEY idx_service_code (serviceCode)
      `);
      console.log("✓ Added serviceCode column\n");
    } else {
      console.log("✓ serviceCode column already exists\n");
    }

    // Verify
    const [finalColumns] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patients' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `) as any[];

    console.log("=== Current patients columns ===");
    finalColumns.forEach((c: any) => {
      console.log(`  ${c.COLUMN_NAME}`);
    });

    console.log("\n✓ COMPLETE!");

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
