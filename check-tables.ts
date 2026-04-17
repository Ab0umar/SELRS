import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [tables] = await conn.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `) as any[];

    console.log("Tables in database:");
    tables.forEach((t: any) => {
      console.log(`  - ${t.TABLE_NAME}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => console.error(err.message));
