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
    console.log("Applying recovered SQL from binary logs...\n");

    // Read the recovered SQL file
    const sqlFile = "E:\\SELRS.cc\\recovered.sql";
    const sql = readFileSync(sqlFile, "utf8");

    console.log(`Read recovered SQL file (${Math.round(sql.length / 1024 / 1024)}MB)\n`);

    // Split by delimiter (;) but be careful with BINLOG statements
    const statements = sql
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"));

    console.log(`Found ${statements.length} statements\n`);

    // Disable FOREIGN_KEY_CHECKS for restoration
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    console.log(`✓ Disabled FOREIGN_KEY_CHECKS\n`);

    let applied = 0;
    let errors = 0;
    const errorLog: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      if (!stmt || stmt.length < 5) continue;

      try {
        await conn.query(stmt);
        applied++;

        if ((applied + errors) % 1000 === 0) {
          console.log(`  Processed ${applied + errors} statements (${applied} applied, ${errors} errors)...`);
        }
      } catch (err: any) {
        errors++;
        const msg = String(err.message).toLowerCase();

        // Log only non-ignorable errors
        if (
          !msg.includes("syntax error") &&
          !msg.includes("you have an error") &&
          !msg.includes("binlog")
        ) {
          errorLog.push(`${i}: ${err.message.slice(0, 80)}`);
        }
      }
    }

    // Re-enable FOREIGN_KEY_CHECKS
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    console.log(`\n✓ Applied recovered SQL:`);
    console.log(`  Statements applied: ${applied}`);
    console.log(`  Errors: ${errors}`);

    if (errorLog.length > 0) {
      console.log(`\nFirst 10 errors:`);
      errorLog.slice(0, 10).forEach((e) => console.log(`  ${e}`));
    }

    // Verify new data
    const [visitsCount] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];
    const [examsCount] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];

    const [latestVisit] = await conn.query(`
      SELECT MAX(updatedAt) as max_date FROM visits
    `) as any[];

    const [latestExam] = await conn.query(`
      SELECT MAX(updatedAt) as max_date FROM examinations
    `) as any[];

    console.log(`\nFinal state:`);
    console.log(`  Visits: ${visitsCount[0].count}`);
    console.log(`  Exams: ${examsCount[0].count}`);
    console.log(`  Latest visit update: ${latestVisit[0].max_date}`);
    console.log(`  Latest exam update: ${latestExam[0].max_date}`);

    console.log(`\n✓ Recovery complete!`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
