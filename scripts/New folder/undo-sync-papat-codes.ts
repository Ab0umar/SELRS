import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [r] = await conn.query(
      "UPDATE patients SET doctorCode = NULL, serviceCode = NULL"
    ) as any[];
    console.log(`Cleared doctorCode + serviceCode on ${r.affectedRows} patients`);
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
