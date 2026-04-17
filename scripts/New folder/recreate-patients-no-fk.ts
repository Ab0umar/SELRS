import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Recreate patients table (no foreign key) ===\n");

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    console.log("✓ Disabled foreign key checks");

    // Drop old table
    await conn.query(`DROP TABLE IF EXISTS patients`);
    console.log("✓ Dropped old patients table");

    // Create fresh patients table with AUTO_INCREMENT = 1 (no FK for now)
    await conn.query(`
      CREATE TABLE patients (
        id int NOT NULL AUTO_INCREMENT,
        patientCode varchar(50) NOT NULL UNIQUE,
        fullName varchar(255) NOT NULL,
        dateOfBirth date DEFAULT NULL,
        age int DEFAULT NULL,
        gender enum('male','female') DEFAULT NULL,
        nationalId varchar(20) DEFAULT NULL,
        phone varchar(20) DEFAULT NULL,
        alternatePhone varchar(20) DEFAULT NULL,
        address text,
        occupation varchar(255) DEFAULT NULL,
        referralSource varchar(255) DEFAULT NULL,
        medicalHistory text,
        allergies text,
        branch enum('examinations','surgery') DEFAULT 'examinations',
        status enum('new','followup','archived') DEFAULT 'new',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        serviceType enum('consultant','specialist','lasik','surgery','external') DEFAULT 'consultant',
        locationType enum('center','external') DEFAULT 'center',
        lastVisit date DEFAULT NULL,
        doctorId int DEFAULT NULL,
        receptionSignature varchar(255) DEFAULT NULL,
        temp_id int DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_patients_full_name (fullName),
        KEY idx_patients_last_visit (lastVisit),
        KEY idx_patients_service_type (serviceType),
        KEY idx_patients_location_type (locationType),
        KEY idx_patients_doctor_id (doctorId)
      ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✓ Created new patients table");

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("✓ Enabled foreign key checks\n");

    // Verify
    const [aiResult] = await conn.query(`
      SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
    `) as any[];

    const [count] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];

    console.log(`AUTO_INCREMENT: ${aiResult[0].AUTO_INCREMENT}`);
    console.log(`Patient count: ${count[0].count}\n`);

    if (aiResult[0].AUTO_INCREMENT === 1) {
      console.log("✓ SUCCESS! Table recreated with AUTO_INCREMENT = 1");
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
