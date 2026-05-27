import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // Check if shift staff have emp_cd (linked to employees)
  const [linked] = await conn.query(`
    SELECT id, name, emp_cd FROM shift_staff WHERE emp_cd IS NOT NULL
  `) as any;
  console.log("\nShift staff linked to employees:", linked);
  
  // Check punch data for linked employees
  if (linked.length > 0) {
    const empCds = linked.map((r: any) => r.emp_cd);
    const [reports] = await conn.query(`
      SELECT emp_cd, total_late_mins, total_early_leave_mins 
      FROM attendance_monthly_report 
      WHERE year = ? AND month = ? AND emp_cd IN (?)
    `, [year, month, empCds]) as any;
    console.log("Punch data (late/early leave):", reports);
  }
  
  await conn.end();
}

check().catch(console.error);
