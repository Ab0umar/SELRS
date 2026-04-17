import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== DOCTORS TABLE ===");
    const [doctorCols] = await conn.query(`DESCRIBE doctors`) as any[];
    doctorCols.forEach((col: any) => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(25)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log("\n=== SERVICES TABLE ===");
    const [serviceCols] = await conn.query(`DESCRIBE services`) as any[];
    serviceCols.forEach((col: any) => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(25)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log("\n=== SAMPLE DATA ===");
    const [doctors] = await conn.query(`SELECT * FROM doctors LIMIT 3`) as any[];
    console.log("Doctors:", doctors);

    const [services] = await conn.query(`SELECT * FROM services LIMIT 3`) as any[];
    console.log("Services:", services);

  } finally {
    await conn.end();
  }
}

main().catch(err => console.error(err.message));
