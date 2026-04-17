import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Report: Orphaned patientPageStates Records ===\n");

    // Find patientPageStates records that reference non-existent patients
    const [orphaned] = await conn.query(`
      SELECT pps.patientId, COUNT(*) as record_count
      FROM patientPageStates pps
      LEFT JOIN patients p ON pps.patientId = p.id
      WHERE p.id IS NULL
      GROUP BY pps.patientId
      ORDER BY pps.patientId
    `) as any[];

    console.log(`Found ${orphaned.length} orphaned patientIds\n`);

    if (orphaned.length > 0) {
      console.log("Orphaned records by patientId:");
      let totalOrphaned = 0;
      orphaned.forEach((row: any) => {
        console.log(`  patientId ${row.patientId}: ${row.record_count} records`);
        totalOrphaned += row.record_count;
      });

      console.log(`\nTotal orphaned records: ${totalOrphaned}`);
      console.log(`\n⚠️  These records reference patients that no longer exist.`);
      console.log(`    To delete them, run: npx tsx scripts/New\ folder/delete-orphaned-patientpagestates.ts`);
    } else {
      console.log("✓ No orphaned records found\n");
    }

    // Overall stats
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT patientId) as unique_patients
      FROM patientPageStates
    `) as any[];

    console.log("=== Overall Statistics ===");
    console.log(`Total patientPageStates records: ${stats[0].total}`);
    console.log(`Unique patients referenced: ${stats[0].unique_patients}`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
