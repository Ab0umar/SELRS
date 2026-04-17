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
    console.log("=== Sync Patient Doctor/Service Codes from PAPAT_SRV ===\n");

    // Get all PAPAT_SRV records
    const papatResult = await pool.request().query(`
      SELECT DISTINCT
        PAT_CD,
        SRV_CD,
        SRV_BY1,
        SRV_BY2,
        SRV_BY3
      FROM op2026.dbo.PAPAT_SRV
      ORDER BY PAT_CD, SRV_CD
    `);

    const patientServices = papatResult.recordset || [];
    console.log(`Found ${patientServices.length} patient-service records in PAPAT_SRV\n`);

    let updated = 0;
    let skipped = 0;
    const issues: string[] = [];

    for (const ps of patientServices) {
      const patientCode = String(ps.PAT_CD).trim();
      const serviceCode = String(ps.SRV_CD).trim();
      const doctorCode1 = String(ps.SRV_BY1 || "").trim();
      const doctorCode2 = String(ps.SRV_BY2 || "").trim();
      const doctorCode3 = String(ps.SRV_BY3 || "").trim();

      // Find patient in MySQL
      const [mysqlPatients] = await mysqlConn.query(
        `SELECT id FROM patients WHERE patientCode = ?`,
        [patientCode]
      ) as any[];

      if (mysqlPatients.length === 0) {
        skipped++;
        continue;
      }

      const patientId = mysqlPatients[0].id;

      // Use first available doctor code
      const doctorCode = doctorCode1 || doctorCode2 || doctorCode3 || null;

      // Update patient with codes
      try {
        await mysqlConn.query(
          `UPDATE patients SET serviceCode = ?, doctorCode = ? WHERE id = ?`,
          [serviceCode, doctorCode, patientId]
        );
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${patientServices.length}...`);
        }
      } catch (err: any) {
        issues.push(`Patient ${patientCode}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated} patients`);
    console.log(`⚠ Skipped: ${skipped} records`);

    if (issues.length > 0) {
      console.log(`\n⚠ Issues (${issues.length}):`);
      issues.slice(0, 10).forEach(m => console.log(`  ${m}`));
      if (issues.length > 10) {
        console.log(`  ... and ${issues.length - 10} more`);
      }
    }

    // Verify
    const [stats] = await mysqlConn.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN doctorCode IS NOT NULL THEN 1 ELSE 0 END) as with_doctor,
        SUM(CASE WHEN serviceCode IS NOT NULL THEN 1 ELSE 0 END) as with_service
      FROM patients
    `) as any[];

    console.log("\n=== Final State ===");
    console.log(`Total patients: ${stats[0].total}`);
    console.log(`Patients with doctorCode: ${stats[0].with_doctor}`);
    console.log(`Patients with serviceCode: ${stats[0].with_service}`);

    console.log(`\n✓ COMPLETE! Codes synced from PAPAT_SRV`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
