import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Check if any shift staff records exist in payroll
  const [all] = await conn.query(`
    SELECT DISTINCT emp_cd FROM salary_payroll WHERE emp_cd LIKE 'shift_%'
  `) as any;
  
  console.log("Shift staff in payroll (all time):", all.map((r: any) => r.emp_cd));
  
  // Check what section shift staff should be in
  const [config] = await conn.query(`
    SELECT section FROM salary_commission_pools WHERE year = ? AND month = ?
  `, [2026, 5]) as any;
  
  console.log("\nCommission pools for 2026-05:", config.map((c: any) => c.section));
  
  await conn.end();
}

check().catch(console.error);
