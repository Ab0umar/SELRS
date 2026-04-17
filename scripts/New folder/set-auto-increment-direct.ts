import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const tableName = process.argv[2];
    const newValue = parseInt(process.argv[3]);

    if (!tableName || isNaN(newValue)) {
      console.error("Usage: npx tsx set-auto-increment-direct.ts <table> <value>");
      console.error("Example: npx tsx set-auto-increment-direct.ts patients 1");
      process.exit(1);
    }

    console.log(`Setting ${tableName} AUTO_INCREMENT to ${newValue}...\n`);

    // Use direct SQL (not parameterized for ALTER TABLE)
    const sql = `ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${newValue}`;
    await conn.query(sql);

    console.log(`✓ Command executed\n`);

    // Verify
    const [result] = await conn.query(`
      SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]) as any[];

    if (result.length > 0) {
      console.log(`Current ${tableName} AUTO_INCREMENT: ${result[0].AUTO_INCREMENT}`);
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
