import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Today's date: ${today}\n`);

    // Check visits on today's date
    const [todayVisits] = await conn.query(`
      SELECT
        COUNT(*) as count,
        MIN(visitDate) as min_date,
        MAX(visitDate) as max_date
      FROM visits
      WHERE DATE(visitDate) = ?
    `, [today]) as any[];

    console.log(`Visits on ${today}:`);
    console.log(`  Count: ${todayVisits[0].count}`);
    console.log(`  Date range: ${todayVisits[0].min_date} - ${todayVisits[0].max_date}`);

    // Check visit date distribution
    const [distribution] = await conn.query(`
      SELECT
        DATE(visitDate) as visit_date,
        COUNT(*) as count
      FROM visits
      GROUP BY DATE(visitDate)
      ORDER BY visit_date DESC
      LIMIT 10
    `) as any[];

    console.log(`\nTop 10 visit dates:`);
    distribution.forEach((row: any) => {
      console.log(`  ${row.visit_date}: ${row.count} visits`);
    });

    // Check what dates we actually have
    const [allDates] = await conn.query(`
      SELECT
        MIN(visitDate) as earliest,
        MAX(visitDate) as latest,
        COUNT(DISTINCT DATE(visitDate)) as unique_dates
      FROM visits
    `) as any[];

    console.log(`\nVisit date statistics:`);
    console.log(`  Earliest: ${allDates[0].earliest}`);
    console.log(`  Latest: ${allDates[0].latest}`);
    console.log(`  Unique dates: ${allDates[0].unique_dates}`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
