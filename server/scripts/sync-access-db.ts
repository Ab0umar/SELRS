/**
 * Syncs Access DB (الخزنه.accdb) → MySQL acc* tables.
 * Run manually or on a schedule.
 *
 * Usage:
 *   npx tsx server/scripts/sync-access-db.ts
 *   npx tsx server/scripts/sync-access-db.ts --db "C:\path\to\other.accdb"
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config();

const DEFAULT_DB_PATH = "C:\\Users\\SELRS\\OneDrive\\Documents\\SELRS\\الخزنه.accdb";
const DUMP_SCRIPT = path.resolve(__dirname, "access-dump.ps1");

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
}

const TABLES = {
  ledger:     "All",
  advances:   "سلف",
  loans:      "القرض",
  home:       "البيت",
  instapay:   "انستا",
  employees:  "الموظفين",
  categories: "التصنيف",
  saadany:    "د_السعدني",
};

function dumpAccess(dbPath: string): Record<string, any[]> {
  // Pass table names as parameters — avoids Arabic encoding issues in the .ps1 file itself
  const args = [
    "-NoProfile", "-NonInteractive", "-File", `"${DUMP_SCRIPT}"`,
    "-DbPath", `"${dbPath}"`,
    "-T1", `"${TABLES.ledger}"`,
    "-T2", `"${TABLES.advances}"`,
    "-T3", `"${TABLES.loans}"`,
    "-T4", `"${TABLES.home}"`,
    "-T5", `"${TABLES.instapay}"`,
    "-T6", `"${TABLES.employees}"`,
    "-T7", `"${TABLES.categories}"`,
    "-T8", `"${TABLES.saadany}"`,
  ].join(" ");

  const out = execSync(`powershell ${args}`, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  const parsed = JSON.parse(out);
  return {
    ledger:    parsed.t1 ?? [],
    advances:  parsed.t2 ?? [],
    loans:     parsed.t3 ?? [],
    home:      parsed.t4 ?? [],
    instapay:   parsed.t5 ?? [],
    employees:  parsed.t6 ?? [],
    categories: parsed.t7 ?? [],
    saadany:    parsed.t8 ?? [],
  };
}

function toDate(val: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

function toDecimal(val: string | null): string | null {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n.toFixed(2);
}

async function upsertLedger(db: any, rows: any[]) {
  let inserted = 0, updated = 0;
  for (const r of rows) {
    const accessId = Number(r["ID"] ?? r["id"]);
    if (!accessId) continue;
    const existing = await db.execute(
      sql.raw(`SELECT id FROM accLedger WHERE accessId = ${accessId} LIMIT 1`)
    );
    const row = (existing as any)[0]?.[0];
    const txDate = toDate(r["التاريخ"]);
    if (!txDate) continue;
    const vals = {
      total:   toDecimal(r["الاجمالي"]),
      balance: toDecimal(r["الرصيد"]),
      income:  toDecimal(r["الايراد"]),
      expense: toDecimal(r["المصروف"]),
      txDate,
      notes:   String(r["ملاحظات"] ?? "").slice(0, 500) || null,
    };
    if (row) {
      await db.execute(sql.raw(
        `UPDATE accLedger SET total=${sqlVal(vals.total)}, balance=${sqlVal(vals.balance)}, income=${sqlVal(vals.income)}, expense=${sqlVal(vals.expense)}, txDate='${vals.txDate}', notes=${sqlVal(vals.notes)}, syncedAt=NOW() WHERE accessId=${accessId}`
      ));
      updated++;
    } else {
      await db.execute(sql.raw(
        `INSERT INTO accLedger (accessId, total, balance, income, expense, txDate, notes, syncedAt) VALUES (${accessId}, ${sqlVal(vals.total)}, ${sqlVal(vals.balance)}, ${sqlVal(vals.income)}, ${sqlVal(vals.expense)}, '${vals.txDate}', ${sqlVal(vals.notes)}, NOW())`
      ));
      inserted++;
    }
  }
  console.log(`  accLedger: +${inserted} inserted, ~${updated} updated`);
}

async function upsertAdvances(db: any, rows: any[]) {
  let inserted = 0, updated = 0;
  for (const r of rows) {
    const accessId = Number(r["ID"] ?? r["id"]);
    if (!accessId) continue;
    const txDate = toDate(r["التاريخ"]);
    if (!txDate) continue;
    const existing = await db.execute(sql.raw(`SELECT id FROM accAdvances WHERE accessId = ${accessId} LIMIT 1`));
    const row = (existing as any)[0]?.[0];
    const rawRepayment = parseFloat(r["سداد"] ?? "0") || 0;
    const vals = {
      advance:    toDecimal(r["سلفه"]),
      repayment:  rawRepayment !== 0 ? String(Math.abs(rawRepayment)) : null,
      notes:      String(r["ملاحظات"] ?? "").slice(0, 500) || null,
      employee:   String(r["الاسم"] ?? "").slice(0, 200) || null,
      total:      toDecimal(r["الاجمالي"]),
    };
    if (row) {
      await db.execute(sql.raw(
        `UPDATE accAdvances SET advance=${sqlVal(vals.advance)}, repayment=${sqlVal(vals.repayment)}, notes=${sqlVal(vals.notes)}, employee=${sqlVal(vals.employee)}, total=${sqlVal(vals.total)}, syncedAt=NOW() WHERE accessId=${accessId}`
      ));
      updated++;
    } else {
      await db.execute(sql.raw(
        `INSERT INTO accAdvances (accessId, txDate, advance, repayment, notes, employee, total, syncedAt) VALUES (${accessId}, '${txDate}', ${sqlVal(vals.advance)}, ${sqlVal(vals.repayment)}, ${sqlVal(vals.notes)}, ${sqlVal(vals.employee)}, ${sqlVal(vals.total)}, NOW())`
      ));
      inserted++;
    }
  }
  console.log(`  accAdvances: +${inserted} inserted, ~${updated} updated`);
}

async function upsertLoans(db: any, rows: any[]) {
  let inserted = 0, updated = 0;
  for (const r of rows) {
    const accessId = Number(r["ID"] ?? r["id"]);
    if (!accessId) continue;
    const txDate = toDate(r["التاريخ"]);
    if (!txDate) continue;
    const existing = await db.execute(sql.raw(`SELECT id FROM accLoans WHERE accessId = ${accessId} LIMIT 1`));
    const row = (existing as any)[0]?.[0];
    const vals = {
      name:      String(r["الاسم"] ?? "").slice(0, 200) || null,
      amount:    toDecimal(r["المبلغ"]),
      repayment: toDecimal(r["سداد"]),
      remaining: toDecimal(r["المتبقي"]),
      notes:     String(r["ملاحظات"] ?? "").slice(0, 1000) || null,
    };
    if (row) {
      await db.execute(sql.raw(
        `UPDATE accLoans SET name=${sqlVal(vals.name)}, amount=${sqlVal(vals.amount)}, repayment=${sqlVal(vals.repayment)}, remaining=${sqlVal(vals.remaining)}, notes=${sqlVal(vals.notes)}, syncedAt=NOW() WHERE accessId=${accessId}`
      ));
      updated++;
    } else {
      await db.execute(sql.raw(
        `INSERT INTO accLoans (accessId, name, amount, repayment, remaining, txDate, notes, syncedAt) VALUES (${accessId}, ${sqlVal(vals.name)}, ${sqlVal(vals.amount)}, ${sqlVal(vals.repayment)}, ${sqlVal(vals.remaining)}, '${txDate}', ${sqlVal(vals.notes)}, NOW())`
      ));
      inserted++;
    }
  }
  console.log(`  accLoans: +${inserted} inserted, ~${updated} updated`);
}

async function upsertSimple(db: any, tableName: string, rows: any[]) {
  let inserted = 0, updated = 0;
  for (const r of rows) {
    const accessId = Number(r["ID"] ?? r["id"]);
    if (!accessId) continue;
    const txDate = toDate(r["التاريخ"]);
    if (!txDate) continue;
    const existing = await db.execute(sql.raw(`SELECT id FROM ${tableName} WHERE accessId = ${accessId} LIMIT 1`));
    const row = (existing as any)[0]?.[0];
    const vals = {
      total:     toDecimal(r["الاجمالي"]),
      balance:   toDecimal(r["الرصيد"]),
      inAmount:  toDecimal(r["معاه"]),
      outAmount: toDecimal(r["منه"]),
      notes:     String(r["ملاحظات"] ?? "").slice(0, 500) || null,
    };
    if (row) {
      await db.execute(sql.raw(
        `UPDATE ${tableName} SET total=${sqlVal(vals.total)}, balance=${sqlVal(vals.balance)}, inAmount=${sqlVal(vals.inAmount)}, outAmount=${sqlVal(vals.outAmount)}, notes=${sqlVal(vals.notes)}, syncedAt=NOW() WHERE accessId=${accessId}`
      ));
      updated++;
    } else {
      await db.execute(sql.raw(
        `INSERT INTO ${tableName} (accessId, txDate, total, balance, inAmount, outAmount, notes, syncedAt) VALUES (${accessId}, '${txDate}', ${sqlVal(vals.total)}, ${sqlVal(vals.balance)}, ${sqlVal(vals.inAmount)}, ${sqlVal(vals.outAmount)}, ${sqlVal(vals.notes)}, NOW())`
      ));
      inserted++;
    }
  }
  console.log(`  ${tableName}: +${inserted} inserted, ~${updated} updated`);
}

function sqlVal(v: string | null): string {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Batch upsert using INSERT ... ON DUPLICATE KEY UPDATE
// Requires a UNIQUE index on accessId — added during table creation.
async function batchUpsertLedger(db: any, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw(
    "ALTER TABLE accLedger ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)"
  )).catch(() => {});

  const chunks = chunkArray(rows, 500);
  let count = 0;
  for (const chunk of chunks) {
    // Only sync source columns (income, expense, txDate, notes).
    // balance and total are auto-calculated by MySQL after upsert.
    const vals = chunk.map((r: any) => {
      const id = Number(r["ID"] ?? r["id"]);
      const txDate = toDate(r["التاريخ"]);
      if (!id || !txDate) return null;
      const income  = toDecimal(r["الايراد"]);
      const expense = toDecimal(r["المصروف"]);
      const balance = toDecimal(r["الرصيد"]) ?? String(((parseFloat(income ?? "0") || 0) - (parseFloat(expense ?? "0") || 0)).toFixed(2));
      const total   = toDecimal(r["الاجمالي"]);
      return `(${id}, ${sqlVal(income)}, ${sqlVal(expense)}, ${sqlVal(balance)}, ${sqlVal(total)}, '${txDate}', ${sqlVal(String(r["ملاحظات"] ?? "").slice(0, 500) || null)})`;
    }).filter(Boolean);
    if (!vals.length) continue;
    await db.execute(sql.raw(
      `INSERT INTO accLedger (accessId, income, expense, balance, total, txDate, notes) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE income=VALUES(income), expense=VALUES(expense), balance=VALUES(balance), total=VALUES(total), txDate=VALUES(txDate), notes=VALUES(notes), syncedAt=NOW()`
    ));
    count += vals.length;
  }

  // Delete MySQL rows whose accessId is no longer in accdb (orphans from deleted accdb rows)
  const allIds = rows.map((r: any) => Number(r["ID"] ?? r["id"])).filter(Boolean);
  if (allIds.length) {
    const idList = allIds.join(",");
    await db.execute(sql.raw(
      `DELETE FROM accLedger WHERE accessId IS NOT NULL AND accessId NOT IN (${idList})`
    ));
  }

  // For UI-added rows (accessId IS NULL): compute total as continuation of accdb running sum
  await db.execute(sql.raw(`
    UPDATE accLedger l
    JOIN (
      SELECT id,
        SUM(COALESCE(balance, 0)) OVER (
          ORDER BY txDate ASC, COALESCE(accessId, 999999999) ASC, id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_total
      FROM accLedger
    ) sub ON l.id = sub.id
    SET l.total = sub.running_total
    WHERE l.accessId IS NULL
  `));

  console.log(`  accLedger: ${count} upserted, balance+total recalculated`);
}

async function batchUpsertAdvances(db: any, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw("ALTER TABLE accAdvances ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)")).catch(() => {});
  const vals = rows.map((r: any) => {
    const id = Number(r["ID"] ?? r["id"]);
    const txDate = toDate(r["التاريخ"]);
    if (!id || !txDate) return null;
    // سلف table: سداد is stored as negative for repayment rows; سلفه is the advance
    const rawRepayment = parseFloat(r["سداد"] ?? "0") || 0;
    const advance   = toDecimal(r["سلفه"]);
    const repayment = rawRepayment !== 0 ? String(Math.abs(rawRepayment)) : null;
    return `(${id}, '${txDate}', ${sqlVal(advance)}, ${sqlVal(repayment)}, ${sqlVal(String(r["ملاحظات"] ?? "").slice(0, 500) || null)}, ${sqlVal(String(r["الاسم"] ?? "").slice(0, 200) || null)}, ${sqlVal(toDecimal(r["الاجمالي"]))})`;
  }).filter(Boolean);
  if (!vals.length) return;
  await db.execute(sql.raw(
    `INSERT INTO accAdvances (accessId, txDate, advance, repayment, notes, employee, total) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE txDate=VALUES(txDate), advance=VALUES(advance), repayment=VALUES(repayment), notes=VALUES(notes), total=VALUES(total), syncedAt=NOW()`
  ));
  // Refresh canonical employee name from accEmployees via LIKE match
  await db.execute(sql.raw(`
    UPDATE accAdvances a
    INNER JOIN accEmployees e ON TRIM(a.notes) LIKE CONCAT(TRIM(e.name), '%')
    SET a.employee = TRIM(e.name)
    WHERE a.employee IS NULL OR a.employee != TRIM(e.name)
  `));
  console.log(`  accAdvances: ${vals.length} upserted`);
}

async function batchUpsertLoans(db: any, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw("ALTER TABLE accLoans ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)")).catch(() => {});
  const vals = rows.map((r: any) => {
    const id = Number(r["ID"] ?? r["id"]);
    const txDate = toDate(r["التاريخ"]);
    if (!id || !txDate) return null;
    return `(${id}, ${sqlVal(String(r["الاسم"] ?? "").slice(0, 200) || null)}, ${sqlVal(toDecimal(r["المبلغ"]))}, ${sqlVal(toDecimal(r["سداد"]))}, ${sqlVal(toDecimal(r["المتبقي"]))}, '${txDate}', ${sqlVal(String(r["ملاحظات"] ?? "").slice(0, 1000) || null)})`;
  }).filter(Boolean);
  if (!vals.length) return;
  await db.execute(sql.raw(
    `INSERT INTO accLoans (accessId, name, amount, repayment, remaining, txDate, notes) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE name=VALUES(name), amount=VALUES(amount), repayment=VALUES(repayment), remaining=VALUES(remaining), txDate=VALUES(txDate), notes=VALUES(notes), syncedAt=NOW()`
  ));
  console.log(`  accLoans: ${vals.length} upserted`);
}

async function batchUpsertSimple(db: any, tableName: string, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw(`ALTER TABLE ${tableName} ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)`)).catch(() => {});
  const vals = rows.map((r: any) => {
    const id = Number(r["ID"] ?? r["id"]);
    const txDate = toDate(r["التاريخ"]);
    if (!id || !txDate) return null;
    return `(${id}, '${txDate}', ${sqlVal(toDecimal(r["الاجمالي"]))}, ${sqlVal(toDecimal(r["الرصيد"]))}, ${sqlVal(toDecimal(r["معاه"]))}, ${sqlVal(toDecimal(r["منه"]))}, ${sqlVal(String(r["ملاحظات"] ?? "").slice(0, 500) || null)})`;
  }).filter(Boolean);
  if (!vals.length) return;
  await db.execute(sql.raw(
    `INSERT INTO ${tableName} (accessId, txDate, total, balance, inAmount, outAmount, notes) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE total=VALUES(total), balance=VALUES(balance), inAmount=VALUES(inAmount), outAmount=VALUES(outAmount), notes=VALUES(notes), syncedAt=NOW()`
  ));
  console.log(`  ${tableName}: ${vals.length} upserted`);
}

async function batchUpsertEmployees(db: any, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw("ALTER TABLE accEmployees ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)")).catch(() => {});
  const vals = rows.map((r: any) => {
    const id = Number(r["ID"] ?? r["id"]);
    const name = String(r["اسم الموظف"] ?? "").trim().slice(0, 200);
    if (!id || !name) return null;
    return `(${id}, ${sqlVal(name)})`;
  }).filter(Boolean);
  if (!vals.length) return;
  await db.execute(sql.raw(
    `INSERT INTO accEmployees (accessId, name) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE name=VALUES(name), syncedAt=NOW()`
  ));
  console.log(`  accEmployees: ${vals.length} upserted`);
}

async function batchUpsertCategories(db: any, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw("ALTER TABLE accCategories ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)")).catch(() => {});
  const vals = rows.map((r: any) => {
    const id = Number(r["ID"] ?? r["id"]);
    if (!id) return null;
    const name   = sqlVal(String(r["الاسم"] ?? "").trim().slice(0, 200) || null);
    const entity = sqlVal(String(r["الجهه"] ?? "").trim().slice(0, 200) || null);
    const isPaid = (String(r["تم السداد"] ?? "").toLowerCase() === "true" || r["تم السداد"] === "1") ? 1 : 0;
    return `(${id}, ${name}, ${entity}, ${isPaid})`;
  }).filter(Boolean);
  if (!vals.length) return;
  await db.execute(sql.raw(
    `INSERT INTO accCategories (accessId, name, entity, isPaid) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE name=VALUES(name), entity=VALUES(entity), isPaid=VALUES(isPaid), syncedAt=NOW()`
  ));
  console.log(`  accCategories: ${vals.length} upserted`);
}

async function batchUpsertSaadany(db: any, rows: any[]) {
  if (!rows.length) return;
  await db.execute(sql.raw("ALTER TABLE accSaadany ADD UNIQUE INDEX IF NOT EXISTS uq_accessId (accessId)")).catch(() => {});
  const vals = rows.map((r: any) => {
    const id = Number(r["ID"] ?? r["id"]);
    const txDate = toDate(r["التاريخ"]);
    if (!id || !txDate) return null;
    return `(${id}, '${txDate}', ${sqlVal(toDecimal(r["مسحوبات"]))}, ${sqlVal(toDecimal(r["السداد"]))}, ${sqlVal(String(r["ملاحظات"] ?? "").slice(0, 500) || null)}, ${sqlVal(toDecimal(r["الاجمالي"]))})`;
  }).filter(Boolean);
  if (!vals.length) return;
  await db.execute(sql.raw(
    `INSERT INTO accSaadany (accessId, txDate, withdrawals, repayment, notes, total) VALUES ${vals.join(",")} ON DUPLICATE KEY UPDATE txDate=VALUES(txDate), withdrawals=VALUES(withdrawals), repayment=VALUES(repayment), notes=VALUES(notes), total=VALUES(total), syncedAt=NOW()`
  ));
  console.log(`  accSaadany: ${vals.length} upserted`);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function main() {
  const dbPath = getArg("--db") ?? DEFAULT_DB_PATH;
  console.log(`\n🔄 Access DB Sync — ${new Date().toLocaleString("ar-EG")}`);
  console.log(`   Source: ${dbPath}\n`);

  const db = await getDb();
  if (!db) throw new Error("MySQL connection failed");

  console.log("📂 Reading Access DB...");
  const dump = dumpAccess(dbPath);
  console.log(`   ledger:     ${dump.ledger?.length ?? 0} rows`);
  console.log(`   advances:   ${dump.advances?.length ?? 0} rows`);
  console.log(`   loans:      ${dump.loans?.length ?? 0} rows`);
  console.log(`   home:       ${dump.home?.length ?? 0} rows`);
  console.log(`   instapay:   ${dump.instapay?.length ?? 0} rows`);
  console.log(`   employees:  ${dump.employees?.length ?? 0} rows`);
  console.log(`   categories: ${dump.categories?.length ?? 0} rows`);
  console.log(`   saadany:    ${dump.saadany?.length ?? 0} rows\n`);

  console.log("💾 Syncing to MySQL...");
  await batchUpsertLedger(db, dump.ledger ?? []);
  await batchUpsertAdvances(db, dump.advances ?? []);
  await batchUpsertLoans(db, dump.loans ?? []);
  await batchUpsertSimple(db, "accHome", dump.home ?? []);
  await batchUpsertSimple(db, "accInstapay", dump.instapay ?? []);
  await batchUpsertEmployees(db, dump.employees ?? []);
  await batchUpsertCategories(db, dump.categories ?? []);
  await batchUpsertSaadany(db, dump.saadany ?? []);

  console.log("\n✅ Sync complete.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
