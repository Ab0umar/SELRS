/**
 * Pushes web-created rows (accessId IS NULL) from the MySQL acc* tables INTO the
 * Access DB (الخزنه.accdb), then writes the new Access IDs back to MySQL so the
 * rows become permanent source records (and survive the next DB→web pull).
 *
 * One-way web → Access. Complements sync-access-db.ts (Access → web).
 * Column mappings mirror sync-access-db.ts exactly.
 *
 * Usage:
 *   npx tsx server/scripts/push-access-db.ts
 *   npx tsx server/scripts/push-access-db.ts --db "C:\path\to\الخزنه.accdb"
 */
import { config } from "dotenv";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

config();

const __scriptDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH =
  "C:\\Users\\selrs\\OneDrive\\Documents\\SELRS\\الخزنه.accdb";
const PUSH_SCRIPT = path.resolve(__scriptDir, "access-push.ps1");

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
}

type ColType = "date" | "num" | "str" | "bool";

interface ColMap {
  /** MySQL column to read */
  mysql: string;
  /** Access (accdb) column name to write */
  access: string;
  type: ColType;
  /** optional transform of the MySQL value before writing */
  transform?: (v: any) => any;
}

interface TableMap {
  /** MySQL table */
  mysqlTable: string;
  /** Access table name */
  accessTable: string;
  /** computed/auto columns to NOT push (balance/total etc.) — for documentation */
  cols: ColMap[];
}

// Mappings mirror the pull side (sync-access-db.ts). Computed columns
// (الاجمالي/الرصيد) are intentionally omitted — the Access app / next pull
// recomputes running balances.
const TABLES: TableMap[] = [
  {
    mysqlTable: "accLedger",
    accessTable: "All",
    cols: [
      { mysql: "txDate", access: "التاريخ", type: "date" },
      { mysql: "income", access: "الايراد", type: "num" },
      { mysql: "expense", access: "المصروف", type: "num" },
      { mysql: "notes", access: "ملاحظات", type: "str" },
    ],
  },
  {
    mysqlTable: "accAdvances",
    accessTable: "سلف",
    cols: [
      { mysql: "txDate", access: "التاريخ", type: "date" },
      { mysql: "advance", access: "سلفه", type: "num" },
      // pull stores repayment as ABS(سداد); accdb keeps repayment negative
      { mysql: "repayment", access: "سداد", type: "num", transform: (v) => (v != null ? -Math.abs(Number(v)) : null) },
      { mysql: "employee", access: "الاسم", type: "str" },
      { mysql: "notes", access: "ملاحظات", type: "str" },
    ],
  },
  {
    mysqlTable: "accLoans",
    accessTable: "القرض",
    cols: [
      { mysql: "txDate", access: "التاريخ", type: "date" },
      { mysql: "name", access: "الاسم", type: "str" },
      { mysql: "amount", access: "المبلغ", type: "num" },
      { mysql: "repayment", access: "سداد", type: "num" },
      { mysql: "notes", access: "ملاحظات", type: "str" },
    ],
  },
  {
    mysqlTable: "accHome",
    accessTable: "البيت",
    cols: [
      { mysql: "txDate", access: "التاريخ", type: "date" },
      { mysql: "inAmount", access: "معاه", type: "num" },
      { mysql: "outAmount", access: "منه", type: "num" },
      { mysql: "notes", access: "ملاحظات", type: "str" },
    ],
  },
  {
    mysqlTable: "accInstapay",
    accessTable: "انستا",
    cols: [
      { mysql: "txDate", access: "التاريخ", type: "date" },
      { mysql: "inAmount", access: "معاه", type: "num" },
      { mysql: "outAmount", access: "منه", type: "num" },
      { mysql: "notes", access: "ملاحظات", type: "str" },
    ],
  },
  {
    mysqlTable: "accSaadany",
    accessTable: "د_السعدني",
    cols: [
      { mysql: "txDate", access: "التاريخ", type: "date" },
      { mysql: "withdrawals", access: "مسحوبات", type: "num" },
      { mysql: "repayment", access: "السداد", type: "num" },
      { mysql: "notes", access: "ملاحظات", type: "str" },
    ],
  },
  {
    mysqlTable: "accEmployees",
    accessTable: "الموظفين",
    cols: [{ mysql: "name", access: "اسم الموظف", type: "str" }],
  },
  {
    mysqlTable: "accCategories",
    accessTable: "التصنيف",
    cols: [
      { mysql: "name", access: "الاسم", type: "str" },
      { mysql: "entity", access: "الجهه", type: "str" },
      { mysql: "isPaid", access: "تم السداد", type: "bool" },
    ],
  },
];

