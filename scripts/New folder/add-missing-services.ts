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
    console.log("=== Adding Missing Services for Patients Without Entries ===\n");

    // Get patients without any service entries
    const [patientsWithout] = await mysqlConn.query(`
      SELECT p.id, p.patientCode
      FROM patients p
      WHERE NOT EXISTS (
        SELECT 1 FROM patientServiceEntries pse WHERE pse.patientId = p.id
      )
    `) as any[];

    console.log(`Found ${patientsWithout.length} patients without service entries\n`);

    // For each patient, find their service from PAPAT_SRV
    const result = await pool.request().query(`
      SELECT DISTINCT
        PAT_CD,
        SRV_CD,
        DT as serviceDate
      FROM op2026.dbo.PAPAT_SRV
      WHERE PAT_CD IS NOT NULL AND PAT_CD != ''
    `);

    const papatServices = new Map<string, any[]>();
    (result.recordset || []).forEach((rec: any) => {
      const patCode = String(rec.PAT_CD).trim();
      if (!papatServices.has(patCode)) {
        papatServices.set(patCode, []);
      }
      papatServices.get(patCode)!.push({
        serviceCode: String(rec.SRV_CD).trim(),
        serviceDate: rec.serviceDate,
      });
    });

    let inserted = 0;
    let skipped = 0;
    const issues: string[] = [];

    for (const patient of patientsWithout) {
      const patCode = patient.patientCode;
      const services = papatServices.get(patCode);

      if (!services || services.length === 0) {
        skipped++;
        continue;
      }

      // Add the first service from PAPAT_SRV
      const firstService = services[0];

      try {
        await mysqlConn.query(
          `INSERT INTO patientServiceEntries (patientId, serviceCode, serviceDate, sourceRef, createdAt, updatedAt)
           VALUES (?, ?, ?, 'PAPAT_SRV_MISSING', NOW(), NOW())`,
          [patient.id, firstService.serviceCode, firstService.serviceDate]
        );
        inserted++;

        if (inserted % 50 === 0) {
          console.log(`  Added ${inserted}/${patientsWithout.length}...`);
        }
      } catch (err: any) {
        if (err.message.includes('Duplicate')) {
          skipped++;
        } else {
          issues.push(`${patCode}: ${err.message.slice(0, 60)}`);
        }
      }
    }

    console.log(`\n✓ Inserted: ${inserted} service entries for missing patients`);
    console.log(`⚠ Skipped: ${skipped} (already exist or no service found)`);

    if (issues.length > 0) {
      console.log(`\n⚠ Issues (${issues.length}):`);
      issues.slice(0, 5).forEach(issue => console.log(`  ${issue}`));
    }

    // Verify
    const [finalStats] = await mysqlConn.query(`
      SELECT
        COUNT(DISTINCT patientId) as patients_with_services
      FROM patientServiceEntries
    `) as any[];

    const [totalPatients] = await mysqlConn.query(`
      SELECT COUNT(*) as total FROM patients
    `) as any[];

    console.log("\n=== Final Statistics ===");
    console.log(`Total patients: ${totalPatients[0].total}`);
    console.log(`Patients with service entries: ${finalStats[0].patients_with_services}`);
    console.log(`Gap: ${totalPatients[0].total - finalStats[0].patients_with_services}`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
