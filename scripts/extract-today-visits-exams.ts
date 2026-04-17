import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Extracting visits and exams entered today (April 11)...\n");

    // Get visits created today
    const [todayVisits] = await conn.query(`
      SELECT id, patientId, visitDate, visitType, branch, queueStatus, createdAt, updatedAt
      FROM visits
      WHERE DATE(createdAt) = '2026-04-11'
      ORDER BY createdAt DESC
      LIMIT 50
    `) as any[];

    console.log(`Visits entered today: ${todayVisits.length}\n`);
    console.log(`Recent visits:`);
    todayVisits.forEach((v: any) => {
      console.log(`  ID ${v.id}: patientId=${v.patientId}, type=${v.visitType}, status=${v.queueStatus}, created=${v.createdAt}`);
    });

    // Get exams created today
    const [todayExams] = await conn.query(`
      SELECT id, visitId, patientId, createdAt, updatedAt
      FROM examinations
      WHERE DATE(createdAt) = '2026-04-11'
      ORDER BY createdAt DESC
      LIMIT 50
    `) as any[];

    console.log(`\n\nExams entered today: ${todayExams.length}\n`);
    console.log(`Recent exams:`);
    todayExams.forEach((e: any) => {
      console.log(`  ID ${e.id}: visitId=${e.visitId}, patientId=${e.patientId}, created=${e.createdAt}`);
    });

    // Get total counts by date
    const [visitsByDate] = await conn.query(`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM visits
      WHERE DATE(createdAt) >= '2026-04-10'
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
    `) as any[];

    console.log(`\n\nVisits by date (last 2 days):`);
    visitsByDate.forEach((row: any) => {
      console.log(`  ${row.date}: ${row.count} visits`);
    });

    const [examsByDate] = await conn.query(`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM examinations
      WHERE DATE(createdAt) >= '2026-04-10'
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
    `) as any[];

    console.log(`\nExams by date (last 2 days):`);
    examsByDate.forEach((row: any) => {
      console.log(`  ${row.date}: ${row.count} exams`);
    });

    console.log(`\n✓ Analysis complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
