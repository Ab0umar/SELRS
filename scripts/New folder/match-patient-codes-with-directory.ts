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
    console.log("=== Match Patient Codes with Directory ===\n");

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
      doctorByCode.set(String(d.code).trim(), d);
    });

    serviceDirectory.forEach(s => {
      serviceByCode.set(String(s.code).trim(), s);
    });

    console.log(`Doctor lookup: ${doctorByCode.size} entries`);
    console.log(`Service lookup: ${serviceByCode.size} entries\n`);

    // Get all MSSQL patients with their codes
    const result = await pool.request().query(`
      SELECT
        PAT_CD,
        PAT_NM_AR,
        PAT_SRV_TYP,
        PAT_DOCT_CD
      FROM op2026.dbo.PAPATMF
      ORDER BY PAT_CD
    `);

    const mssqlPatients = result.recordset || [];
    console.log(`Processing ${mssqlPatients.length} MSSQL patients\n`);

    let updated = 0;
    let skipped = 0;
    const mismatches: string[] = [];

    for (const mssqlPatient of mssqlPatients) {
      const patientCode = String(mssqlPatient.PAT_CD).trim();
      const mssqlServiceCode = String(mssqlPatient.PAT_SRV_TYP || '').trim();
      const mssqlDoctorCode = String(mssqlPatient.PAT_DOCT_CD || '').trim();

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
      let serviceId = null;
      let serviceType = null;

      if (mssqlServiceCode) {
        const matchedService = serviceByCode.get(mssqlServiceCode);
        if (matchedService) {
          serviceId = matchedService.id;
          serviceType = matchedService.serviceType;
        } else {
          mismatches.push(`Patient ${patientCode}: Service code "${mssqlServiceCode}" not found in directory`);
        }
      }

      // Match doctor code with directory
      let doctorId = null;

      if (mssqlDoctorCode) {
        const matchedDoctor = doctorByCode.get(mssqlDoctorCode);
        if (matchedDoctor) {
          doctorId = matchedDoctor.id;
        } else {
          mismatches.push(`Patient ${patientCode}: Doctor code "${mssqlDoctorCode}" not found in directory`);
        }
      }

      // Update patient with matched IDs
      try {
        await mysqlConn.query(
          `UPDATE patients SET serviceType = ?, doctorId = ? WHERE id = ?`,
          [serviceType || 'consultant', doctorId, patientId]
        );
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${mssqlPatients.length}...`);
        }
      } catch (err: any) {
        console.error(`  Error for patient ${patientCode}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated} patients`);
    console.log(`⚠ Skipped: ${skipped} patients`);

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

    console.log(`\n✓ COMPLETE! Patients matched with doctors and services from directory`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
