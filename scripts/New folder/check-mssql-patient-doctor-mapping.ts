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
    console.log("=== Checking MSSQL Patient-Doctor Mapping ===\n");

    // Check PAPATMF table for doctor field
    const [columns] = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAPATMF' AND TABLE_SCHEMA = 'op2026'
      ORDER BY ORDINAL_POSITION
    `) as any;

    console.log("PAPATMF columns:");
    columns.recordset.forEach((col: any) => {
      if (col.COLUMN_NAME.toLowerCase().includes('doc') || col.COLUMN_NAME.toLowerCase().includes('dr')) {
        console.log(`  → ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      } else {
        console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      }
    });

    // Sample patients with doctor info
    console.log("\n\nSample patients with doctor info:");
    const [patients] = await pool.request().query(`
      SELECT TOP 10
        PAT_CD,
        PAT_NM_AR,
        PAT_SRV_TYP,
        PAT_DOCT_CD
      FROM op2026.dbo.PAPATMF
      WHERE PAT_DOCT_CD IS NOT NULL
    `) as any;

    if (patients.recordset.length > 0) {
      patients.recordset.forEach((p: any) => {
        console.log(`  ${p.PAT_CD}: ${p.PAT_NM_AR} - Service: ${p.PAT_SRV_TYP}, Doctor: ${p.PAT_DOCT_CD}`);
      });
    } else {
      console.log("  No patients with doctor code found");
    }

    // Check doctor table
    console.log("\n\nPADOCTF doctors:");
    const [doctors] = await pool.request().query(`
      SELECT TOP 10 DT_CD, DT_NM FROM op2026.dbo.PADOCTF
    `) as any;

    doctors.recordset.forEach((d: any) => {
      console.log(`  ${d.DT_CD}: ${d.DT_NM}`);
    });

    await pool.close();

  } finally {
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
