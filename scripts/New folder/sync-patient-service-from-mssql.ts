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
    console.log("=== Sync Patient Service Assignments from MSSQL ===\n");

    // Get all MSSQL patients with their service type and doctor code
    const result = await pool.request().query(`
      SELECT
        PAT_CD,
        PAT_NM_AR,
        PAT_SRV_TYP
      FROM op2026.dbo.PAPATMF
      ORDER BY PAT_CD
    `);

    const mssqlPatients = result.recordset || [];
    console.log(`Found ${mssqlPatients.length} patients in MSSQL\n`);

    // Create a mapping of service codes to service types
    const serviceMapping: { [key: string]: string } = {
      '1': 'consultant',
      '2': 'specialist',
      '3': 'lasik',
      '4': 'surgery',
      '5': 'external',
      'consultant': 'consultant',
      'specialist': 'specialist',
      'lasik': 'lasik',
      'surgery': 'surgery',
      'external': 'external',
    };

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const mssqlPatient of mssqlPatients) {
      const patientCode = String(mssqlPatient.PAT_CD).trim();
      const mssqlServiceCode = String(mssqlPatient.PAT_SRV_TYP || '').trim();

      if (!mssqlServiceCode) {
        skipped++;
        continue;
      }

      // Map service code to service type
      const serviceType = serviceMapping[mssqlServiceCode] || mssqlServiceCode;

      try {
        // Find patient by patientCode
        const [patients] = await mysqlConn.query(
          `SELECT id FROM patients WHERE patientCode = ?`,
          [patientCode]
        ) as any[];

        if (patients.length === 0) {
          skipped++;
          continue;
        }

        const patientId = patients[0].id;

        // Update serviceType
        const [result] = await mysqlConn.query(
          `UPDATE patients SET serviceType = ? WHERE id = ?`,
          [serviceType, patientId]
        ) as any[];

        if ((result as any).affectedRows > 0) {
          updated++;
          if (updated % 100 === 0) {
            console.log(`  Updated ${updated}/${mssqlPatients.length}...`);
          }
        }
      } catch (err: any) {
        errors.push(`${patientCode}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated}`);
    console.log(`⚠ Skipped: ${skipped}\n`);

    if (errors.length > 0) {
      console.log(`Errors (${errors.length}):`);
      errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
    }

    // Verify
    const [byService] = await mysqlConn.query(`
      SELECT serviceType, COUNT(*) as count FROM patients GROUP BY serviceType ORDER BY count DESC
    `) as any[];

    console.log("\n=== Final Patient Distribution ===");
    byService.forEach((row: any) => {
      console.log(`  ${row.serviceType}: ${row.count} patients`);
    });

    console.log(`\n✓ COMPLETE! Patient services synced from MSSQL`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
