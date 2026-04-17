import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    // 1. Patients where locationType != service locationType
    const [locMismatch] = await conn.query(`
      SELECT
        p.locationType as patientLoc,
        s.locationType as serviceLoc,
        COUNT(*) as cnt
      FROM patients p
      JOIN patientServiceEntries pse ON pse.patientId = p.id
      JOIN services s ON LOWER(TRIM(pse.serviceCode)) = LOWER(TRIM(s.code))
      GROUP BY p.locationType, s.locationType
      ORDER BY cnt DESC
    `) as any[];

    console.log("Patient locationType vs Service locationType:");
    (locMismatch as any[]).forEach(r => {
      const mismatch = r.patientLoc !== r.serviceLoc ? "⚠ MISMATCH" : "✓ OK";
      console.log(`  ${mismatch}  patient=${r.patientLoc}, service=${r.serviceLoc}: ${r.cnt}`);
    });

    // 2. Patients where serviceType != service category
    const [typeMismatch] = await conn.query(`
      SELECT
        p.serviceType as patientType,
        s.serviceType as srvType,
        COUNT(*) as cnt
      FROM patients p
      JOIN patientServiceEntries pse ON pse.patientId = p.id
      JOIN services s ON LOWER(TRIM(pse.serviceCode)) = LOWER(TRIM(s.code))
      GROUP BY p.serviceType, s.serviceType
      ORDER BY cnt DESC
      LIMIT 20
    `) as any[];

    console.log("\nPatient serviceType vs Service serviceType:");
    (typeMismatch as any[]).forEach(r => {
      const mismatch = r.patientType !== r.srvType ? "⚠ MISMATCH" : "✓ OK";
      console.log(`  ${mismatch}  patient=${r.patientType}, service=${r.srvType}: ${r.cnt}`);
    });

    // 3. Doctor locationType vs patient locationType
    const [drMismatch] = await conn.query(`
      SELECT
        p.locationType as patientLoc,
        d.locationType as doctorLoc,
        COUNT(*) as cnt
      FROM patients p
      JOIN doctors d ON p.doctorId = d.id
      GROUP BY p.locationType, d.locationType
      ORDER BY cnt DESC
    `) as any[];

    console.log("\nPatient locationType vs Doctor locationType:");
    (drMismatch as any[]).forEach(r => {
      const mismatch = r.patientLoc !== r.doctorLoc ? "⚠ MISMATCH" : "✓ OK";
      console.log(`  ${mismatch}  patient=${r.patientLoc}, doctor=${r.doctorLoc}: ${r.cnt}`);
    });

    const [noDoctor] = await conn.query("SELECT COUNT(*) as n FROM patients WHERE doctorId IS NULL") as any[];
    console.log(`\nPatients with no doctorId: ${(noDoctor as any[])[0].n}`);

  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
