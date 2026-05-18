import { config } from "dotenv";
config();
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const db = await getDb();
if (!db) { console.error("no db"); process.exit(1); }

async function rebuildTable(
  table: string,
  formula: (row: any) => number,
  orderBy = "txDate ASC, id ASC",
) {
  const [rows] = await db!.execute(sql.raw(`SELECT * FROM ${table} ORDER BY ${orderBy}`)) as any;
  let running = 0;
  let updated = 0;
  for (const row of rows as any[]) {
    running = formula({ ...row, prev: running });
    const rounded = Math.round(running * 100) / 100;
    await db!.execute(sql.raw(`UPDATE ${table} SET total = ${rounded} WHERE id = ${row.id}`));
    updated++;
  }
  console.log(`${table}: rebuilt ${updated} rows, final total = ${running}`);
}

// accAdvances: total = prev + advance - repayment
await rebuildTable("accAdvances", (r) =>
  r.prev + (Number(r.advance) || 0) - (Number(r.repayment) || 0),
);

// accHome: total = prev + inAmount - outAmount
await rebuildTable("accHome", (r) =>
  r.prev + (Number(r.inAmount) || 0) - (Number(r.outAmount) || 0),
);

// accInstapay: total = prev + inAmount - outAmount
await rebuildTable("accInstapay", (r) =>
  r.prev + (Number(r.inAmount) || 0) - (Number(r.outAmount) || 0),
);

// accSaadany: withdrawals stored as negative, repayment positive
// total = prev + abs(withdrawals) - repayment
await rebuildTable("accSaadany", (r) =>
  r.prev + Math.abs(Number(r.withdrawals) || 0) - (Number(r.repayment) || 0),
);

// accLoans: total = prev + amount - repayment
await rebuildTable("accLoans", (r) =>
  r.prev + (Number(r.amount) || 0) - (Number(r.repayment) || 0),
);

console.log("done");
process.exit(0);
