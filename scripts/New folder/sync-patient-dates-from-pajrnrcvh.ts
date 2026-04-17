import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const mysqlConn = await mysql.createConnection(process.env.DATABASE_URL!);

  const mssqlConfig = {
    user: process.env.MSSQL_USER || "sa",
    password: process.env.MSSQL_PASSWORD || "",
    server: process.env.MSSQL_SERVER || "localhost",
    database: process.env.MSSQL_DATABASE || "op2026",
    authentication: { type: "default" as const },
    options: { trustServerCertificate: true },
  };

  const pool = new sql.ConnectionPool(mssqlConfig);
  await pool.connect();

  try {
    console.log("=== Syncing Patient Dates from PAJRNRCVH ===\n");

    // Get all patient visit records with dates
    const result = await pool.request().query(`
      SELECT
        PAT_CD,
        VST_DT,
        ENTRYDATE,
        UPDATEDATE
      FROM op2026.dbo.PAJRNRCVH
      WHERE PAT_CD IS NOT NULL AND PAT_CD != ''
      ORDER BY PAT_CD, VST_DT DESC
    `);

    const records = result.recordset || [];
    console.log(`Found ${records.length} visit records in PAJRNRCVH\n`);

    // Group by PAT_CD to get latest visit and dates
    const patientDateMap = new Map<string, any>();

    records.forEach((rec: any) => {
      const patCode = String(rec.PAT_CD).trim();

      if (!patientDateMap.has(patCode)) {
        // Use fallbacks for dates that are NULL
        const vstDt = rec.VST_DT;
        const entryDate = rec.ENTRYDATE || vstDt;
        const updateDate = rec.UPDATEDATE || entryDate;

        patientDateMap.set(patCode, {
          patientCode: patCode,
          lastVisit: vstDt,
          createdAt: entryDate,
          updatedAt: updateDate,
        });
      }
    });

    console.log(`Unique patient codes: ${patientDateMap.size}\n`);

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Update each patient
    for (const [patCode, dateData] of patientDateMap.entries()) {
      // Find patient in MySQL
      const [mysqlPatients] = await mysqlConn.query(
        `SELECT id FROM patients WHERE patientCode = ?`,
        [patCode]
      ) as any[];

      if (mysqlPatients.length === 0) {
        notFound++;
        continue;
      }

      const patientId = mysqlPatients[0].id;

      // Update with dates
      try {
        await mysqlConn.query(
          `UPDATE patients SET lastVisit = ?, createdAt = ?, updatedAt = ? WHERE id = ?`,
          [
            dateData.lastVisit,
            dateData.createdAt,
            dateData.updatedAt,
            patientId
          ]
        );
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${patientDateMap.size}...`);
        }
      } catch (err: any) {
        console.error(`  Error updating patient ${patCode}: ${err.message.slice(0, 80)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated} patients with dates`);
    console.log(`⚠ Not found in MySQL: ${notFound} patient codes`);
    console.log(`⚠ Skipped: ${skipped}`);

    // Verify results
    const [stats] = await mysqlConn.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN lastVisit IS NOT NULL THEN 1 ELSE 0 END) as with_lastVisit,
        SUM(CASE WHEN createdAt IS NOT NULL THEN 1 ELSE 0 END) as with_createdAt,
        SUM(CASE WHEN updatedAt IS NOT NULL THEN 1 ELSE 0 END) as with_updatedAt
      FROM patients
    `) as any[];

    console.log("\n=== Final Patient Date Statistics ===");
    console.log(`Total patients: ${stats[0].total}`);
    console.log(`With lastVisit: ${stats[0].with_lastVisit}`);
    console.log(`With createdAt: ${stats[0].with_createdAt}`);
    console.log(`With updatedAt: ${stats[0].with_updatedAt}`);

    console.log(`\n✓ COMPLETE! Patient dates synchronized from PAJRNRCVH`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
