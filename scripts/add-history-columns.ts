import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    process.exit(1);
  }

  const columns = [
    "thyroid",
    "autoimmune",
    "familyKeratoconus",
    "glaucoma"
  ];

  for (const col of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE \`medicalHistoryChecklist\` ADD COLUMN \`${col}\` tinyint(1) DEFAULT 0`));
      console.log(`Added column ${col}`);
    } catch (e: any) {
      if (e.message?.includes("Duplicate column name")) {
        console.log(`Column ${col} already exists`);
      } else {
        console.error(`Error adding column ${col}:`, e.message);
      }
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

main();
