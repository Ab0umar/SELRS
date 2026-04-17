import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const [result] = await conn.query(`
      SELECT TABLE_NAME, AUTO_INCREMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('patients', 'visits', 'examinations')
    `) as any[];

    console.log("Current AUTO_INCREMENT values:\n");
    result.forEach((row: any) => {
      console.log(`${row.TABLE_NAME}: ${row.AUTO_INCREMENT}`);
    });
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
