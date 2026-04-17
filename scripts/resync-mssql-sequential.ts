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
    console.log("Resyncing patients from MSSQL with sequential IDs...\n");

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
        const errMsg = String(err.message);
        insertErrors.push(`${patientCode}: ${errMsg.slice(0, 50)}`);
      }
    }

    await pool.close();

    console.log(`\n✓ Inserted ${insertedCount} patients with sequential IDs`);

    if (insertErrors.length > 0) {
      console.log(`\nErrors (${insertErrors.length}):`);
      insertErrors.slice(0, 5).forEach(err => console.log(`  ${err}`));
      if (insertErrors.length > 5) {
        console.log(`  ... and ${insertErrors.length - 5} more`);
      }
    }

    // Update AUTO_INCREMENT to be safe
    await mysqlConn.query(`ALTER TABLE patients AUTO_INCREMENT = ${newId}`);

    // Verify
    const [count] = await mysqlConn.query(`SELECT COUNT(*) as total FROM patients`) as any[];
    const [maxId] = await mysqlConn.query(`SELECT MAX(id) as max_id FROM patients`) as any[];

    console.log(`\nFinal state:`);
    console.log(`  Total patients: ${count[0].total}`);
    console.log(`  Max ID: ${maxId[0].max_id}`);
    console.log(`  Sequential: ${count[0].total === maxId[0].max_id ? "✓ YES" : "✗ NO"}`);

    const [samplePatients] = await mysqlConn.query(
      `SELECT id, patientCode, fullName FROM patients ORDER BY id LIMIT 5`
    ) as any[];

    console.log(`\nFirst 5 patients:`);
    samplePatients.forEach((p: any) => {
      console.log(`  ID ${p.id}: ${p.patientCode} (${p.fullName})`);
    });

    console.log(`\n✓ MSSQL resync complete with sequential IDs`);
  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
