import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  dailyRevenueInputSchema,
  dailyRevenueOutputSchema,
  dashboardSummaryInputSchema,
  extendedDashboardSummaryOutputSchema,
  lasikReceiptsInputSchema,
  lasikReceiptsOutputSchema,
  lasikRevenueSummaryInputSchema,
  lasikRevenueSummaryOutputSchema,
  lasikServicesInputSchema,
  lasikServicesOutputSchema,
  patientLasikSummaryInputSchema,
  patientLasikSummaryOutputSchema,
  receiptDetailInputSchema,
  receiptDetailOutputSchema,
  receiptsInquiryInputSchema,
  receiptsInquiryOutputSchema,
  serviceRevenueInputSchema,
  serviceRevenueOutputSchema,
  transactionsInputSchema,
  transactionsOutputSchema,
} from "../../shared/accounting/contracts";
import { accountingProcedure, adminProcedure, router } from "../_core/procedures";
import { getDailyRevenue } from "../services/accounting/dailyRevenue.service";
import {
  getExtendedDashboardSummary,
  getTransactions,
} from "../services/accounting/home.service";
import {
  getLasikRevenueSummary,
  getServiceRevenue,
} from "../services/accounting/lasikRevenue.service";
import { getLasikReceipts } from "../services/accounting/lasikReceipts.service";
import { getLasikServices } from "../services/accounting/lasikServices.service";
import { getPatientLasikSummary } from "../services/accounting/lasikPatientAccounting.service";
import {
  getReceiptDetail,
  getReceiptsInquiry,
} from "../services/accounting/receiptsInquiry.service";
import { mssqlQuery } from "../services/accounting/mssqlAccounting";

