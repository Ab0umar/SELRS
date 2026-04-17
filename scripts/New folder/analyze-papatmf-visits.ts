import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const mysqlConn = await mysql.createConnection(process.env.DATABASE_URL!);

  const mssqlConfig = {
    user: process.env.MSSQL_USER || "sa",
    password: process.env.MSSQL_PASSWORD || "",
    server: process.env.MSSQL_SERVER || "localhost",
    database: process.env.MSSQL_DATABASE || "op2026",
    authentication: { type: "default" as const },
    options: { trustServerCertificate: true },
  };

  const pool = new sql.ConnectionPool(mssqlConfig);
  await pool.connect();

  try {
    console.log("=== Analyzing PAPATMF vs Visits ===\n");

    // Count MySQL visits per patient
    const [visitCounts] = await mysqlConn.query(`
      SELECT
        patientId,
        p.patientCode,
        COUNT(*) as visit_count
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      GROUP BY patientId, p.patientCode
      ORDER BY visit_count DESC
      LIMIT 20
    `) as any[];

    console.log("Top patients by visit count:");
    visitCounts.forEach((row: any) => {
      console.log(`  Patient ${row.patientCode}: ${row.visit_count} visits`);
    });

    // Get PAPATMF exam records
    const examsResult = await pool.request().query(`
      SELECT
        PAT_CD,
        COUNT(*) as exam_count,
        MIN(DT) as first_exam,
        MAX(DT) as last_exam
      FROM op2026.dbo.PAPATMF
      GROUP BY PAT_CD
      ORDER BY exam_count DESC
    `);

    const exams = examsResult.recordset || [];
    console.log(`\nPAPATMF records: ${exams.length} unique patients`);
    console.log("Top patients by exam count:");
    exams.slice(0, 20).forEach((row: any) => {
      console.log(`  Patient ${row.PAT_CD}: ${row.exam_count} exams (${row.first_exam} - ${row.last_exam})`);
    });

    // Check distribution
    const [examsPerPatient] = await mysqlConn.query(`
      SELECT COUNT(*) as total
      FROM (
        SELECT PAT_CD, COUNT(*) as exam_count
        FROM op2026.dbo.PAPATMF
        GROUP BY PAT_CD
      ) AS exams
    `) as any[];

    console.log(`\n=== Statistics ===`);
    console.log(`MySQL visits total: ${(await mysqlConn.query('SELECT COUNT(*) as c FROM visits') as any[])[0][0].c}`);
    console.log(`MySQL patients: 1089`);
    console.log(`PAPATMF exams total: ${exams.reduce((sum: number, e: any) => sum + e.exam_count, 0)}`);
    console.log(`PAPATMF unique patients: ${exams.length}`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
