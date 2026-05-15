import { config } from "dotenv";
config();
import { sql } from "drizzle-orm";
import { getDb } from "../db";
const db = await getDb();
if (!db) { console.error("no db"); process.exit(1); }
const [rows] = await db.execute(sql.raw("SELECT accessId, name, entity, isPaid FROM accCategories ORDER BY accessId")) as any;
for (const r of rows as any[]) {
  console.log(`[${r.accessId}] name="${r.name}" entity="${r.entity}" isPaid=${r.isPaid}`);
}
process.exit(0);
