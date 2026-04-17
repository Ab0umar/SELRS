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
    console.log("=== Inspecting PAJRNRCVH Table Structure ===\n");

    // Get column information
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAJRNRCVH'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Columns in PAJRNRCVH:");
    columnsResult.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // Get sample data
    console.log("\n=== Sample Records (First 5) ===\n");
    const sampleResult = await pool.request().query(`
      SELECT TOP 5 *
      FROM op2026.dbo.PAJRNRCVH
    `);

    if (sampleResult.recordset.length > 0) {
      const firstRecord = sampleResult.recordset[0];
      console.log("Sample record keys:");
      Object.keys(firstRecord).forEach(key => {
        const value = firstRecord[key];
        console.log(`  ${key}: ${value}`);
      });
    }

    // Get count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM op2026.dbo.PAJRNRCVH
    `);

    console.log(`\nTotal records in PAJRNRCVH: ${countResult.recordset[0].total}`);

    // Check for date columns specifically
    console.log("\n=== Date Columns ===");
    const dateColumnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAJRNRCVH'
      AND DATA_TYPE IN ('datetime', 'datetime2', 'date', 'time')
    `);

    dateColumnsResult.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });

    await pool.close();

  } finally {
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
