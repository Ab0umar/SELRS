import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const [rows] = await conn.query(`
    SELECT emp_cd, basic_salary, absent_deduction, total_deductions, net_basic, total_pay
    FROM salary_payroll
    WHERE year = ? AND month = ? AND section = 'مركز'
    LIMIT 10
  `, [year, month]) as any;
  
  console.log(`\nPayroll records for ${year}-${month} (مركز):`);
  rows.forEach((r: any) => {
    const isShift = r.emp_cd.startsWith('shift_');
    console.log(`  ${r.emp_cd} (${isShift ? 'SHIFT' : 'EMP'}): basic=${r.basic_salary}, absent_ded=${r.absent_deduction}, total_ded=${r.total_deductions}, net=${r.net_basic}, pay=${r.total_pay}`);
  });
  
  const shiftCount = rows.filter((r: any) => r.emp_cd.startsWith('shift_')).length;
  console.log(`\nTotal: ${rows.length} records, ${shiftCount} are shift staff`);
  
  await conn.end();
}

check().catch(console.error);
