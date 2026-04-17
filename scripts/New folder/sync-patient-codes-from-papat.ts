import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const pool = new sql.ConnectionPool({
    user: process.env.MSSQL_USER || "sa",
    password: process.env.MSSQL_PASSWORD || "",
    server: process.env.MSSQL_SERVER || "localhost",
    database: process.env.MSSQL_DATABASE || "op2026",
    authentication: { type: "default" as const },
    options: { trustServerCertificate: true },
  });
  await pool.connect();

  try {
    // MySQL: code → { locationType } for doctors and services
    const [dbDoctors] = await conn.query(
      "SELECT code, name, locationType FROM doctors WHERE code IS NOT NULL"
    ) as any[];
    const doctorByCode = new Map<string, any>();
    (dbDoctors as any[]).forEach(d =>
      doctorByCode.set(String(d.code).trim().toLowerCase(), d)
    );

    const [dbServices] = await conn.query(
      "SELECT code, name, serviceType, locationType FROM services WHERE code IS NOT NULL"
    ) as any[];
    const serviceByCode = new Map<string, any>();
    (dbServices as any[]).forEach(s =>
      serviceByCode.set(String(s.code).trim().toLowerCase(), s)
    );

    console.log(`MySQL doctors: ${doctorByCode.size}, services: ${serviceByCode.size}`);

    // MSSQL: most recent dr code + srv code per patient
    const r = await pool.request().query(`
      SELECT PAT_CD, SRV_CD, SRV_BY1
      FROM op2026.dbo.PAPAT_SRV
      ORDER BY PAT_CD, DT DESC
    `);

    const primaryByPatCode = new Map<string, { srvCd: string; drCd: string }>();
    for (const rec of r.recordset || []) {
      const patCode = String(rec.PAT_CD).trim();
      if (!primaryByPatCode.has(patCode)) {
        primaryByPatCode.set(patCode, {
          srvCd: String(rec.SRV_CD || "").trim(),
          drCd:  String(rec.SRV_BY1 || "").trim(),
        });
      }
    }
    console.log(`PAPAT_SRV patients: ${primaryByPatCode.size}\n`);

    const [patients] = await conn.query(
      "SELECT id, patientCode, doctorCode, serviceCode, locationType, serviceType FROM patients"
    ) as any[];

    let updated = 0, unchanged = 0, noRecord = 0;

    for (const p of patients as any[]) {
      const primary = primaryByPatCode.get(String(p.patientCode).trim());
      if (!primary) { noRecord++; continue; }

      const dr  = doctorByCode.get(primary.drCd.toLowerCase());
      const srv = serviceByCode.get(primary.srvCd.toLowerCase());

      const newDoctorCode  = primary.drCd || p.doctorCode;
      const newServiceCode = primary.srvCd || p.serviceCode;
      const newLocationType = dr?.locationType ?? srv?.locationType ?? p.locationType;
      const newServiceType  = srv?.serviceType ?? p.serviceType;

      const changed =
        newDoctorCode  !== String(p.doctorCode  ?? "") ||
        newServiceCode !== String(p.serviceCode ?? "") ||
        newLocationType !== p.locationType ||
        newServiceType  !== p.serviceType;

      if (!changed) { unchanged++; continue; }

      await conn.query(
        "UPDATE patients SET doctorCode=?, serviceCode=?, locationType=?, serviceType=? WHERE id=?",
        [newDoctorCode || null, newServiceCode || null, newLocationType, newServiceType, p.id]
      );
      updated++;
    }

    console.log(`✓ Updated:          ${updated}`);
    console.log(`- Unchanged:        ${unchanged}`);
    console.log(`- No MSSQL record:  ${noRecord}`);

    // Verify
    const [check] = await conn.query(`
      SELECT
        COUNT(*) as total,
        SUM(doctorCode IS NOT NULL) as withDoctorCode,
        SUM(serviceCode IS NOT NULL) as withServiceCode
      FROM patients
    `) as any[];
    const row = (check as any[])[0];
    console.log(`\nPatients total: ${row.total}, with doctorCode: ${row.withDoctorCode}, with serviceCode: ${row.withServiceCode}`);

    await pool.close();
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
