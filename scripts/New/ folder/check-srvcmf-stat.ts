import "dotenv/config";
import sql from "mssql";

async function main() {
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

  try {
    console.log("=== Checking SRVCMF STAT Values ===\n");

    // Check all STAT values
    const result = await pool.request().query(`
      SELECT DISTINCT STAT, COUNT(*) as count
      FROM op2026.dbo.SRVCMF
      GROUP BY STAT
      ORDER BY STAT
    `);

    console.log("STAT values in SRVCMF:");
    result.recordset.forEach((row: any) => {
      console.log(`  STAT=${row.STAT}: ${row.count} services`);
    });

    // Show sample services regardless of STAT
    console.log("\n=== Sample Services (First 10) ===\n");
    const samples = await pool.request().query(`
      SELECT TOP 10 SRV_CD, SRV_NM_AR, SRV_NM_EN, STAT
      FROM op2026.dbo.SRVCMF
      ORDER BY SRV_CD
    `);

    samples.recordset.forEach((s: any) => {
      console.log(`  ${s.SRV_CD}: ${s.SRV_NM_AR} (STAT=${s.STAT})`);
    });

    await pool.close();

  } finally {
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
