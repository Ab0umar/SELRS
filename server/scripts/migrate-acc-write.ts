import { config } from "dotenv";
config();
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const db = await getDb();
if (!db) { console.error("no db"); process.exit(1); }

const stmts = [
  // Allow NULL accessId so app-created rows don't need an Access ID
  `ALTER TABLE accLedger   MODIFY accessId INT NULL`,
  `ALTER TABLE accAdvances  MODIFY accessId INT NULL`,
  `ALTER TABLE accLoans     MODIFY accessId INT NULL`,
  `ALTER TABLE accHome      MODIFY accessId INT NULL`,
  `ALTER TABLE accInstapay MODIFY accessId INT NULL`,
  `ALTER TABLE accSaadany   MODIFY accessId INT NULL`,
  // Track which sub-table + row a ledger entry was mirrored to
  `ALTER TABLE accLedger ADD COLUMN IF NOT EXISTS linkedTable VARCHAR(50) NULL`,
  `ALTER TABLE accLedger ADD COLUMN IF NOT EXISTS linkedId    INT NULL`,
];

for (const s of stmts) {
  try {
    await db.execute(sql.raw(s));
    console.log("OK:", s.slice(0, 60));
  } catch (e: any) {
    // column already exists / already nullable — safe to skip
    if (e.message?.includes("Duplicate column") || e.message?.includes("already exists")) {
      console.log("skip (already done):", s.slice(0, 60));
    } else {
      console.error("FAIL:", s.slice(0, 60), "—", e.message);
    }
  }
}

console.log("\nDone.");
process.exit(0);
