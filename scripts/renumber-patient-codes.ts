import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Renumbering patient codes to sequential format (0001, 0002, 0003...)...\n");

    // Get all patients ordered by ID
    const [patients] = await conn.query(
      `SELECT id, patientCode FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${patients.length} patients to renumber`);

    // Build mapping of old code -> new code
    const codeMapping = new Map<string, string>();
    for (let i = 0; i < patients.length; i++) {
      const oldCode = patients[i].patientCode;
      const newCode = String(i + 1).padStart(4, '0');
      codeMapping.set(oldCode, newCode);
    }

    console.log(`\nSample code mapping:`);
    let sampleCount = 0;
    for (const [oldCode, newCode] of codeMapping.entries()) {
      if (sampleCount < 10) {
        console.log(`  "${oldCode}" -> "${newCode}"`);
        sampleCount++;
      } else {
        break;
      }
    }

    // Drop unique constraint
    console.log(`\nDropping unique constraint...`);
    await conn.query(`ALTER TABLE patients DROP INDEX patients_patientCode_unique`).catch(() => {
      // May not exist, continue
    });

    // Update patients table using temporary column
    console.log(`Updating patients table...`);

    // Add temporary column
    await conn.query(`ALTER TABLE patients ADD COLUMN temp_code VARCHAR(50)`).catch(() => {});

    // Update temporary column with new codes
    let updateCount = 0;
    for (const patient of patients) {
      const oldCode = patient.patientCode;
      const newCode = codeMapping.get(oldCode);
      if (newCode) {
        await conn.query(
          `UPDATE patients SET temp_code = ? WHERE patientCode = ?`,
          [newCode, oldCode]
        );
        updateCount++;
        if (updateCount % 100 === 0) {
          console.log(`  Updated ${updateCount}/${patients.length} patients...`);
        }
      }
    }

    // Swap columns
    await conn.query(`UPDATE patients SET patientCode = temp_code`);
    await conn.query(`ALTER TABLE patients DROP COLUMN temp_code`);

    console.log(`✓ Updated ${updateCount} patients`);

    // Re-create unique constraint
    console.log(`\nRecreating unique constraint...`);
    await conn.query(`ALTER TABLE patients ADD UNIQUE KEY patients_patientCode_unique (patientCode)`);

    // Verify the update
    const [verifyPatients] = await conn.query(
      `SELECT id, patientCode FROM patients ORDER BY id LIMIT 10`
    ) as any[];

    console.log(`\nVerification - first 10 patients:`);
    verifyPatients.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode}`);
    });

    // Check for any duplicates
    const [duplicates] = await conn.query(
      `SELECT patientCode, COUNT(*) as count FROM patients GROUP BY patientCode HAVING count > 1`
    ) as any[];

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found duplicate codes:`);
      duplicates.forEach((d: any) => {
        console.log(`  "${d.patientCode}": ${d.count} patients`);
      });
    } else {
      console.log(`\n✓ No duplicate codes found`);
    }

    // Get summary
    const [summary] = await conn.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT patientCode) as distinct_codes FROM patients`
    ) as any[];

    console.log(`\nSummary:`);
    console.log(`  Total patients: ${summary[0].total}`);
    console.log(`  Distinct codes: ${summary[0].distinct_codes}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
