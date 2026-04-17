import "dotenv/config";
import { execSync } from "child_process";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  // Parse DATABASE_URL
  const url = new URL(databaseUrl);
  const user = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port || "3306";
  const database = url.pathname.slice(1);

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Restoring visits and exams from backup...\n");

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

    // Build mysql command
    let mysqlCmd = `mysql -h ${host} -P ${port} -u ${user}`;
    if (password) {
      mysqlCmd += ` -p${password}`;
    }
    mysqlCmd += ` ${database} < "E:\\MySQL\\Backups\\selrs26_20260411_000003.sql"`;

    console.log(`Restoring from backup...\n`);

    try {
      execSync(mysqlCmd, {
        stdio: "pipe",
        shell: true,
        maxBuffer: 50 * 1024 * 1024, // 50MB
      });
      console.log(`✓ Backup restored\n`);
    } catch (err: any) {
      // Ignore some warnings but still continue
      if (err.message && !err.message.includes("Warning")) {
        console.error("Restore failed:", err.message);
        throw err;
      }
      console.log(`✓ Backup restored (with warnings)\n`);
    }

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Verify
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];
    const [patientsCount] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    console.log(`Restored state:`);
    console.log(`  Patients: ${patientsCount[0].count}`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Exams: ${examsCount[0].count}`);

    // Check matching with old patient IDs
    const [visitsOldMatched] = await conn.query(`
      SELECT COUNT(*) as count FROM visits v
      LEFT JOIN patients p ON v.patientId = p.id
      WHERE p.id IS NULL
    `) as any[];

    const [examsOldMatched] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations e
      LEFT JOIN patients p ON e.patientId = p.id
      WHERE p.id IS NULL
    `) as any[];

    console.log(`\nUnmatched (old IDs not in current patients):`);
    console.log(`  Visits: ${visitsOldMatched[0].count}`);
    console.log(`  Exams: ${examsOldMatched[0].count}`);

    console.log(`\n✓ COMPLETE! Visits and exams restored. Next: run remap script to update to new sequential IDs`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
