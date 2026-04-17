import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Check Records Using Old Patient IDs (>10000) ===\n");

    const tables = [
      { name: "patients", col: "id" },
      { name: "visits", col: "patientId" },
      { name: "examinations", col: "patientId" },
      { name: "appointments", col: "patientId" },
      { name: "doctorReports", col: "patientId" },
      { name: "patientPageStates", col: "patientId" },
    ];

    for (const t of tables) {
      try {
        const [rows] = await conn.query(`
          SELECT COUNT(*) as cnt, MIN(${t.col}) as min_id, MAX(${t.col}) as max_id
          FROM ${t.name}
          WHERE ${t.col} > 10000
        `) as any[];
        
        const count = rows[0].cnt;
        if (count > 0) {
          console.log(`${t.name}: ${count} records (IDs ${rows[0].min_id}-${rows[0].max_id})`);
        }
      } catch (e) {}
    }
  } finally {
    await conn.end();
  }
}
main().catch(console.error);
