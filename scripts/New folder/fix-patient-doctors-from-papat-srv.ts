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
    console.log("=== Fixing Patient Doctor Assignments from PAPAT_SRV ===\n");

    // Get all PAPAT_SRV records (most recent per patient = highest SRV_CD or latest DT)
    const r = await pool.request().query(`
      SELECT PAT_CD, SRV_BY1, SRV_CD
      FROM op2026.dbo.PAPAT_SRV
      WHERE SRV_BY1 IS NOT NULL AND SRV_BY1 != ''
      ORDER BY PAT_CD, DT DESC
    `);
    const papatRecords = r.recordset || [];
    console.log(`Found ${papatRecords.length} PAPAT_SRV records with doctor\n`);

    // Get primary doctor per patient (first record after ordering by date desc)
    const primaryDoctorByPatCode = new Map<string, string>();
    for (const rec of papatRecords) {
      const patCode = String(rec.PAT_CD).trim();
      if (!primaryDoctorByPatCode.has(patCode)) {
        primaryDoctorByPatCode.set(patCode, String(rec.SRV_BY1).trim());
      }
    }
    console.log(`Unique patients with doctor in PAPAT_SRV: ${primaryDoctorByPatCode.size}`);

    // Build doctorCode → doctorId map from MySQL doctors table
    const [doctorRows] = await conn.query("SELECT id, code FROM doctors WHERE code IS NOT NULL") as any[];
    const doctorIdByCode = new Map<string, string>();
    (doctorRows as any[]).forEach((d: any) => {
      if (d.code) doctorIdByCode.set(String(d.code).trim().toLowerCase(), String(d.id));
    });
    console.log(`Doctors in MySQL: ${doctorIdByCode.size}\n`);

    // Get all patients
    const [patients] = await conn.query("SELECT id, patientCode, doctorId FROM patients") as any[];

    let updated = 0, alreadyCorrect = 0, notFound = 0, noPapatRecord = 0;

    for (const p of patients as any[]) {
      const patCode = String(p.patientCode).trim();
      const doctorCode = primaryDoctorByPatCode.get(patCode);

      if (!doctorCode) {
        noPapatRecord++;
        continue;
      }

      const doctorId = doctorIdByCode.get(doctorCode.toLowerCase());
      if (!doctorId) {
        notFound++;
        continue;
      }

      if (String(p.doctorId) === doctorId) {
        alreadyCorrect++;
        continue;
      }

      await conn.query("UPDATE patients SET doctorId = ? WHERE id = ?", [doctorId, p.id]);
      updated++;
    }

    console.log(`✓ Updated: ${updated} patients`);
    console.log(`✓ Already correct: ${alreadyCorrect}`);
    console.log(`⚠ No PAPAT_SRV record: ${noPapatRecord}`);
    console.log(`⚠ Doctor code not found in MySQL: ${notFound}`);

    // Check remaining mismatches
    const [remaining] = await conn.query(`
      SELECT p.locationType AS patLoc, d.locationType AS drLoc, COUNT(*) as cnt
      FROM patients p JOIN doctors d ON p.doctorId = d.id
      GROUP BY p.locationType, d.locationType ORDER BY cnt DESC
    `) as any[];

    console.log("\n=== Doctor vs Patient Location (after fix) ===");
    (remaining as any[]).forEach(r => {
      const ok = r.patLoc === r.drLoc ? "✓" : "⚠";
      console.log(`  ${ok}  patient=${r.patLoc}, doctor=${r.drLoc}: ${r.cnt}`);
    });

    const [noDoc] = await conn.query("SELECT COUNT(*) as n FROM patients WHERE doctorId IS NULL") as any[];
    console.log(`\nPatients with no doctorId: ${(noDoc as any[])[0].n}`);

    await pool.close();
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
