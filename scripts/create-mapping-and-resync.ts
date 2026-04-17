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
    console.log("=== STEP 1: Create Mapping Table ===\n");

    // Create mapping table from old visits/exams
    await mysqlConn.query(`DROP TABLE IF EXISTS patient_id_mapping`);
    await mysqlConn.query(`
      CREATE TABLE patient_id_mapping (
        old_id INT PRIMARY KEY,
        patientCode VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all unique old patientIds from visits and exams
    const [oldIds] = await mysqlConn.query(`
      SELECT DISTINCT patientId FROM (
        SELECT DISTINCT patientId FROM visits
        UNION
        SELECT DISTINCT patientId FROM examinations
      ) t
      ORDER BY patientId
    `) as any[];

    console.log(`Found ${oldIds.length} unique patient IDs in visits/exams`);

    // For mapping, we'll use the old ID as a placeholder for now
    // We'll update it after resync
    let insertCount = 0;
    for (const row of oldIds) {
      const oldId = row.patientId;
      const tempCode = `TEMP_${oldId}`;
      await mysqlConn.query(
        `INSERT INTO patient_id_mapping (old_id, patientCode) VALUES (?, ?)`,
        [oldId, tempCode]
      );
      insertCount++;
      if (insertCount % 100 === 0) {
        console.log(`  Inserted ${insertCount}/${oldIds.length}...`);
      }
    }

    console.log(`✓ Created mapping table with ${insertCount} entries\n`);

    console.log("=== STEP 2: Resync from MSSQL ===\n");

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

    console.log("Fetching patients from MSSQL PAPATMF...");
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

    // Manually assign sequential IDs (1, 2, 3...) without relying on AUTO_INCREMENT
    let newId = 1;
    let insertedCount = 0;

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
        // Manually insert with explicit ID
        await mysqlConn.query(
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
        console.error(`Error inserting patient ${patientCode}:`, err.message);
      }
    }

    await pool.close();

    console.log(`\n✓ Inserted ${insertedCount} patients with sequential IDs`);

    // Update AUTO_INCREMENT to be safe
    await mysqlConn.query(`ALTER TABLE patients AUTO_INCREMENT = ${newId}`);

    // Verify
    const [count] = await mysqlConn.query(`SELECT COUNT(*) as total FROM patients`) as any[];
    const [maxId] = await mysqlConn.query(`SELECT MAX(id) as max_id FROM patients`) as any[];

    console.log(`Total patients: ${count[0].total}`);
    console.log(`Max ID: ${maxId[0].max_id}`);
    console.log(`Sequential: ${count[0].total === maxId[0].max_id ? "✓ YES" : "✗ NO"}`);

    const [samplePatients] = await mysqlConn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id LIMIT 10`
    ) as any[];

    console.log(`\nFirst 10 patients:`);
    samplePatients.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    console.log(`\n✓ Resync complete - ready to update visits/exams`);
  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
