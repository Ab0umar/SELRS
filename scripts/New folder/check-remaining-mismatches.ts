import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    // Which doctors are causing the mismatches?
    const [rows] = await conn.query(`
      SELECT
        d.code AS doctorCode,
        d.name AS doctorName,
        d.locationType AS doctorLoc,
        p.locationType AS patientLoc,
        COUNT(*) as cnt
      FROM patients p
      JOIN doctors d ON p.doctorId = d.id
      WHERE p.locationType != d.locationType
      GROUP BY d.code, d.name, d.locationType, p.locationType
      ORDER BY cnt DESC
    `) as any[];

    console.log(`=== Mismatched Doctor-Patient Assignments (${rows.length} doctor groups) ===\n`);
    (rows as any[]).forEach(r => {
      console.log(`  ${r.doctorCode} | ${r.doctorName} | doctor=${r.doctorLoc} | patient=${r.patientLoc} | ${r.cnt} patients`);
    });

    // Are these doctors in systemsettings?
    const [ss] = await conn.query(
      "SELECT value FROM systemsettings WHERE `key` = 'doctor_directory'"
    ) as any[];
    const dirCodes = new Set(
      JSON.parse((ss as any[])[0].value).map((d: any) => String(d.code).trim())
    );

    console.log("\n=== Are they in doctor_directory? ===");
    (rows as any[]).forEach(r => {
      const inDir = dirCodes.has(String(r.doctorCode).trim());
      console.log(`  ${inDir ? "✓ YES" : "✗ NO "} | ${r.doctorCode} | ${r.doctorName} (${r.doctorLoc})`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
