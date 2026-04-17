import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Admin Hub Data Check ===\n");

    // Check services
    console.log("--- Services ---");
    const [servicesCheck] = await conn.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'
    `) as any[];

    if (servicesCheck.length > 0) {
      const [services] = await conn.query(`SELECT * FROM services`) as any[];
      console.log(`Found ${services.length} services:`);
      services.forEach((s: any) => {
        console.log(`  - ${s.id}: ${s.name} (${s.code})`);
      });
    } else {
      console.log("⚠ Services table not found");
    }

    // Check doctors
    console.log("\n--- Doctors ---");
    const [doctors] = await conn.query(`
      SELECT id, email, firstName, lastName, specialization, status
      FROM users
      WHERE role = 'doctor'
      ORDER BY id
    `) as any[];

    console.log(`Found ${doctors.length} doctors:`);
    doctors.slice(0, 10).forEach((d: any) => {
      console.log(`  - ID ${d.id}: ${d.firstName} ${d.lastName} (${d.specialization}) - ${d.status}`);
    });
    if (doctors.length > 10) {
      console.log(`  ... and ${doctors.length - 10} more`);
    }

    // Check doctor-service relationships
    console.log("\n--- Doctor-Service Links ---");
    const [relCheck] = await conn.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctorservices'
    `) as any[];

    if (relCheck.length > 0) {
      const [relations] = await conn.query(`
        SELECT ds.doctorId, u.firstName, u.lastName, ds.serviceId, s.name
        FROM doctorservices ds
        JOIN users u ON ds.doctorId = u.id
        LEFT JOIN services s ON ds.serviceId = s.id
        LIMIT 20
      `) as any[];

      if (relations.length > 0) {
        console.log(`Found ${relations.length} doctor-service links (showing first 20):`);
        relations.forEach((r: any) => {
          console.log(`  - Doctor ${r.firstName} ${r.lastName} → Service ${r.name || 'NULL'}`);
        });
      } else {
        console.log("No doctor-service links found");
      }
    } else {
      console.log("⚠ Doctor-services table not found");
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
