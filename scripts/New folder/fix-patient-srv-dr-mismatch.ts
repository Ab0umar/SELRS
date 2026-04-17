import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Fixing Patient Service/Location/Doctor Mismatches ===\n");

    // Get each patient's primary service entry (most recent by serviceDate, then updatedAt)
    // and the matching service's locationType and serviceType from the services table
    const [rows] = await conn.query(`
      SELECT
        p.id AS patientId,
        p.locationType AS curPatLoc,
        p.serviceType AS curPatType,
        s.locationType AS srvLoc,
        s.serviceType AS srvType,
        pse.serviceCode,
        d.id AS doctorId,
        d.locationType AS doctorLoc
      FROM patients p
      -- Primary service entry: prefer mssql source, most recent date
      JOIN patientServiceEntries pse ON pse.id = (
        SELECT id FROM patientServiceEntries
        WHERE patientId = p.id
        ORDER BY
          CASE WHEN source = 'mssql' THEN 0 ELSE 1 END,
          COALESCE(serviceDate, DATE(updatedAt)) DESC,
          id DESC
        LIMIT 1
      )
      JOIN services s ON LOWER(TRIM(pse.serviceCode)) = LOWER(TRIM(s.code))
      LEFT JOIN doctors d ON p.doctorId = d.id
      WHERE
        p.locationType != s.locationType
        OR p.serviceType != s.serviceType
        OR (p.doctorId IS NOT NULL AND d.locationType != s.locationType)
    `) as any[];

    console.log(`Found ${rows.length} patients with mismatches\n`);

    let fixed = 0, skipped = 0;
    for (const r of rows as any[]) {
      try {
        await conn.query(
          `UPDATE patients SET locationType = ?, serviceType = ? WHERE id = ?`,
          [r.srvLoc, r.srvType, r.patientId]
        );
        fixed++;
      } catch (e: any) {
        console.error(`Error for patient ${r.patientId}:`, e.message?.slice(0, 60));
        skipped++;
      }
    }

    console.log(`Fixed: ${fixed} patients`);
    console.log(`Skipped: ${skipped}`);

    // Verify
    const [after] = await conn.query(`
      SELECT
        p.locationType AS patLoc,
        s.locationType AS srvLoc,
        COUNT(*) as cnt
      FROM patients p
      JOIN patientServiceEntries pse ON pse.id = (
        SELECT id FROM patientServiceEntries
        WHERE patientId = p.id
        ORDER BY CASE WHEN source='mssql' THEN 0 ELSE 1 END,
          COALESCE(serviceDate, DATE(updatedAt)) DESC, id DESC
        LIMIT 1
      )
      JOIN services s ON LOWER(TRIM(pse.serviceCode)) = LOWER(TRIM(s.code))
      GROUP BY p.locationType, s.locationType
      ORDER BY cnt DESC
    `) as any[];

    console.log("\n=== After Fix: Patient vs Service Location ===");
    (after as any[]).forEach(r => {
      const ok = r.patLoc === r.srvLoc ? "✓" : "⚠";
      console.log(`  ${ok}  patient=${r.patLoc}, service=${r.srvLoc}: ${r.cnt}`);
    });

  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
