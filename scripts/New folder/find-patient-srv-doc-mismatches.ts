import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Finding Patient Service-Doctor Mismatches ===\n");

    // Get all patients with their service and doctor
    const [patients] = await conn.query(`
      SELECT
        p.id,
        p.patientCode,
        p.fullName,
        p.serviceType,
        p.doctorId,
        u.name as doctorName,
        d.name as doctorFromTable
      FROM patients p
      LEFT JOIN users u ON p.doctorId = u.id AND u.role = 'doctor'
      LEFT JOIN doctors d ON p.doctorId = d.id
      ORDER BY p.id
      LIMIT 100
    `) as any[];

    console.log(`Checked ${patients.length} patients:\n`);

    let mismatches = 0;
    patients.forEach((p: any, idx: number) => {
      if (!p.doctorName && !p.doctorFromTable && p.doctorId) {
        console.log(`\n[${idx + 1}] ID ${p.id}: ${p.patientCode} - ${p.fullName}`);
        console.log(`  Service: ${p.serviceType}`);
        console.log(`  ✗ Doctor ID ${p.doctorId} NOT FOUND in users or doctors table`);
        mismatches++;
      }
    });

    if (mismatches === 0) {
      console.log("✓ No obvious mismatches found\n");
      console.log("Patients by service type:\n");

      const [byService] = await conn.query(`
        SELECT serviceType, COUNT(*) as count FROM patients GROUP BY serviceType
      `) as any[];

      byService.forEach((row: any) => {
        console.log(`  ${row.serviceType}: ${row.count} patients`);
      });
    } else {
      console.log(`\n\n✗ Found ${mismatches} patients with invalid doctorId`);
    }

    // Check if there are specific service-doctor combinations that shouldn't exist
    console.log("\n\n=== Checking Service-Doctor Combinations ===\n");

    const [combos] = await conn.query(`
      SELECT
        p.serviceType,
        p.doctorId,
        u.name as doctorName,
        COUNT(*) as patientCount
      FROM patients p
      LEFT JOIN users u ON p.doctorId = u.id AND u.role = 'doctor'
      WHERE p.doctorId IS NOT NULL
      GROUP BY p.serviceType, p.doctorId, u.name
      ORDER BY p.serviceType, patientCount DESC
      LIMIT 20
    `) as any[];

    if (combos.length > 0) {
      console.log("Service-Doctor combinations:");
      combos.forEach((c: any) => {
        console.log(`  ${c.serviceType} → Doctor ${c.doctorId} (${c.doctorName || 'UNKNOWN'}): ${c.patientCount} patients`);
      });
    } else {
      console.log("No service-doctor combinations found (patients may not have doctorId assigned)");
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
