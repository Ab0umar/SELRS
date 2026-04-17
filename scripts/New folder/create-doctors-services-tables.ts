import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Extract and Create Doctors & Services Tables ===\n");

    // Get systemsettings data
    const [settings] = await conn.query(
      `SELECT \`key\`, \`value\` FROM selrs26.systemsettings WHERE \`key\` IN ('doctor_directory', 'service_directory')`
    ) as any[];

    let doctorDirectory = [];
    let serviceDirectory = [];

    for (const setting of settings) {
      if (setting.key === 'doctor_directory') {
        doctorDirectory = JSON.parse(setting.value);
      } else if (setting.key === 'service_directory') {
        serviceDirectory = JSON.parse(setting.value);
      }
    }

    console.log(`Found ${doctorDirectory.length} doctors`);
    console.log(`Found ${serviceDirectory.length} services\n`);

    // Step 1: Create doctors table
    console.log("Step 1: Creating doctors table...\n");

    await conn.query(`DROP TABLE IF EXISTS doctors`);

    await conn.query(`
      CREATE TABLE doctors (
        id varchar(36) PRIMARY KEY,
        code varchar(50),
        name varchar(255) NOT NULL,
        isActive tinyint(1) DEFAULT 1,
        locationType varchar(50) DEFAULT 'center',
        doctorType varchar(50) DEFAULT 'internal',
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY doctors_code_unique (code),
        KEY idx_doctors_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✓ Created doctors table");

    // Insert doctors
    let doctorInserted = 0;
    for (const doc of doctorDirectory) {
      try {
        await conn.query(
          `INSERT INTO doctors (id, code, name, isActive, locationType, doctorType)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            doc.id,
            doc.code,
            doc.name,
            doc.isActive ? 1 : 0,
            doc.locationType || 'center',
            doc.doctorType || 'internal'
          ]
        );
        doctorInserted++;
      } catch (err: any) {
        console.error(`  Error for doctor ${doc.name}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`✓ Inserted ${doctorInserted} doctors\n`);

    // Step 2: Create services table
    console.log("Step 2: Creating services table...\n");

    await conn.query(`DROP TABLE IF EXISTS services`);

    await conn.query(`
      CREATE TABLE services (
        id varchar(36) PRIMARY KEY,
        code varchar(50),
        name varchar(255) NOT NULL,
        category varchar(50),
        serviceType varchar(50),
        defaultSheet varchar(50),
        srvTyp varchar(50),
        isActive tinyint(1) DEFAULT 1,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY services_code_unique (code),
        KEY idx_services_name (name),
        KEY idx_services_type (serviceType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✓ Created services table");

    // Insert services
    let serviceInserted = 0;
    for (const svc of serviceDirectory) {
      try {
        await conn.query(
          `INSERT INTO services (id, code, name, category, serviceType, defaultSheet, srvTyp, isActive)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            svc.id,
            svc.code,
            svc.name,
            svc.category || null,
            svc.serviceType || null,
            svc.defaultSheet || null,
            svc.srvTyp || null,
            svc.isActive ? 1 : 0
          ]
        );
        serviceInserted++;
      } catch (err: any) {
        console.error(`  Error for service ${svc.name}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`✓ Inserted ${serviceInserted} services\n`);

    // Verify
    const [doctorCount] = await conn.query(`SELECT COUNT(*) as count FROM doctors`) as any[];
    const [serviceCount] = await conn.query(`SELECT COUNT(*) as count FROM services`) as any[];

    console.log("=== Final State ===");
    console.log(`Doctors: ${doctorCount[0].count}`);
    console.log(`Services: ${serviceCount[0].count}\n`);

    // Show samples
    const [doctorSample] = await conn.query(
      `SELECT id, code, name FROM doctors LIMIT 5`
    ) as any[];

    console.log("Sample doctors:");
    doctorSample.forEach((d: any) => {
      console.log(`  - ${d.code}: ${d.name}`);
    });

    const [serviceSample] = await conn.query(
      `SELECT id, code, name FROM services LIMIT 5`
    ) as any[];

    console.log("\nSample services:");
    serviceSample.forEach((s: any) => {
      console.log(`  - ${s.code}: ${s.name}`);
    });

    console.log(`\n✓ COMPLETE! Doctors and services tables created and populated`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
