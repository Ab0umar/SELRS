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
    console.log("=== Checking MSSQL Patient Services & Doctors ===\n");

    // Get sample patients
    const result = await pool.request().query(`
      SELECT TOP 20
        PAT_CD,
        PAT_NM_AR,
        PAT_SRV_TYP,
        PAT_DOCT_CD
      FROM op2026.dbo.PAPATMF
    `);

    console.log("Sample MSSQL patients:\n");
    result.recordset.forEach((p: any) => {
      console.log(`  ${p.PAT_CD}: ${p.PAT_NM_AR}`);
      console.log(`    Service: ${p.PAT_SRV_TYP || 'NULL'}`);
      console.log(`    Doctor: ${p.PAT_DOCT_CD || 'NULL'}\n`);
    });

  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
