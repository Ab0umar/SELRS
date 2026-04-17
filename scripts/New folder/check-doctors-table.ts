import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM doctors") as any[];
    console.log("Doctors cols:", (cols as any[]).map((c: any) => c.Field).join(", "));

    const [sample] = await conn.query("SELECT id, code, name, locationType, isActive FROM doctors LIMIT 5") as any[];
    console.log("Sample:");
    (sample as any[]).forEach((r: any) => console.log(" ", JSON.stringify(r)));

    const [cnt] = await conn.query("SELECT locationType, COUNT(*) as n FROM doctors GROUP BY locationType") as any[];
    console.log("\nBy locationType:");
    (cnt as any[]).forEach((r: any) => console.log(" ", r.locationType, ":", r.n));

    const [total] = await conn.query("SELECT COUNT(*) as n FROM doctors") as any[];
    console.log("\nTotal doctors:", (total as any[])[0].n);

    // Check PAPAT_SRV doctor codes vs doctors table
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

    const r = await pool.request().query(`
      SELECT DISTINCT SRV_BY1 as code
      FROM op2026.dbo.PAPAT_SRV
      WHERE SRV_BY1 IS NOT NULL AND SRV_BY1 != ''
    `);
    const mssqlCodes = (r.recordset || []).map((x: any) => String(x.code).trim()).filter(Boolean);
    console.log(`\nMSSQL PAPAT_SRV distinct SRV_BY1 codes: ${mssqlCodes.length}`);

    // Check which are missing in doctors table
    const [drCodes] = await conn.query("SELECT code FROM doctors WHERE code IS NOT NULL") as any[];
    const mysqlCodes = new Set((drCodes as any[]).map((r: any) => String(r.code).trim().toLowerCase()));
    const missing = mssqlCodes.filter(c => !mysqlCodes.has(c.toLowerCase()));
    console.log(`Missing in MySQL doctors: ${missing.length}`);
    if (missing.length > 0 && missing.length <= 20) {
      console.log("Missing codes:", missing.join(", "));
    }

    await pool.close();
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
