import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const [result] = await conn.query(
      `SELECT COUNT(*) as total, MIN(id) as min_id, MAX(id) as max_id FROM patients`
    ) as any[];

    console.log(`Patients table:`);
    console.log(`  Total: ${result[0].total}`);
    console.log(`  ID range: ${result[0].min_id} to ${result[0].max_id}`);

    // Sample a few
    const [samples] = await conn.query(
      `SELECT id, patientCode, fullName FROM patients LIMIT 5`
    ) as any[];

    console.log(`\nSample patients:`);
    samples.forEach((p: any) => {
      console.log(`  ID ${p.id}: patientCode=${p.patientCode}, name=${p.fullName}`);
    });
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
