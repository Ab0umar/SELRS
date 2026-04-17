import "dotenv/config";
import mysql from "mysql2/promise";
import sql from "mssql";
import { randomUUID } from "crypto";

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
    console.log("=== Sync Missing Doctors from MDTEAM ===\n");

    // Get all doctors from MDTEAM
    const mdteamResult = await pool.request().query(`
      SELECT CODE, PHNM_AR, PHNM_EN
      FROM op2026.dbo.MDTEAM
      ORDER BY CODE
    `);

    const mdteamDoctors = mdteamResult.recordset || [];
    console.log(`Found ${mdteamDoctors.length} doctors in MDTEAM\n`);

    // Get existing doctor codes in MySQL
    const [existingDoctors] = await mysqlConn.query(
      `SELECT code FROM doctors WHERE code IS NOT NULL`
    ) as any[];

    const existingCodes = new Set(
      existingDoctors.map((d: any) => String(d.code).trim().toLowerCase())
    );

    console.log(`Found ${existingCodes.size} doctors in MySQL\n`);

    // Find missing doctors
    const missingDoctors = mdteamDoctors.filter((d: any) => {
      const code = String(d.CODE).trim().toLowerCase();
      return code && !existingCodes.has(code);
    });

    console.log(`Found ${missingDoctors.length} missing doctors\n`);

    if (missingDoctors.length === 0) {
      console.log("✓ No missing doctors");
      await pool.close();
      return;
    }

    // Insert missing doctors
    let inserted = 0;
    for (const doc of missingDoctors) {
      try {
        const id = randomUUID();
        const code = String(doc.CODE).trim().toLowerCase();
        const name = String(doc.PHNM_AR || doc.PHNM_EN || "").trim();

        if (!code || !name) continue;

        await mysqlConn.query(
          `INSERT INTO doctors (id, code, name, isActive, locationType, doctorType, createdAt, updatedAt)
           VALUES (?, ?, ?, 1, 'center', 'internal', NOW(), NOW())`,
          [id, code, name]
        );
        inserted++;

        if (inserted % 50 === 0) {
          console.log(`  Inserted ${inserted}/${missingDoctors.length}...`);
        }
      } catch (err: any) {
        console.error(`  Error for doctor ${doc.CODE}: ${err.message.slice(0, 50)}`);
      }
    }

    console.log(`\n✓ Inserted: ${inserted} new doctors`);

    // Verify
    const [stats] = await mysqlConn.query(
      `SELECT COUNT(*) as total FROM doctors`
    ) as any[];

    console.log(`\nTotal doctors in MySQL: ${stats[0].total}`);
    console.log(`\n✓ COMPLETE! Missing doctors synced from MDTEAM`);

    await pool.close();

  } finally {
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
