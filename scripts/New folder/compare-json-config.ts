import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Compare JSON Configuration Data: Old vs New ===\n");

    // Get pairs and extract/display JSON configs
    const [pairs] = await conn.query(`
      SELECT 
        pps_old.patientId as old_id,
        p.id as new_id,
        p.patientCode,
        p.fullName,
        pps_old.data as old_data,
        pps_new.data as new_data
      FROM patientPageStates pps_old
      INNER JOIN patients p ON p.patientCode = JSON_UNQUOTE(JSON_EXTRACT(pps_old.data, '$.mssqlBackfill.patientCode'))
      LEFT JOIN patientPageStates pps_new ON pps_new.patientId = p.id AND pps_new.page = 'examination'
      WHERE pps_old.patientId > 10000 AND pps_old.page = 'examination'
      ORDER BY p.id
      LIMIT 10
    `) as any[];

    console.log(`Comparing JSON configs for ${pairs.length} patient pairs\n`);

    pairs.forEach((pair: any, idx: number) => {
      console.log(`--- Pair ${idx + 1}: Old ID ${pair.old_id} → New ID ${pair.new_id} (${pair.patientCode}) ---`);
      
      try {
        const oldJson = typeof pair.old_data === 'string' ? JSON.parse(pair.old_data) : pair.old_data;
        const newJson = typeof pair.new_data === 'string' ? JSON.parse(pair.new_data) : pair.new_data;

        // Compare key fields
        console.log("OLD JSON config:");
        console.log(`  doctorName: ${oldJson.doctorName || 'undefined'}`);
        console.log(`  doctorCode: ${oldJson.doctorCode || 'undefined'}`);
        console.log(`  serviceCode: ${oldJson.serviceCode || 'undefined'}`);
        console.log(`  serviceCodes: ${JSON.stringify(oldJson.serviceCodes) || 'undefined'}`);
        console.log(`  serviceSheetTypeByCode: ${JSON.stringify(oldJson.serviceSheetTypeByCode) || 'undefined'}`);
        console.log(`  syncLockManual: ${oldJson.syncLockManual}`);

        console.log("\nNEW JSON config:");
        console.log(`  doctorName: ${newJson.doctorName || 'undefined'}`);
        console.log(`  doctorCode: ${newJson.doctorCode || 'undefined'}`);
        console.log(`  serviceCode: ${newJson.serviceCode || 'undefined'}`);
        console.log(`  serviceCodes: ${JSON.stringify(newJson.serviceCodes) || 'undefined'}`);
        console.log(`  serviceSheetTypeByCode: ${JSON.stringify(newJson.serviceSheetTypeByCode) || 'undefined'}`);
        console.log(`  syncLockManual: ${newJson.syncLockManual}`);

        // Check if configs are equivalent
        const oldConfig = {
          doctorName: oldJson.doctorName,
          doctorCode: oldJson.doctorCode,
          serviceCode: oldJson.serviceCode,
          serviceCodes: oldJson.serviceCodes,
          serviceSheetTypeByCode: oldJson.serviceSheetTypeByCode,
          syncLockManual: oldJson.syncLockManual
        };

        const newConfig = {
          doctorName: newJson.doctorName,
          doctorCode: newJson.doctorCode,
          serviceCode: newJson.serviceCode,
          serviceCodes: newJson.serviceCodes,
          serviceSheetTypeByCode: newJson.serviceSheetTypeByCode,
          syncLockManual: newJson.syncLockManual
        };

        const isSame = JSON.stringify(oldConfig) === JSON.stringify(newConfig);
        console.log(`\n${isSame ? '✓ SAME config' : '⚠️  DIFFERENT config'}\n`);

      } catch (e) {
        console.log(`Error parsing JSON: ${e}\n`);
      }
    });

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
