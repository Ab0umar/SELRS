import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Reset AUTO_INCREMENT ===\n");

    // Get table name from command line argument
    const tableName = process.argv[2];
    const newValue = process.argv[3];

    if (!tableName) {
      console.log("Usage: npx tsx reset-auto-increment.ts <table_name> <new_value>\n");
      console.log("Examples:");
      console.log("  npx tsx reset-auto-increment.ts patients 1");
      console.log("  npx tsx reset-auto-increment.ts visits 1");
      console.log("  npx tsx reset-auto-increment.ts examinations 1000\n");

      // Show current values
      const [tables] = await conn.query(`
        SELECT TABLE_NAME, AUTO_INCREMENT
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND AUTO_INCREMENT IS NOT NULL
        ORDER BY TABLE_NAME
      `) as any[];

      console.log("Current AUTO_INCREMENT values:\n");
      tables.forEach((row: any) => {
        console.log(`  ${row.TABLE_NAME}: ${row.AUTO_INCREMENT}`);
      });
      return;
    }

    if (!newValue) {
      console.error("Error: Please provide new AUTO_INCREMENT value\n");
      console.log("Usage: npx tsx reset-auto-increment.ts <table_name> <new_value>");
      process.exit(1);
    }

    const value = parseInt(newValue);
    if (isNaN(value) || value < 1) {
      console.error("Error: Value must be a positive number");
      process.exit(1);
    }

    // Check if table exists
    const [tableCheck] = await conn.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    ) as any[];

    if (!tableCheck || tableCheck.length === 0) {
      console.error(`Error: Table '${tableName}' not found`);
      process.exit(1);
    }

    // Get current value
    const [currentVal] = await conn.query(
      `SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    ) as any[];

    const currentValue = currentVal[0].AUTO_INCREMENT;

    console.log(`Table: ${tableName}`);
    console.log(`Current AUTO_INCREMENT: ${currentValue}`);
    console.log(`New AUTO_INCREMENT: ${value}\n`);

    // Change it
    await conn.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ?`, [value]);

    // Verify
    const [newVal] = await conn.query(
      `SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    ) as any[];

    console.log(`✓ Changed ${tableName} AUTO_INCREMENT from ${currentValue} to ${newVal[0].AUTO_INCREMENT}`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
