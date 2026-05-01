import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking table columns with patientCode...\n");

    // Check which tables have patientCode
    const [tables] = await conn.query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'patientCode'
    `) as any[];

    console.log("Tables with patientCode column:");
    tables.forEach((t: any) => {
      console.log(`  ${t.TABLE_NAME}`);
    });

    // Sample data from patients
    const [patients] = await conn.query(
      `SELECT id, patientCode FROM patients LIMIT 5`
    ) as any[];

    console.log("\nSample from patients table:");
    patients.forEach((p: any) => {
      console.log(`  ID ${p.id}: "${p.patientCode}"`);
    });

    // Check each table with patientCode
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      if (tableName === 'patients') continue;

      const [rows] = await conn.query(
        `SELECT COUNT(*) as total, COUNT(DISTINCT patientCode) as distinct_codes FROM ${tableName}`
      ) as any[];

      console.log(`\n${tableName}:`);
      console.log(`  Total rows: ${rows[0].total}`);
      console.log(`  Distinct codes: ${rows[0].distinct_codes}`);

      // Sample
      const [sample] = await conn.query(
        `SELECT id, patientCode FROM ${tableName} LIMIT 3`
      ) as any[];

      sample.forEach((s: any) => {
        console.log(`    ${s.id}: "${s.patientCode}"`);
      });
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
