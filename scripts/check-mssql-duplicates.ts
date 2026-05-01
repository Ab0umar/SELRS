import "dotenv/config";
import sql from "mssql";

async function main() {
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
    console.log("Checking for duplicate PAT_CD in MSSQL...\n");

    const result = await pool.request().query(`
      SELECT PAT_CD, COUNT(*) as count
      FROM op2026.dbo.PAPATMF
      GROUP BY PAT_CD
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    if (result.recordset.length > 0) {
      console.log(`Found ${result.recordset.length} duplicate PAT_CD values:\n`);
      result.recordset.forEach((row: any) => {
        console.log(`  PAT_CD: ${row.PAT_CD} (${row.count} records)`);
      });

      // Show which patients have these duplicates
      console.log(`\nDetails of duplicate patients:`);
      for (const dup of result.recordset.slice(0, 5)) {
        const details = await pool.request()
          .input('code', sql.VarChar, dup.PAT_CD)
          .query(`SELECT PAT_CD, PAT_NM_AR, PAT_NM_EN FROM op2026.dbo.PAPATMF WHERE PAT_CD = @code`);
        console.log(`\n${dup.PAT_CD}:`);
        details.recordset.forEach((d: any) => {
          console.log(`  - ${d.PAT_NM_AR || d.PAT_NM_EN}`);
        });
      }
    } else {
      console.log("✓ No duplicates found");
    }

    await pool.close();
  } catch (err) {
    console.error("Failed:", err);
  }
}

main();
