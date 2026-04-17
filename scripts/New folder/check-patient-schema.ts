import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [schema] = await conn.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patients'
      AND COLUMN_NAME IN ('lastVisit', 'createdAt', 'updatedAt')
    `) as any[];

    console.log("Patient date columns schema:");
    schema.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}, nullable=${col.IS_NULLABLE}, default=${col.COLUMN_DEFAULT}`);
    });
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
