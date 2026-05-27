import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const [rows] = await conn.query(`
    SELECT emp_cd, basic_salary, absent_deduction, total_deductions, net_basic, total_pay
    FROM salary_payroll
    WHERE year = 2026 AND month = 5 AND section = 'مركز' AND emp_cd LIKE 'shift_%'
  `) as any;
  
  console.log("\nShift staff payroll for May 2026 (مركز):");
  rows.forEach((r: any) => {
    console.log(`  ${r.emp_cd}: basic=${r.basic_salary}, absent_ded=${r.absent_deduction}, total_ded=${r.total_deductions}, net=${r.net_basic}, pay=${r.total_pay}`);
  });
  
  await conn.end();
}

check().catch(console.error);
