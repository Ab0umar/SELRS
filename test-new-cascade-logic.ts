import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Testing NEW Cascade Logic with Fresh Data ===\n");

    const today = new Date().toISOString().split('T')[0];
    const testPatientCode = "CASCADE-TEST-" + Date.now();

    // Create a patient with today's createdAt
    const [patientRes] = await conn.query(`
      INSERT INTO patients (patientCode, fullName, createdAt, updatedAt, locationType)
      VALUES (?, ?, NOW(), NOW(), 'center')
    `, [testPatientCode, "Cascade Test Patient"]) as any[];

    const patientId = patientRes.insertId;
    console.log(`Created patient ${testPatientCode} (ID: ${patientId})\n`);

    // Create visits with specific times
    const baseTime = new Date("2026-04-12T10:00:00");
    
    // Visit 1: checkedIn (should cascade to next -> clinic -> treated)
    const visit1CheckedIn = new Date(baseTime);
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, createdAt, updatedAt)
      VALUES (?, ?, 'checkedIn', ?, NOW(), NOW())
    `, [patientId, visit1CheckedIn, visit1CheckedIn]);

    // Visit 2: next (should cascade to clinic -> treated)
    const visit2CheckedIn = new Date(baseTime.getTime() + 300000); // 5 min later
    const visit2MovedToNext = new Date(visit2CheckedIn.getTime() + 300000); // 5 min after checkedIn
    const [visit2Res] = await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, createdAt, updatedAt)
      VALUES (?, ?, 'next', ?, ?, NOW(), NOW())
    `, [patientId, visit2CheckedIn, visit2CheckedIn, visit2MovedToNext]) as any[];

    // Visit 3: clinic (should cascade to treated)
    const visit3CheckedIn = new Date(baseTime.getTime() + 600000); // 10 min later
    const visit3MovedToNext = new Date(visit3CheckedIn.getTime() + 300000); // 5 min after checkedIn
    const visit3MovedToClinic = new Date(visit3MovedToNext.getTime() + 600000); // 10 min after next
    const [visit3Res] = await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, movedToClinicAt, createdAt, updatedAt)
      VALUES (?, ?, 'clinic', ?, ?, ?, NOW(), NOW())
    `, [patientId, visit3CheckedIn, visit3CheckedIn, visit3MovedToNext, visit3MovedToClinic]) as any[];

    // Visit 4: This will trigger the cascade (mark as treated)
    const visit4CheckedIn = new Date(baseTime.getTime() + 900000); // 15 min later
    const visit4MovedToNext = new Date(visit4CheckedIn.getTime() + 300000);
    const visit4MovedToClinic = new Date(visit4MovedToNext.getTime() + 600000);
    const [visit4Res] = await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, movedToClinicAt, treatedAt, createdAt, updatedAt)
      VALUES (?, ?, 'treated', ?, ?, ?, ?, NOW(), NOW())
    `, [patientId, visit4CheckedIn, visit4CheckedIn, visit4MovedToNext, visit4MovedToClinic, visit4MovedToClinic]) as any[];

    console.log("Created 4 test visits:");
    console.log("  Visit 1: checkedIn (10:00:00)");
    console.log("  Visit 2: next (10:05:00 checkedIn, 10:10:00 next)");
    console.log("  Visit 3: clinic (10:10:00 checkedIn, 10:15:00 next, 10:25:00 clinic)");
    console.log("  Visit 4: treated (10:15:00 checkedIn) - WILL TRIGGER CASCADE\n");

    // Show visits BEFORE cascade
    console.log("BEFORE Cascade:");
    const [visitsBefore] = await conn.query(`
      SELECT
        v.id,
        v.queueStatus,
        TIME(v.checkedInAt) as checked_in,
        TIME(v.movedToNextAt) as moved_to_next,
        TIME(v.movedToClinicAt) as moved_to_clinic,
        TIME(v.treatedAt) as treated
      FROM visits v
      WHERE v.patientId = ?
      ORDER BY v.visitDate
    `, [patientId]) as any[];

    visitsBefore.forEach((v: any) => {
      console.log(`  Visit ${v.id} (${v.queueStatus}): checked_in=${v.checked_in}, next=${v.moved_to_next}, clinic=${v.moved_to_clinic}, treated=${v.treated}`);
    });

    // Clean up
    await conn.query("DELETE FROM visits WHERE patientId = ?", [patientId]);
    await conn.query("DELETE FROM patients WHERE id = ?", [patientId]);
    
    console.log(`\n✓ Test data created successfully`);
    console.log(`\nTo test the cascade, the application needs to call updateVisitQueueStatus with queueStatus='treated'`);
    console.log(`This will trigger cascadeQueueStatus which should cascade the other visits correctly.`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
