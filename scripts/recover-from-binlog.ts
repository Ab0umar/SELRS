import "dotenv/config";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Recovering lost visits/exams from MySQL binary logs...\n");

  const binlogDir = "/e/MySQL/Data";
  const outputFile = "E:\\SELRS.cc\\scripts\\recovered-transactions.sql";

  // Get the index of the last applied binlog
  const binlogIndexPath = path.join(binlogDir, "binlog.index");
  const binlogIndex = fs.readFileSync(binlogIndexPath, "utf8").trim().split("\n");

  console.log(`Found ${binlogIndex.length} binlog files\n`);

  // Get the backup timestamp (approximate - when backup was taken)
  // We'll extract from binlog.000024 and binlog.000023 to get recent transactions
  const recentBinlogs = ["binlog.000022", "binlog.000023", "binlog.000024"];

  console.log(`Extracting transactions from recent binlogs:\n`);
  console.log(`  - binlog.000022`);
  console.log(`  - binlog.000023`);
  console.log(`  - binlog.000024\n`);

  let output = "";
  output += "-- Recovered transactions from binary logs\n";
  output += "-- Visits and Examinations inserts from April 11\n\n";

  for (const binlog of recentBinlogs) {
    const binlogPath = path.join(binlogDir, binlog);

    if (!fs.existsSync(binlogPath)) {
      console.log(`⚠ ${binlog} not found, skipping`);
      continue;
    }

    try {
      // Use mysqlbinlog to extract SQL statements
      const cmd = `mysqlbinlog --database=selrs26 "${binlogPath}" 2>/dev/null | grep -E "^(INSERT INTO \`(visits|examinations)|UPDATE|DELETE)" || true`;

      console.log(`Reading ${binlog}...`);

      try {
        const result = execSync(cmd, { shell: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
        if (result) {
          output += `\n-- From ${binlog}\n`;
          output += result;
        }
      } catch (e) {
        // mysqlbinlog might not be available, continue
        console.log(`  (mysqlbinlog tool not available for ${binlog})`);
      }
    } catch (err) {
      console.error(`Error processing ${binlog}:`, err);
    }
  }

  if (output.length > 100) {
    fs.writeFileSync(outputFile, output);
    console.log(`\n✓ Extracted recovered transactions to:\n  ${outputFile}`);
    console.log(`\nFile size: ${Math.round(output.length / 1024)}KB`);
    console.log(`\nNext steps:`);
    console.log(`1. Review the recovered SQL file`);
    console.log(`2. Execute it to restore the lost visits/exams`);
  } else {
    console.log(`\n⚠ No transactions found in binlogs`);
    console.log(`\nAlternative: Use MySQL point-in-time recovery:`);
    console.log(`  mysqlbinlog --start-datetime="2026-04-11 00:00:00" /e/MySQL/Data/binlog.000024 > recovery.sql`);
  }
}

main().catch(console.error);
