import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Check Mapping by patientCode ===\n");

    // Match by patientCode from mssqlBackfill
    const [codeMatches] = await conn.query(`
      SELECT DISTINCT
        pps.patientId as old_id,
        p.id as new_id,
        p.patientCode,
        p.fullName
      FROM patientPageStates pps
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.mssqlBackfill.patientCode'))
      WHERE pps.patientId > 10000
      ORDER BY pps.patientId
    `) as any[];

    console.log(`Matched by patientCode: ${codeMatches.length}\n`);
    
    if (codeMatches.length > 0) {
      console.log("Sample matches:");
      codeMatches.slice(0, 15).forEach((m: any) => {
        console.log(`  Old ID ${m.old_id} → New ID ${m.new_id} (Code: ${m.patientCode}: ${m.fullName})`);
      });
      
      if (codeMatches.length > 15) {
        console.log(`  ... and ${codeMatches.length - 15} more\n`);
      }
    }

    // Summary
    console.log("\n=== Coverage ===");
    const [totalOld] = await conn.query(`
      SELECT COUNT(*) as cnt FROM patientPageStates WHERE patientId > 10000
    `) as any[];

    console.log(`Total old pageState records: ${totalOld[0].cnt}`);
    console.log(`Matched by patientCode: ${codeMatches.length}`);
    console.log(`Coverage: ${Math.round(codeMatches.length / totalOld[0].cnt * 100)}%`);

    if (codeMatches.length === totalOld[0].cnt) {
      console.log("\n✅ PERFECT MAPPING - All old records can be migrated!");
    } else {
      console.log(`\n⚠️  ${totalOld[0].cnt - codeMatches.length} records have no matching patientCode`);
    }

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
