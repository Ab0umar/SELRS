import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Raw Page State Data (Old IDs) ===\n");

    // Get raw data
    const [pageStates] = await conn.query(`
      SELECT patientId, page, data, LENGTH(data) as data_length
      FROM patientPageStates
      WHERE patientId > 10000 AND page = 'examination'
      ORDER BY patientId
      LIMIT 5
    `) as any[];

    pageStates.forEach((ps: any) => {
      console.log(`PatientID ${ps.patientId}: ${ps.data_length} bytes`);
      console.log(`Data type: ${typeof ps.data}`);
      
      if (ps.data) {
        if (typeof ps.data === 'string') {
          console.log(`Content: ${ps.data.substring(0, 200)}`);
        } else if (typeof ps.data === 'object') {
          console.log(`Content: ${JSON.stringify(ps.data).substring(0, 200)}`);
        }
      }
      console.log("");
    });

    // Check column type
    console.log("\n=== Column Definition ===\n");
    const [columnInfo] = await conn.query(`
      SELECT COLUMN_TYPE, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'patientPageStates' AND COLUMN_NAME = 'data'
    `) as any[];

    if (columnInfo.length > 0) {
      console.log(`Data column type: ${columnInfo[0].COLUMN_TYPE}`);
    }

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
