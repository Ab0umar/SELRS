import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Table Definition ===\n");

    const [createTable] = await conn.query(
      `SHOW CREATE TABLE patients`
    ) as any[];

    console.log(createTable[0]['Create Table']);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
