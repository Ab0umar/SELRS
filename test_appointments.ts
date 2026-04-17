import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { appointments, patients } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function test() {
  const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "selrs",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  const db = drizzle(pool);

  console.log("\n=== APPOINTMENT DATA CHECK ===\n");

  // Check raw appointments
  const appts = await db.select().from(appointments).limit(5);
  console.log("First 5 appointments:");
  console.log(JSON.stringify(appts, null, 2));

  // Check if patients exist
  const patientCount = await db.select({ count: appointments.patientId }).from(appointments).limit(1);
  console.log("\nTotal appointments:", appts.length);
  
  // Check if there are any patients with matching IDs
  if (appts.length > 0) {
    const firstPatientId = appts[0].patientId;
    const patient = await db.select().from(patients).where(eq(patients.id, firstPatientId!));
    console.log(`\nLooking for patient with ID ${firstPatientId}:`);
    console.log(patient.length > 0 ? JSON.stringify(patient[0], null, 2) : "NOT FOUND");
  }

  await pool.end();
}

test().catch(console.error);
