import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== Recreate patients table with AUTO_INCREMENT = 1 ===\n");

    // Get current table definition
    const [createTable] = await conn.query(
      `SHOW CREATE TABLE patients`
    ) as any[];
    const originalDef = createTable[0]['Create Table'];
    console.log("Backing up table definition...\n");

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    console.log("✓ Disabled foreign key checks");

    // Rename old table
    await conn.query(`RENAME TABLE patients TO patients_old`);
    console.log("✓ Renamed patients to patients_old");

    // Recreate with AUTO_INCREMENT = 1
    const newDef = originalDef.replace(
      'CREATE TABLE `patients`',
      'CREATE TABLE `patients`'
    ) + ' AUTO_INCREMENT = 1';

    // Actually, let's use a safer approach
    await conn.query(`
      CREATE TABLE patients (
        id int NOT NULL AUTO_INCREMENT,
        patientCode varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        fullName varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        dateOfBirth date DEFAULT NULL,
        age int DEFAULT NULL,
        gender enum('male','female') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        nationalId varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        phone varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        alternatePhone varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        address text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        occupation varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        referralSource varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        medicalHistory text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        allergies text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        branch enum('examinations','surgery') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'examinations',
        status enum('new','followup','archived') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'new',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        serviceType enum('consultant','specialist','lasik','surgery','external') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'consultant',
        locationType enum('center','external') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'center',
        lastVisit date DEFAULT NULL,
        doctorId int DEFAULT NULL,
        receptionSignature varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        temp_id int DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY patients_patientCode_unique (patientCode),
        KEY idx_patients_full_name (fullName),
        KEY idx_patients_last_visit (lastVisit),
        KEY idx_patients_service_type (serviceType),
        KEY idx_patients_location_type (locationType),
        KEY idx_patients_service_location_visit (serviceType, locationType, lastVisit),
        KEY idx_patients_doctor_id (doctorId),
        KEY idx_patients_last_visit_service_location (lastVisit, serviceType, locationType),
        CONSTRAINT fk_patients_doctor_user_new FOREIGN KEY (doctorId) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT = 1
    `);
    console.log("✓ Created new patients table with AUTO_INCREMENT = 1");

    // Drop old table
    await conn.query(`DROP TABLE patients_old`);
    console.log("✓ Dropped old table");

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("✓ Enabled foreign key checks\n");

    // Verify
    const [aiResult] = await conn.query(`
      SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
    `) as any[];

    console.log(`Current AUTO_INCREMENT: ${aiResult[0].AUTO_INCREMENT}`);

    if (aiResult[0].AUTO_INCREMENT === 1) {
      console.log("✓ SUCCESS! AUTO_INCREMENT is now 1");
    } else {
      console.log(`⚠ AUTO_INCREMENT is ${aiResult[0].AUTO_INCREMENT}`);
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
