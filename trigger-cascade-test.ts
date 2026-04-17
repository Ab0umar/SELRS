import "dotenv/config";
import mysql from "mysql2/promise";
import { getDb } from "./server/db";

async function main() {
  try {
    console.log("=== Testing Cascade Trigger ===\n");

    const conn = await mysql.createConnection(process.env.DATABASE_URL!);
    const today = "2026-04-12";

    // Create fresh test data
    const testPatientCode = "CASC-" + Date.now();
    const [patientRes] = await conn.query(`
      INSERT INTO patients (patientCode, fullName, createdAt, updatedAt, locationType)
      VALUES (?, ?, ?, ?, 'center')
    `, [testPatientCode, "Cascade Trigger Test", today + " 10:00:00", today + " 10:00:00"]) as any[];

    const patientId = patientRes.insertId;

    // Create test visits
    const baseTime = today + " 10:00:00";
    
    // Visit 1: checkedIn
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, createdAt, updatedAt)
      VALUES (?, ?, 'checkedIn', ?, NOW(), NOW())
    `, [patientId, baseTime, baseTime]);

    // Visit 2: next
    const time2 = today + " 10:05:00";
    const time2Next = today + " 10:10:00";
    await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, createdAt, updatedAt)
      VALUES (?, ?, 'next', ?, ?, NOW(), NOW())
    `, [patientId, time2, time2, time2Next]);

    // Visit 3: clinic
    const time3 = today + " 10:10:00";
    const time3Next = today + " 10:15:00";
    const time3Clinic = today + " 10:25:00";
    const [visit3Res] = await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, movedToClinicAt, createdAt, updatedAt)
      VALUES (?, ?, 'clinic', ?, ?, ?, NOW(), NOW())
    `, [patientId, time3, time3, time3Next, time3Clinic]) as any[];

    // Visit 4: treated (this will trigger the cascade)
    const time4 = today + " 10:15:00";
    const time4Next = today + " 10:20:00";
    const time4Clinic = today + " 10:30:00";
    const [visit4Res] = await conn.query(`
      INSERT INTO visits (patientId, visitDate, queueStatus, checkedInAt, movedToNextAt, movedToClinicAt, treatedAt, createdAt, updatedAt)
      VALUES (?, ?, 'treated', ?, ?, ?, ?, NOW(), NOW())
    `, [patientId, time4, time4, time4Next, time4Clinic, time4Clinic]) as any[];

    const visit4Id = visit4Res.insertId;

    console.log(`Created patient ${testPatientCode} (ID: ${patientId}) with 4 visits`);
    console.log(`Visit 4 ID: ${visit4Id} (treated status)\n`);

    // Show before state
    console.log("BEFORE cascade:");
    const [beforeVisits] = await conn.query(`
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

    beforeVisits.forEach((v: any) => {
      console.log(`  ${v.id}: ${v.queueStatus.padEnd(10)} | next:${(v.moved_to_next || 'null').padEnd(8)} | clinic:${(v.moved_to_clinic || 'null').padEnd(8)} | treated:${v.treated || 'null'}`);
    });

    // Now call cascadeQueueStatus directly
    console.log("\nCalling cascadeQueueStatus...\n");
    const db = await getDb();
    if (db) {
      // Import cascade function
      const { cascadeQueueStatus } = require("./server/db");
      await cascadeQueueStatus(patientId, today);
      console.log("Cascade completed!\n");
    }

    // Show after state
    console.log("AFTER cascade:");
    const [afterVisits] = await conn.query(`
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

    afterVisits.forEach((v: any) => {
      console.log(`  ${v.id}: ${v.queueStatus.padEnd(10)} | next:${(v.moved_to_next || 'null').padEnd(8)} | clinic:${(v.moved_to_clinic || 'null').padEnd(8)} | treated:${v.treated || 'null'}`);
    });

    // Verify the cascade worked correctly
    console.log("\nVerification:");
    const visit1After = afterVisits.find((v: any) => v.id === beforeVisits[0].id);
    const visit2After = afterVisits.find((v: any) => v.id === beforeVisits[1].id);
    const visit3After = afterVisits.find((v: any) => v.id === beforeVisits[2].id);

    if (visit1After.queueStatus === "treated") {
      console.log("  ✓ Visit 1 cascaded to treated");
    } else {
      console.log("  ✗ Visit 1 NOT cascaded (status: " + visit1After.queueStatus + ")");
    }

    if (visit2After.queueStatus === "treated") {
      console.log("  ✓ Visit 2 cascaded to treated");
    } else {
      console.log("  ✗ Visit 2 NOT cascaded");
    }

    if (visit3After.queueStatus === "treated") {
      console.log("  ✓ Visit 3 cascaded to treated");
    } else {
      console.log("  ✗ Visit 3 NOT cascaded");
    }

    // Clean up
    await conn.query("DELETE FROM visits WHERE patientId = ?", [patientId]);
    await conn.query("DELETE FROM patients WHERE id = ?", [patientId]);
    
    await conn.end();

  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
