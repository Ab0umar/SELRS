import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Updating visit dates for all visits...");

    // Get all visits with their patient data
    const [visits] = await conn.query(`
      SELECT v.id, v.patientId, p.lastVisit, p.createdAt, p.patientCode, p.fullName
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      ORDER BY p.patientCode, v.id
    `) as any[];

    console.log(`Found ${visits.length} visits to update`);

    let updatedCount = 0;
    const patientVisitMap = new Map<number, any[]>();

    // Group visits by patient
    for (const visit of visits) {
      if (!patientVisitMap.has(visit.patientId)) {
        patientVisitMap.set(visit.patientId, []);
      }
      patientVisitMap.get(visit.patientId)!.push(visit);
    }

    // Update each visit
    let skipped = 0;
    for (const visit of visits) {
      const patientVisits = patientVisitMap.get(visit.patientId)!;
      const visitIndex = patientVisits.findIndex(v => v.id === visit.id);
      const visitLabel = `V${visitIndex + 1}`;

      // Skip if no lastVisit date available
      if (!visit.lastVisit) {
        skipped++;
        continue;
      }

      // Update visit with:
      // visitDate = patient.lastVisit (تاریخ الفحص/الكشف - examination date)
      // checkedInAt = patient.createdAt (تاریخ الفحص/الكشف - for sorting)
      // createdAt = patient.createdAt (actual creation date from MSSQL)
      const [result] = await conn.query(
        `UPDATE visits
         SET visitDate = ?,
             checkedInAt = ?,
             createdAt = ?,
             updatedAt = NOW()
         WHERE id = ?`,
        [
          visit.lastVisit,
          visit.createdAt,
          visit.createdAt,
          visit.id
        ]
      ) as any[];

      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`  Updated ${updatedCount}/${visits.length} visits...`);
      }
    }

    console.log(`\n✓ Updated ${updatedCount} visits`);
    console.log(`⚠ Skipped: ${skipped} visits (no lastVisit date)`);

    // Verify the updates
    const [counts] = await conn.query(
      `SELECT COUNT(*) as total FROM visits WHERE visitDate IS NOT NULL`
    ) as any[];

    const [totalCount] = await conn.query(
      `SELECT COUNT(*) as total FROM visits`
    ) as any[];

    console.log(`\nVisits with visitDate: ${(counts as any)[0].total}`);
    console.log(`Total visits in database: ${(totalCount as any)[0].total}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
