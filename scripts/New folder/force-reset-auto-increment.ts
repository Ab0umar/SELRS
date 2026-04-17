import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Force Reset AUTO_INCREMENT to 1 ===\n");

    // Check current state
    const [before] = await conn.query(`
      SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
    `) as any[];
    console.log(`Before: AUTO_INCREMENT = ${before[0].AUTO_INCREMENT}`);

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    console.log("✓ Disabled foreign key checks");

    // Method 1: Try TRUNCATE
    try {
      await conn.query(`TRUNCATE TABLE patients`);
      console.log("✓ Truncated patients table");
    } catch (e) {
      console.log("⚠ TRUNCATE failed, trying DELETE + ALTER");
      await conn.query(`DELETE FROM patients`);
      console.log("✓ Deleted all patients");
    }

    // Method 2: Force with ALTER TABLE (always works)
    await conn.query(`ALTER TABLE patients AUTO_INCREMENT = 1`);
    console.log("✓ Set AUTO_INCREMENT = 1 with ALTER TABLE");

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("✓ Enabled foreign key checks\n");

    // Verify
    const [after] = await conn.query(`
      SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
    `) as any[];
    console.log(`After: AUTO_INCREMENT = ${after[0].AUTO_INCREMENT}`);

    const [count] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];
    console.log(`Patients: ${count[0].count}\n`);

    if (after[0].AUTO_INCREMENT === 1) {
      console.log("✓ SUCCESS! AUTO_INCREMENT is now 1");
    } else {
      console.log(`⚠ AUTO_INCREMENT is still ${after[0].AUTO_INCREMENT}`);
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
