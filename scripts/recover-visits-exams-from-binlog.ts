import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Attempting to recover lost visits/exams from binary logs...\n");

    // First, check if binary logging is enabled
    const [binlogStatus] = await conn.query(`SHOW VARIABLES LIKE 'log_bin'`) as any[];
    if (binlogStatus.length === 0 || binlogStatus[0].Value !== 'ON') {
      console.log("⚠ Binary logging is not enabled");
      return;
    }

    console.log("✓ Binary logging is enabled\n");

    // Get list of binlog files
    const [binlogs] = await conn.query(`SHOW BINARY LOGS`) as any[];
    console.log(`Found ${binlogs.length} binary log files\n`);

    // Show the most recent ones
    const recent = binlogs.slice(-5);
    console.log(`Most recent binlog files:`);
    recent.forEach((b: any) => {
      console.log(`  ${b.Log_name} (${Math.round(b.File_size / 1024 / 1024)}MB)`);
    });

    console.log(`\nTo recover lost visits/exams from April 11 after the backup:`);
    console.log(`\n1. Run this to extract SQL from binlogs:`);
    console.log(`   mysqlbinlog --database=selrs26 --start-datetime="2026-04-11 00:00:00" /e/MySQL/Data/binlog.000022 > recovered.sql`);
    console.log(`\n2. Or for all recent binlogs:`);
    console.log(`   mysqlbinlog --database=selrs26 --start-datetime="2026-04-11 00:00:00" /e/MySQL/Data/binlog.000022 /e/MySQL/Data/binlog.000023 /e/MySQL/Data/binlog.000024 > recovered.sql`);
    console.log(`\n3. Then review and execute the SQL file to restore visits/exams`);

    // Try to estimate when the backup was taken
    const [newestData] = await conn.query(`
      SELECT MAX(updatedAt) as max_update FROM visits
    `) as any[];

    console.log(`\nLatest visit update in DB: ${newestData[0]?.max_update || 'unknown'}`);

    console.log(`\n✓ Use mysqlbinlog tool to extract and recover the lost data`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
