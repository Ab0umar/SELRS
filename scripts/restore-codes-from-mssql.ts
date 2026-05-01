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
    console.log("Restoring patient codes from MSSQL PAPATMF...\n");

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

    // Get all patients from MSSQL
    const mssqlResult = await pool.request().query(`
      SELECT PAT_CD, PAT_NM_AR, PAT_NM_EN FROM op2026.dbo.PAPATMF
      ORDER BY PAT_CD
    `);
    const mssqlPatients = Array.isArray(mssqlResult?.recordset) ? mssqlResult.recordset : [];

    console.log(`Found ${mssqlPatients.length} patients in MSSQL`);

    // Build name-to-code map from MSSQL
    const nameToMssqlCode = new Map<string, string>();
    for (const row of mssqlPatients) {
      const code = String(row.PAT_CD).trim();
      const nameAr = String(row.PAT_NM_AR || "").trim().toUpperCase();
      const nameEn = String(row.PAT_NM_EN || "").trim().toUpperCase();
      if (code) {
        if (nameAr) nameToMssqlCode.set(nameAr, code);
        if (nameEn) nameToMssqlCode.set(nameEn, code);
      }
    }

    // Get all MySQL patients
    const [mysqlPatients] = await mysqlConn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id`
    ) as any[];

    console.log(`Found ${mysqlPatients.length} patients in MySQL\n`);

    // Drop unique constraint
    await mysqlConn.query(`ALTER TABLE patients DROP INDEX patients_patientCode_unique`).catch(() => {});

    let restoredCount = 0;
    let unmatchedCount = 0;
    const usedCodes = new Map<string, number>(); // code -> count

    for (const patient of mysqlPatients) {
      const fullName = String(patient.fullName).trim().toUpperCase();
      const mssqlCode = nameToMssqlCode.get(fullName);

      if (mssqlCode) {
        // Track code usage for duplicates
        const usageCount = (usedCodes.get(mssqlCode) || 0) + 1;
        usedCodes.set(mssqlCode, usageCount);

        // For duplicates, append a suffix (V2, V3, etc)
        let codeToUse = mssqlCode;
        if (usageCount > 1) {
          codeToUse = `${mssqlCode}-V${usageCount}`;
        }

        await mysqlConn.query(
          `UPDATE patients SET patientCode = ? WHERE id = ?`,
          [codeToUse, patient.id]
        ).catch((err) => {
          console.error(`Failed to update patient ${patient.id}: ${err.message}`);
        });

        restoredCount++;
        if (restoredCount % 100 === 0) {
          console.log(`  Restored ${restoredCount}/${mysqlPatients.length}...`);
        }
      } else {
        unmatchedCount++;
        if (unmatchedCount <= 5) {
          console.log(`⚠️  No match for: "${patient.fullName}"`);
        }
      }
    }

    // Check for duplicates
    const duplicatesMap = new Map<string, number>();
    for (const [code, count] of usedCodes) {
      if (count > 1) {
        duplicatesMap.set(code, count);
      }
    }

    if (duplicatesMap.size > 0) {
      console.log(`\nDuplicate MSSQL codes found (handled with -V2, -V3, etc):`);
      for (const [code, count] of duplicatesMap) {
        console.log(`  ${code}: ${count} patients`);
      }
    }

    // Re-create unique constraint
    await mysqlConn.query(`ALTER TABLE patients ADD UNIQUE KEY patients_patientCode_unique (patientCode)`);

    console.log(`\n✓ Restored ${restoredCount} patient codes from MSSQL`);
    console.log(`⚠️  Unmatched: ${unmatchedCount} patients`);

    // Verify
    const [sample] = await mysqlConn.query(
      `SELECT id, patientCode, fullName FROM patients LIMIT 10`
    ) as any[];

    console.log(`\nVerification - first 10 patients:`);
    sample.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    await pool.close();
  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
