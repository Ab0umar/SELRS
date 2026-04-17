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
    console.log("=== PAPATMF Columns ===\n");

    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAPATMF' AND TABLE_SCHEMA = 'op2026'
      ORDER BY ORDINAL_POSITION
    `);

    result.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    console.log("\n\nSample patient record:");
    const sampleResult = await pool.request().query(`
      SELECT TOP 1 * FROM op2026.dbo.PAPATMF
    `);

    const sample = sampleResult.recordset[0];
    if (sample) {
      Object.entries(sample).forEach(([key, value]: [string, any]) => {
        if (value !== null && value !== '') {
          console.log(`  ${key}: ${value}`);
        }
      });
    }

    await pool.close();

  } finally {
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
