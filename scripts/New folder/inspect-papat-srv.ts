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
    console.log("=== Inspecting PAPAT_SRV Table Structure ===\n");

    // Get column information
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAPAT_SRV'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Columns in PAPAT_SRV:");
    columnsResult.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // Get date columns
    console.log("\n=== Date/Time Columns ===");
    const dateColumnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PAPAT_SRV'
      AND DATA_TYPE IN ('datetime', 'datetime2', 'date', 'time')
    `);

    dateColumnsResult.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });

    // Get total count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM op2026.dbo.PAPAT_SRV
    `);

    console.log(`\nTotal records in PAPAT_SRV: ${countResult.recordset[0].total}`);

    // Get sample data
    console.log("\n=== Sample Records (First 2) ===\n");
    const sampleResult = await pool.request().query(`
      SELECT TOP 2 *
      FROM op2026.dbo.PAPAT_SRV
    `);

    if (sampleResult.recordset.length > 0) {
      sampleResult.recordset.forEach((record: any, idx: number) => {
        console.log(`Record ${idx + 1}:`);
        Object.keys(record).forEach(key => {
          const value = record[key];
          console.log(`  ${key}: ${value}`);
        });
        console.log();
      });
    }

    // Count by patient
    console.log("=== Services per Patient ===");
    const countsByPatient = await pool.request().query(`
      SELECT
        PAT_CD,
        COUNT(*) as srv_count
      FROM op2026.dbo.PAPAT_SRV
      GROUP BY PAT_CD
      ORDER BY srv_count DESC
    `);

    console.log("\nTop patients by service count:");
    countsByPatient.recordset.slice(0, 15).forEach((row: any) => {
      console.log(`  Patient ${row.PAT_CD}: ${row.srv_count} services`);
    });

    await pool.close();

  } finally {
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