interface PushResult {
  webId: number;
  accessId: number | null;
  ok: boolean;
  error?: string;
}

function pushTable(dbPath: string, accessTable: string, rows: any[]): PushResult[] {
  if (!rows.length) return [];
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    PUSH_SCRIPT,
    "-DbPath",
    dbPath,
    "-TableName",
    accessTable,
  ];
  const proc = spawnSync("powershell", args, {
    input: JSON.stringify(rows),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    throw new Error(
      `access-push.ps1 (${accessTable}) failed: ${proc.stderr || proc.stdout || "unknown"}`,
    );
  }
  const out = (proc.stdout || "").trim();
  if (!out) return [];
  const parsed = JSON.parse(out);
  const flatResults = (Array.isArray(parsed) ? parsed : [parsed]).flat(
    Number.POSITIVE_INFINITY,
  );
  return flatResults.map((result, index) => {
    if (
      !result ||
      typeof result !== "object" ||
      !("webId" in result) ||
      !("ok" in result)
    ) {
      throw new Error(
        `access-push.ps1 (${accessTable}) returned an invalid result at index ${index}: ${JSON.stringify(result)}`,
      );
    }
    return result as PushResult;
  });
}

function cleanDate(v: any): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

async function pushOne(db: any, t: TableMap, dbPath: string): Promise<{ pushed: number; failures: string[] }> {
  const cols = t.cols.map((c) => c.mysql).join(", ");
  const res = await db.execute(
    sql.raw(
      `SELECT id, ${cols} FROM ${t.mysqlTable} WHERE accessId IS NULL ORDER BY id ASC`,
    ),
  );
  const dbRows = (res as any)[0] as any[];
  if (!dbRows.length) {
    console.log(`  ${t.mysqlTable}: nothing to push`);
    return { pushed: 0, failures: [] };
  }

  const payload = dbRows.map((r) => ({
    webId: Number(r.id),
    cols: t.cols.map((c) => {
      let value = r[c.mysql];
      if (c.transform) value = c.transform(value);
      if (c.type === "date") value = cleanDate(value);
      return { name: c.access, value, type: c.type };
    }),
  }));

  const results = pushTable(dbPath, t.accessTable, payload);
  let pushed = 0;
  const failures: string[] = [];
  for (const rr of results) {
    if (rr.ok && rr.accessId) {
      // The Access→web watcher may import the newly inserted Access row before
      // this script can attach its ID to the original web row. Merge that
      // short-lived mirror row inside one transaction so the unique accessId
      // constraint cannot turn a successful Access insert into a retry loop.
      await db.transaction(async (tx: any) => {
        await tx.execute(
          sql.raw(
            `DELETE FROM ${t.mysqlTable} WHERE accessId = ${rr.accessId} AND id <> ${rr.webId}`,
          ),
        );
        await tx.execute(
          sql.raw(
            `UPDATE ${t.mysqlTable} SET accessId = ${rr.accessId}, syncedAt = NOW() WHERE id = ${rr.webId} AND accessId IS NULL`,
          ),
        );
      });
      pushed++;
    } else {
      failures.push(`${t.mysqlTable} webId=${rr.webId}: ${rr.error ?? "unknown"}`);
    }
  }
  console.log(`  ${t.mysqlTable} → [${t.accessTable}]: ${pushed} pushed${failures.length ? `, ${failures.length} failed` : ""}`);
  return { pushed, failures };
}

async function main() {
  const dbPath = getArg("--db") ?? DEFAULT_DB_PATH;
  console.log(`\n⬆️  Web → Access push — ${new Date().toLocaleString("ar-EG")}`);
  console.log(`   Target: ${dbPath}\n`);

  const db = await getDb();
  if (!db) throw new Error("MySQL connection failed");

  let totalPushed = 0;
  const allFailures: string[] = [];
  for (const t of TABLES) {
    const { pushed, failures } = await pushOne(db, t, dbPath);
    totalPushed += pushed;
    allFailures.push(...failures);
  }

  console.log(`\n✅ Push complete — ${totalPushed} row(s) pushed.`);
  if (allFailures.length) {
    console.log(`⚠️ ${allFailures.length} failed:`);
    allFailures.forEach((f) => console.log(`   - ${f}`));
  }
  console.log("");
  process.exit(allFailures.length ? 2 : 0);
}

main().catch((err) => {
  console.error("Push failed:", err);
  process.exit(1);
});
