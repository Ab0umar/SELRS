import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Fix doctorId Column Type ===\n");

    // Check current column type
    const [columnInfo] = await conn.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patients' AND COLUMN_NAME = 'doctorId'
    `) as any[];

    console.log(`Current doctorId type: ${columnInfo[0].COLUMN_TYPE}\n`);

    // Change to VARCHAR(36) to store UUIDs
    await conn.query(`
      ALTER TABLE patients MODIFY COLUMN doctorId VARCHAR(36) DEFAULT NULL
    `);

    console.log("✓ Changed doctorId to VARCHAR(36)\n");

    // Verify
    const [newInfo] = await conn.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patients' AND COLUMN_NAME = 'doctorId'
    `) as any[];

    console.log(`New doctorId type: ${newInfo[0].COLUMN_TYPE}`);
    console.log(`\n✓ COMPLETE! doctorId column fixed`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
