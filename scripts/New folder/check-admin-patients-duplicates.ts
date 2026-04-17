import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Checking for Duplicate Patients in Admin Query ===\n");

    // Check what the admin query returns (from getAllPatients)
    const [patients] = await conn.query(`
      SELECT
        id,
        patientCode,
        fullName
      FROM patients
      LIMIT 20
    `) as any[];

    console.log(`Direct query from patients table: ${patients.length} rows`);

    // Check for duplicates
    const idCounts = new Map<number, number>();
    const codeCounts = new Map<string, number>();

    patients.forEach((p: any) => {
      idCounts.set(p.id, (idCounts.get(p.id) || 0) + 1);
      codeCounts.set(p.patientCode, (codeCounts.get(p.patientCode) || 0) + 1);
    });

    const duplicateIds = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
    const duplicateCodes = Array.from(codeCounts.entries()).filter(([_, count]) => count > 1);

    console.log(`Unique IDs: ${idCounts.size}`);
    console.log(`Unique codes: ${codeCounts.size}`);
    console.log(`Duplicate IDs: ${duplicateIds.length}`);
    console.log(`Duplicate codes: ${duplicateCodes.length}`);

    if (duplicateIds.length > 0) {
      console.log(`\n⚠️ Duplicate IDs found:`);
      duplicateIds.forEach(([id, count]) => {
        console.log(`  ID ${id}: ${count} copies`);
      });
    }

    if (duplicateCodes.length > 0) {
      console.log(`\n⚠️ Duplicate codes found:`);
      duplicateCodes.forEach(([code, count]) => {
        console.log(`  Code ${code}: ${count} copies`);
      });
    }

    if (duplicateIds.length === 0 && duplicateCodes.length === 0) {
      console.log(`\n✓ No duplicates in basic query`);
    }

    // Now check if the issue is with how the data is being displayed
    // Maybe it's paginating incorrectly?
    const [total] = await conn.query(`
      SELECT COUNT(*) as total FROM patients
    `) as any[];

    console.log(`\nTotal patients in database: ${total[0].total}`);
    console.log(`Admin is showing: 20 (or limit value)`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
