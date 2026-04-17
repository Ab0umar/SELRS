import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Finding ALL tables with patientId column...\n");

    const [results] = await conn.query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'patientId'
      ORDER BY TABLE_NAME
    `) as any[];

    console.log(`Found ${results.length} tables with patientId:\n`);

    results.forEach((row: any) => {
      console.log(`  ${row.TABLE_NAME} (${row.COLUMN_TYPE})`);
    });

    console.log(`\nComplete list for script:`);
    const tableNames = results.map((r: any) => `'${r.TABLE_NAME}'`).join(',\n  ');
    console.log(`const TABLES_WITH_PATIENTID = [\n  ${tableNames}\n];`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
