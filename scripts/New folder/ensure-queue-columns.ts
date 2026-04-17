import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    // Check if columns exist
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'visits' AND TABLE_SCHEMA = DATABASE()
       AND COLUMN_NAME IN ('queueStatus', 'checkedInAt', 'movedToNextAt', 'movedToClinicAt', 'treatedAt')`
    ) as any[];

    console.log(`Found ${rows.length} queue columns in visits table`);

    if (rows.length < 5) {
      console.log("Adding missing queue columns...");
      const statements = [
        `ALTER TABLE visits ADD COLUMN queueStatus ENUM('checkedIn', 'next', 'clinic', 'treated') DEFAULT 'checkedIn'`,
        `ALTER TABLE visits ADD COLUMN checkedInAt TIMESTAMP NULL`,
        `ALTER TABLE visits ADD COLUMN movedToNextAt TIMESTAMP NULL`,
        `ALTER TABLE visits ADD COLUMN movedToClinicAt TIMESTAMP NULL`,
        `ALTER TABLE visits ADD COLUMN treatedAt TIMESTAMP NULL`,
      ];

      for (const stmt of statements) {
        try {
          await conn.query(stmt);
          console.log("✓ " + stmt.substring(0, 50) + "...");
        } catch (err: any) {
          if (err?.code === "ER_DUP_FIELDNAME") {
            console.log("- Column already exists (skipped)");
          } else {
            console.error("✗ Error:", err?.message);
          }
        }
      }
    } else {
      console.log("✓ All queue columns already exist");
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
