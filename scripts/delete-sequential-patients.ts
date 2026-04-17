import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking sequential patients (no deletion - manual confirmation required)...\n");

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Count before
    const [countBefore] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];
    console.log(`Patients found: ${countBefore[0].count}`);
    console.log(`⚠ NOT DELETING - manual confirmation required\n`);

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [countAfter] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];

    console.log(`\nPatients after: ${countAfter[0].count}`);
    console.log(`Visits preserved: ${visitsCount[0].count}`);
    console.log(`Examinations preserved: ${examsCount[0].count}`);

    console.log(`\n✓ Ready for MSSQL resync`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
