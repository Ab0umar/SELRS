import "dotenv/config";
import sql from "mssql";

async function main() {
  // Connect to MSSQL
  const mssqlConfig = {
    user: process.env.MSSQL_USER || "sa",
    password: process.env.MSSQL_PASSWORD || "",
    server: process.env.MSSQL_SERVER || "localhost",
    database: process.env.MSSQL_DATABASE || "op2026",
    authentication: {
      type: "default" as const,
    },
    options: {
      trustServerCertificate: true,
    },
  };

  const pool = new sql.ConnectionPool(mssqlConfig);
  await pool.connect();

  try {
    console.log("Updating PAT_CD in MSSQL...\n");

    // Check before update
    const checkBefore = await pool.request()
      .input('oldCode', sql.VarChar, '0000807')
      .query(`SELECT PAT_CD, PAT_NM_AR, PAT_NM_EN FROM op2026.dbo.PAPATMF WHERE PAT_CD = @oldCode`);

    if (checkBefore.recordset.length > 0) {
      console.log("Before update:");
      checkBefore.recordset.forEach((row: any) => {
        console.log(`  PAT_CD: ${row.PAT_CD} (${row.PAT_NM_AR || row.PAT_NM_EN})`);
      });
    } else {
      console.log("No patient found with PAT_CD = 0000807");
    }

    // Update
    const result = await pool.request()
      .input('oldCode', sql.VarChar, '0000807')
      .input('newCode', sql.VarChar, '0807')
      .query(`UPDATE op2026.dbo.PAPATMF SET PAT_CD = @newCode WHERE PAT_CD = @oldCode`);

    console.log(`\n✓ Updated ${result.rowsAffected[0]} record(s)\n`);

    // Check after update
    const checkAfter = await pool.request()
      .input('newCode', sql.VarChar, '0807')
      .query(`SELECT PAT_CD, PAT_NM_AR, PAT_NM_EN FROM op2026.dbo.PAPATMF WHERE PAT_CD = @newCode`);

    if (checkAfter.recordset.length > 0) {
      console.log("After update:");
      checkAfter.recordset.forEach((row: any) => {
        console.log(`  PAT_CD: ${row.PAT_CD} (${row.PAT_NM_AR || row.PAT_NM_EN})`);
      });
    }

    console.log(`\n✓ COMPLETE!`);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
