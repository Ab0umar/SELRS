import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  const [tables] = await conn.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'selrs26' AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `) as any[];

  console.log(`Found ${tables.length} tables:\n`);
  tables.forEach((t: any, i: number) => {
    console.log(`${String(i + 1).padStart(3, ' ')}. ${t.TABLE_NAME}`);
  });

  await conn.end();
}

main();
