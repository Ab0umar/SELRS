import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Check for Medical Data in Old PageState Records ===\n");

    // Get full JSON data from old records
    const [oldRecords] = await conn.query(`
      SELECT 
        patientId,
        page,
        data,
        updatedAt
      FROM patientPageStates
      WHERE patientId > 10000 AND page = 'examination'
      ORDER BY patientId
      LIMIT 5
    `) as any[];

    console.log(`Examining ${oldRecords.length} old pageState records\n`);

    oldRecords.forEach((record: any, idx: number) => {
      console.log(`--- Record ${idx + 1}: Patient ID ${record.patientId} ---`);
      
      try {
        const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
        
        console.log("Full JSON keys:", Object.keys(data).join(', '));
        console.log("\nFull JSON structure:");
        console.log(JSON.stringify(data, null, 2).substring(0, 1500));
        console.log("\n");
        
      } catch (e) {
        console.log(`Error parsing: ${e}\n`);
      }
    });

    // Check what fields are typically in examination data
    console.log("\n--- Analysis: Medical Data Fields ---\n");
    
    const medicalFields = [
      'refraction', 'vision', 'iop', 'fundus', 'diagnosis', 
      'treatment', 'medications', 'tests', 'prescription',
      'findings', 'examination', 'assessment', 'plan'
    ];

    const [sampleData] = await conn.query(`
      SELECT data
      FROM patientPageStates
      WHERE patientId > 10000 AND page = 'examination'
      LIMIT 1
    `) as any[];

    if (sampleData.length > 0) {
      try {
        const jsonData = typeof sampleData[0].data === 'string' 
          ? JSON.parse(sampleData[0].data) 
          : sampleData[0].data;

        console.log("Medical/clinical fields found:");
        let foundMedical = false;
        medicalFields.forEach(field => {
          if (jsonData[field] !== undefined) {
            console.log(`  ✓ ${field}: ${typeof jsonData[field]}`);
            foundMedical = true;
          }
        });

        if (!foundMedical) {
          console.log("  ✗ No medical/clinical data fields found");
          console.log("\nData contains only configuration/metadata:");
          Object.keys(jsonData).forEach(key => {
            if (!['mssqlBackfill', 'signatures', 'serviceSheetTypeByCode'].includes(key)) {
              console.log(`  - ${key}: ${typeof jsonData[key]}`);
            }
          });
        }
      } catch (e) {
        console.log("Error: " + e);
      }
    }

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
