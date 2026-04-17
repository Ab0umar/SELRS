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
    console.log("=== Sync Patients from MDTEAM & SRVCMF (Direct MSSQL Tables) ===\n");

    // Get all doctors from MDTEAM (no STAT filter)
    const doctorsResult = await pool.request().query(`
      SELECT CODE, PHNM_AR, PHNM_EN
      FROM op2026.dbo.MDTEAM
      ORDER BY CODE
    `);

    const doctors = doctorsResult.recordset || [];
    console.log(`Found ${doctors.length} doctors in MDTEAM\n`);

    const doctorByCode = new Map<string, any>();
    doctors.forEach(d => {
      const code = String(d.CODE).trim().toLowerCase();
      if (code) {
        doctorByCode.set(code, {
          code,
          name_ar: String(d.PHNM_AR || "").trim(),
          name_en: String(d.PHNM_EN || "").trim(),
        });
      }
    });

    // Get all services from SRVCMF (no STAT filter)
    const servicesResult = await pool.request().query(`
      SELECT SRV_CD, SRV_NM_AR, SRV_NM_EN, SRV_TY
      FROM op2026.dbo.SRVCMF
      ORDER BY SRV_CD
    `);

    const services = servicesResult.recordset || [];
    console.log(`Found ${services.length} services in SRVCMF\n`);

    const serviceByCode = new Map<string, any>();
    services.forEach(s => {
      const code = String(s.SRV_CD).trim();
      if (code) {
        serviceByCode.set(code, {
          code,
          name_ar: String(s.SRV_NM_AR || "").trim(),
          name_en: String(s.SRV_NM_EN || "").trim(),
          type: String(s.SRV_TY || "").trim(),
        });
      }
    });

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
    let doctorMismatches = 0;
    let serviceMismatches = 0;
    const issues: string[] = [];

    for (const ps of patientServices) {
      const patientCode = String(ps.PAT_CD).trim();
      const serviceCode = String(ps.SRV_CD).trim();
      const doctorCode1 = String(ps.SRV_BY1 || "").trim().toLowerCase();
      const doctorCode2 = String(ps.SRV_BY2 || "").trim().toLowerCase();
      const doctorCode3 = String(ps.SRV_BY3 || "").trim().toLowerCase();

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

      // Match service
      const matchedService = serviceByCode.get(serviceCode);
      if (!matchedService) {
        issues.push(`Patient ${patientCode}: Service code "${serviceCode}" not found in SRVCMF`);
        serviceMismatches++;
        skipped++;
        continue;
      }

      // Match primary doctor (try SRV_BY1, SRV_BY2, SRV_BY3)
      let doctorUUID = null;
      let doctorName = null;

      for (const drCode of [doctorCode1, doctorCode2, doctorCode3]) {
        if (drCode && drCode.length > 0) {
          const matchedDoctor = doctorByCode.get(drCode);
          if (matchedDoctor) {
            doctorName = matchedDoctor.name_ar || matchedDoctor.name_en;

            // Find matching doctor in MySQL by code (exact match)
            const [mysqlDoctors] = await mysqlConn.query(
              `SELECT id, name FROM doctors WHERE code = ?`,
              [drCode]
            ) as any[];

            if (mysqlDoctors.length > 0) {
              doctorUUID = mysqlDoctors[0].id;
              doctorName = mysqlDoctors[0].name;
            } else if (doctorName) {
              // Fallback: try fuzzy match by name
              const [fuzzyMatch] = await mysqlConn.query(
                `SELECT id, name FROM doctors WHERE name LIKE ? LIMIT 1`,
                [`%${doctorName}%`]
              ) as any[];

              if (fuzzyMatch.length > 0) {
                doctorUUID = fuzzyMatch[0].id;
                doctorName = fuzzyMatch[0].name;
              }
            }
            break;
          }
        }
      }

      if (!doctorUUID && (doctorCode1 || doctorCode2 || doctorCode3)) {
        issues.push(
          `Patient ${patientCode}: Doctor codes [${doctorCode1}, ${doctorCode2}, ${doctorCode3}] not found in MySQL doctors table`
        );
        doctorMismatches++;
      }

      // Determine service type from SRV_TY
      const serviceTypeMap: Record<string, string> = {
        "1": "consultant",
        "2": "specialist",
        "3": "lasik",
        "4": "surgery",
        "5": "external",
      };
      const mappedServiceType = serviceTypeMap[matchedService.type] || "consultant";

      // Update patient with doctorId as UUID
      try {
        await mysqlConn.query(
          `UPDATE patients SET serviceType = ?, doctorId = ? WHERE id = ?`,
          [
            mappedServiceType,
            doctorUUID,
            patientId
          ]
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
    console.log(`⚠ Doctor mismatches: ${doctorMismatches}`);
    console.log(`⚠ Service mismatches: ${serviceMismatches}`);

    if (issues.length > 0) {
      console.log(`\n⚠ Issues (${issues.length}):`);
      issues.slice(0, 20).forEach(m => console.log(`  ${m}`));
      if (issues.length > 20) {
        console.log(`  ... and ${issues.length - 20} more`);
      }
    }

    // Verify
    const [stats] = await mysqlConn.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN doctorId IS NOT NULL THEN 1 ELSE 0 END) as with_doctor,
        SUM(CASE WHEN serviceType IS NOT NULL THEN 1 ELSE 0 END) as with_service
      FROM patients
    `) as any[];

    console.log("\n=== Final State ===");
    console.log(`Total patients: ${stats[0].total}`);
    console.log(`Patients with doctorId: ${stats[0].with_doctor}`);
    console.log(`Patients with serviceType: ${stats[0].with_service}`);

    console.log(`\n✓ COMPLETE! Patients synced from MDTEAM & SRVCMF`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
