import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Check if Old Patient Data is Unique ===\n");

    // Get sample visits from old IDs
    console.log("--- VISITS from old IDs (40585-41019) ---\n");
    const [oldVisits] = await conn.query(`
      SELECT id, patientId, visitDate, queueStatus, createdAt
      FROM visits
      WHERE patientId > 10000
      ORDER BY patientId, visitDate DESC
      LIMIT 10
    `) as any[];

    if (oldVisits.length > 0) {
      console.log("Sample visits from old patient IDs:");
      oldVisits.forEach((v: any) => {
        console.log(`  PatientID ${v.patientId}: visit ${v.id} on ${v.visitDate} (${v.queueStatus})`);
      });
    } else {
      console.log("No visits found for old IDs");
    }

    // Check patientPageStates - what pages have data?
    console.log("\n--- PATIENT PAGE STATES from old IDs (39923-44998) ---\n");
    const [pageTypes] = await conn.query(`
      SELECT page, COUNT(*) as count
      FROM patientPageStates
      WHERE patientId > 10000
      GROUP BY page
    `) as any[];

    console.log("Pages with data in old patient IDs:");
    pageTypes.forEach((p: any) => {
      console.log(`  ${p.page}: ${p.count} records`);
    });

    // Get sample pageState content
    console.log("\n--- Sample Page State Data ---\n");
    const [samplePageStates] = await conn.query(`
      SELECT patientId, page, data, updatedAt
      FROM patientPageStates
      WHERE patientId > 10000
      ORDER BY patientId, updatedAt DESC
      LIMIT 5
    `) as any[];

    samplePageStates.forEach((ps: any) => {
      console.log(`PatientID ${ps.patientId}, page: ${ps.page} (${ps.updatedAt})`);
      if (ps.data) {
        try {
          const parsed = JSON.parse(ps.data);
          console.log(`  Data keys: ${Object.keys(parsed).join(', ')}`);
        } catch {
          console.log(`  Data: ${String(ps.data).slice(0, 100)}`);
        }
      }
    });

    // Check if old patient IDs exist in patients table
    console.log("\n--- Do old IDs exist in patients table? ---\n");
    const [oldPatients] = await conn.query(`
      SELECT id, patientCode, fullName FROM patients WHERE id > 10000 LIMIT 5
    `) as any[];

    if (oldPatients.length > 0) {
      console.log("OLD PATIENTS STILL IN DATABASE:");
      oldPatients.forEach((p: any) => {
        console.log(`  ID ${p.id}: ${p.patientCode} - ${p.fullName}`);
      });
    } else {
      console.log("✓ No old patient IDs in patients table (they were renumbered)");
    }

    // Check for duplicates - do any new patients have the same patientCode as old data?
    console.log("\n--- Checking for duplicate patientCodes ---\n");
    const [duplicateCodes] = await conn.query(`
      SELECT patientCode, COUNT(*) as cnt FROM patients GROUP BY patientCode HAVING cnt > 1 LIMIT 5
    `) as any[];

    if (duplicateCodes.length > 0) {
      console.log("Found duplicate patientCodes:");
      duplicateCodes.forEach((d: any) => {
        console.log(`  ${d.patientCode}: ${d.cnt} patients`);
      });
    } else {
      console.log("✓ No duplicate patientCodes");
    }

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
