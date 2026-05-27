import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Get most recent shift payroll
  const [latest] = await conn.query(`
    SELECT year, month, section, COUNT(*) as cnt
    FROM salary_payroll
    WHERE emp_cd LIKE 'shift_%'
    GROUP BY year, month, section
    ORDER BY year DESC, month DESC
    LIMIT 3
  `) as any;
  
  console.log("Most recent shift payroll computation:");
  latest.forEach((r: any) => console.log(`  ${r.year}-${r.month} (${r.section}): ${r.cnt} shift staff`));
  
  // Check May 2026 by section
  const [may] = await conn.query(`
    SELECT section, COUNT(DISTINCT emp_cd) as cnt
    FROM salary_payroll
    WHERE year = 2026 AND month = 5
    GROUP BY section
  `) as any;
  
  console.log("\nMay 2026 payroll by section:");
  may.forEach((r: any) => console.log(`  ${r.section}: ${r.cnt} records`));
  
  await conn.end();
}

check().catch(console.error);
