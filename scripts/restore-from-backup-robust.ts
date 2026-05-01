import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";

async function executeSqlStatements(conn: any, statements: string[], tableName: string) {
  let count = 0;
  for (const stmt of statements) {
    if (!stmt.trim()) continue;

    try {
      await conn.query(stmt);
      if (stmt.toUpperCase().includes("INSERT")) {
        count++;
        if (count % 100 === 0) {
          console.log(`  Inserted ${count} rows into ${tableName}...`);
        }
      }
    } catch (err: any) {
      const msg = String(err.message).toLowerCase();
      // Ignore some errors
      if (!msg.includes("duplicate") && !msg.includes("foreign key")) {
        console.error(`Error in ${tableName}: ${err.message.slice(0, 100)}`);
      }
    }
  }
  return count;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Reading backup file...\n");

    const backupPath = "E:\\MySQL\\Backups\\selrs26_20260411_000003.sql";
    let backupContent = readFileSync(backupPath, "utf-8");

    console.log(`✓ Read backup file (${Math.round(backupContent.length / 1024 / 1024)} MB)\n`);

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Check current visits/exams (no deletion)
    try {
      const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
      console.log(`⚠ Existing visits found: ${visitsCount[0].count} (will be preserved, not deleted)`);
    } catch (e) {
      console.log(`✓ Visits table doesn't exist (will create)`);
    }

    try {
      const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
      console.log(`⚠ Existing exams found: ${examsCount[0].count} (will be preserved, not deleted)`);
    } catch (e) {
      console.log(`✓ Exams table doesn't exist (will create)`);
    }

    console.log();

    // Extract visits table statements
    console.log(`Extracting visits data...\n`);
    const visitsMatch = backupContent.match(/CREATE TABLE `visits`[\s\S]*?\);/);
    if (visitsMatch) {
      const createStmt = visitsMatch[0];
      await conn.query(createStmt);
      console.log(`✓ Created visits table`);
    }

    // Extract examinations table statements
    console.log(`Extracting examinations data...\n`);
    const examsMatch = backupContent.match(/CREATE TABLE `examinations`[\s\S]*?\);/);
    if (examsMatch) {
      const createStmt = examsMatch[0];
      await conn.query(createStmt);
      console.log(`✓ Created examinations table`);
    }

    // Extract and execute INSERT statements
    console.log(`\nInserting data...\n`);

    // Split by INSERT statements
    const inserts = backupContent.split(/(?=INSERT INTO)/);

    let visitInserts = 0;
    let examInserts = 0;

    for (const insert of inserts) {
      if (!insert.trim().startsWith("INSERT")) continue;

      // Split by semicolon to get individual statements
      const statements = insert.split(";").map(s => s.trim()).filter(s => s);

      for (const stmt of statements) {
        if (!stmt.startsWith("INSERT")) continue;

        try {
          await conn.query(stmt);

          if (stmt.includes("visits")) {
            visitInserts++;
          } else if (stmt.includes("examinations")) {
            examInserts++;
          }

          if ((visitInserts + examInserts) % 100 === 0) {
            console.log(`  Processed ${visitInserts + examInserts} inserts...`);
          }
        } catch (err: any) {
          // Ignore errors
        }
      }
    }

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];

    console.log(`\n✓ Restored:`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Exams: ${examsCount[0].count}`);

    console.log(`\n✓ COMPLETE! Visits and exams restored. Next: run remap script`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
