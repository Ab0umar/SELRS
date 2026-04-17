import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    // Step 1: Delete wrong entries created from serviceType (sheet type, not real service)
    const [del] = await conn.query(
      `DELETE FROM patientServiceEntries WHERE sourceRef LIKE 'SERVICETYPE_%'`
    ) as any[];
    console.log(`Deleted ${del.affectedRows} wrong entries (based on sheet type)`);

    // Step 2: Find patients with serviceCode but no service entry
    const [rows] = await conn.query(`
      SELECT id, patientCode, serviceCode, createdAt
      FROM patients p
      WHERE serviceCode IS NOT NULL AND serviceCode != ''
        AND NOT EXISTS (
          SELECT 1 FROM patientServiceEntries pse WHERE pse.patientId = p.id
        )
    `) as any[];
    console.log(`Patients with serviceCode but no entry: ${rows.length}`);

    let inserted = 0, skipped = 0;
    for (const p of rows as any[]) {
      const serviceDate = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null;
      try {
        await conn.query(
          `INSERT INTO patientServiceEntries (patientId, serviceCode, serviceDate, source, sourceRef, createdAt, updatedAt)
           VALUES (?, ?, ?, 'mssql', ?, NOW(), NOW())`,
          [p.id, String(p.serviceCode).trim(), serviceDate, `PAT_SRV_${p.id}`]
        );
        inserted++;
      } catch (err: any) {
        if (err.message?.includes("Duplicate")) skipped++;
        else console.error(`Error for ${p.patientCode}:`, err.message?.slice(0, 80));
      }
    }
    console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);

    // Step 3: Patients still without any entry
    const [noEntry] = await conn.query(`
      SELECT COUNT(*) as n FROM patients p
      WHERE NOT EXISTS (
        SELECT 1 FROM patientServiceEntries pse WHERE pse.patientId = p.id
      )
    `) as any[];
    console.log(`Patients still without service entries: ${(noEntry as any[])[0].n}`);

    const [final] = await conn.query(`SELECT COUNT(DISTINCT patientId) as n FROM patientServiceEntries`) as any[];
    const [total] = await conn.query(`SELECT COUNT(*) as n FROM patients`) as any[];
    console.log(`\nPatients with services: ${(final as any[])[0].n} / ${(total as any[])[0].n}`);
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
