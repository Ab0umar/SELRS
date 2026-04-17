import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Restoring original patient codes from before renumbering...\n");

    // The reversal mapping (new_code -> old_code) based on the renumbering we just did
    // We need to reverse the IDs back to their original codes
    // Get all patients ordered by ID to rebuild the mapping
    const [patients] = await conn.query(
      `SELECT id FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${patients.length} patients to restore`);

    // Drop unique constraint
    await conn.query(`ALTER TABLE patients DROP INDEX patients_patientCode_unique`).catch(() => {});

    // Add temporary column
    await conn.query(`ALTER TABLE patients ADD COLUMN temp_code_restore VARCHAR(50)`).catch(() => {});

    // We need to reverse the mapping. The issue is we don't have the original codes stored.
    // However, we can infer them from the fact that we had gaps in the original numbering.
    // But this is complex. Let me try a different approach - query the MSSQL sync state or
    // ask the user if they have a backup.

    console.log(`\n⚠️  WARNING: I don't have the original codes stored anywhere.`);
    console.log(`The original codes were randomly distributed (0002, 0008, 0022, etc.)`);
    console.log(`To restore them, I need either:`);
    console.log(`  1. A database backup from before the change`);
    console.log(`  2. The original codes from MSSQL (via sync)`);
    console.log(`  3. A manual mapping you can provide`);

    await conn.end();
  } catch (err) {
    console.error("Failed:", err);
  }
}

main();
