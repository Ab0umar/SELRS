import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Checking visitId integrity in examinations...\n");

    // Get sample exams with their visitIds
    const [examSample] = await conn.query(`
      SELECT id, visitId, patientId FROM examinations LIMIT 20
    `) as any[];

    console.log(`Sample exams and their visitIds:`);
    examSample.forEach((e: any) => {
      console.log(`  Exam ${e.id}: visitId=${e.visitId}, patientId=${e.patientId}`);
    });

    // Check which visitIds exist in visits table
    const [visitIds] = await conn.query(`
      SELECT DISTINCT visitId FROM examinations ORDER BY visitId LIMIT 20
    `) as any[];

    console.log(`\nDistinct visitIds from exams (first 20):`);
    visitIds.forEach((row: any) => {
      console.log(`  visitId: ${row.visitId}`);
    });

    // Check if these visitIds exist in visits table
    console.log(`\nChecking if visitIds exist in visits table:`);

    for (const row of visitIds.slice(0, 5)) {
      const [match] = await conn.query(`
        SELECT id FROM visits WHERE id = ?
      `, [row.visitId]) as any[];

      console.log(`  visitId ${row.visitId}: ${match.length > 0 ? '✓ EXISTS' : '✗ MISSING'}`);
    }

    // Count mismatches
    const [mismatches] = await conn.query(`
      SELECT COUNT(*) as count FROM examinations e
      WHERE e.visitId NOT IN (SELECT id FROM visits)
    `) as any[];

    console.log(`\nTotal exams with missing visitId (not in visits): ${mismatches[0].count}`);

    // Get list of visitIds used by exams
    const [usedVisitIds] = await conn.query(`
      SELECT DISTINCT visitId FROM examinations ORDER BY visitId
    `) as any[];

    console.log(`\nTotal unique visitIds used by exams: ${usedVisitIds.length}`);

    // Get list of visit IDs that exist
    const [existingVisits] = await conn.query(`
      SELECT id FROM visits ORDER BY id
    `) as any[];

    console.log(`Total visit IDs in visits table: ${existingVisits.length}`);

    // Find visitIds from exams that are NOT in visits
    const visitIdSet = new Set(usedVisitIds.map((r: any) => r.visitId));
    const visitSet = new Set(existingVisits.map((v: any) => v.id));

    const orphanedVisitIds = Array.from(visitIdSet).filter((vid: any) => !visitSet.has(vid));

    console.log(`\nOrphaned visitIds (in exams but not in visits): ${orphanedVisitIds.length}`);
    if (orphanedVisitIds.length > 0 && orphanedVisitIds.length <= 20) {
      orphanedVisitIds.forEach((vid) => {
        console.log(`  visitId: ${vid}`);
      });
    } else if (orphanedVisitIds.length > 20) {
      orphanedVisitIds.slice(0, 10).forEach((vid) => {
        console.log(`  visitId: ${vid}`);
      });
      console.log(`  ... and ${orphanedVisitIds.length - 10} more`);
    }

    console.log(`\n✓ Analysis complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
