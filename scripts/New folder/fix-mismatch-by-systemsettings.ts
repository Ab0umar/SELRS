import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

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
    // 1. Load doctor_directory and service_directory from systemsettings
    const [settings] = await conn.query(
      "SELECT `key`, `value` FROM systemsettings WHERE `key` IN ('doctor_directory','service_directory')"
    ) as any[];

    let doctorDir: any[] = [];
    let serviceDir: any[] = [];
    for (const s of settings as any[]) {
      if (s.key === "doctor_directory") doctorDir = JSON.parse(s.value);
      if (s.key === "service_directory") serviceDir = JSON.parse(s.value);
    }

    console.log(`doctor_directory: ${doctorDir.length} entries`);
    console.log(`service_directory: ${serviceDir.length} entries\n`);

    // Build lookup: code → { locationType, serviceType, id }
    const doctorByCode = new Map<string, any>();
    doctorDir.forEach(d => doctorByCode.set(String(d.code).trim().toLowerCase(), d));

    const serviceByCode = new Map<string, any>();
    serviceDir.forEach(s => serviceByCode.set(String(s.code).trim().toLowerCase(), s));

    // 2. Get PAPAT_SRV: primary service + doctor per patient (most recent)
    const r = await pool.request().query(`
      SELECT PAT_CD, SRV_CD, SRV_BY1
      FROM op2026.dbo.PAPAT_SRV
      ORDER BY PAT_CD, DT DESC
    `);
    const primaryPerPatient = new Map<string, { srvCd: string; drCd: string }>();
    for (const rec of r.recordset || []) {
      const patCode = String(rec.PAT_CD).trim();
      if (!primaryPerPatient.has(patCode)) {
        primaryPerPatient.set(patCode, {
          srvCd: String(rec.SRV_CD || "").trim(),
          drCd: String(rec.SRV_BY1 || "").trim(),
        });
      }
    }
    console.log(`Patients in PAPAT_SRV: ${primaryPerPatient.size}`);

    // 3. Get all patients
    const [patients] = await conn.query(
      "SELECT id, patientCode, doctorId, locationType, serviceType FROM patients"
    ) as any[];

    // 4. Build doctors table: code → id
    const [dbDoctors] = await conn.query("SELECT id, code FROM doctors WHERE code IS NOT NULL") as any[];
    const dbDoctorIdByCode = new Map<string, string>();
    (dbDoctors as any[]).forEach(d => dbDoctorIdByCode.set(String(d.code).trim().toLowerCase(), String(d.id)));

    let updated = 0, skipped = 0, notInDir = 0;

    for (const p of patients as any[]) {
      const patCode = String(p.patientCode).trim();
      const primary = primaryPerPatient.get(patCode);
      if (!primary) { skipped++; continue; }

      const srv = serviceByCode.get(primary.srvCd.toLowerCase());
      const dr = doctorByCode.get(primary.drCd.toLowerCase());

      if (!srv && !dr) { notInDir++; continue; }

      const newLocationType = srv?.locationType ?? dr?.locationType ?? p.locationType;
      const newServiceType  = srv?.serviceType  ?? p.serviceType;
      const newDoctorId     = dr ? (dbDoctorIdByCode.get(primary.drCd.toLowerCase()) ?? p.doctorId) : p.doctorId;

      const changed =
        newLocationType !== p.locationType ||
        newServiceType  !== p.serviceType  ||
        String(newDoctorId) !== String(p.doctorId);

      if (!changed) { skipped++; continue; }

      await conn.query(
        "UPDATE patients SET locationType=?, serviceType=?, doctorId=? WHERE id=?",
        [newLocationType, newServiceType, newDoctorId || null, p.id]
      );
      updated++;
    }

    console.log(`\n✓ Updated: ${updated}`);
    console.log(`- Skipped (no change / no PAPAT record): ${skipped}`);
    console.log(`- Not in systemsettings directory: ${notInDir}`);

    // 5. Verify remaining mismatches
    const [locCheck] = await conn.query(`
      SELECT p.locationType as patLoc, d.locationType as drLoc, COUNT(*) as cnt
      FROM patients p JOIN doctors d ON p.doctorId = d.id
      GROUP BY p.locationType, d.locationType ORDER BY cnt DESC
    `) as any[];

    console.log("\n=== Patient vs Doctor location (after fix) ===");
    (locCheck as any[]).forEach((r: any) => {
      const ok = r.patLoc === r.drLoc ? "✓" : "⚠";
      console.log(`  ${ok}  patient=${r.patLoc}, doctor=${r.drLoc}: ${r.cnt}`);
    });

    const [noDoc] = await conn.query("SELECT COUNT(*) as n FROM patients WHERE doctorId IS NULL") as any[];
    console.log(`Patients without doctor: ${(noDoc as any[])[0].n}`);

    await pool.close();
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
