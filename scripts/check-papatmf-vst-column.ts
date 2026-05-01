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
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAPATMF' AND TABLE_SCHEMA = 'op2026'
      AND COLUMN_NAME LIKE '%VST%' OR COLUMN_NAME LIKE '%DT%'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Columns with VST or DT:");
    result.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}`);
    });

    // Try to get the actual data
    const sample = await pool.request().query(`
      SELECT PAT_CD, * FROM op2026.dbo.PAPATMF
      WHERE PAT_CD = '0001'
    `);

    if (sample.recordset.length > 0) {
      console.log("\nSample record keys:");
      Object.keys(sample.recordset[0]).forEach(key => {
        if (key.includes('DT') || key.includes('VST') || key.includes('LV')) {
          console.log(`  ${key}: ${sample.recordset[0][key]}`);
        }
      });
    }

    await pool.close();
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
main().catch(console.error);
