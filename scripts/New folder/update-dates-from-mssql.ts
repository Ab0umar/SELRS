import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const mysqlConn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Syncing dates from MSSQL...\n");

    // Connect to MSSQL
    const mssqlConfig = {
      user: process.env.MSSQL_USER || "sa",
      password: process.env.MSSQL_PASSWORD || "",
      server: process.env.MSSQL_SERVER || "localhost",
      database: process.env.MSSQL_DATABASE || "op2026",
      authentication: {
        type: "default" as const,
      },
      options: {
        trustServerCertificate: true,
      },
    };

    const pool = new sql.ConnectionPool(mssqlConfig);
    await pool.connect();

    console.log("Fetching patient dates from MSSQL...");
    const mssqlResult = await pool.request().query(`
      SELECT
        PAT_CD,
        DT as lastVisit,
        BDT as dateOfBirth,
        GETDATE() as createdAt
      FROM op2026.dbo.PAPATMF
      WHERE PAT_CD IS NOT NULL AND PAT_CD != ''
    `);
    const mssqlPatients = Array.isArray(mssqlResult?.recordset) ? mssqlResult.recordset : [];

    console.log(`Found ${mssqlPatients.length} patients with date info\n`);

    let updated = 0;
    let skipped = 0;

    for (const row of mssqlPatients) {
      const patientCode = String(row.PAT_CD).trim();
      let lastVisit = null;
      let dateOfBirth = null;

      try {
        if (row.lastVisit) lastVisit = new Date(row.lastVisit).toISOString().split("T")[0];
        if (row.dateOfBirth) dateOfBirth = new Date(row.dateOfBirth).toISOString().split("T")[0];
      } catch (e) {
        // Skip invalid dates
      }

      try {
        // Update patient lastVisit and dateOfBirth
        const updates = [];
        const params = [];

        if (lastVisit) {
          updates.push("lastVisit = ?");
          params.push(lastVisit);
        }
        if (dateOfBirth) {
          updates.push("dateOfBirth = ?");
          params.push(dateOfBirth);
        }

        if (updates.length > 0) {
          params.push(patientCode);
          const sql = `UPDATE patients SET ${updates.join(", ")} WHERE patientCode = ?`;
          await mysqlConn.query(sql, params);
          updated++;

          if (updated % 100 === 0) {
            console.log(`  Updated ${updated} patients...`);
          }
        } else {
          skipped++;
        }
      } catch (err: any) {
        // Ignore errors
      }
    }

    await pool.close();

    console.log(`\n✓ Updated ${updated} patients with date info`);
    console.log(`✓ Skipped ${skipped} patients (no date info)\n`);

    // Verify
    const [patientsWithLastVisit] = await mysqlConn.query(`
      SELECT COUNT(*) as count FROM patients WHERE lastVisit IS NOT NULL
    `) as any[];

    const [patientsWithDOB] = await mysqlConn.query(`
      SELECT COUNT(*) as count FROM patients WHERE dateOfBirth IS NOT NULL
    `) as any[];

    console.log(`Final state:`);
    console.log(`  Patients with lastVisit: ${patientsWithLastVisit[0].count}`);
    console.log(`  Patients with dateOfBirth: ${patientsWithDOB[0].count}`);

    console.log(`\n✓ COMPLETE! Patient dates synced from MSSQL`);
  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
