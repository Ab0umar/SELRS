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
    console.log("Reading backup file...\n");

    // Read backup file
    const backupPath = "E:\\MySQL\\Backups\\selrs26_20260411_000003.sql";
    const backupContent = readFileSync(backupPath, "utf-8");

    console.log(`✓ Read backup file (${Math.round(backupContent.length / 1024 / 1024)} MB)\n`);

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Check current visits/exams (no deletion)
    try {
      const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
      console.log(`⚠ Existing visits found: ${visitsCount[0].count} (will be preserved, not deleted)`);
    } catch (e) {
      console.log(`✓ Visits table doesn't exist`);
    }

    try {
      const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
      console.log(`⚠ Existing exams found: ${examsCount[0].count} (will be preserved, not deleted)`);
    } catch (e) {
      console.log(`✓ Exams table doesn't exist`);
    }

    // Extract and execute CREATE TABLE and INSERT statements for visits and exams
    const lines = backupContent.split("\n");
    let visitsCreateFound = false;
    let examsCreateFound = false;
    let currentStatement = "";

    console.log(`Processing backup SQL...\n`);

    let visitInsertCount = 0;
    let examInsertCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith("--") || trimmed.startsWith("/*") || !trimmed) {
        continue;
      }

      currentStatement += line + "\n";

      // Check for visits or examinations table
      if (trimmed.includes("CREATE TABLE") && trimmed.includes("`visits`")) {
        visitsCreateFound = true;
      }
      if (trimmed.includes("CREATE TABLE") && trimmed.includes("`examinations`")) {
        examsCreateFound = true;
      }

      // Execute statement when it ends with ;
      if (trimmed.endsWith(";")) {
        const stmt = currentStatement.trim();

        try {
          // Only execute visits and examinations related statements
          if (stmt.includes("visits") || stmt.includes("examinations")) {
            if (stmt.includes("CREATE TABLE")) {
              // Drop table first to avoid conflicts
              if (stmt.includes("`visits`")) {
                await conn.query(`DROP TABLE IF EXISTS visits`);
              } else if (stmt.includes("`examinations`")) {
                await conn.query(`DROP TABLE IF EXISTS examinations`);
              }
              // Create table from backup definition
              await conn.query(stmt);
            } else if (stmt.includes("INSERT INTO")) {
              await conn.query(stmt);
              if (stmt.includes("`visits`")) {
                visitInsertCount++;
              } else if (stmt.includes("`examinations`")) {
                examInsertCount++;
              }

              if ((visitInsertCount + examInsertCount) % 10 === 0) {
                console.log(`  Processed ${visitInsertCount + examInsertCount} inserts...`);
              }
            }
          }
        } catch (err: any) {
          // Ignore duplicate key and table exists errors
          const msg = String(err.message).toLowerCase();
          if (!msg.includes("duplicate") && !msg.includes("already exists") && !msg.includes("table exists")) {
            console.error(`Error executing statement: ${err.message}`);
          }
        }

        currentStatement = "";
      }
    }

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [patientsCount] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    console.log(`\nRestored state:`);
    console.log(`  Patients: ${patientsCount[0].count}`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Exams: ${examsCount[0].count}`);

    // Check distinct old patient IDs
    const [visitsOldIds] = await conn.query(`SELECT DISTINCT patientId FROM visits ORDER BY patientId`) as any[];
    const [examsOldIds] = await conn.query(`SELECT DISTINCT patientId FROM examinations ORDER BY patientId`) as any[];

    console.log(`\nOld patient IDs in visits: ${visitsOldIds.length}`);
    console.log(`Old patient IDs in exams: ${examsOldIds.length}`);

    console.log(`\n✓ COMPLETE! Visits and exams restored. Now run remap script to update to new sequential IDs`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
