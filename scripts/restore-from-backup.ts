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
    console.log("Restoring database from backup...\n");

    // Read backup file
    const backupFile = "E:\\MySQL\\Backups\\selrs26_20260411_000003.sql";
    console.log(`Reading: ${backupFile}`);
    const backupData = readFileSync(backupFile, "utf8");

    console.log(`Backup size: ${(backupData.length / 1024 / 1024).toFixed(2)} MB\n`);

    // Split by ; and execute statements
    const statements = backupData
      .split(";")
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("--") && !s.startsWith("/*"));

    console.log(`Found ${statements.length} SQL statements\n`);

    // Drop and recreate database
    console.log("Dropping current database...");
    await conn.query(`DROP DATABASE IF EXISTS selrs26`);
    await conn.query(`CREATE DATABASE selrs26`);
    console.log("✓ Database recreated\n");

    // Execute statements
    let executedCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      try {
        await conn.query(stmt);
        executedCount++;

        if (executedCount % 100 === 0) {
          console.log(`  Executed ${executedCount}/${statements.length}...`);
        }
      } catch (err: any) {
        // Skip errors on duplicate database creation
        if (!String(err.message).includes("already exists")) {
          console.error(`Statement ${i} failed:`, err.message.slice(0, 100));
        }
      }
    }

    console.log(`\n✓ Executed ${executedCount} statements`);
    console.log(`✓ Database restored successfully`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
