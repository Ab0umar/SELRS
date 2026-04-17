import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Sync Patient Services & Doctors from systemsettings ===\n");

    // Get doctor_directory and service_directory from systemsettings
    const [settings] = await conn.query(`
      SELECT \`key\`, \`value\` FROM selrs26.systemsettings
      WHERE \`key\` IN ('doctor_directory', 'service_directory')
    `) as any[];

    let doctorDirectory: any[] = [];
    let serviceDirectory: any[] = [];

    for (const setting of settings) {
      if (setting.key === 'doctor_directory') {
        doctorDirectory = JSON.parse(setting.value);
      } else if (setting.key === 'service_directory') {
        serviceDirectory = JSON.parse(setting.value);
      }
    }

    console.log(`Loaded ${doctorDirectory.length} doctors`);
    console.log(`Loaded ${serviceDirectory.length} services from systemsettings\n`);

    // Step 1: Insert/update doctors table from systemsettings
    console.log("Step 1: Syncing doctors table...");
    let doctorInserted = 0;
    for (const doc of doctorDirectory) {
      try {
        const [existing] = await conn.query(
          `SELECT id FROM doctors WHERE id = ?`,
          [doc.id]
        ) as any[];

        if (existing.length === 0) {
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
        } else {
          // Update existing
          await conn.query(
            `UPDATE doctors SET name = ?, isActive = ?, locationType = ?, doctorType = ?
             WHERE id = ?`,
            [
              doc.name,
              doc.isActive ? 1 : 0,
              doc.locationType || 'center',
              doc.doctorType || 'internal',
              doc.id
            ]
          );
        }
      } catch (err: any) {
        console.error(`  Error for doctor ${doc.name}: ${err.message.slice(0, 50)}`);
      }
    }
    console.log(`✓ ${doctorInserted} doctors synced\n`);

    // Step 2: Insert/update services table from systemsettings
    console.log("Step 2: Syncing services table...");
    let serviceInserted = 0;
    for (const svc of serviceDirectory) {
      try {
        const [existing] = await conn.query(
          `SELECT id FROM services WHERE id = ?`,
          [svc.id]
        ) as any[];

        if (existing.length === 0) {
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
        } else {
          // Update existing
          await conn.query(
            `UPDATE services SET code = ?, name = ?, category = ?, serviceType = ?, defaultSheet = ?, srvTyp = ?, isActive = ?
             WHERE id = ?`,
            [
              svc.code,
              svc.name,
              svc.category || null,
              svc.serviceType || null,
              svc.defaultSheet || null,
              svc.srvTyp || null,
              svc.isActive ? 1 : 0,
              svc.id
            ]
          );
        }
      } catch (err: any) {
        console.error(`  Error for service ${svc.name}: ${err.message.slice(0, 50)}`);
      }
    }
    console.log(`✓ ${serviceInserted} services synced\n`);

    // Step 3: Show sample data
    const [doctorSample] = await conn.query(
      `SELECT code, name FROM doctors LIMIT 5`
    ) as any[];

    console.log("Sample doctors:");
    doctorSample.forEach((d: any) => {
      console.log(`  - ${d.code}: ${d.name}`);
    });

    const [serviceSample] = await conn.query(
      `SELECT code, name, serviceType FROM services LIMIT 10`
    ) as any[];

    console.log("\nSample services:");
    serviceSample.forEach((s: any) => {
      console.log(`  - ${s.code}: ${s.name} (${s.serviceType})`);
    });

    console.log(`\n✓ COMPLETE! Synced doctors and services from systemsettings`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
