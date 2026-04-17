import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const mysqlConn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    console.log("=== Syncing Doctors and Services from MSSQL ===\n");

    // Connect to MSSQL
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

    // Step 1: Sync Doctors from PADOCTF
    console.log("Step 1: Syncing doctors from MSSQL...\n");

    const doctorsResult = await pool.request().query(`
      SELECT
        DT_CD as code,
        DT_NM as name,
        DT_SPCL as specialization,
        DT_MAIL as email
      FROM op2026.dbo.PADOCTF
      ORDER BY DT_CD
    `) as any;

    const mssqlDoctors = doctorsResult.recordset || [];
    console.log(`Found ${mssqlDoctors.length} doctors in MSSQL\n`);

    let doctorsInserted = 0;
    let doctorsSkipped = 0;

    for (const doc of mssqlDoctors) {
      const code = String(doc.code || "").trim();
      const name = String(doc.name || "").trim();
      const specialization = String(doc.specialization || "").trim();
      const email = String(doc.email || "").trim() || null;

      if (!name) {
        doctorsSkipped++;
        continue;
      }

      try {
        // Check if doctor already exists by name
        const [existing] = await mysqlConn.query(
          `SELECT id FROM users WHERE name = ? AND role = 'doctor'`,
          [name]
        ) as any[];

        if (existing.length > 0) {
          // Update existing
          await mysqlConn.query(
            `UPDATE users SET email = ?, branch = ? WHERE id = ?`,
            [email, 'examinations', existing[0].id]
          );
        } else {
          // Insert new
          const username = `dr_${code || name.toLowerCase().replace(/\s+/g, '_')}`;
          await mysqlConn.query(
            `INSERT INTO users (username, password, name, email, role, branch, isActive)
             VALUES (?, ?, ?, ?, 'doctor', 'examinations', 1)`,
            [username, '$2b$10$placeholder', name, email]
          );
        }

        doctorsInserted++;
        if (doctorsInserted % 5 === 0) {
          console.log(`  Processed ${doctorsInserted} doctors...`);
        }
      } catch (err: any) {
        console.error(`  Error for doctor ${name}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`✓ Doctors: ${doctorsInserted} synced, ${doctorsSkipped} skipped\n`);

    // Step 2: Sync Services (create if not exists)
    console.log("Step 2: Creating services table...\n");

    // Check if services table exists
    const [serviceTableCheck] = await mysqlConn.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'
    `) as any[];

    if (serviceTableCheck.length === 0) {
      await mysqlConn.query(`
        CREATE TABLE services (
          id int NOT NULL AUTO_INCREMENT,
          code varchar(50),
          name varchar(255) NOT NULL,
          description text,
          branch enum('examinations', 'surgery', 'both') DEFAULT 'examinations',
          isActive tinyint(1) DEFAULT 1,
          createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY services_code_unique (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✓ Created services table");
    }

    // Insert default services
    const defaultServices = [
      ['examinations', 'الفحوصات', 'examinations'],
      ['surgery', 'الجراحة', 'surgery'],
      ['consultant', 'استشارة', 'examinations'],
      ['specialist', 'متخصص', 'examinations'],
      ['lasik', 'ليزك', 'surgery'],
      ['external', 'خارجي', 'both'],
    ];

    let servicesInserted = 0;

    for (const [code, name, branch] of defaultServices) {
      try {
        const [existing] = await mysqlConn.query(
          `SELECT id FROM services WHERE code = ?`,
          [code]
        ) as any[];

        if (existing.length === 0) {
          await mysqlConn.query(
            `INSERT INTO services (code, name, branch) VALUES (?, ?, ?)`,
            [code, name, branch]
          );
          servicesInserted++;
          console.log(`  ✓ Added service: ${code}`);
        }
      } catch (err: any) {
        console.error(`  Error for service ${code}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`✓ Services: ${servicesInserted} created\n`);

    // Verify
    const [doctorCount] = await mysqlConn.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'doctor'`
    ) as any[];

    const [serviceCount] = await mysqlConn.query(
      `SELECT COUNT(*) as count FROM services`
    ) as any[];

    console.log("=== Final State ===");
    console.log(`Doctors: ${doctorCount[0].count}`);
    console.log(`Services: ${serviceCount[0].count}\n`);

    console.log("✓ COMPLETE! Doctors and services synced");

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
