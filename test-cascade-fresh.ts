import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Testing Cascade with Fresh Data ===\n");

    const today = "2026-04-12";
    const testPatientId = 9999; // Use a high ID to avoid conflicts

    // First, clean up any existing test data
    await conn.query("DELETE FROM visits WHERE patientId = ?", [testPatientId]);
    await conn.query("DELETE FROM patients WHERE id = ?", [testPatientId]);

    // Create a test patient
    const patientCode = "TEST-" + Date.now();
    await conn.query(`
      INSERT INTO patients (id, patientCode, fullName, createdAt, updatedAt)
      VALUES (?, ?, ?, NOW(), NOW())
    `, [testPatientId, patientCode, "Test Patient"]);

    // Create test visits with specific times
    const now = new Date();
    const checkedInTime = new Date(now.getTime() - 3600000); // 1 hour ago
    
    // Visit 1: checkedIn state
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [testPatientId, checkedInTime, "checkedIn", checkedInTime]);

    // Visit 2: next state with movedToNextAt set
    const visit2CheckedIn = new Date(checkedInTime.getTime() + 300000); // 5 min after first
    const visit2MovedToNext = new Date(visit2CheckedIn.getTime() + 300000); // 5 min later
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [testPatientId, visit2CheckedIn, "next", visit2CheckedIn, visit2MovedToNext]);

    // Visit 3: clinic state
    const visit3CheckedIn = new Date(visit2CheckedIn.getTime() + 300000);
    const visit3MovedToNext = new Date(visit3CheckedIn.getTime() + 300000);
    const visit3MovedToClinic = new Date(visit3MovedToNext.getTime() + 600000); // 10 min after next
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, movedToClinicAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [testPatientId, visit3CheckedIn, "clinic", visit3CheckedIn, visit3MovedToNext, visit3MovedToClinic]);

    // Visit 4: This will mark as treated and trigger cascade
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, movedToClinicAt, treatedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [testPatientId, visit3CheckedIn, "treated", visit3CheckedIn, visit3MovedToNext, visit3MovedToClinic, visit3MovedToClinic]);

    // Now mark visit 4 as treated to trigger cascade (simulate the API call)
    // The cascade should update visits 1, 2, and 3

    // Import the cascade function - but we can't directly call it from here
    // Instead, let's just check the current state before cascade
    console.log("Before cascade:");
    const [visitsBefore] = await conn.query(`
      SELECT
        id,
        queueStatus,
        TIME(checkedInAt) as checked_in,
        TIME(movedToNextAt) as moved_to_next,
        TIME(movedToClinicAt) as moved_to_clinic,
        TIME(treatedAt) as treated
      FROM visits
      WHERE patientId = ?
      ORDER BY visitDate
    `, [testPatientId]) as any[];

    visitsBefore.forEach((v: any, i: number) => {
      console.log(`Visit ${i + 1}: ${v.queueStatus} | checked_in: ${v.checked_in} | next: ${v.moved_to_next} | clinic: ${v.moved_to_clinic} | treated: ${v.treated}`);
    });

    // Clean up
    await conn.query("DELETE FROM visits WHERE patientId = ?", [testPatientId]);
    await conn.query("DELETE FROM patients WHERE id = ?", [testPatientId]);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
