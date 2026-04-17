import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Checking Visit Dates ===\n");

    // Check visitDate status
    const [visitStats] = await conn.query(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN visitDate IS NOT NULL THEN 1 ELSE 0 END) as with_visitDate,
        SUM(CASE WHEN visitDate IS NULL THEN 1 ELSE 0 END) as null_visitDate,
        MIN(visitDate) as min_date,
        MAX(visitDate) as max_date
      FROM visits
    `) as any[];

    console.log("Visit dates status:");
    console.log(`  Total visits: ${visitStats[0].total_visits}`);
    console.log(`  With visitDate: ${visitStats[0].with_visitDate}`);
    console.log(`  NULL visitDate: ${visitStats[0].null_visitDate}`);
    console.log(`  Min date: ${visitStats[0].min_date}`);
    console.log(`  Max date: ${visitStats[0].max_date}`);

    // Check sample visits
    console.log("\n=== Sample Visits ===\n");
    const [samples] = await conn.query(`
      SELECT
        v.id,
        v.patientId,
        p.patientCode,
        p.fullName,
        v.visitDate,
        p.lastVisit,
        p.createdAt
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      LIMIT 10
    `) as any[];

    samples.forEach((row: any) => {
      console.log(`Visit ${row.id} (Patient ${row.patientCode} - ${row.fullName}):`);
      console.log(`  visitDate: ${row.visitDate}`);
      console.log(`  patient.lastVisit: ${row.lastVisit}`);
      console.log(`  patient.createdAt: ${row.createdAt}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
