import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Check Mapping: Old IDs → New IDs ===\n");

    // Strategy 1: Try to match by fullName from pageState JSON
    console.log("--- Attempt 1: Match by fullName ---\n");
    
    const [nameMatches] = await conn.query(`
      SELECT 
        pps.patientId as old_id,
        p.id as new_id,
        p.patientCode,
        p.fullName,
        COUNT(*) as pagestate_count
      FROM patientPageStates pps
      INNER JOIN patients p ON p.fullName = JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.mssqlBackfill.fullName'))
      WHERE pps.patientId > 10000
      GROUP BY pps.patientId, p.id
      ORDER BY pps.patientId
      LIMIT 20
    `) as any[];

    if (nameMatches.length > 0) {
      console.log(`✓ Found ${nameMatches.length} matches by fullName\n`);
      nameMatches.forEach((m: any) => {
        console.log(`  Old ID ${m.old_id} → New ID ${m.new_id} (${m.patientCode}: ${m.fullName})`);
      });
    } else {
      console.log("✗ No matches by fullName\n");
    }

    // Strategy 2: Check if old pageStates have patientCode embedded
    console.log("\n--- Checking data structure ---\n");
    const [sampleData] = await conn.query(`
      SELECT patientId, data
      FROM patientPageStates
      WHERE patientId > 10000
      LIMIT 3
    `) as any[];

    sampleData.forEach((row: any) => {
      try {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        console.log(`Old ID ${row.patientId}:`);
        console.log(`  Keys: ${Object.keys(data).join(', ')}`);
        if (data.mssqlBackfill) {
          console.log(`  MSSQL Backfill keys: ${Object.keys(data.mssqlBackfill).join(', ')}`);
        }
      } catch (e) {
        console.log(`Old ID ${row.patientId}: Could not parse`);
      }
    });

    // Summary
    console.log("\n=== Summary ===");
    const [totalOld] = await conn.query(`
      SELECT COUNT(*) as cnt FROM patientPageStates WHERE patientId > 10000
    `) as any[];

    console.log(`Total old pageState records: ${totalOld[0].cnt}`);
    console.log(`Matched records: ${nameMatches.length}`);
    console.log(`Unmatched: ${totalOld[0].cnt - nameMatches.length}`);

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
