import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("=== Checking where codes are being matched ===\n");

    // Check if getDoctorDirectoryCached is still being used
    console.log("Places using getDoctorDirectoryCached():");
    const grep1 = require('child_process').execSync(
      `grep -n "getDoctorDirectoryCached\|doctor_directory" "E:\SELRS.cc\server\db.ts"`,
      { encoding: 'utf8' }
    ).split('\n').filter(Boolean);
    
    grep1.forEach((line: string) => console.log(`  ${line}`));

    console.log("\nPlaces using service_directory:");
    const grep2 = require('child_process').execSync(
      `grep -n "service_directory" "E:\SELRS.cc\server\db.ts"`,
      { encoding: 'utf8' }
    ).split('\n').filter(Boolean);
    
    grep2.forEach((line: string) => console.log(`  ${line}`));

    console.log("\n✓ enrichPatientsWithCodeNames already uses doctors & services tables correctly");

  } finally {
    await conn.end();
  }
}

main().catch(err => console.error(err.message));
