import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Check if Old PageState Data is Unique or Repeated ===\n");

    // Check 1: Do any new patients have BOTH old and new pageState records?
    console.log("--- Check 1: Multiple pageState records per new patient ---\n");
    
    const [multipleRecords] = await conn.query(`
      SELECT 
        p.id as new_id,
        p.patientCode,
        p.fullName,
        COUNT(*) as record_count,
        GROUP_CONCAT(pps.patientId ORDER BY pps.patientId) as old_ids
      FROM patientPageStates pps
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.mssqlBackfill.patientCode'))
      WHERE pps.patientId > 10000 AND pps.page = 'examination'
      GROUP BY p.id
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `) as any[];

    if (multipleRecords.length > 0) {
      console.log(`Found ${multipleRecords.length} patients with MULTIPLE old pageState records:\n`);
      multipleRecords.forEach((m: any) => {
        console.log(`  New ID ${m.new_id} (${m.patientCode}): ${m.record_count} old records`);
        console.log(`    Old IDs: ${m.old_ids}`);
      });
    } else {
      console.log("✓ Each new patient has at most 1 old pageState record\n");
    }

    // Check 2: Are the data contents identical or different?
    console.log("\n--- Check 2: Content comparison ---\n");
    
    const [sampleComparison] = await conn.query(`
      SELECT 
        p.id as new_id,
        p.patientCode,
        pps.patientId as old_id,
        pps.page,
        LENGTH(pps.data) as data_size,
        JSON_EXTRACT(pps.data, '$.doctorName') as doctorName,
        JSON_EXTRACT(pps.data, '$.serviceCode') as serviceCode,
        JSON_EXTRACT(pps.data, '$.mssqlBackfill.lastVisit') as lastVisit
      FROM patientPageStates pps
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.mssqlBackfill.patientCode'))
      WHERE pps.patientId > 10000 AND pps.page = 'examination'
      ORDER BY p.id
      LIMIT 15
    `) as any[];

    console.log("Sample old pageState data for new patients:\n");
    sampleComparison.forEach((s: any) => {
      console.log(`New ID ${s.new_id} (${s.patientCode}) ← Old ID ${s.old_id}`);
      console.log(`  Doctor: ${s.doctorName}, Service: ${s.serviceCode}, LastVisit: ${s.lastVisit}`);
    });

    // Check 3: Summary statistics
    console.log("\n--- Summary Statistics ---\n");
    
    const [stats] = await conn.query(`
      SELECT 
        COUNT(DISTINCT p.id) as unique_new_patients,
        COUNT(DISTINCT pps.patientId) as unique_old_ids,
        COUNT(*) as total_records,
        COUNT(DISTINCT pps.page) as page_types
      FROM patientPageStates pps
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.mssqlBackfill.patientCode'))
      WHERE pps.patientId > 10000
    `) as any[];

    console.log(`Unique new patients: ${stats[0].unique_new_patients}`);
    console.log(`Unique old IDs: ${stats[0].unique_old_ids}`);
    console.log(`Total records: ${stats[0].total_records}`);
    console.log(`Page types: ${stats[0].page_types}`);

    // Check 4: Are there conflicting records (different data for same patient)?
    console.log("\n--- Check 4: Conflicting Data ---\n");
    
    const [conflicts] = await conn.query(`
      SELECT 
        p.id as new_id,
        p.patientCode,
        pps.page,
        COUNT(DISTINCT JSON_EXTRACT(pps.data, '$.doctorName')) as diff_doctors,
        COUNT(DISTINCT JSON_EXTRACT(pps.data, '$.serviceCode')) as diff_services
      FROM patientPageStates pps
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.mssqlBackfill.patientCode'))
      WHERE pps.patientId > 10000
      GROUP BY p.id, pps.page
      HAVING diff_doctors > 1 OR diff_services > 1
      LIMIT 10
    `) as any[];

    if (conflicts.length > 0) {
      console.log(`⚠️  Found ${conflicts.length} patients with CONFLICTING data:\n`);
      conflicts.forEach((c: any) => {
        console.log(`  New ID ${c.new_id} (${c.patientCode}), page: ${c.page}`);
        console.log(`    Different doctors: ${c.diff_doctors}, Different services: ${c.diff_services}`);
      });
    } else {
      console.log("✓ No conflicting data found\n");
    }

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
