import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Count shift attendance for May 2026
  const [att] = await conn.query(`
    SELECT staff_id, COUNT(*) as scheduled, SUM(present) as attended
    FROM shift_attendance
    WHERE year = 2026 AND month = 5
    GROUP BY staff_id
  `) as any;
  
  console.log("Shift attendance May 2026:");
  att.forEach((r: any) => console.log(`  staff_id ${r.staff_id}: scheduled=${r.scheduled}, attended=${r.attended}`));
  
  // Check if any punches with 'present'/'partial' exist for these staff
  const [punches] = await conn.query(`
    SELECT ad.emp_cd, COUNT(*) as cnt, ad.status
    FROM attendance_daily ad
    WHERE ad.work_date >= '2026-05-01' AND ad.work_date < '2026-06-01'
    AND ad.status IN ('present', 'partial', 'missing_checkout')
    GROUP BY ad.emp_cd, ad.status
  `) as any;
  
  console.log("\nPunch records (present/partial/missing_checkout) for May 2026:");
  punches.forEach((r: any) => console.log(`  emp_cd ${r.emp_cd}: ${r.cnt} ${r.status} records`));
  
  if (punches.length === 0) {
    console.log("  (NONE - all employees marked as 'absent' in attendance_daily)");
  }
  
  await conn.end();
}

check().catch(console.error);
