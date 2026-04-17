import "dotenv/config";
import * as db from "../../server/db";

async function main() {
  console.log("=== Testing getAllPatients ===\n");

  const result = await db.getAllPatients({ limit: 20 });

  console.log(`Returned ${result.rows.length} rows (limit: ${result.limit})`);
  console.log(`Has more: ${result.hasMore}`);

  // Check for duplicates
  const patientIds = new Set<number>();
  const patientCodes = new Set<string>();
  let duplicateIds = 0;
  let duplicateCodes = 0;

  result.rows.forEach((row: any) => {
    if (patientIds.has(row.id)) {
      duplicateIds++;
    }
    patientIds.add(row.id);

    if (patientCodes.has(row.patientCode)) {
      duplicateCodes++;
    }
    patientCodes.add(row.patientCode);
  });

  console.log(`\nUnique patient IDs: ${patientIds.size}`);
  console.log(`Unique patient codes: ${patientCodes.size}`);
  console.log(`Duplicate IDs found: ${duplicateIds}`);
  console.log(`Duplicate codes found: ${duplicateCodes}`);

  if (duplicateIds > 0 || duplicateCodes > 0) {
    console.log(`\n⚠️ DUPLICATES DETECTED!`);
  } else {
    console.log(`\n✓ No duplicates found`);
  }

  // Show first 5 patients
  console.log(`\nFirst 5 patients:`);
  result.rows.slice(0, 5).forEach((row: any) => {
    console.log(`  ID ${row.id}: ${row.patientCode} - ${row.fullName}`);
  });
}

db.initializeDatabase().then(() => {
  main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
});
