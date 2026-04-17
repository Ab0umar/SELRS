import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Clean Up patientPageStates Orphaned Records ===\n");

    // Find patientPageStates records that reference non-existent patients
    const [orphaned] = await conn.query(`
      SELECT DISTINCT pps.patientId
      FROM patientPageStates pps
      LEFT JOIN patients p ON pps.patientId = p.id
      WHERE p.id IS NULL
      ORDER BY pps.patientId
    `) as any[];

    console.log(`Found ${orphaned.length} orphaned patientIds (no matching patient)\n`);

    if (orphaned.length > 0) {
      console.log("Orphaned patientIds:");
      orphaned.slice(0, 20).forEach((row: any) => {
        console.log(`  ${row.patientId}`);
      });
      if (orphaned.length > 20) {
        console.log(`  ... and ${orphaned.length - 20} more`);
      }
      console.log("");

      // Delete orphaned records
      const orphanedIds = orphaned.map((row: any) => row.patientId);
      const placeholders = orphanedIds.map(() => "?").join(",");
      
      const [result] = await conn.query(
        `DELETE FROM patientPageStates WHERE patientId IN (${placeholders})`,
        orphanedIds
      ) as any[];

      const deleted = (result as any).affectedRows || 0;
      console.log(`✓ Deleted ${deleted} orphaned patientPageStates records\n`);
    } else {
      console.log("✓ No orphaned records found\n");
    }

    // Verify final state
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT patientId) as unique_patients,
        MIN(patientId) as min_id,
        MAX(patientId) as max_id
      FROM patientPageStates
    `) as any[];

    console.log("=== Final State ===");
    console.log(`Total patientPageStates: ${stats[0].total}`);
    console.log(`Unique patients: ${stats[0].unique_patients}`);
    console.log(`ID range: ${stats[0].min_id} - ${stats[0].max_id}`);

    // Check for orphans again
    const [stillOrphaned] = await conn.query(`
      SELECT COUNT(*) as count
      FROM patientPageStates pps
      LEFT JOIN patients p ON pps.patientId = p.id
      WHERE p.id IS NULL
    `) as any[];

    console.log(`Orphaned records remaining: ${stillOrphaned[0].count}`);

    console.log(`\n✓ COMPLETE! patientPageStates cleaned up`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
