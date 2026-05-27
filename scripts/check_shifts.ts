import "dotenv/config";
import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Check shift staff
  const [staff] = await conn.query(`
    SELECT id, name, active FROM shift_staff LIMIT 5
  `) as any;
  console.log("Shift staff:", staff);
  
  // Check shift attendance for current month
  const now = new Date();
  const [attendance] = await conn.query(`
    SELECT staff_id, COUNT(*) as cnt, SUM(present) as attended
    FROM shift_attendance
    WHERE year = ? AND month = ?
    GROUP BY staff_id
  `, [now.getFullYear(), now.getMonth() + 1]) as any;
  console.log("Shift attendance this month:", attendance);
  
  await conn.end();
}

check().catch(console.error);
