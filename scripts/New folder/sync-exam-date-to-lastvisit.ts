import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Update تاريخ الكشف/الفحص to lastVisit ===\n");

    // Get patients with lastVisit and check current examination dates
    const [patients] = await conn.query(`
      SELECT 
        id,
        patientCode,
        fullName,
        lastVisit
      FROM patients
      WHERE lastVisit IS NOT NULL AND id BETWEEN 1 AND 1089
      ORDER BY id
      LIMIT 10
    `) as any[];

    console.log(`Found ${patients.length} patients with lastVisit dates\n`);
    
    patients.forEach((p: any) => {
      console.log(`Patient ${p.id} (${p.patientCode}): lastVisit = ${p.lastVisit}`);
    });

    // Check current examination records
    console.log("\n--- Checking current examination dates ---\n");
    
    const [exams] = await conn.query(`
      SELECT 
        e.id,
        e.patientId,
        p.patientCode,
        p.lastVisit,
        e.createdAt,
        e.examinationDate
      FROM examinations e
      INNER JOIN patients p ON e.patientId = p.id
      WHERE e.patientId BETWEEN 1 AND 1089
      ORDER BY p.id
      LIMIT 10
    `) as any[];

    console.log(`Found ${exams.length} examination records\n`);
    exams.forEach((e: any) => {
      console.log(`Exam ${e.id} for patient ${e.patientCode}:`);
      console.log(`  examinationDate: ${e.examinationDate}`);
      console.log(`  createdAt: ${e.createdAt}`);
      console.log(`  patient lastVisit: ${e.lastVisit}`);
    });

    // Check visits with examination date
    console.log("\n--- Checking visit dates ---\n");
    
    const [visits] = await conn.query(`
      SELECT 
        v.id,
        v.patientId,
        p.patientCode,
        p.lastVisit,
        v.visitDate,
        v.createdAt
      FROM visits v
      INNER JOIN patients p ON v.patientId = p.id
      WHERE v.patientId BETWEEN 1 AND 1089
      ORDER BY p.id
      LIMIT 10
    `) as any[];

    console.log(`Found ${visits.length} visit records\n`);
    visits.forEach((v: any) => {
      console.log(`Visit ${v.id} for patient ${v.patientCode}:`);
      console.log(`  visitDate: ${v.visitDate}`);
      console.log(`  patient lastVisit: ${v.lastVisit}`);
    });

    console.log("\n--- Ready to sync ---\n");
    console.log("Which field should be updated to lastVisit?");
    console.log("1. examinations.examinationDate");
    console.log("2. visits.visitDate");
    console.log("3. Both");

  } finally {
    await conn.end();
  }
}
main().catch(console.error);
