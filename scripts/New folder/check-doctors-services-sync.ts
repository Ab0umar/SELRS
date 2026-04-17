import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const mysqlConn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    console.log("=== Checking Doctors and Services Sync ===\n");

    // Check MySQL doctors
    const [mysqlDoctors] = await mysqlConn.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'doctor'`
    ) as any[];

    // Check MySQL services
    const [mysqlServices] = await mysqlConn.query(
      `SELECT COUNT(*) as count FROM services`
    ) as any[];

    console.log("MySQL:");
    console.log(`  Doctors: ${mysqlDoctors[0].count}`);
    console.log(`  Services: ${mysqlServices[0].count}\n`);

    // Connect to MSSQL
    const mssqlConfig = {
      user: process.env.MSSQL_USER || "sa",
      password: process.env.MSSQL_PASSWORD || "",
      server: process.env.MSSQL_SERVER || "localhost",
      database: process.env.MSSQL_DATABASE || "op2026",
      authentication: { type: "default" as const },
      options: { trustServerCertificate: true },
    };

    const pool = new sql.ConnectionPool(mssqlConfig);
    await pool.connect();

    // Check MSSQL for doctors table
    const doctorsResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'PADOCTF' AND TABLE_SCHEMA = 'op2026'
    `) as any;

    if (doctorsResult.recordset[0].count > 0) {
      const [doctorData] = await pool.request().query(`
        SELECT COUNT(*) as count FROM op2026.dbo.PADOCTF
      `) as any;
      console.log(`MSSQL:`);
      console.log(`  Doctors table (PADOCTF): ${doctorData.recordset[0].count}`);
    } else {
      console.log("MSSQL: Doctors table (PADOCTF) not found");
    }

    // Check MSSQL for services
    const servicesResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%SERV%' AND TABLE_SCHEMA = 'op2026'
    `) as any;

    if (servicesResult.recordset.length > 0) {
      console.log(`  Services tables found:`);
      servicesResult.recordset.forEach((row: any) => {
        console.log(`    - ${row.TABLE_NAME}`);
      });
    } else {
      console.log(`  Services table: not found`);
    }

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
