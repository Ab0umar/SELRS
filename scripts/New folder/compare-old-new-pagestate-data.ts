import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Compare PageState Data: Old IDs vs New IDs (Same Patient) ===\n");

    // Get pairs of old→new IDs with their pageState data
    const [comparisons] = await conn.query(`
      SELECT 
        pps_old.patientId as old_id,
        p.id as new_id,
        p.patientCode,
        p.fullName,
        pps_old.page as old_page,
        pps_old.data as old_data,
        pps_old.updatedAt as old_updated,
        pps_new.page as new_page,
        pps_new.data as new_data,
        pps_new.updatedAt as new_updated,
        pps_old.data = pps_new.data as data_identical
      FROM patientPageStates pps_old
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps_old.data, '$.mssqlBackfill.patientCode'))
      LEFT JOIN patientPageStates pps_new ON pps_new.patientId = p.id AND pps_new.page = pps_old.page
      WHERE pps_old.patientId > 10000
      ORDER BY p.id
      LIMIT 20
    `) as any[];

    console.log(`Comparing ${comparisons.length} old→new patient pairs\n`);

    let identical = 0;
    let different = 0;
    let newMissing = 0;

    comparisons.forEach((c: any) => {
      if (!c.new_page) {
        newMissing++;
        console.log(`Old ID ${c.old_id} → New ID ${c.new_id} (${c.patientCode})`);
        console.log(`  ❌ New patient has NO pageState for page: ${c.old_page}`);
        return;
      }

      if (c.data_identical) {
        identical++;
      } else {
        different++;
        console.log(`Old ID ${c.old_id} → New ID ${c.new_id} (${c.patientCode})`);
        console.log(`  ⚠️  DATA DIFFERENT`);
        
        try {
          const oldData = typeof c.old_data === 'string' ? JSON.parse(c.old_data) : c.old_data;
          const newData = typeof c.new_data === 'string' ? JSON.parse(c.new_data) : c.new_data;
          
          console.log(`    Old: doctor=${oldData.doctorName}, service=${oldData.serviceCode}, updated=${c.old_updated}`);
          console.log(`    New: doctor=${newData.doctorName}, service=${newData.serviceCode}, updated=${c.new_updated}`);
        } catch (e) {
          console.log(`    Could not parse data`);
        }
      }
    });

    // Summary
    console.log("\n=== Summary ===");
    console.log(`Total pairs compared: ${comparisons.length}`);
    console.log(`✓ Identical data: ${identical}`);
    console.log(`⚠️  Different data: ${different}`);
    console.log(`❌ New missing pageState: ${newMissing}`);

    if (identical + different + newMissing === 0) {
      console.log("\nNo comparison data found");
    } else {
      const matchRate = Math.round((identical / comparisons.length) * 100);
      console.log(`\nData match rate: ${matchRate}%`);
    }

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
