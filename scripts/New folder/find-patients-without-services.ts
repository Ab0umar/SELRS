import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Finding Missing Service Entries ===\n");

    // Total patients
    const [totalPatients] = await conn.query(`
      SELECT COUNT(*) as total FROM patients
    `) as any[];

    console.log(`Total patients: ${totalPatients[0].total}`);

    // Patients with service entries
    const [withServices] = await conn.query(`
      SELECT COUNT(DISTINCT patientId) as total FROM patientServiceEntries
    `) as any[];

    console.log(`Patients with service entries: ${withServices[0].total}`);

    // Patients WITHOUT service entries
    const [withoutServices] = await conn.query(`
      SELECT COUNT(*) as total
      FROM patients p
      WHERE NOT EXISTS (
        SELECT 1 FROM patientServiceEntries pse WHERE pse.patientId = p.id
      )
    `) as any[];

    console.log(`Patients WITHOUT service entries: ${withoutServices[0].total}`);
    console.log(`Gap: ${totalPatients[0].total - withServices[0].total}`);

    // Sample patients without services
    const [samples] = await conn.query(`
      SELECT id, patientCode, fullName, serviceType, createdAt
      FROM patients p
      WHERE NOT EXISTS (
        SELECT 1 FROM patientServiceEntries pse WHERE pse.patientId = p.id
      )
      LIMIT 10
    `) as any[];

    console.log(`\nSample patients without services:`);
    samples.forEach((p: any) => {
      console.log(`  ${p.patientCode}: ${p.fullName} (${p.serviceType}) - created ${p.createdAt}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
