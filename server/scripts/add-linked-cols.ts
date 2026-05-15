import { config } from "dotenv";
config();
import { sql } from "drizzle-orm";
import { getDb } from "../db";
const db = await getDb();
if (!db) { process.exit(1); }
for (const s of [
  "ALTER TABLE accLedger ADD COLUMN linkedTable VARCHAR(50) NULL",
  "ALTER TABLE accLedger ADD COLUMN linkedId INT NULL",
]) {
  try { await db.execute(sql.raw(s)); console.log("OK:", s.slice(0, 55)); }
  catch (e: any) { console.log("skip:", e.message?.slice(0, 80)); }
}
process.exit(0);
