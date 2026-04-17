import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("=== Searching for April 11 data across all tables ===\n");

    // Check visits
    const [visitsApril11] = await conn.query(`
      SELECT COUNT(*) as count, MIN(createdAt) as first, MAX(createdAt) as last
      FROM visits
      WHERE DATE(createdAt) = '2026-04-11'
    `) as any[];

    console.log("Visits (2026-04-11):");
    console.log(`  Total: ${visitsApril11[0].count}`);
    if (visitsApril11[0].count > 0) {
      console.log(`  Range: ${visitsApril11[0].first} to ${visitsApril11[0].last}\n`);
    } else {
      console.log("");
    }

    // Check examinations
    const [examsApril11] = await conn.query(`
      SELECT COUNT(*) as count, MIN(createdAt) as first, MAX(createdAt) as last
      FROM examinations
      WHERE DATE(createdAt) = '2026-04-11'
    `) as any[];

    console.log("Examinations (2026-04-11):");
    console.log(`  Total: ${examsApril11[0].count}`);
    if (examsApril11[0].count > 0) {
      console.log(`  Range: ${examsApril11[0].first} to ${examsApril11[0].last}\n`);
    } else {
      console.log("");
    }

    // Check sheet_entries (JSON data)
    const [sheetEntriesApril11] = await conn.query(`
      SELECT COUNT(*) as count, MIN(createdAt) as first, MAX(createdAt) as last
      FROM sheet_entries
      WHERE DATE(createdAt) = '2026-04-11'
    `) as any[];

    console.log("Sheet Entries (JSON) (2026-04-11):");
    console.log(`  Total: ${sheetEntriesApril11[0].count}`);
    if (sheetEntriesApril11[0].count > 0) {
      console.log(`  Range: ${sheetEntriesApril11[0].first} to ${sheetEntriesApril11[0].last}\n`);
    } else {
      console.log("");
    }

    // Check pentacamresults
    const [pentacamApril11] = await conn.query(`
      SELECT COUNT(*) as count, MIN(createdAt) as first, MAX(createdAt) as last
      FROM pentacamresults
      WHERE DATE(createdAt) = '2026-04-11'
    `) as any[];

    console.log("Pentacam Results (2026-04-11):");
    console.log(`  Total: ${pentacamApril11[0].count}`);
    if (pentacamApril11[0].count > 0) {
      console.log(`  Range: ${pentacamApril11[0].first} to ${pentacamApril11[0].last}\n`);
    } else {
      console.log("");
    }

    // Check autorefractometrydata
    const [autorefApril11] = await conn.query(`
      SELECT COUNT(*) as count, MIN(createdAt) as first, MAX(createdAt) as last
      FROM autorefractometrydata
      WHERE DATE(createdAt) = '2026-04-11'
    `) as any[];

    console.log("Autorefractometry Data (2026-04-11):");
    console.log(`  Total: ${autorefApril11[0].count}`);
    if (autorefApril11[0].count > 0) {
      console.log(`  Range: ${autorefApril11[0].first} to ${autorefApril11[0].last}\n`);
    } else {
      console.log("");
    }

    // Check all tables overall totals
    const [allTables] = await conn.query(`
      SELECT 'visits' as table_name, COUNT(*) as total FROM visits
      UNION ALL
      SELECT 'examinations', COUNT(*) FROM examinations
      UNION ALL
      SELECT 'sheet_entries', COUNT(*) FROM sheet_entries
      UNION ALL
      SELECT 'pentacamresults', COUNT(*) FROM pentacamresults
      UNION ALL
      SELECT 'autorefractometrydata', COUNT(*) FROM autorefractometrydata
    `) as any[];

    console.log("Overall totals:");
    allTables.forEach((row: any) => {
      console.log(`  ${row.table_name}: ${row.total}`);
    });

    // Check for any data between April 11 1pm-5pm (when colleague was entering)
    const [busyHours] = await conn.query(`
      SELECT
        DATE(createdAt) as date,
        HOUR(createdAt) as hour,
        COUNT(*) as count
      FROM examinations
      WHERE DATE(createdAt) = '2026-04-11'
      AND HOUR(createdAt) >= 13
      AND HOUR(createdAt) < 17
      GROUP BY DATE(createdAt), HOUR(createdAt)
      ORDER BY hour
    `) as any[];

    if (busyHours.length > 0) {
      console.log("\nData by hour (April 11, 1pm-5pm):");
      busyHours.forEach((row: any) => {
        console.log(`  ${row.hour}:00 - ${row.count} exams`);
      });
    } else {
      console.log("\nNo exams found between 1pm-5pm on April 11");
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
