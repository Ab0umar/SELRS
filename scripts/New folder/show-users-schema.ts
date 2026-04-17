import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const [createUser] = await conn.query(`SHOW CREATE TABLE users`) as any[];
    console.log(createUser[0]['Create Table']);

    // Count doctors
    const [doctors] = await conn.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'doctor'
    `) as any[];
    console.log(`\n\nDoctors: ${doctors[0].count}`);

    // Sample user columns
    const [sample] = await conn.query(`
      SELECT * FROM users LIMIT 1
    `) as any[];

    if (sample.length > 0) {
      console.log("\nSample user columns:");
      Object.keys(sample[0]).forEach(col => {
        console.log(`  - ${col}: ${sample[0][col]}`);
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
