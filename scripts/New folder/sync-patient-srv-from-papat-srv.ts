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
    console.log("=== Sync Patient Services & Doctors from PAPAT_SRV ===\n");

    // Get doctor and service directories from systemsettings
    const [settings] = await mysqlConn.query(`
      SELECT \`key\`, \`value\` FROM selrs26.systemsettings
      WHERE \`key\` IN ('doctor_directory', 'service_directory')
    `) as any[];

    let doctorDirectory: any[] = [];
    let serviceDirectory: any[] = [];

    for (const setting of settings) {
      if (setting.key === 'doctor_directory') {
        doctorDirectory = JSON.parse(setting.value);
      } else if (setting.key === 'service_directory') {
        serviceDirectory = JSON.parse(setting.value);
      }
    }

    // Create code-based lookups
    const doctorByCode = new Map<string, any>();
    const serviceByCode = new Map<string, any>();

    doctorDirectory.forEach(d => {
      doctorByCode.set(String(d.code).trim().toLowerCase(), d);
    });

    serviceDirectory.forEach(s => {
      serviceByCode.set(String(s.code).trim(), s);
    });

    console.log(`Doctor lookup: ${doctorByCode.size} entries`);
    console.log(`Service lookup: ${serviceByCode.size} entries\n`);

    // Get all PAPAT_SRV records (patient-service-doctor mappings)
    const result = await pool.request().query(`
      SELECT DISTINCT
        PAT_CD,
        SRV_CD,
        SRV_BY1,
        SRV_BY2,
        SRV_BY3
      FROM op2026.dbo.PAPAT_SRV
      ORDER BY PAT_CD, SRV_CD
    `);

    const patientServices = result.recordset || [];
    console.log(`Found ${patientServices.length} patient-service records in PAPAT_SRV\n`);

    let updated = 0;
    let skipped = 0;
    const mismatches: string[] = [];

    for (const ps of patientServices) {
      const patientCode = String(ps.PAT_CD).trim();
      const serviceCode = String(ps.SRV_CD).trim();
      const doctorCode1 = String(ps.SRV_BY1 || '').trim().toLowerCase();
      const doctorCode2 = String(ps.SRV_BY2 || '').trim().toLowerCase();
      const doctorCode3 = String(ps.SRV_BY3 || '').trim().toLowerCase();

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

      // Match service code with directory
      const matchedService = serviceByCode.get(serviceCode);
      if (!matchedService) {
        mismatches.push(`Patient ${patientCode}: Service code "${serviceCode}" not found`);
        skipped++;
        continue;
      }

      // Match primary doctor (try SRV_BY1, SRV_BY2, SRV_BY3)
      let doctorId = null;
      let matchedDoctorCode = null;

      for (const drCode of [doctorCode1, doctorCode2, doctorCode3]) {
        if (drCode && drCode.length > 0) {
          const matchedDoctor = doctorByCode.get(drCode);
          if (matchedDoctor) {
            doctorId = matchedDoctor.id;
            matchedDoctorCode = drCode;
            break;
          }
        }
      }

      if (!doctorId && (doctorCode1 || doctorCode2 || doctorCode3)) {
        mismatches.push(`Patient ${patientCode}: Doctor codes [${doctorCode1}, ${doctorCode2}, ${doctorCode3}] not found`);
      }

      // Update patient with matched service and doctor
      try {
        await mysqlConn.query(
          `UPDATE patients SET serviceType = ?, doctorId = ? WHERE id = ?`,
          [matchedService.serviceType || 'consultant', doctorId, patientId]
        );
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${patientServices.length}...`);
        }
      } catch (err: any) {
        console.error(`  Error for patient ${patientCode}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated} patients`);
    console.log(`⚠ Skipped: ${skipped} records`);

    if (mismatches.length > 0) {
      console.log(`\n⚠ Mismatches (${mismatches.length}):`);
      mismatches.slice(0, 10).forEach(m => console.log(`  ${m}`));
      if (mismatches.length > 10) {
        console.log(`  ... and ${mismatches.length - 10} more`);
      }
    }

    // Verify
    const [doctorAssigned] = await mysqlConn.query(
      `SELECT COUNT(*) as count FROM patients WHERE doctorId IS NOT NULL`
    ) as any[];

    const [byService] = await mysqlConn.query(`
      SELECT serviceType, COUNT(*) as count FROM patients GROUP BY serviceType ORDER BY count DESC
    `) as any[];

    console.log("\n=== Final State ===");
    console.log(`Patients with doctorId: ${doctorAssigned[0].count}`);
    console.log("\nPatients by service:");
    byService.forEach((row: any) => {
      console.log(`  ${row.serviceType}: ${row.count}`);
    });

    console.log(`\n✓ COMPLETE! Patients synced with correct services and doctors from PAPAT_SRV`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
