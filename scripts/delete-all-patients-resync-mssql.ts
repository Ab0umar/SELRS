import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("Checking current patients (no deletion - manual confirmation required)...\n");

    // Check patient count instead of deleting
    const [existingPatients] = await conn.query(`SELECT COUNT(*) as count FROM patients`) as any[];
    console.log(`⚠ Existing patients found: ${existingPatients[0].count} (NOT DELETING)\n`);

    // Disable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    // Re-enable foreign key checks
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    console.log("Fetching patients from MSSQL PAPATMF...");

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

    const mssqlResult = await pool.request().query(`
      SELECT
        PAT_CD,
        PAT_NM_AR,
        PAT_NM_EN,
        TEL1,
        ADDRS,
        AGE,
        GNDR,
        DT,
        BDT
      FROM op2026.dbo.PAPATMF
      ORDER BY PAT_CD
    `);
    const mssqlPatients = Array.isArray(mssqlResult?.recordset) ? mssqlResult.recordset : [];

    console.log(`Found ${mssqlPatients.length} patients in MSSQL\n`);

    // Assign sequential IDs (1, 2, 3...) with original MSSQL patientCode
    let newId = 1;
    let insertedCount = 0;
    const insertErrors: string[] = [];

    for (const row of mssqlPatients) {
      const patientCode = String(row.PAT_CD).trim();
      const fullName = String(row.PAT_NM_AR || row.PAT_NM_EN || "").trim();
      const phone = String(row.TEL1 || "").trim() || null;
      const address = String(row.ADDRS || "").trim() || null;
      const age = Number.isFinite(Number(row.AGE)) ? Number(row.AGE) : null;

      // Parse gender
      let gender = null;
      const genderCode = String(row.GNDR || "").trim();
      if (genderCode === "1" || genderCode.toLowerCase() === "m") gender = "male";
      else if (genderCode === "2" || genderCode.toLowerCase() === "f") gender = "female";

      // Parse dates
      let dateOfBirth = null;
      let lastVisit = null;
      try {
        if (row.BDT) dateOfBirth = new Date(row.BDT).toISOString().split("T")[0];
        if (row.DT) lastVisit = new Date(row.DT).toISOString().split("T")[0];
      } catch (e) {
        // Skip invalid dates
      }

      if (!patientCode || !fullName) continue;

      try {
        // Insert with sequential ID and original MSSQL patientCode
        await conn.query(
          `INSERT INTO patients (id, patientCode, fullName, phone, address, age, gender, dateOfBirth, lastVisit, branch, serviceType, locationType, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            newId,
            patientCode,
            fullName,
            phone,
            address,
            age,
            gender,
            dateOfBirth,
            lastVisit || new Date().toISOString().split("T")[0],
            "examinations",
            "consultant",
            "center",
            "new",
          ]
        );
        insertedCount++;
        newId++;

        if (insertedCount % 100 === 0) {
          console.log(`  Inserted ${insertedCount}/${mssqlPatients.length}...`);
        }
      } catch (err: any) {
        const errMsg = String(err.message);
        insertErrors.push(`${patientCode}: ${errMsg.slice(0, 50)}`);
      }
    }

    await pool.close();

    console.log(`\n✓ Inserted ${insertedCount} patients with sequential IDs\n`);

    if (insertErrors.length > 0) {
      console.log(`Errors (${insertErrors.length}):`);
      insertErrors.slice(0, 5).forEach(err => console.log(`  ${err}`));
      if (insertErrors.length > 5) {
        console.log(`  ... and ${insertErrors.length - 5} more`);
      }
    }

    // Update AUTO_INCREMENT
    await conn.query(`ALTER TABLE patients AUTO_INCREMENT = ${newId}`);

    // Verify
    const [count] = await conn.query(`SELECT COUNT(*) as total FROM patients`) as any[];
    const [maxId] = await conn.query(`SELECT MAX(id) as max_id FROM patients`) as any[];

    console.log(`\nFinal state:`);
    console.log(`  Total patients: ${count[0].total}`);
    console.log(`  Max ID: ${maxId[0].max_id}`);
    console.log(`  Sequential: ${count[0].total === maxId[0].max_id ? "✓ YES" : "✗ NO"}`);

    const [sample] = await conn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id LIMIT 10`
    ) as any[];

    console.log(`\nFirst 10 patients:`);
    sample.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    // Check visit matching
    const [visitsMatched] = await conn.query(
      `SELECT COUNT(*) as count FROM visits WHERE patientId IN (SELECT id FROM patients)`
    ) as any[];
    const [visitsTotal] = await conn.query(`SELECT COUNT(*) as count FROM visits`) as any[];

    const [examsMatched] = await conn.query(
      `SELECT COUNT(*) as count FROM examinations WHERE patientId IN (SELECT id FROM patients)`
    ) as any[];
    const [examsTotal] = await conn.query(`SELECT COUNT(*) as count FROM examinations`) as any[];

    console.log(`\nVisits/Exams status:`);
    console.log(`  Visits: ${visitsMatched[0].count}/${visitsTotal[0].count}`);
    console.log(`  Exams: ${examsMatched[0].count}/${examsTotal[0].count}`);

    console.log(`\n✓ COMPLETE! Resynced from MSSQL with sequential IDs and original patientCodes`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
