/**
 * Pushes web-created ledger rows (accLedger WHERE accessId IS NULL) INTO the
 * Access DB (الخزنه.accdb), then writes the new Access IDs back to MySQL so the
 * rows become permanent source records (and survive the next DB→web pull).
 *
 * One-way web → Access, ledger (الخزنه) only. Complements sync-access-db.ts.
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
const LEDGER_TABLE = "All";

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
}

interface WebRow {
  webId: number;
  txDate: string;
  income: number | null;
  expense: number | null;
  notes: string | null;
}

interface PushResult {
  webId: number;
  accessId: number | null;
  ok: boolean;
  error?: string;
}

function pushToAccess(dbPath: string, rows: WebRow[]): PushResult[] {
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
    LEDGER_TABLE,
  ];
  const proc = spawnSync("powershell", args, {
    input: JSON.stringify(rows),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    throw new Error(
      `access-push.ps1 failed: ${proc.stderr || proc.stdout || "unknown error"}`,
    );
  }
  const out = (proc.stdout || "").trim();
  if (!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function main() {
  const dbPath = getArg("--db") ?? DEFAULT_DB_PATH;
  console.log(`\n⬆️  Web → Access push — ${new Date().toLocaleString("ar-EG")}`);
  console.log(`   Target: ${dbPath}\n`);

  const db = await getDb();
  if (!db) throw new Error("MySQL connection failed");

  // Web-created rows have accessId IS NULL.
  const res = await db.execute(
    sql.raw(
      `SELECT id, txDate, income, expense, notes FROM accLedger WHERE accessId IS NULL ORDER BY txDate ASC, id ASC`,
    ),
  );
  const rows: WebRow[] = ((res as any)[0] as any[]).map((r) => ({
    webId: Number(r.id),
    txDate: String(r.txDate).slice(0, 10),
    income: r.income != null ? Number(r.income) : null,
    expense: r.expense != null ? Number(r.expense) : null,
    notes: r.notes != null ? String(r.notes) : null,
  }));

  console.log(`📤 ${rows.length} web-only ledger row(s) to push`);
  if (rows.length === 0) {
    console.log("\n✅ Nothing to push.\n");
    process.exit(0);
  }

  const results = pushToAccess(dbPath, rows);

  let pushed = 0;
  const failures: string[] = [];
  for (const r of results) {
    if (r.ok && r.accessId) {
      await db.execute(
        sql.raw(
          `UPDATE accLedger SET accessId = ${r.accessId}, syncedAt = NOW() WHERE id = ${r.webId} AND accessId IS NULL`,
        ),
      );
      pushed++;
    } else {
      failures.push(`webId=${r.webId}: ${r.error ?? "unknown"}`);
    }
  }

  console.log(`  accLedger: ${pushed} pushed to Access`);
  if (failures.length) {
    console.log(`  ⚠️ ${failures.length} failed:`);
    failures.forEach((f) => console.log(`     - ${f}`));
  }
  console.log("\n✅ Push complete.\n");
  process.exit(failures.length ? 2 : 0);
}

main().catch((err) => {
  console.error("Push failed:", err);
  process.exit(1);
});
