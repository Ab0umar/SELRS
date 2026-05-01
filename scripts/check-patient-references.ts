import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking how patient-related tables reference patients...\n");

    // Key tables to check
    const tablesToCheck = [
      'visits', 'appointments', 'examinations', 'prescriptions',
      'tests', 'surgeries', 'pentacam_results', 'glasses_records',
      'autorefractometry_data', 'doctor_reports', 'consent_forms',
      'medical_history_checklists', 'followup_sheets'
    ];

    for (const tableName of tablesToCheck) {
      const [info] = await conn.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'selrs26' AND TABLE_NAME = ?
        AND (COLUMN_NAME LIKE '%patient%' OR COLUMN_NAME LIKE '%id%')
        ORDER BY COLUMN_NAME
      `, [tableName]) as any[];

      if (info.length === 0) {
        console.log(`${tableName}: NOT FOUND`);
        continue;
      }

      console.log(`${tableName}:`);
      info.forEach((col: any) => {
        console.log(`  - ${col.COLUMN_NAME}`);
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
