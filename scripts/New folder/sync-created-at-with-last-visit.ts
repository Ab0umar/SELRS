import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Updating patients createdAt to match lastVisit...");

    const [result] = await conn.query(
      `UPDATE patients SET createdAt = lastVisit WHERE createdAt != lastVisit`
    ) as any[];

    console.log(`✓ Updated ${(result as any).affectedRows} patients`);
    console.log(`\nVerifying updates...`);

    const [counts] = await conn.query(
      `SELECT COUNT(*) as total, SUM(IF(createdAt = lastVisit, 1, 0)) as synced
       FROM patients`
    ) as any[];

    console.log(`  Total patients: ${(counts as any)[0].total}`);
    console.log(`  Synced (createdAt = lastVisit): ${(counts as any)[0].synced}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