async function accountingQuery<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[accounting:${operation}]`, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load accounting data",
    });
  }
}

export const accountingRouter = router({
  dashboardSummary: accountingProcedure
    .input(dashboardSummaryInputSchema)
    .output(extendedDashboardSummaryOutputSchema)
    .query(({ input }) =>
      accountingQuery("dashboardSummary", () => getExtendedDashboardSummary(input)),
    ),

  transactions: accountingProcedure
    .input(transactionsInputSchema)
    .output(transactionsOutputSchema)
    .query(({ input }) =>
      accountingQuery("todayActivity", () => getTransactions(input)),
    ),

  dailyRevenue: accountingProcedure
    .input(dailyRevenueInputSchema)
    .output(dailyRevenueOutputSchema)
    .query(({ input }) =>
      accountingQuery("dailyRevenue", () => getDailyRevenue(input)),
    ),

  serviceRevenue: accountingProcedure
    .input(serviceRevenueInputSchema)
    .output(serviceRevenueOutputSchema)
    .query(({ input }) =>
      accountingQuery("serviceRevenue", () => getServiceRevenue(input)),
    ),

  receiptsInquiry: accountingProcedure
    .input(receiptsInquiryInputSchema)
    .output(receiptsInquiryOutputSchema)
    .query(({ input }) =>
      accountingQuery("receiptsInquiry", () => getReceiptsInquiry(input)),
    ),

  receiptDetail: accountingProcedure
    .input(receiptDetailInputSchema)
    .output(receiptDetailOutputSchema)
    .query(({ input }) =>
      accountingQuery("receiptDetail", () => getReceiptDetail(input)),
    ),

  lasikReceipts: accountingProcedure
    .input(lasikReceiptsInputSchema)
    .output(lasikReceiptsOutputSchema)
    .query(({ input }) =>
      accountingQuery("lasikReceipts", () => getLasikReceipts(input)),
    ),

  lasikServices: accountingProcedure
    .input(lasikServicesInputSchema)
    .output(lasikServicesOutputSchema)
    .query(({ input }) =>
      accountingQuery("lasikServices", () => getLasikServices(input)),
    ),

  lasikRevenueSummary: accountingProcedure
    .input(lasikRevenueSummaryInputSchema)
    .output(lasikRevenueSummaryOutputSchema)
    .query(({ input }) =>
      accountingQuery("lasikRevenueSummary", () => getLasikRevenueSummary(input)),
    ),

  patientLasikSummary: accountingProcedure
    .input(patientLasikSummaryInputSchema)
    .output(patientLasikSummaryOutputSchema)
    .query(({ input }) =>
      accountingQuery("patientLasikSummary", () => getPatientLasikSummary(input)),
    ),

  patientLookup: accountingProcedure
    .input(z.object({ patientCode: z.string() }))
    .query(async ({ input }) => {
      const rows = await mssqlQuery<{ PAT_CD: string; NAM: string }>(
        "SELECT TOP 1 PAT_CD, NAM FROM PAPATMF WHERE PAT_CD = @code",
        { code: input.patientCode }
      );
      return rows[0] ? { patientCode: rows[0].PAT_CD, patientName: rows[0].NAM } : null;
    }),

  doctorLookup: accountingProcedure
    .input(z.object({ doctorCode: z.string() }))
    .query(async ({ input }) => {
      const rows = await mssqlQuery<{ CODE: string; PHNM_AR: string }>(
        "SELECT TOP 1 CODE, PHNM_AR FROM MDTEAM WHERE CODE = @code",
        { code: input.doctorCode }
      );
      return rows[0] ? { doctorCode: rows[0].CODE, doctorName: rows[0].PHNM_AR } : null;
    }),

  serviceLookup: accountingProcedure
    .input(z.object({ serviceCode: z.string(), sectionCode: z.number().optional() }))
    .query(async ({ input }) => {
      const rows = await mssqlQuery<{ SRV_CD: string; SRV_NM_AR: string }>(
        "SELECT TOP 1 SRV_CD, SRV_NM_AR FROM SRVCMF WHERE SRV_CD = @code",
        { code: input.serviceCode }
      );
      return rows[0] ? { serviceCode: rows[0].SRV_CD, serviceName: rows[0].SRV_NM_AR } : null;
    }),

  // ── Access DB (الخزنه) ────────────────────────────────────────────────────

  accLedgerSummary: accountingProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo:   z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const where = buildDateWhere(input.dateFrom, input.dateTo);
      const [periodRes, balanceRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT COALESCE(SUM(income),0) AS totalIncome, COALESCE(SUM(expense),0) AS totalExpense, COUNT(*) AS txCount FROM accLedger${where}`
        )),
        // Current treasury balance = الاجمالي of the latest row overall (not filtered by date)
        db.execute(sql.raw(
          `SELECT total AS currentBalance FROM accLedger ORDER BY accessId DESC LIMIT 1`
        )),
      ]);
      const p = (periodRes as any)[0]?.[0] ?? {};
      const b = (balanceRes as any)[0]?.[0] ?? {};
      console.log("[accLedgerSummary] periodRes:", periodRes, "parsed p:", p, "balanceRes:", balanceRes, "parsed b:", b);
      return {
        totalIncome:     Number(p.totalIncome     ?? 0),
        totalExpense:    Number(p.totalExpense    ?? 0),
        currentBalance:  Number(b.currentBalance  ?? 0),
        txCount:         Number(p.txCount         ?? 0),
      };
    }),

  accLedger: accountingProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo:   z.string().optional(),
      type:     z.enum(["all", "income", "expense"]).default("all"),
      notes:    z.string().optional(),
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let where = buildDateWhere(input.dateFrom, input.dateTo);
      if (input.type === "income")  where += (where ? " AND " : " WHERE ") + "income > 0";
      if (input.type === "expense") where += (where ? " AND " : " WHERE ") + "expense > 0";
      if (input.notes?.trim()) {
        const q = input.notes.trim().replace(/'/g, "");
        where += (where ? " AND " : " WHERE ") + `notes LIKE '%${q}%'`;
      }
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(`SELECT id, accessId, txDate, income, expense, balance, total, notes FROM accLedger${where} ORDER BY txDate DESC, accessId DESC LIMIT ${input.pageSize} OFFSET ${offset}`)),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accLedger${where}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:        Number(r.id),
        accessId:  Number(r.accessId),
        txDate:    String(r.txDate ?? ""),
        income:    r.income  != null ? Number(r.income)  : null,
        expense:   r.expense != null ? Number(r.expense) : null,
        balance:   r.balance != null ? Number(r.balance) : null,
        total:     r.total   != null ? Number(r.total)   : null,
        notes:     r.notes   != null ? String(r.notes)   : null,
      }));
      const total = Number((countRes as any)[0]?.[0]?.n ?? 0);
      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── Advances (السلفه) ─────────────────────────────────────────────────────

  accAdvancesSummary: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [summaryRes, byEmployeeRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT COALESCE(SUM(advance),0) AS totalAdvance, COALESCE(SUM(repayment),0) AS totalRepaid FROM accAdvances`
        )),
        db.execute(sql.raw(
          `SELECT COALESCE(notes,'غير محدد') AS employee,
             COALESCE(SUM(advance),0) AS totalAdvance,
             COALESCE(SUM(repayment),0) AS totalRepaid,
             COALESCE(SUM(advance),0) - COALESCE(SUM(repayment),0) AS remaining
           FROM accAdvances
           GROUP BY notes
           ORDER BY remaining DESC`
        )),
      ]);
      const s = (summaryRes as any)[0]?.[0] ?? {};
      const byEmployee = ((byEmployeeRes as any)[0] as any[]).map((r: any) => ({
        employee:     String(r.employee ?? "غير محدد"),
        totalAdvance: Number(r.totalAdvance ?? 0),
        totalRepaid:  Number(r.totalRepaid  ?? 0),
        remaining:    Number(r.remaining    ?? 0),
      }));
      return {
        totalAdvance: Number(s.totalAdvance ?? 0),
        totalRepaid:  Number(s.totalRepaid  ?? 0),
        byEmployee,
      };
    }),

  accAdvancesLedger: accountingProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
      search:   z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let where = "";
      if (input.search?.trim()) {
        const q = input.search.trim().replace(/'/g, "");
        where = ` WHERE notes LIKE '%${q}%'`;
      }
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, advance, repayment, notes, total FROM accAdvances${where} ORDER BY txDate DESC, accessId DESC LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accAdvances${where}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:         Number(r.id),
        accessId:   Number(r.accessId),
        txDate:     String(r.txDate ?? ""),
        advance:    r.advance    != null ? Number(r.advance)    : null,
        repayment:  r.repayment  != null ? Number(r.repayment)  : null,
        notes:      r.notes      != null ? String(r.notes)      : null,
        total:      r.total      != null ? Number(r.total)      : null,
      }));
      const total = Number((countRes as any)[0]?.[0]?.n ?? 0);
      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── Loans (القرض) ─────────────────────────────────────────────────────────

  accLoansSummary: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [summaryRes, byPersonRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT COALESCE(SUM(amount),0) AS totalLoan, COALESCE(SUM(ABS(repayment)),0) AS totalPaid FROM accLoans`
        )),
        db.execute(sql.raw(
          `SELECT name,
             COALESCE(SUM(amount),0) AS totalLoan,
             COALESCE(SUM(ABS(repayment)),0) AS totalPaid,
             COALESCE(SUM(amount),0) - COALESCE(SUM(ABS(repayment)),0) AS remaining
           FROM accLoans
           WHERE name IS NOT NULL AND name <> ''
           GROUP BY name
           HAVING remaining <> 0
           ORDER BY remaining DESC`
        )),
      ]);
      const s = (summaryRes as any)[0]?.[0] ?? {};
      const byPerson = ((byPersonRes as any)[0] as any[]).map((r: any) => ({
        name:      String(r.name ?? ""),
        totalLoan: Number(r.totalLoan ?? 0),
        totalPaid: Number(r.totalPaid ?? 0),
        remaining: Number(r.remaining ?? 0),
      }));
      return {
        totalLoan: Number(s.totalLoan ?? 0),
        totalPaid: Number(s.totalPaid ?? 0),
        byPerson,
      };
    }),

  accLoansLedger: accountingProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
      search:   z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let where = "";
      if (input.search?.trim()) {
        const q = input.search.trim().replace(/'/g, "");
        where = ` WHERE name LIKE '%${q}%' OR notes LIKE '%${q}%'`;
      }
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, name, amount, repayment, remaining, notes FROM accLoans${where} ORDER BY txDate DESC, accessId DESC LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accLoans${where}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:         Number(r.id),
        accessId:   Number(r.accessId),
        txDate:     String(r.txDate ?? ""),
        name:       r.name       != null ? String(r.name)       : null,
        amount:     r.amount     != null ? Number(r.amount)     : null,
        repayment:  r.repayment  != null ? Number(r.repayment)  : null,
        remaining:  r.remaining  != null ? Number(r.remaining)  : null,
        notes:      r.notes      != null ? String(r.notes)      : null,
      }));
      const total = Number((countRes as any)[0]?.[0]?.n ?? 0);
      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── Home (البيت) ──────────────────────────────────────────────────────────

  accHomeSummary: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const res = await db.execute(sql.raw(
        `SELECT COALESCE(SUM(inAmount),0) AS totalIn, COALESCE(SUM(outAmount),0) AS totalOut FROM accHome`
      ));
      const r = (res as any)[0]?.[0] ?? {};
      return { totalIn: Number(r.totalIn ?? 0), totalOut: Number(r.totalOut ?? 0) };
    }),

  accHomeLedger: accountingProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
      search:   z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let where = "";
      if (input.search?.trim()) {
        const q = input.search.trim().replace(/'/g, "");
        where = ` WHERE notes LIKE '%${q}%'`;
      }
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, inAmount, outAmount, balance, total, notes FROM accHome${where} ORDER BY txDate DESC, accessId DESC LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accHome${where}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:        Number(r.id),
        accessId:  Number(r.accessId),
        txDate:    String(r.txDate ?? ""),
        inAmount:  r.inAmount  != null ? Number(r.inAmount)  : null,
        outAmount: r.outAmount != null ? Number(r.outAmount) : null,
        balance:   r.balance   != null ? Number(r.balance)   : null,
        total:     r.total     != null ? Number(r.total)     : null,
        notes:     r.notes     != null ? String(r.notes)     : null,
      }));
      const total = Number((countRes as any)[0]?.[0]?.n ?? 0);
      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── Instagram (انستا) ─────────────────────────────────────────────────────

  accInstagramSummary: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const res = await db.execute(sql.raw(
        `SELECT COALESCE(SUM(inAmount),0) AS totalIn, COALESCE(SUM(outAmount),0) AS totalOut FROM accInstagram`
      ));
      const r = (res as any)[0]?.[0] ?? {};
      return { totalIn: Number(r.totalIn ?? 0), totalOut: Number(r.totalOut ?? 0) };
    }),

  accInstagramLedger: accountingProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
      search:   z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let where = "";
      if (input.search?.trim()) {
        const q = input.search.trim().replace(/'/g, "");
        where = ` WHERE notes LIKE '%${q}%'`;
      }
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, inAmount, outAmount, balance, total, notes FROM accInstagram${where} ORDER BY txDate DESC, accessId DESC LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accInstagram${where}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:        Number(r.id),
        accessId:  Number(r.accessId),
        txDate:    String(r.txDate ?? ""),
        inAmount:  r.inAmount  != null ? Number(r.inAmount)  : null,
        outAmount: r.outAmount != null ? Number(r.outAmount) : null,
        balance:   r.balance   != null ? Number(r.balance)   : null,
        total:     r.total     != null ? Number(r.total)     : null,
        notes:     r.notes     != null ? String(r.notes)     : null,
      }));
      const total = Number((countRes as any)[0]?.[0]?.n ?? 0);
      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  accSaadanyLedger: accountingProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, withdrawals, repayment, total, notes FROM accSaadany ORDER BY txDate DESC, id DESC LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accSaadany`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:         Number(r.id),
        accessId:   r.accessId != null ? Number(r.accessId) : null,
        txDate:     String(r.txDate ?? ""),
        withdrawals: r.withdrawals != null ? Number(r.withdrawals) : null,
        repayment:  r.repayment  != null ? Number(r.repayment)  : null,
        total:      r.total      != null ? Number(r.total)      : null,
        notes:      r.notes      != null ? String(r.notes)      : null,
      }));
      const total = Number((countRes as any)[0]?.[0]?.n ?? 0);
      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── _T views — pure MySQL (no PowerShell) ────────────────────────────────

  accReports: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      try {
        const toNum = (v: any) => v != null ? parseFloat(String(v)) || 0 : 0;

        const [advRows] = await db.execute(sql.raw("SELECT employee, totalAdvance, totalRepaid, remaining FROM accView_Advances ORDER BY employee")) as any;
        const [loanRows] = await db.execute(sql.raw("SELECT name, totalLoan, totalPaid, remaining FROM accView_Loans ORDER BY name")) as any;
        const [[homeRow]] = await db.execute(sql.raw("SELECT totalIn, totalOut, net FROM accView_Home")) as any;
        const [[instaRow]] = await db.execute(sql.raw("SELECT totalIn, totalOut, net FROM accView_Instagram")) as any;
        const [[saadanyRow]] = await db.execute(sql.raw("SELECT totalWithdrawals, totalRepaid, remaining FROM accView_Saadany")) as any;

        return {
          advances: (advRows as any[]).map((r: any) => ({
            employee:     String(r.employee ?? ""),
            totalAdvance: toNum(r.totalAdvance),
            totalRepaid:  toNum(r.totalRepaid),
            remaining:    toNum(r.remaining),
          })),
          loans: (loanRows as any[]).map((r: any) => ({
            name:      String(r.name ?? ""),
            totalLoan: toNum(r.totalLoan),
            totalPaid: toNum(r.totalPaid),
            remaining: toNum(r.remaining),
          })),
          home: {
            totalIn:  toNum(homeRow?.totalIn),
            totalOut: toNum(homeRow?.totalOut),
            net:      toNum(homeRow?.net),
          },
          instagram: {
            totalIn:  toNum(instaRow?.totalIn),
            totalOut: toNum(instaRow?.totalOut),
            net:      toNum(instaRow?.net),
          },
          saadany: {
            totalWithdrawals: toNum(saadanyRow?.totalWithdrawals),
            totalRepaid:      toNum(saadanyRow?.totalRepaid),
            remaining:        toNum(saadanyRow?.remaining),
          },
        };
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message?.slice(0, 300) ?? "Failed to read reports" });
      }
    }),

  // ── Categories (for entry form autocomplete) ─────────────────────────────

  accCategories: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [rows] = await db.execute(sql.raw(
        `SELECT id, accessId, name, entity, isPaid FROM accCategories ORDER BY entity, name`
      )) as any;
      return (rows as any[]).map((r: any) => ({
        id:     Number(r.id),
        name:   String(r.name ?? ""),
        entity: String(r.entity ?? ""),
        isPaid: Boolean(r.isPaid),
      }));
    }),

  // ── Ledger write mutations ────────────────────────────────────────────────

  addAccEntry: accountingProcedure
    .input(z.object({
      txDate:  z.string(),
      income:  z.number().min(0).default(0),
      expense: z.number().min(0).default(0),
      notes:   z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const balance = input.income - input.expense;
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

      const [lastRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accLedger ORDER BY accessId DESC, id DESC LIMIT 1`
      )) as any;
      const runningTotal = Number((lastRes as any[])[0]?.t ?? 0) + balance;

      const [res] = await db.execute(sql.raw(
        `INSERT INTO accLedger (txDate, income, expense, balance, total, notes) VALUES (${sq(input.txDate)}, ${sq(input.income)}, ${sq(input.expense)}, ${sq(balance)}, ${sq(runningTotal)}, ${sq(input.notes || null)})`
      )) as any;
      const ledgerId: number = res.insertId;

      // Mirror to sub-table based on التصنيف matching in notes
      const mirror = await resolveMirror(db, input.notes, input.income, input.expense);
      if (mirror) {
        const [mRes] = await db.execute(sql.raw(mirror.insertSql)) as any;
        await db.execute(sql.raw(
          `UPDATE accLedger SET linkedTable=${sq(mirror.table)}, linkedId=${sq(mRes.insertId)} WHERE id=${ledgerId}`
        ));
      }
      return { id: ledgerId };
    }),

  updateAccEntry: accountingProcedure
    .input(z.object({
      id:      z.number().int(),
      txDate:  z.string(),
      income:  z.number().min(0).default(0),
      expense: z.number().min(0).default(0),
      notes:   z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const balance = input.income - input.expense;

      // Fetch existing row to get current mirror info
      const [existing] = await db.execute(sql.raw(
        `SELECT linkedTable, linkedId FROM accLedger WHERE id=${input.id}`
      )) as any;
      const cur = (existing as any[])[0];

      await db.execute(sql.raw(
        `UPDATE accLedger SET txDate=${sq(input.txDate)}, income=${sq(input.income)}, expense=${sq(input.expense)}, balance=${sq(balance)}, notes=${sq(input.notes || null)} WHERE id=${input.id}`
      ));

      // Update or replace mirror
      if (cur?.linkedTable && cur?.linkedId) {
        await deleteMirrorRow(db, cur.linkedTable, cur.linkedId);
      }
      const mirror = await resolveMirror(db, input.notes, input.income, input.expense);
      if (mirror) {
        const [mRes] = await db.execute(sql.raw(mirror.insertSql)) as any;
        await db.execute(sql.raw(
          `UPDATE accLedger SET linkedTable=${sq(mirror.table)}, linkedId=${sq(mRes.insertId)} WHERE id=${input.id}`
        ));
      } else {
        await db.execute(sql.raw(
          `UPDATE accLedger SET linkedTable=NULL, linkedId=NULL WHERE id=${input.id}`
        ));
      }
      return { id: input.id };
    }),

  deleteAccEntry: accountingProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [existing] = await db.execute(sql.raw(
        `SELECT linkedTable, linkedId FROM accLedger WHERE id=${input.id}`
      )) as any;
      const cur = (existing as any[])[0];
      if (cur?.linkedTable && cur?.linkedId) {
        await deleteMirrorRow(db, cur.linkedTable, cur.linkedId);
      }
      await db.execute(sql.raw(`DELETE FROM accLedger WHERE id=${input.id}`));
      return { ok: true };
    }),

  // ── Advances write mutations ──────────────────────────────────────────────

  addAccAdvance: accountingProcedure
    .input(z.object({
      txDate:    z.string(),
      advance:   z.number().min(0).default(0),
      repayment: z.number().min(0).default(0),
      notes:     z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const [lastRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accAdvances ORDER BY accessId DESC, id DESC LIMIT 1`
      )) as any;
      const runningTotal = Number((lastRes as any[])[0]?.t ?? 0) + (input.advance || 0) - (input.repayment || 0);
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accAdvances (txDate, advance, repayment, notes, total) VALUES (${sq(input.txDate)}, ${sq(input.advance || null)}, ${sq(input.repayment || null)}, ${sq(input.notes || null)}, ${sq(runningTotal)})`
      )) as any;
      return { id: res.insertId };
    }),

  addAccHome: accountingProcedure
    .input(z.object({
      txDate:    z.string(),
      inAmount:  z.number().min(0).default(0),
      outAmount: z.number().min(0).default(0),
      notes:     z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const balance = input.inAmount - input.outAmount;
      const [lastRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accHome ORDER BY accessId DESC, id DESC LIMIT 1`
      )) as any;
      const runningTotal = Number((lastRes as any[])[0]?.t ?? 0) + balance;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accHome (txDate, inAmount, outAmount, balance, total, notes) VALUES (${sq(input.txDate)}, ${sq(input.inAmount || null)}, ${sq(input.outAmount || null)}, ${sq(balance)}, ${sq(runningTotal)}, ${sq(input.notes || null)})`
      )) as any;
      return { id: res.insertId };
    }),

  addAccInstagram: accountingProcedure
    .input(z.object({
      txDate:    z.string(),
      inAmount:  z.number().min(0).default(0),
      outAmount: z.number().min(0).default(0),
      notes:     z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const balance = input.inAmount - input.outAmount;
      const [lastRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accInstagram ORDER BY accessId DESC, id DESC LIMIT 1`
      )) as any;
      const runningTotal = Number((lastRes as any[])[0]?.t ?? 0) + balance;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accInstagram (txDate, inAmount, outAmount, balance, total, notes) VALUES (${sq(input.txDate)}, ${sq(input.inAmount || null)}, ${sq(input.outAmount || null)}, ${sq(balance)}, ${sq(runningTotal)}, ${sq(input.notes || null)})`
      )) as any;
      return { id: res.insertId };
    }),

  // ── Loans write mutations ─────────────────────────────────────────────────

  addAccLoan: accountingProcedure
    .input(z.object({
      txDate:    z.string(),
      name:      z.string().max(200),
      amount:    z.number().min(0).default(0),
      repayment: z.number().min(0).default(0),
      notes:     z.string().max(1000).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const remaining = input.amount - input.repayment;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accLoans (txDate, name, amount, repayment, remaining, notes) VALUES (${sq(input.txDate)}, ${sq(input.name)}, ${sq(input.amount || null)}, ${sq(input.repayment || null)}, ${sq(remaining)}, ${sq(input.notes || null)})`
      )) as any;
      return { id: res.insertId };
    }),

  updateAccLoan: accountingProcedure
    .input(z.object({
      id:        z.number().int(),
      txDate:    z.string(),
      name:      z.string().max(200),
      amount:    z.number().min(0).default(0),
      repayment: z.number().min(0).default(0),
      notes:     z.string().max(1000).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const remaining = input.amount - input.repayment;
      await db.execute(sql.raw(
        `UPDATE accLoans SET txDate=${sq(input.txDate)}, name=${sq(input.name)}, amount=${sq(input.amount || null)}, repayment=${sq(input.repayment || null)}, remaining=${sq(remaining)}, notes=${sq(input.notes || null)} WHERE id=${input.id}`
      ));
      return { id: input.id };
    }),

  deleteAccLoan: accountingProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.execute(sql.raw(`DELETE FROM accLoans WHERE id=${input.id}`));
      return { ok: true };
    }),

  triggerAccSync: adminProcedure
    .mutation(async () => {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const syncScript = path.resolve(__dirname, "../scripts/sync-access-db.ts");
      try {
        execSync(`npx tsx "${syncScript}"`, { encoding: "utf8", timeout: 120_000 });
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message?.slice(0, 300) ?? "Sync failed" });
      }
    }),
});

// ── Mirror helpers ────────────────────────────────────────────────────────

const ENTITY_TABLE: Record<string, string> = {
  سلف:    "accAdvances",
  البيت:  "accHome",
  insta:  "accInstagram",
  غرابه:  "accSaadany",
};

async function resolveMirror(
  db: any,
  notes: string,
  income: number,
  expense: number,
): Promise<{ table: string; insertSql: string } | null> {
  if (!notes?.trim()) return null;
  const sq = (v: string | number | null) =>
    v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

  const [catRows] = await db.execute(sql.raw(
    `SELECT name, entity FROM accCategories WHERE name IS NOT NULL ORDER BY LENGTH(name) DESC`
  )) as any;

  let matchedEntity: string | null = null;
  const notesTrimmed = notes.trim();
  for (const cat of catRows as any[]) {
    const name: string = String(cat.name ?? "").trim();
    if (!name) continue;
    if (notesTrimmed.startsWith(name) || notesTrimmed.includes(name)) {
      matchedEntity = String(cat.entity ?? "");
      break;
    }
  }
  if (!matchedEntity || !ENTITY_TABLE[matchedEntity]) return null;

  const table = ENTITY_TABLE[matchedEntity];
  // Routing trick: if both income + expense present, mirror only expense
  const mirrorAmount = (income > 0 && expense > 0) ? expense
    : income > 0 ? income
    : expense;
  const isOut = (income > 0 && expense > 0) || expense > 0;

  let insertSql = "";
  const notesVal = sq(notes || null);
  const today = new Date().toISOString().split("T")[0];

  if (table === "accAdvances") {
    const advance   = isOut ? sq(mirrorAmount) : sq(null);   // expense = سلفة خارجة
    const repayment = isOut ? sq(null) : sq(mirrorAmount);   // income  = سداد داخل
    insertSql = `INSERT INTO accAdvances (txDate, advance, repayment, notes) VALUES (${sq(today)}, ${advance}, ${repayment}, ${notesVal})`;
  } else if (table === "accHome" || table === "accInstagram") {
    const inAmt  = isOut ? sq(null) : sq(mirrorAmount);
    const outAmt = isOut ? sq(mirrorAmount) : sq(null);
    insertSql = `INSERT INTO ${table} (txDate, inAmount, outAmount, notes) VALUES (${sq(today)}, ${inAmt}, ${outAmt}, ${notesVal})`;
  } else if (table === "accSaadany") {
    const withdrawals = isOut ? sq(mirrorAmount) : sq(null);
    const repayment   = isOut ? sq(null) : sq(mirrorAmount);
    insertSql = `INSERT INTO accSaadany (txDate, withdrawals, repayment, notes) VALUES (${sq(today)}, ${withdrawals}, ${repayment}, ${notesVal})`;
  }
  return insertSql ? { table, insertSql } : null;
}

async function deleteMirrorRow(db: any, table: string, id: number) {
  const allowed = Object.values(ENTITY_TABLE);
  if (!allowed.includes(table)) return;
  await db.execute(sql.raw(`DELETE FROM ${table} WHERE id=${id}`)).catch(() => {});
}

function buildDateWhere(dateFrom?: string, dateTo?: string): string {
  const parts: string[] = [];
  if (dateFrom) parts.push(`txDate >= '${dateFrom.replace(/'/g, "")}'`);
  if (dateTo)   parts.push(`txDate <= '${dateTo.replace(/'/g, "")}'`);
  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
}

export type AccountingRouter = typeof accountingRouter;
