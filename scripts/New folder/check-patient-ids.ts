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
      SELECT
        COUNT(*) as total,
        MIN(id) as min_id,
        MAX(id) as max_id
      FROM patients
    `) as any[];

    console.log("Patients table:");
    console.log(`  Total: ${result[0].total}`);
    console.log(`  Min ID: ${result[0].min_id}`);
    console.log(`  Max ID: ${result[0].max_id}`);

    const [aiResult] = await conn.query(`
      SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
    `) as any[];

    console.log(`  AUTO_INCREMENT: ${aiResult[0].AUTO_INCREMENT}`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
