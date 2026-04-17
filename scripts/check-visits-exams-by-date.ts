import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking visits and exams by date...\n");

    // Get visits by visitDate
    const [visitsByDate] = await conn.query(`
      SELECT DATE(visitDate) as visit_date, COUNT(*) as count
      FROM visits
      GROUP BY DATE(visitDate)
      ORDER BY DATE(visitDate) DESC
      LIMIT 20
    `) as any[];

    console.log(`Visits by date (last 20 days):`);
    visitsByDate.forEach((row: any) => {
      console.log(`  ${row.visit_date}: ${row.count} visits`);
    });

    // Get exams by createdAt
    const [examsByDate] = await conn.query(`
      SELECT DATE(createdAt) as exam_date, COUNT(*) as count
      FROM examinations
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
      LIMIT 20
    `) as any[];

    console.log(`\nExams by createdAt (last 20 days):`);
    examsByDate.forEach((row: any) => {
      console.log(`  ${row.exam_date}: ${row.count} exams`);
    });

    // Get visits between March 31 and today
    const [recentVisits] = await conn.query(`
      SELECT DATE(visitDate) as visit_date, COUNT(*) as count
      FROM visits
      WHERE DATE(visitDate) >= '2026-03-31'
      GROUP BY DATE(visitDate)
      ORDER BY DATE(visitDate) DESC
    `) as any[];

    console.log(`\nVisits from March 31 onwards:`);
    if (recentVisits.length === 0) {
      console.log(`  ✗ NO VISITS after March 31`);
    } else {
      recentVisits.forEach((row: any) => {
        console.log(`  ${row.visit_date}: ${row.count} visits`);
      });
    }

    // Get exams between March 31 and today
    const [recentExams] = await conn.query(`
      SELECT DATE(createdAt) as exam_date, COUNT(*) as count
      FROM examinations
      WHERE DATE(createdAt) >= '2026-03-31'
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
    `) as any[];

    console.log(`\nExams from March 31 onwards:`);
    if (recentExams.length === 0) {
      console.log(`  ✗ NO EXAMS after March 31`);
    } else {
      recentExams.forEach((row: any) => {
        console.log(`  ${row.exam_date}: ${row.count} exams`);
      });
    }

    // Check for visits with today's date
    const [todayVisits] = await conn.query(`
      SELECT COUNT(*) as count FROM visits WHERE DATE(visitDate) = '2026-04-11'
    `) as any[];

    const [todayExams] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations WHERE DATE(createdAt) = '2026-04-11'
    `) as any[];

    console.log(`\nToday (2026-04-11):`);
    console.log(`  Visits: ${todayVisits[0].count}`);
    console.log(`  Exams: ${todayExams[0].count}`);

    // Check last visit and exam dates
    const [lastVisit] = await conn.query(`
      SELECT MAX(DATE(visitDate)) as last_date FROM visits
    `) as any[];

    const [lastExam] = await conn.query(`
      SELECT MAX(DATE(createdAt)) as last_date FROM examinations
    `) as any[];

    console.log(`\nLast dates:`);
    console.log(`  Last visit: ${lastVisit[0].last_date}`);
    console.log(`  Last exam: ${lastExam[0].last_date}`);

    console.log(`\n✓ Analysis complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
