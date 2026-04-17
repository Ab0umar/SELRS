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
    console.log("=== Syncing Visit Dates from PAPAT_SRV ===\n");

    // Get all service records with visit dates
    const result = await pool.request().query(`
      SELECT
        PAT_CD,
        VST_NO,
        DT,
        SRV_CD,
        ENTRYDATE,
        UPDATEDATE
      FROM op2026.dbo.PAPAT_SRV
      WHERE PAT_CD IS NOT NULL AND PAT_CD != ''
      ORDER BY PAT_CD, VST_NO
    `);

    const services = result.recordset || [];
    console.log(`Found ${services.length} service records in PAPAT_SRV\n`);

    // Get all visits grouped by patient
    const [mysqlVisits] = await mysqlConn.query(`
      SELECT
        v.id,
        v.patientId,
        p.patientCode,
        p.fullName,
        ROW_NUMBER() OVER (PARTITION BY v.patientId ORDER BY v.id) as visit_no
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      ORDER BY p.patientCode, visit_no
    `) as any[];

    console.log(`Found ${mysqlVisits.length} visits in MySQL\n`);

    // Build map of visits by patient code and visit number
    const visitMap = new Map<string, Map<number, any>>();
    mysqlVisits.forEach((visit: any) => {
      const key = visit.patientCode;
      if (!visitMap.has(key)) {
        visitMap.set(key, new Map());
      }
      visitMap.get(key)!.set(visit.visit_no, visit);
    });

    let updated = 0;
    let notFound = 0;
    let skipped = 0;
    const issues: string[] = [];

    // Update each service date to corresponding visit
    for (const srv of services) {
      const patCode = String(srv.PAT_CD).trim();
      const vstNo = srv.VST_NO;

      // Find visit in MySQL by patient code and visit number
      const patientVisits = visitMap.get(patCode);
      if (!patientVisits) {
        notFound++;
        continue;
      }

      const visit = patientVisits.get(vstNo);
      if (!visit) {
        skipped++;
        issues.push(`Patient ${patCode}: No visit #${vstNo} in MySQL (found ${patientVisits.size} visits)`);
        continue;
      }

      // Update visit with exam date
      try {
        await mysqlConn.query(
          `UPDATE visits SET visitDate = ?, checkedInAt = ?, createdAt = ?, updatedAt = NOW() WHERE id = ?`,
          [
            srv.DT,
            srv.ENTRYDATE || srv.DT,
            srv.ENTRYDATE || srv.DT,
            visit.id
          ]
        );
        updated++;

        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${services.length}...`);
        }
      } catch (err: any) {
        console.error(`  Error updating visit ${visit.id}: ${err.message.slice(0, 80)}`);
      }
    }

    console.log(`\n✓ Updated: ${updated} visits with exam dates`);
    console.log(`⚠ Patient codes not found in MySQL: ${notFound}`);
    console.log(`⚠ Visit numbers not found: ${skipped}`);

    if (issues.length > 0) {
      console.log(`\n⚠ Issues (${issues.length}):`);
      issues.slice(0, 10).forEach(issue => console.log(`  ${issue}`));
      if (issues.length > 10) {
        console.log(`  ... and ${issues.length - 10} more`);
      }
    }

    // Verify results
    const [stats] = await mysqlConn.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN visitDate IS NOT NULL THEN 1 ELSE 0 END) as with_visitDate,
        SUM(CASE WHEN visitDate IS NULL THEN 1 ELSE 0 END) as null_visitDate,
        MIN(visitDate) as min_date,
        MAX(visitDate) as max_date
      FROM visits
    `) as any[];

    console.log("\n=== Final Visit Date Statistics ===");
    console.log(`Total visits: ${stats[0].total}`);
    console.log(`With visitDate: ${stats[0].with_visitDate}`);
    console.log(`NULL visitDate: ${stats[0].null_visitDate}`);
    console.log(`Date range: ${stats[0].min_date} to ${stats[0].max_date}`);

    console.log(`\n✓ COMPLETE! Visit dates synchronized from PAPAT_SRV`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
