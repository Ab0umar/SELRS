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
    // MySQL lookups: code → row
    const [dbDoctors] = await conn.query("SELECT id, code, locationType FROM doctors WHERE code IS NOT NULL") as any[];
    const doctorByCode = new Map<string, any>();
    (dbDoctors as any[]).forEach(d => doctorByCode.set(String(d.code).trim().toLowerCase(), d));

    const [dbServices] = await conn.query("SELECT code, serviceType, locationType FROM services WHERE code IS NOT NULL") as any[];
    const serviceByCode = new Map<string, any>();
    (dbServices as any[]).forEach(s => serviceByCode.set(String(s.code).trim().toLowerCase(), s));

    console.log(`MySQL doctors: ${doctorByCode.size}, services: ${serviceByCode.size}`);

    // MSSQL: primary service + doctor per patient (most recent by DT)
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
      "SELECT id, patientCode, doctorId, locationType, serviceType FROM patients"
    ) as any[];

    let updated = 0, unchanged = 0, noRecord = 0;

    for (const p of patients as any[]) {
      const primary = primaryByPatCode.get(String(p.patientCode).trim());
      if (!primary) { noRecord++; continue; }

      const srv = serviceByCode.get(primary.srvCd.toLowerCase());
      const dr  = doctorByCode.get(primary.drCd.toLowerCase());

      // Doctor wins for locationType; service provides serviceType
      const newDoctorId    = dr?.id ?? p.doctorId;
      const newLocationType = dr?.locationType ?? srv?.locationType ?? p.locationType;
      const newServiceType  = srv?.serviceType ?? p.serviceType;

      const changed =
        String(newDoctorId)     !== String(p.doctorId ?? "") ||
        newLocationType          !== p.locationType ||
        newServiceType           !== p.serviceType;

      if (!changed) { unchanged++; continue; }

      await conn.query(
        "UPDATE patients SET doctorId=?, locationType=?, serviceType=? WHERE id=?",
        [newDoctorId || null, newLocationType, newServiceType, p.id]
      );
      updated++;
    }

    console.log(`✓ Updated:   ${updated}`);
    console.log(`- Unchanged: ${unchanged}`);
    console.log(`- No MSSQL record: ${noRecord}`);

    // Final check
    const [loc] = await conn.query(`
      SELECT p.locationType AS patLoc, d.locationType AS drLoc, COUNT(*) as cnt
      FROM patients p JOIN doctors d ON p.doctorId = d.id
      GROUP BY p.locationType, d.locationType ORDER BY cnt DESC
    `) as any[];
    console.log("\n=== Patient vs Doctor location ===");
    (loc as any[]).forEach((row: any) => {
      console.log(`  ${row.patLoc === row.drLoc ? "✓" : "⚠"}  patient=${row.patLoc}, doctor=${row.drLoc}: ${row.cnt}`);
    });

    const [noDoc] = await conn.query("SELECT COUNT(*) as n FROM patients WHERE doctorId IS NULL") as any[];
    console.log(`Patients without doctor: ${(noDoc as any[])[0].n}`);

    await pool.close();
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
