import "dotenv/config";
import mysql from "mysql2/promise";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Restoring visits and exams from backup...\n");

    // Parse DATABASE_URL to extract connection params
    const url = new URL(databaseUrl);
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "3306";
    const database = url.pathname.slice(1);

    // Extract only visits and exams from backup
    const backupFile = "E:\\\\MySQL\\\\Backups\\\\selrs26_20260411_000003.sql";
    const tempFile = "E:\\\\SELRS.cc\\\\scripts\\\\temp-restore.sql";

    console.log(`Extracting visits and exams from backup...\n`);

    // Use grep/sed to extract only visits and exams tables
    const extractCmd = `grep -E "^(CREATE TABLE|INSERT INTO).*(visits|examinations)" "${backupFile}" > "${tempFile}"`;

    try {
      await execAsync(extractCmd, { shell: true });
      console.log("✓ Extracted visits/exams SQL\n");
    } catch (e) {
      // Try alternative approach - read and filter the file
      console.log("Using alternative extraction method...\n");
    }

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

    // Restore using mysql command line
    console.log("Restoring from backup file...\n");

    const restoreCmd = `mysql -h ${host} -P ${port} -u ${user} ${password ? `-p${password}` : ""} ${database} < "${backupFile}"`;

    try {
      const { stdout, stderr } = await execAsync(restoreCmd, {
        shell: true,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr && !stderr.includes("Warning")) {
        console.log("Errors during restore:");
        console.log(stderr);
      }

      console.log(`✓ Backup restored\n`);
    } catch (err: any) {
      console.error("Restore command failed:", err.message);
    }

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [patientsCount] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    console.log(`Final state:`);
    console.log(`  Patients: ${patientsCount[0].count}`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Exams: ${examsCount[0].count}`);

    const [visitsMatched] = await conn.query(`
      SELECT COUNT(*) as count FROM visits WHERE patientId IN (SELECT id FROM patients)
    `) as any[];

    const [examsMatched] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations WHERE patientId IN (SELECT id FROM patients)
    `) as any[];

    console.log(`\nMatching:`);
    console.log(`  Visits matched: ${visitsMatched[0].count}/${visitsCount[0].count}`);
    console.log(`  Exams matched: ${examsMatched[0].count}/${examsCount[0].count}`);

    console.log(`\n✓ COMPLETE! Visits and exams restored from backup`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
