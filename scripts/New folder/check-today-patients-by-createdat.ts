import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Today's date: ${today}\n`);

    // Check patients created on today's date
    const [todayPatients] = await conn.query(`
      SELECT
        COUNT(*) as count,
        MIN(createdAt) as min_date,
        MAX(createdAt) as max_date
      FROM patients
      WHERE DATE(createdAt) = ?
    `, [today]) as any[];

    console.log(`Patients created on ${today}:`);
    console.log(`  Count: ${todayPatients[0].count}`);
    console.log(`  Date range: ${todayPatients[0].min_date} - ${todayPatients[0].max_date}`);

    // Check creation date distribution
    const [distribution] = await conn.query(`
      SELECT
        DATE(createdAt) as created_date,
        COUNT(*) as count
      FROM patients
      GROUP BY DATE(createdAt)
      ORDER BY created_date DESC
      LIMIT 10
    `) as any[];

    console.log(`\nTop 10 patient creation dates:`);
    distribution.forEach((row: any) => {
      console.log(`  ${row.created_date}: ${row.count} patients`);
    });

    // Sample patients from today
    if (todayPatients[0].count > 0) {
      const [samples] = await conn.query(`
        SELECT id, patientCode, fullName, serviceType, createdAt
        FROM patients
        WHERE DATE(createdAt) = ?
        LIMIT 5
      `, [today]) as any[];

      console.log(`\nSample patients from today:`);
      samples.forEach((p: any) => {
        console.log(`  ${p.patientCode}: ${p.fullName} (${p.serviceType})`);
      });
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
