import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const mysqlConn = await mysql.createConnection(process.env.DATABASE_URL!);

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
    console.log("=== Sync Patient Dates from MSSQL PAPATMF ===\n");

    // Get MSSQL patient dates
    const papatResult = await pool.request().query(`
      SELECT 
        PAT_CD,
        VST_DT as lastVisit,
        ENTRYDATE as createdAt,
        UPDATEDATE as updatedAt
      FROM op2026.dbo.PAPATMF
      WHERE PAT_CD IS NOT NULL AND PAT_CD != ''
      ORDER BY PAT_CD
    `);

    const mssqlPatients = papatResult.recordset || [];
    console.log(`Found ${mssqlPatients.length} patients in MSSQL PAPATMF\n`);

    let updated = 0;
    let skipped = 0;
    const issues: string[] = [];

    for (const mssqlPat of mssqlPatients) {
      const patientCode = String(mssqlPat.PAT_CD).trim().padStart(4, '0');
      const lastVisit = mssqlPat.lastVisit;
      const createdAt = mssqlPat.createdAt;
      const updatedAt = mssqlPat.updatedAt;

      // Find patient in MySQL by patientCode
      const [mysqlPatients] = await mysqlConn.query(
        `SELECT id FROM patients WHERE patientCode = ?`,
        [patientCode]
      ) as any[];

      if (mysqlPatients.length === 0) {
        skipped++;
        continue;
      }

      const patientId = mysqlPatients[0].id;

      try {
        await mysqlConn.query(
          `UPDATE patients SET lastVisit = ?, createdAt = ?, updatedAt = ? WHERE id = ?`,
          [lastVisit, createdAt, updatedAt, patientId]
        );
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${mssqlPatients.length}...`);
        }
      } catch (err: any) {
        issues.push(`Patient ${patientCode}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated} patients`);
    console.log(`⚠ Skipped: ${skipped} patients (not found in MySQL)\n`);

    if (issues.length > 0) {
      console.log(`⚠ Issues (${issues.length}):`);
      issues.slice(0, 10).forEach(m => console.log(`  ${m}`));
      if (issues.length > 10) {
        console.log(`  ... and ${issues.length - 10} more`);
      }
    }

    // Verify
    const [stats] = await mysqlConn.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN lastVisit IS NOT NULL THEN 1 ELSE 0 END) as with_lastvisit,
        SUM(CASE WHEN createdAt IS NOT NULL THEN 1 ELSE 0 END) as with_createdat,
        SUM(CASE WHEN updatedAt IS NOT NULL THEN 1 ELSE 0 END) as with_updatedat
      FROM patients
    `) as any[];

    console.log("=== Final State ===");
    console.log(`Total patients: ${stats[0].total}`);
    console.log(`With lastVisit: ${stats[0].with_lastvisit}`);
    console.log(`With createdAt: ${stats[0].with_createdat}`);
    console.log(`With updatedAt: ${stats[0].with_updatedat}`);

    console.log(`\n✓ COMPLETE! Patient dates synced from MSSQL`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
