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
    console.log("=== PAPATMF Table Columns ===\n");

    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAPATMF' AND TABLE_SCHEMA = 'op2026'
      ORDER BY ORDINAL_POSITION
    `);

    result.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    console.log("\n=== Sample PAPATMF Record ===\n");
    const sample = await pool.request().query(`
      SELECT TOP 1 * FROM op2026.dbo.PAPATMF
    `);

    if (sample.recordset.length > 0) {
      const rec = sample.recordset[0];
      Object.keys(rec).forEach(key => {
        console.log(`  ${key}: ${rec[key]}`);
      });
    }

    await pool.close();

  } finally {
  }
}
main().catch(console.error);
