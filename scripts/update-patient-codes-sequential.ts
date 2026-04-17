import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Updating patientCode to match sequential IDs (0001, 0002, etc.)...\n");

    // Get all patients ordered by id
    const [patients] = await conn.query(
      `SELECT id FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${patients.length} patients to update\n`);

    let updated = 0;
    for (const patient of patients) {
      const newPatientCode = String(patient.id).padStart(4, "0");
      await conn.query(
        `UPDATE patients SET patientCode = ? WHERE id = ?`,
        [newPatientCode, patient.id]
      );
      updated++;

      if (updated % 100 === 0) {
        console.log(`  Updated ${updated}/${patients.length}...`);
      }
    }

    console.log(`\n✓ Updated ${updated} patientCodes\n`);

    // Verify
    const [sample] = await conn.query(
      `SELECT id, patientCode FROM patients ORDER BY id LIMIT 10`
    ) as any[];

    console.log(`Sample updated patients:`);
    sample.forEach((p: any) => {
      console.log(`  ID ${p.id} → patientCode ${p.patientCode}`);
    });

    const [count] = await conn.query(`SELECT COUNT(*) as total FROM patients`) as any[];
    console.log(`\n✓ COMPLETE! All ${count[0].total} patients now have sequential patientCodes`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
