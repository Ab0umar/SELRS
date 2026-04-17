import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("=== systemsettings table ===\n");

    const [results] = await conn.query(
      `SELECT * FROM selrs26.systemsettings`
    ) as any[];

    console.log(`Found ${results.length} records:\n`);

    results.forEach((row: any, idx: number) => {
      console.log(`\n[${idx + 1}]`);
      Object.entries(row).forEach(([key, value]: [string, any]) => {
        if (typeof value === 'string' && value.length > 200) {
          console.log(`  ${key}: ${value.slice(0, 200)}...`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    });

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
