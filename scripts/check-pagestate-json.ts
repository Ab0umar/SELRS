import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Examination Page State JSON Data (Old IDs) ===\n");

    // Get actual JSON data
    const [pageStates] = await conn.query(`
      SELECT patientId, page, data, updatedAt
      FROM patientPageStates
      WHERE patientId > 10000 AND page = 'examination'
      ORDER BY patientId, updatedAt DESC
      LIMIT 10
    `) as any[];

    console.log(`Found ${pageStates.length} examination page states\n`);

    pageStates.forEach((ps: any, idx: number) => {
      console.log(`--- Record ${idx + 1}: PatientID ${ps.patientId} (${ps.updatedAt}) ---`);
      
      if (ps.data) {
        try {
          const parsed = JSON.parse(ps.data);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(`Raw: ${ps.data}`);
        }
      }
      console.log("");
    });

    // Count by content type
    console.log("\n=== Counting Data Patterns ---\n");
    
    const [allData] = await conn.query(`
      SELECT data FROM patientPageStates
      WHERE patientId > 10000 AND page = 'examination'
      LIMIT 100
    `) as any[];

    let hasServiceCodes = 0;
    let hasDoctorNames = 0;
    let hasSheetTypes = 0;
    let emptyData = 0;

    allData.forEach((row: any) => {
      if (!row.data) {
        emptyData++;
        return;
      }
      
      try {
        const data = JSON.parse(row.data);
        if (data.serviceCode || data.serviceCodes) hasServiceCodes++;
        if (data.doctorName) hasDoctorNames++;
        if (data.serviceSheetTypeByCode) hasSheetTypes++;
      } catch {}
    });

    console.log(`Entries with serviceCode: ${hasServiceCodes}`);
    console.log(`Entries with doctorName: ${hasDoctorNames}`);
    console.log(`Entries with serviceSheetTypeByCode: ${hasSheetTypes}`);
    console.log(`Empty entries: ${emptyData}`);

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
