import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Reading and processing backup file...\n");

    const backupPath = "E:\\MySQL\\Backups\\selrs26_20260411_000003.sql";
    let content = readFileSync(backupPath, "utf-8");

    console.log(`✓ Read backup file (${Math.round(content.length / 1024 / 1024)} MB)\n`);

    // Remove MySQL dump comments like /*!40014 ... */
    content = content.replace(/\/\*![\d\s,]*\*\//g, "");
    // Remove other comments
    content = content.replace(/--[^\n]*/g, "");
    // Clean up multiple spaces
    content = content.replace(/\s+/g, " ");

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    console.log(`Processing SQL statements...\n`);

    // Split by semicolon
    const statements = content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && (s.includes("visits") || s.includes("examinations")));

    console.log(`Found ${statements.length} relevant statements\n`);

    let visitCount = 0;
    let examCount = 0;
    let tableVisitsCreated = false;
    let tableExamsCreated = false;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      try {
        if (stmt.includes("CREATE TABLE") && stmt.includes("visits")) {
          if (!tableVisitsCreated) {
            await conn.query(`DROP TABLE IF EXISTS visits`);
            await conn.query(stmt);
            tableVisitsCreated = true;
            console.log(`✓ Created visits table`);
          }
        } else if (stmt.includes("CREATE TABLE") && stmt.includes("examinations")) {
          if (!tableExamsCreated) {
            await conn.query(`DROP TABLE IF EXISTS examinations`);
            await conn.query(stmt);
            tableExamsCreated = true;
            console.log(`✓ Created examinations table`);
          }
        } else if (stmt.includes("INSERT INTO") && stmt.includes("visits")) {
          await conn.query(stmt);
          visitCount++;
          if (visitCount % 50 === 0) {
            console.log(`  Inserted ${visitCount} visits...`);
          }
        } else if (stmt.includes("INSERT INTO") && stmt.includes("examinations")) {
          await conn.query(stmt);
          examCount++;
          if (examCount % 50 === 0) {
            console.log(`  Inserted ${examCount} exams...`);
          }
        }
      } catch (err: any) {
        const msg = String(err.message).toLowerCase();
        if (!msg.includes("duplicate") && !msg.includes("syntax error") && i < 10) {
          // Only show first 10 errors
          console.error(`Error: ${err.message.slice(0, 80)}`);
        }
      }
    }

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    console.log(`\n✓ Processing complete:`);
    console.log(`  Visits inserted: ${visitCount}`);
    console.log(`  Exams inserted: ${examCount}`);

    // Verify
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];

    console.log(`\nFinal counts:`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Exams: ${examsCount[0].count}`);

    if (visitsCount[0].count > 0 || examsCount[0].count > 0) {
      console.log(`\n✓ Restoration successful! Next: run remap script to update to new sequential IDs`);
    } else {
      console.log(`\n✗ No data was restored. The backup file might be in a different format.`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
