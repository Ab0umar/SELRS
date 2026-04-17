import "dotenv/config";
import { readFileSync } from "fs";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Restoring visits and examinations tables from backup...\n");

    // Read backup file
    const backupFile = "E:\\MySQL\\Backups\\selrs26_20260411_000003.sql";
    console.log(`Reading: ${backupFile}`);
    const backupData = readFileSync(backupFile, "utf8");

    // Extract CREATE TABLE and INSERT statements for visits and examinations
    const lines = backupData.split("\n");

    let inVisitsTable = false;
    let inExamsTable = false;
    let visitsStatements: string[] = [];
    let examsStatements: string[] = [];
    let currentStatement = "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for table names
      if (trimmedLine.includes("CREATE TABLE") && trimmedLine.includes("`visits`")) {
        inVisitsTable = true;
        inExamsTable = false;
        currentStatement = "";
      } else if (trimmedLine.includes("CREATE TABLE") && trimmedLine.includes("`examinations`")) {
        inExamsTable = true;
        inVisitsTable = false;
        currentStatement = "";
      } else if (trimmedLine.startsWith("CREATE TABLE") || trimmedLine.startsWith("DROP TABLE")) {
        inVisitsTable = false;
        inExamsTable = false;
      }

      // Collect statements
      currentStatement += line + "\n";

      if (trimmedLine.endsWith(";")) {
        if (inVisitsTable && (trimmedLine.includes("CREATE TABLE") || trimmedLine.includes("INSERT INTO `visits`"))) {
          visitsStatements.push(currentStatement);
        } else if (inExamsTable && (trimmedLine.includes("CREATE TABLE") || trimmedLine.includes("INSERT INTO `examinations`"))) {
          examsStatements.push(currentStatement);
        }
        currentStatement = "";
      }
    }

    console.log(`Found ${visitsStatements.length} visits statements`);
    console.log(`Found ${examsStatements.length} exams statements\n`);

    // Drop existing tables
    console.log("Dropping existing tables...");
    await conn.query(`DROP TABLE IF EXISTS visits`);
    await conn.query(`DROP TABLE IF EXISTS examinations`);
    console.log("✓ Tables dropped\n");

    // Restore visits
    console.log("Restoring visits table...");
    for (const stmt of visitsStatements) {
      const trimmed = stmt.trim();
      if (trimmed && !trimmed.startsWith("--")) {
        try {
          await conn.query(trimmed);
        } catch (err: any) {
          if (!String(err.message).includes("already exists")) {
            console.error("Error:", err.message.slice(0, 100));
          }
        }
      }
    }
    console.log("✓ Visits restored\n");

    // Restore examinations
    console.log("Restoring examinations table...");
    for (const stmt of examsStatements) {
      const trimmed = stmt.trim();
      if (trimmed && !trimmed.startsWith("--")) {
        try {
          await conn.query(trimmed);
        } catch (err: any) {
          if (!String(err.message).includes("already exists")) {
            console.error("Error:", err.message.slice(0, 100));
          }
        }
      }
    }
    console.log("✓ Examinations restored\n");

    // Verify
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];

    console.log(`Restored data:`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Examinations: ${examsCount[0].count}`);

    console.log(`\n✓ Restore complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
