import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [patientsCount] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    console.log("Current state:");
    console.log(`  Patients: ${patientsCount[0].count}`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Examinations: ${examsCount[0].count}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
