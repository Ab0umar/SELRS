import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

config();

async function addLocationColumn() {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    console.log("[Setup] Adding locationType column to services table...");

    // Execute raw SQL to add the column
    await db.execute(sql.raw("ALTER TABLE services ADD COLUMN locationType VARCHAR(50)"));
    console.log("[Setup] ✓ Column added successfully");

    // Add the index
    await db.execute(sql.raw("ALTER TABLE services ADD INDEX idx_service_location (locationType)"));
    console.log("[Setup] ✓ Index created successfully");

    console.log("[Setup] Done!");
  } catch (err: any) {
    // If column already exists, that's fine
    if (err.message?.includes("Duplicate column") || err.cause?.sqlMessage?.includes("Duplicate column")) {
      console.log("[Setup] Column already exists, skipping");
    } else {
      console.error("[Setup] Error:", err);
      process.exit(1);
    }
  }

  process.exit(0);
}

addLocationColumn();
