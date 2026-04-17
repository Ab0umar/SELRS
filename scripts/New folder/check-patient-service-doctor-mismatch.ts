import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Checking Patient Service/Doctor Mismatches ===\n");

    // Check patients with serviceType
    const [patientsWithServiceType] = await conn.query(`
      SELECT DISTINCT serviceType, COUNT(*) as count
      FROM patients
      GROUP BY serviceType
      ORDER BY count DESC
    `) as any[];

    console.log("Patient service types in MySQL:");
    patientsWithServiceType.forEach((row: any) => {
      console.log(`  ${row.serviceType}: ${row.count} patients`);
    });

    // Check if serviceType matches services table
    console.log("\n\nChecking if serviceType matches services.serviceType:");
    const [serviceTypesInServices] = await conn.query(`
      SELECT DISTINCT serviceType FROM services WHERE serviceType IS NOT NULL ORDER BY serviceType
    `) as any[];

    console.log("Services types in services table:");
    serviceTypesInServices.forEach((row: any) => {
      console.log(`  ${row.serviceType}`);
    });

    // Find mismatches
    console.log("\n\nPatients with unmatched serviceType:");
    const [unmatchedServices] = await conn.query(`
      SELECT DISTINCT p.serviceType, COUNT(*) as count
      FROM patients p
      LEFT JOIN services s ON p.serviceType = s.serviceType
      WHERE s.id IS NULL
      AND p.serviceType IS NOT NULL
      GROUP BY p.serviceType
    `) as any[];

    if (unmatchedServices.length > 0) {
      unmatchedServices.forEach((row: any) => {
        console.log(`  ✗ "${row.serviceType}": ${row.count} patients (NOT IN services table)`);
      });
    } else {
      console.log("  ✓ All patient serviceTypes match");
    }

    // Check patients with doctorId
    console.log("\n\nChecking doctorId references:");
    const [patientsWithDoctor] = await conn.query(`
      SELECT COUNT(*) as count FROM patients WHERE doctorId IS NOT NULL
    `) as any[];

    console.log(`Patients with doctorId: ${patientsWithDoctor[0].count}`);

    // Find unmatched doctors
    const [unmatchedDoctors] = await conn.query(`
      SELECT COUNT(*) as count
      FROM patients p
      WHERE p.doctorId IS NOT NULL
      AND p.doctorId NOT IN (SELECT id FROM users WHERE role = 'doctor')
      AND p.doctorId NOT IN (SELECT id FROM doctors)
    `) as any[];

    console.log(`Patients with unmatched doctorId: ${unmatchedDoctors[0].count}`);

    if (unmatchedDoctors[0].count > 0) {
      const [badDoctors] = await conn.query(`
        SELECT DISTINCT p.doctorId, COUNT(*) as count
        FROM patients p
        WHERE p.doctorId IS NOT NULL
        AND p.doctorId NOT IN (SELECT id FROM users WHERE role = 'doctor')
        AND p.doctorId NOT IN (SELECT id FROM doctors)
        GROUP BY p.doctorId
        LIMIT 10
      `) as any[];

      console.log(`\nExamples of unmatched doctorIds:`);
      badDoctors.forEach((row: any) => {
        console.log(`  ✗ Doctor ID ${row.doctorId}: ${row.count} patients`);
      });
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
