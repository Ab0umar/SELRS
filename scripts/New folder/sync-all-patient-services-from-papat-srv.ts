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
    console.log("=== Syncing All Patient Services from PAPAT_SRV ===\n");

    // Get all service records from MSSQL
    const result = await pool.request().query(`
      SELECT DISTINCT
        PAT_CD,
        SRV_CD,
        DT as serviceDate
      FROM op2026.dbo.PAPAT_SRV
      WHERE PAT_CD IS NOT NULL AND PAT_CD != ''
        AND SRV_CD IS NOT NULL AND SRV_CD != ''
      ORDER BY PAT_CD, SRV_CD
    `);

    const services = result.recordset || [];
    console.log(`Found ${services.length} unique patient-service combinations in PAPAT_SRV\n`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const issues: string[] = [];

    // Process each service
    for (const srv of services) {
      const patCode = String(srv.PAT_CD).trim();
      const srvCode = String(srv.SRV_CD).trim();
      const srvDate = srv.serviceDate;

      // Find patient in MySQL
      const [patients] = await mysqlConn.query(
        `SELECT id FROM patients WHERE patientCode = ?`,
        [patCode]
      ) as any[];

      if (patients.length === 0) {
        notFound++;
        continue;
      }

      const patientId = patients[0].id;

      // Check if service entry already exists
      const [existing] = await mysqlConn.query(
        `SELECT id FROM patientServiceEntries WHERE patientId = ? AND serviceCode = ?`,
        [patientId, srvCode]
      ) as any[];

      try {
        if (existing.length > 0) {
          // Update existing
          await mysqlConn.query(
            `UPDATE patientServiceEntries SET serviceDate = ?, sourceRef = 'PAPAT_SRV', updatedAt = NOW() WHERE patientId = ? AND serviceCode = ?`,
            [srvDate, patientId, srvCode]
          );
          updated++;
        } else {
          // Insert new
          await mysqlConn.query(
            `INSERT INTO patientServiceEntries (patientId, serviceCode, serviceDate, sourceRef, createdAt, updatedAt)
             VALUES (?, ?, ?, 'PAPAT_SRV', NOW(), NOW())`,
            [patientId, srvCode, srvDate]
          );
          inserted++;
        }

        if ((inserted + updated) % 100 === 0) {
          console.log(`  Processed ${inserted + updated}/${services.length}...`);
        }
      } catch (err: any) {
        console.error(`  Error for patient ${patCode}, service ${srvCode}: ${err.message.slice(0, 80)}`);
        issues.push(`${patCode}/${srvCode}: ${err.message.slice(0, 60)}`);
      }
    }

    console.log(`\n✓ Inserted: ${inserted} new service entries`);
    console.log(`✓ Updated: ${updated} existing entries`);
    console.log(`⚠ Patient codes not found: ${notFound}`);
    console.log(`⚠ Skipped: ${skipped}`);

    if (issues.length > 0) {
      console.log(`\n⚠ Issues (${issues.length}):`);
      issues.slice(0, 5).forEach(issue => console.log(`  ${issue}`));
      if (issues.length > 5) {
        console.log(`  ... and ${issues.length - 5} more`);
      }
    }

    // Verify
    const [finalStats] = await mysqlConn.query(`
      SELECT
        COUNT(*) as total_entries,
        COUNT(DISTINCT patientId) as patients_with_services
      FROM patientServiceEntries
    `) as any[];

    const [totalPatients] = await mysqlConn.query(`
      SELECT COUNT(*) as total FROM patients
    `) as any[];

    console.log("\n=== Final Statistics ===");
    console.log(`Total patients: ${totalPatients[0].total}`);
    console.log(`Patients with service entries: ${finalStats[0].patients_with_services}`);
    console.log(`Total service entries: ${finalStats[0].total_entries}`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
