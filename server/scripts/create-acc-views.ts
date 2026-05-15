import { config } from "dotenv";
config();
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const views: { name: string; ddl: string }[] = [
  {
    name: "accView_Advances",   // سلف_T
    ddl: `CREATE OR REPLACE VIEW accView_Advances AS
      SELECT
        TRIM(e.name)                                        AS employee,
        SUM(IFNULL(a.advance,   0))                         AS totalAdvance,
        SUM(IFNULL(a.repayment, 0))                         AS totalRepaid,
        SUM(IFNULL(a.advance,0)) - SUM(IFNULL(a.repayment,0)) AS remaining
      FROM accEmployees e
      JOIN accAdvances  a ON a.notes LIKE CONCAT(TRIM(e.name), '%')
      WHERE e.name IS NOT NULL AND TRIM(e.name) != ''
      GROUP BY TRIM(e.name)`,
  },
  {
    name: "accView_Loans",      // القرض_T
    ddl: `CREATE OR REPLACE VIEW accView_Loans AS
      SELECT
        TRIM(name)                                          AS name,
        SUM(IFNULL(amount,    0))                           AS totalLoan,
        SUM(IFNULL(repayment, 0))                           AS totalPaid,
        SUM(IFNULL(amount,0)) - SUM(IFNULL(repayment, 0))  AS remaining
      FROM accLoans
      WHERE name IS NOT NULL AND TRIM(name) != ''
      GROUP BY TRIM(name)
      HAVING remaining != 0`,
  },
  {
    name: "accView_Home",       // البيت_T
    ddl: `CREATE OR REPLACE VIEW accView_Home AS
      SELECT
        SUM(IFNULL(inAmount,  0)) AS totalIn,
        SUM(IFNULL(outAmount, 0)) AS totalOut,
        SUM(IFNULL(inAmount,0)) - SUM(IFNULL(outAmount,0)) AS net
      FROM accHome`,
  },
  {
    name: "accView_Instagram",  // انستا_T
    ddl: `CREATE OR REPLACE VIEW accView_Instagram AS
      SELECT
        SUM(IFNULL(inAmount,  0)) AS totalIn,
        SUM(IFNULL(outAmount, 0)) AS totalOut,
        SUM(IFNULL(inAmount,0)) - SUM(IFNULL(outAmount,0)) AS net
      FROM accInstagram`,
  },
  {
    name: "accView_Saadany",    // د_السعدني summary
    ddl: `CREATE OR REPLACE VIEW accView_Saadany AS
      SELECT
        SUM(IFNULL(withdrawals, 0)) AS totalWithdrawals,
        SUM(IFNULL(repayment,   0)) AS totalRepaid,
        SUM(IFNULL(withdrawals,0)) - SUM(IFNULL(repayment,0)) AS remaining
      FROM accSaadany`,
  },
  {
    name: "accView_Ledger",     // All _T — ledger ordered with running balance already stored
    ddl: `CREATE OR REPLACE VIEW accView_Ledger AS
      SELECT
        id, accessId, txDate, income, expense, balance, total, notes
      FROM accLedger
      ORDER BY txDate, accessId`,
  },
  {
    name: "accView_Comprehensive",  // اجمالي شامل
    ddl: `CREATE OR REPLACE VIEW accView_Comprehensive AS
      SELECT 'الخزنة'    AS account, SUM(IFNULL(income,0))      AS totalIn, SUM(IFNULL(expense,0))    AS totalOut FROM accLedger
      UNION ALL
      SELECT 'البيت',               SUM(IFNULL(inAmount,0)),     SUM(IFNULL(outAmount,0))              FROM accHome
      UNION ALL
      SELECT 'انستاباي',            SUM(IFNULL(inAmount,0)),     SUM(IFNULL(outAmount,0))              FROM accInstagram
      UNION ALL
      SELECT 'د/ السعدني',          SUM(IFNULL(withdrawals,0)), SUM(IFNULL(repayment,0))              FROM accSaadany`,
  },
];

const db = await getDb();
if (!db) { console.error("DB unavailable"); process.exit(1); }

for (const v of views) {
  await db.execute(sql.raw(v.ddl));
  console.log(`  view: ${v.name}`);
}
console.log("Done.");
process.exit(0);
