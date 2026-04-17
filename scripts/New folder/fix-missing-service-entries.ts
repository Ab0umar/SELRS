import "dotenv/config";
import mysql from "mysql2/promise";

const SERVICE_CODE_MAP: Record<string, string> = {
  consultant: "1589",
  specialist: "1586",
  lasik: "1501",
  surgery: "1509",
  external: "1613",
};

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await conn.query(`
      SELECT id, patientCode, serviceType, createdAt
      FROM patients p
      WHERE NOT EXISTS (
        SELECT 1 FROM patientServiceEntries pse WHERE pse.patientId = p.id
      )
    `) as any[];

    console.log(`Found ${rows.length} patients without service entries`);

    let inserted = 0, skipped = 0;
    for (const p of rows) {
      const svcType = String(p.serviceType || "consultant").toLowerCase();
      const code = SERVICE_CODE_MAP[svcType] ?? SERVICE_CODE_MAP["consultant"];
      const serviceDate = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null;
      try {
        await conn.query(
          `INSERT INTO patientServiceEntries (patientId, serviceCode, serviceDate, source, sourceRef, createdAt, updatedAt)
           VALUES (?, ?, ?, 'manual', ?, NOW(), NOW())`,
          [p.id, code, serviceDate, `SERVICETYPE_${p.id}`]
        );
        inserted++;
      } catch (err: any) {
        if (err.message?.includes("Duplicate")) skipped++;
        else console.error(`Error for patient ${p.patientCode}:`, err.message?.slice(0, 80));
      }
    }

    console.log(`\nInserted: ${inserted}`);
    console.log(`Skipped (duplicate): ${skipped}`);

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
