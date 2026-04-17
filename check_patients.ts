import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { patients, visits } from "./drizzle/schema";
import { eq, sql } from "drizzle-orm";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "selrs",
  waitForConnections: true,
  connectionLimit: 1,
});

async function check() {
  const db = drizzle(pool);

  // Get patients with null fullName
  const patientsWithoutName = await db
    .select({ id: patients.id, patientCode: patients.patientCode, fullName: patients.fullName, lastVisit: patients.lastVisit })
    .from(patients)
    .where(sql`${patients.fullName} IS NULL OR ${patients.fullName} = ''`)
    .limit(10);

  console.log("\n=== PATIENTS WITHOUT FULLNAME ===");
  console.log(JSON.stringify(patientsWithoutName, null, 2));

  // Check visits for today
  const todayVisits = await db
    .select({ 
      patientId: visits.patientId,
      visitDate: visits.visitDate,
      visitType: visits.visitType 
    })
    .from(visits)
    .where(sql`DATE(${visits.visitDate}) = '2026-04-03'`)
    .limit(10);

  console.log("\n=== VISITS FOR 2026-04-03 ===");
  console.log(JSON.stringify(todayVisits, null, 2));

  await pool.end();
}

check().catch(console.error);
