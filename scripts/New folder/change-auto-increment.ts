import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== AUTO_INCREMENT Management ===\n");

    // Get current AUTO_INCREMENT values for all tables
    const [tables] = await conn.query(`
      SELECT
        TABLE_NAME,
        AUTO_INCREMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND AUTO_INCREMENT IS NOT NULL
      ORDER BY TABLE_NAME
    `) as any[];

    console.log("Current AUTO_INCREMENT values:\n");
    tables.forEach((row: any) => {
      console.log(`  ${row.TABLE_NAME}: ${row.AUTO_INCREMENT}`);
    });

    // Example: Change AUTO_INCREMENT for specific tables
    console.log(`\n\n=== Examples to change AUTO_INCREMENT ===\n`);

    // Example 1: Reset patients to 1
    console.log("Example 1: Reset patients to 1");
    console.log("  ALTER TABLE patients AUTO_INCREMENT = 1;\n");

    // Example 2: Set visits to next available
    const [patientsMax] = await conn.query(
      `SELECT MAX(id) + 1 as next_id FROM patients`
    ) as any[];
    const nextPatientId = patientsMax[0].next_id;

    console.log(`Example 2: Set visits to next patient ID (${nextPatientId})`);
    console.log(`  ALTER TABLE visits AUTO_INCREMENT = ${nextPatientId};\n`);

    // Example 3: Set to specific number
    console.log("Example 3: Set to specific number");
    console.log("  ALTER TABLE visits AUTO_INCREMENT = 1000;\n");

    // Current patient max
    const [currentMax] = await conn.query(
      `SELECT MAX(id) as max_id, COUNT(*) as total FROM patients`
    ) as any[];

    console.log(`\n=== Current State ===`);
    console.log(`Patients:`);
    console.log(`  Total: ${currentMax[0].total}`);
    console.log(`  Max ID: ${currentMax[0].max_id}`);

    // To use: uncomment and modify the table name and value below
    // const TABLE_NAME = 'visits';
    // const NEW_AUTO_INCREMENT = 1;
    // await conn.query(`ALTER TABLE \`${TABLE_NAME}\` AUTO_INCREMENT = ${NEW_AUTO_INCREMENT}`);
    // console.log(`\n✓ Changed ${TABLE_NAME} AUTO_INCREMENT to ${NEW_AUTO_INCREMENT}`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
