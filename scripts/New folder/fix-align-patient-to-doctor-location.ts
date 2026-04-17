import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    // Update patient locationType to match their assigned doctor's locationType
    const [result] = await conn.query(`
      UPDATE patients p
      JOIN doctors d ON p.doctorId = d.id
      SET p.locationType = d.locationType
      WHERE p.locationType != d.locationType
    `) as any[];

    console.log(`Fixed: ${result.affectedRows} patients aligned to their doctor's locationType`);

    // Verify
    const [check] = await conn.query(`
      SELECT p.locationType AS patLoc, d.locationType AS drLoc, COUNT(*) as cnt
      FROM patients p JOIN doctors d ON p.doctorId = d.id
      GROUP BY p.locationType, d.locationType ORDER BY cnt DESC
    `) as any[];

    console.log("\n=== After Fix ===");
    (check as any[]).forEach(r => {
      const ok = r.patLoc === r.drLoc ? "✓" : "⚠";
      console.log(`  ${ok}  patient=${r.patLoc}, doctor=${r.drLoc}: ${r.cnt}`);
    });

    const [noDoc] = await conn.query("SELECT COUNT(*) as n FROM patients WHERE doctorId IS NULL") as any[];
    console.log(`\nPatients without doctor: ${(noDoc as any[])[0].n}`);
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("Failed:", e.message); process.exit(1); });
