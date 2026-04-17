import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Examination and Visit Table Columns ===\n");

    const [examColumns] = await conn.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'examinations'
      ORDER BY ORDINAL_POSITION
    `) as any[];

    console.log("EXAMINATIONS table columns:");
    examColumns.forEach((c: any) => {
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    const [visitColumns] = await conn.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'visits'
      ORDER BY ORDINAL_POSITION
    `) as any[];

    console.log("\nVISITS table columns:");
    visitColumns.forEach((c: any) => {
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
