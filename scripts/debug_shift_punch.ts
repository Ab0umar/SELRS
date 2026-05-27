import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  
  console.log(`\n=== Checking ${year}-${mm} ===\n`);
  
  // Check shift attendance for staff 1 (سعيد مجدي)
  const [shifts] = await conn.query(`
    SELECT sa.id, sa.work_date, sa.present, sa.shift_name
    FROM shift_attendance sa
    WHERE sa.staff_id = 1 AND sa.year = ? AND sa.month = ?
    ORDER BY sa.work_date
    LIMIT 5
  `, [year, month]) as any;
  console.log("Sample shift records for staff 1:");
  shifts.forEach((s: any) => {
    const d = s.work_date instanceof Date 
      ? `${s.work_date.getFullYear()}-${String(s.work_date.getMonth() + 1).padStart(2, '0')}-${String(s.work_date.getDate()).padStart(2, '0')}`
      : String(s.work_date).slice(0, 10);
    console.log(`  ${d}: present=${s.present}, shift=${s.shift_name}`);
  });
  
  // Check punch records for emp 37 (سعيد مجدي)
  const [punches] = await conn.query(`
    SELECT ad.work_date, ad.status
    FROM attendance_daily ad
    WHERE ad.emp_cd = '37' AND ad.work_date >= ? AND ad.work_date <= ?
    ORDER BY ad.work_date
    LIMIT 5
  `, [`${year}-${mm}-01`, `${year}-${mm}-${String(lastDay).padStart(2, '0')}`]) as any;
  console.log("\nSample punch records for emp 37:");
  punches.forEach((p: any) => {
    const d = p.work_date instanceof Date 
      ? `${p.work_date.getFullYear()}-${String(p.work_date.getMonth() + 1).padStart(2, '0')}-${String(p.work_date.getDate()).padStart(2, '0')}`
      : String(p.work_date).slice(0, 10);
    console.log(`  ${d}: ${p.status}`);
  });
  
  // Compare dates
  const shiftDates = new Set(shifts.map((s: any) => {
    const d = s.work_date instanceof Date 
      ? `${s.work_date.getFullYear()}-${String(s.work_date.getMonth() + 1).padStart(2, '0')}-${String(s.work_date.getDate()).padStart(2, '0')}`
      : String(s.work_date).slice(0, 10);
    return d;
  }));
  
  const punchDates = new Set(punches
    .filter((p: any) => p.status === 'present' || p.status === 'partial' || p.status === 'missing_checkout')
    .map((p: any) => {
      const d = p.work_date instanceof Date 
        ? `${p.work_date.getFullYear()}-${String(p.work_date.getMonth() + 1).padStart(2, '0')}-${String(p.work_date.getDate()).padStart(2, '0')}`
        : String(p.work_date).slice(0, 10);
      return d;
    }));
  
  console.log("\nDate comparison:");
  console.log(`Shift dates: ${Array.from(shiftDates).join(', ')}`);
  console.log(`Punch dates: ${Array.from(punchDates).join(', ')}`);
  console.log(`Match: ${Array.from(shiftDates).filter(d => punchDates.has(d)).length} / ${shiftDates.size}`);
  
  await conn.end();
}

check().catch(console.error);
