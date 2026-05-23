import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { getDb, upsertPatientServiceEntry } from "../db";
import { addMultiServiceReceiptInMssql, createMssqlPool } from "../integrations/mssqlPatients";
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
        `SELECT TOP 1 PAT_CD, NAM FROM PAJRNRCVH WHERE PAT_CD = @code
         ORDER BY CASE WHEN ISDATE(UPDATEDATE) = 1 THEN CONVERT(datetime, UPDATEDATE) END DESC,
                  CASE WHEN ISDATE(ENTRYDATE)  = 1 THEN CONVERT(datetime, ENTRYDATE)  END DESC`,
        { code: input.patientCode }
      );
      return rows[0] ? { patientCode: rows[0].PAT_CD, patientName: rows[0].NAM } : null;
    }),

  patientNameLookup: accountingProcedure
    .input(z.object({ patientCode: z.string() }))
    .query(async ({ input }) => {
      const code = input.patientCode.trim();
      if (!code) return null;
      const db = await getDb();
      if (!db) return null;
      const sq = (v: string) => `'${v.replace(/'/g, "''")}'`;
      const [rows] = await db.execute(sql.raw(
        `SELECT fullName FROM patients WHERE patientCode=${sq(code)} LIMIT 1`
      )) as any;
      const patient = (rows as any[])[0];
      return patient ? { patientName: String(patient.fullName) } : null;
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

  serviceEntryCatalog: accountingProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [servicesRes, doctorsRes] = await Promise.all([
      db.execute(sql.raw(
        `SELECT code, name, price
         FROM services
         WHERE isActive = 1 AND code IS NOT NULL AND code <> ''
         ORDER BY CAST(code AS UNSIGNED), code`
      )),
      db.execute(sql.raw(
        `SELECT code, name
         FROM doctors
         WHERE code IS NOT NULL AND code <> '' AND COALESCE(isActive, 1) <> 0
         ORDER BY CAST(code AS UNSIGNED), code`
      )),
    ]);
    return {
      services: ((servicesRes as any)[0] as any[]).map((r: any) => ({
        code: String(r.code ?? ""),
        name: String(r.name ?? ""),
        price: Number(r.price ?? 0),
      })),
      doctors: ((doctorsRes as any)[0] as any[]).map((r: any) => ({
        code: String(r.code ?? ""),
        name: String(r.name ?? ""),
      })),
    };
  }),

  addPatientServices: accountingProcedure
    .input(z.object({
      patientCode: z.string().min(1),
      doctorCode: z.string().optional(),
      doctorName: z.string().optional(),
      lines: z.array(z.object({
        serviceCode: z.string().min(1),
        serviceName: z.string().optional(),
        quantity: z.number().int().positive().max(99).default(1),
        discount: z.number().min(0).optional(),
        price: z.number().min(0).optional(),
      })).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const patientCode = input.patientCode.trim();
      const mssqlPatientRows = await mssqlQuery<{ PAT_CD: string; NAM: string }>(
        `SELECT TOP 1 PAT_CD, NAM FROM PAJRNRCVH WHERE PAT_CD = @code
         ORDER BY CASE WHEN ISDATE(UPDATEDATE) = 1 THEN CONVERT(datetime, UPDATEDATE) END DESC,
                  CASE WHEN ISDATE(ENTRYDATE)  = 1 THEN CONVERT(datetime, ENTRYDATE)  END DESC`,
        { code: patientCode },
      );
      if (!mssqlPatientRows[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient code was not found in MSSQL",
        });
      }

      const [patientRes] = await db.execute(sql.raw(
        `SELECT id, fullName FROM patients WHERE patientCode=${sq(patientCode)} LIMIT 1`
      )) as any;
      const patient = (patientRes as any[])[0];
      if (!patient?.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient exists in MSSQL but is not synced to MySQL yet",
        });
      }

      const serviceTotals = new Map<string, { serviceName: string; quantity: number; discount?: number; price?: number }>();
      for (const line of input.lines) {
        const serviceCode = line.serviceCode.trim();
        if (!serviceCode) continue;
        const current = serviceTotals.get(serviceCode);
        serviceTotals.set(serviceCode, {
          serviceName: line.serviceName?.trim() || current?.serviceName || "",
          quantity: (current?.quantity ?? 0) + Math.max(1, Math.trunc(line.quantity || 1)),
          discount: line.discount ?? current?.discount,
          price: line.price ?? current?.price,
        });
      }
      if (serviceTotals.size === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No services selected" });
      }

      let mysqlLinked = 0;
      const serviceDate = new Date().toISOString().slice(0, 10);

      const mssqlLines = Array.from(serviceTotals.entries()).map(([serviceCode, line]) => ({
        serviceCode,
        quantity: line.quantity,
        discount: line.discount,
        priceOverride: line.price,
      }));
      const mssqlResult = await addMultiServiceReceiptInMssql(
        patientCode,
        mssqlLines,
        input.doctorCode ?? null,
      );
      const mssqlLinked = mssqlResult.inserted ? 1 : 0;

      for (const [serviceCode, line] of serviceTotals) {
        const [serviceRes] = await db.execute(sql.raw(
          `SELECT name FROM services WHERE code=${sq(serviceCode)} LIMIT 1`
        )) as any;
        const serviceName = String((serviceRes as any[])[0]?.name ?? line.serviceName ?? "").trim();

        await upsertPatientServiceEntry({
          patientId: Number(patient.id),
          serviceCode,
          serviceName,
          source: "manual",
          sourceRef: `manual:accounting:${patientCode}:${serviceCode}`,
          serviceDate,
        });
        mysqlLinked += 1;
      }

      return {
        patientCode,
        patientName: String(patient.fullName ?? mssqlPatientRows[0].NAM ?? ""),
        mysqlLinked,
        mssqlLinked,
      };
    }),

  deleteReceipt: accountingProcedure
    .input(z.object({
      patientCode: z.string().min(1),
      trNo: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      const targetTable = String(process.env.MSSQL_PUSH_PATIENTS_TABLE ?? "op2026.dbo.PAJRNRCVH").trim();
      const pool = await createMssqlPool();
      try {
        await pool.connect();
        const vstReq = pool.request();
        vstReq.input("PAT_CD", input.patientCode);
        vstReq.input("TR_NO", input.trNo);
        const vstRs = await vstReq.query(
          `SELECT TOP 1 VST_NO FROM ${targetTable} WHERE PAT_CD = @PAT_CD AND CAST(ISNULL(CONVERT(varchar(20), TR_NO), '0') AS INT) = @TR_NO`
        );
        const vstNo = vstRs?.recordset?.[0]?.VST_NO;

        const delReq = pool.request();
        delReq.input("PAT_CD", input.patientCode);
        delReq.input("TR_NO", input.trNo);
        await delReq.query(
          `DELETE FROM ${targetTable} WHERE PAT_CD = @PAT_CD AND CAST(ISNULL(CONVERT(varchar(20), TR_NO), '0') AS INT) = @TR_NO`
        );

        if (vstNo != null) {
          const delSrvReq = pool.request();
          delSrvReq.input("PAT_CD", input.patientCode);
          delSrvReq.input("VST_NO", vstNo);
          await delSrvReq.query(
            `DELETE FROM op2026.dbo.PAPAT_SRV WHERE PAT_CD = @PAT_CD AND CAST(ISNULL(CONVERT(varchar(20), VST_NO), '0') AS INT) = CAST(ISNULL(CONVERT(varchar(20), @VST_NO), '0') AS INT)`
          );
        }
        return { deleted: true };
      } finally {
        try { await pool.close(); } catch {}
      }
    }),

  updateReceipt: accountingProcedure
    .input(z.object({
      patientCode: z.string().min(1),
      trNo: z.number().int(),
      paidAmount: z.number().min(0).optional(),
      discount: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const targetTable = String(process.env.MSSQL_PUSH_PATIENTS_TABLE ?? "op2026.dbo.PAJRNRCVH").trim();
      const parts: string[] = [];
      if (input.paidAmount != null) parts.push("PA_VL = @PA_VL");
      if (input.discount != null) parts.push("DISC = @DISC");
      if (parts.length === 0) return { updated: false };
      const pool = await createMssqlPool();
      try {
        await pool.connect();
        const req = pool.request();
        req.input("PAT_CD", input.patientCode);
        req.input("TR_NO", input.trNo);
        if (input.paidAmount != null) req.input("PA_VL", input.paidAmount);
        if (input.discount != null) req.input("DISC", input.discount);
        await req.query(
          `UPDATE ${targetTable} SET ${parts.join(", ")}, UPDATEDATE = GETDATE() WHERE PAT_CD = @PAT_CD AND CAST(ISNULL(CONVERT(varchar(20), TR_NO), '0') AS INT) = @TR_NO`
        );
        return { updated: true };
      } finally {
        try { await pool.close(); } catch {}
      }
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
      const [periodRes, allRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT COALESCE(SUM(income),0) AS totalIncome, COALESCE(SUM(expense),0) AS totalExpense, COUNT(*) AS txCount FROM accLedger${where}`
        )),
        // total = running cumulative (الاجمالي), auto-calculated by MySQL after sync
        db.execute(sql.raw(
          `SELECT COALESCE(total, 0) AS currentBalance FROM accLedger ORDER BY txDate DESC, accessId DESC LIMIT 1`
        )),
      ]);
      const p = (periodRes as any)[0]?.[0] ?? {};
      const b = (allRes as any)[0]?.[0] ?? {};
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
      sortDir:  z.enum(["asc","desc"]).default("desc"),
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
      const dir = input.sortDir.toUpperCase();
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, income, expense, notes,
            COALESCE(income, 0) - COALESCE(expense, 0) AS balance,
            SUM(COALESCE(income, 0) - COALESCE(expense, 0)) OVER (ORDER BY txDate ASC, accessId ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total
           FROM accLedger${where} ORDER BY txDate ${dir}, accessId ${dir} LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
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
      sortDir:  z.enum(["asc","desc"]).default("desc"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let searchCond = "";
      if (input.search?.trim()) {
        const q = input.search.trim().replace(/'/g, "");
        searchCond = ` AND employee LIKE '%${q}%'`;
      }
      const offset = (input.page - 1) * input.pageSize;
      const [rowsRes, countRes] = await Promise.all([
        db.execute(sql.raw(
          `SELECT id, accessId, txDate, advance, repayment, notes, employee,
             SUM(COALESCE(advance,0) - COALESCE(repayment,0)) OVER (
               PARTITION BY employee
               ORDER BY txDate ASC, id ASC
             ) AS runningTotal
           FROM accAdvances
           WHERE 1=1${searchCond}
           ORDER BY txDate ${input.sortDir.toUpperCase()}, id ${input.sortDir.toUpperCase()} LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accAdvances WHERE 1=1${searchCond}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:           Number(r.id),
        accessId:     r.accessId != null ? Number(r.accessId) : null,
        txDate:       String(r.txDate ?? ""),
        advance:      r.advance    != null ? Number(r.advance)    : null,
        repayment:    r.repayment  != null ? Number(r.repayment)  : null,
        notes:        r.notes      != null ? String(r.notes)      : null,
        employee:     r.employee   != null ? String(r.employee)   : null,
        runningTotal: r.runningTotal != null ? Number(r.runningTotal) : null,
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
      sortDir:  z.enum(["asc","desc"]).default("desc"),
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
          `SELECT id, accessId, txDate, name, amount, repayment, remaining, notes,
           SUM(COALESCE(amount,0) - COALESCE(repayment,0)) OVER (ORDER BY txDate ASC, id ASC) AS total
           FROM accLoans${where} ORDER BY txDate ${input.sortDir.toUpperCase()}, id ${input.sortDir.toUpperCase()} LIMIT ${input.pageSize} OFFSET ${offset}`
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
        total:      r.total      != null ? Number(r.total)      : null,
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
      sortDir:  z.enum(["asc","desc"]).default("desc"),
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
          `SELECT id, accessId, txDate, inAmount, outAmount, notes,
            COALESCE(inAmount, 0) - COALESCE(outAmount, 0) AS balance,
            SUM(COALESCE(inAmount, 0) - COALESCE(outAmount, 0)) OVER (ORDER BY txDate ASC, accessId ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total
           FROM accHome${where} ORDER BY txDate ${input.sortDir.toUpperCase()}, accessId ${input.sortDir.toUpperCase()} LIMIT ${input.pageSize} OFFSET ${offset}`
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

  // ── Instapay (انستاباي) ───────────────────────────────────────────────────

  accInstapaySummary: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const res = await db.execute(sql.raw(
        `SELECT COALESCE(SUM(inAmount),0) AS totalIn, COALESCE(SUM(outAmount),0) AS totalOut FROM accInstapay`
      ));
      const r = (res as any)[0]?.[0] ?? {};
      return { totalIn: Number(r.totalIn ?? 0), totalOut: Number(r.totalOut ?? 0) };
    }),

  accInstapayLedger: accountingProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
      search:   z.string().optional(),
      sortDir:  z.enum(["asc","desc"]).default("desc"),
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
          `SELECT id, accessId, txDate, inAmount, outAmount, notes,
            COALESCE(inAmount, 0) - COALESCE(outAmount, 0) AS balance,
            SUM(COALESCE(inAmount, 0) - COALESCE(outAmount, 0)) OVER (ORDER BY txDate ASC, accessId ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total
           FROM accInstapay${where} ORDER BY txDate ${input.sortDir.toUpperCase()}, accessId ${input.sortDir.toUpperCase()} LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accInstapay${where}`)),
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
      search:   z.string().optional(),
      sortDir:  z.enum(["asc","desc"]).default("desc"),
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
          `SELECT id, accessId, txDate, ABS(withdrawals) AS withdrawals, repayment, notes,
           SUM(ABS(IFNULL(withdrawals,0)) - IFNULL(repayment,0)) OVER (ORDER BY txDate ASC, id ASC) AS runningTotal
           FROM accSaadany${where} ORDER BY txDate ${input.sortDir.toUpperCase()}, id ${input.sortDir.toUpperCase()} LIMIT ${input.pageSize} OFFSET ${offset}`
        )),
        db.execute(sql.raw(`SELECT COUNT(*) AS n FROM accSaadany${where}`)),
      ]);
      const rows = ((rowsRes as any)[0] as any[]).map((r: any) => ({
        id:         Number(r.id),
        accessId:   r.accessId != null ? Number(r.accessId) : null,
        txDate:     String(r.txDate ?? ""),
        withdrawals: r.withdrawals != null ? Number(r.withdrawals) : null,
        repayment:    r.repayment    != null ? Number(r.repayment)    : null,
        runningTotal: r.runningTotal != null ? Number(r.runningTotal) : null,
        notes:        r.notes        != null ? String(r.notes)        : null,
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

        const [advRows] = await db.execute(sql.raw(
          `SELECT employee,
             COALESCE(SUM(advance),0) AS totalAdvance,
             COALESCE(SUM(repayment),0) AS totalRepaid,
             COALESCE(SUM(advance),0) - COALESCE(SUM(repayment),0) AS remaining
           FROM accAdvances
           WHERE employee IS NOT NULL AND employee != ''
           GROUP BY employee
           ORDER BY employee`
        )) as any;
        const [loanRows] = await db.execute(sql.raw("SELECT name, totalLoan, totalPaid, remaining FROM accView_Loans ORDER BY name")) as any;
        const [[homeRow]] = await db.execute(sql.raw("SELECT totalIn, totalOut, net FROM accView_Home")) as any;
        const [[instaRow]] = await db.execute(sql.raw("SELECT totalIn, totalOut, net FROM accView_Instapay")) as any;
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
          instapay: {
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

  // ── Employees list (for advance form) ────────────────────────────────────

  accEmployeesList: accountingProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [rows] = await db.execute(sql.raw(
        `SELECT id, name FROM accEmployees ORDER BY name`
      )) as any;
      return (rows as any[]).map((r: any) => ({ id: Number(r.id), name: String(r.name) }));
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

      const [res] = await db.execute(sql.raw(
        `INSERT INTO accLedger (txDate, income, expense, balance, notes) VALUES (${sq(input.txDate)}, ${sq(input.income)}, ${sq(input.expense)}, ${sq(balance)}, ${sq(input.notes || null)})`
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
      await recalcLedgerTotals(db);
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
      await recalcLedgerTotals(db);
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
      await recalcLedgerTotals(db);
      return { ok: true };
    }),

  // ── Advances write mutations ──────────────────────────────────────────────

  addAccAdvance: accountingProcedure
    .input(z.object({
      txDate:    z.string(),
      employee:  z.string().max(200),
      advance:   z.number().min(0).default(0),
      repayment: z.number().min(0).default(0),
      notes:     z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accAdvances (txDate, employee, advance, repayment, notes) VALUES (${sq(input.txDate)}, ${sq(input.employee)}, ${sq(input.advance || null)}, ${sq(input.repayment || null)}, ${sq(input.notes || null)})`
      )) as any;
      return { id: res.insertId };
    }),

  updateAccAdvance: accountingProcedure
    .input(z.object({
      id:        z.number().int(),
      txDate:    z.string(),
      employee:  z.string().max(200),
      advance:   z.number().min(0).default(0),
      repayment: z.number().min(0).default(0),
      notes:     z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      await db.execute(sql.raw(
        `UPDATE accAdvances SET txDate=${sq(input.txDate)}, employee=${sq(input.employee)}, advance=${sq(input.advance || null)}, repayment=${sq(input.repayment || null)}, notes=${sq(input.notes || null)} WHERE id=${input.id}`
      ));
      return { id: input.id };
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
      const [lastHomeRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accHome WHERE total IS NOT NULL ORDER BY id DESC LIMIT 1`
      )) as any;
      const homeTotal = Number((lastHomeRes as any[])[0]?.t ?? 0) + balance;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accHome (txDate, inAmount, outAmount, balance, total, notes) VALUES (${sq(input.txDate)}, ${sq(input.inAmount || null)}, ${sq(input.outAmount || null)}, ${sq(balance)}, ${sq(homeTotal)}, ${sq(input.notes || null)})`
      )) as any;
      return { id: res.insertId };
    }),

  addAccInstapay: accountingProcedure
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
      const [lastInstaRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accInstapay WHERE total IS NOT NULL ORDER BY id DESC LIMIT 1`
      )) as any;
      const instaTotal = Number((lastInstaRes as any[])[0]?.t ?? 0) + balance;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accInstapay (txDate, inAmount, outAmount, balance, total, notes) VALUES (${sq(input.txDate)}, ${sq(input.inAmount || null)}, ${sq(input.outAmount || null)}, ${sq(balance)}, ${sq(instaTotal)}, ${sq(input.notes || null)})`
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
      const [lastLoanRes] = await db.execute(sql.raw(
        `SELECT COALESCE(total, 0) AS t FROM accLoans WHERE total IS NOT NULL ORDER BY id DESC LIMIT 1`
      )) as any;
      const loanTotal = Number((lastLoanRes as any[])[0]?.t ?? 0) + remaining;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accLoans (txDate, name, amount, repayment, remaining, total, notes) VALUES (${sq(input.txDate)}, ${sq(input.name)}, ${sq(input.amount || null)}, ${sq(input.repayment || null)}, ${sq(remaining)}, ${sq(loanTotal)}, ${sq(input.notes || null)})`
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

  deleteAccAdvance: accountingProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.execute(sql.raw(`DELETE FROM accAdvances WHERE id=${input.id}`));
      return { ok: true };
    }),

  deleteAccHome: accountingProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.execute(sql.raw(`DELETE FROM accHome WHERE id=${input.id}`));
      return { ok: true };
    }),

  deleteAccInstapay: accountingProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.execute(sql.raw(`DELETE FROM accInstapay WHERE id=${input.id}`));
      return { ok: true };
    }),

  deleteAccSaadany: accountingProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.execute(sql.raw(`DELETE FROM accSaadany WHERE id=${input.id}`));
      return { ok: true };
    }),

  updateAccHome: accountingProcedure
    .input(z.object({
      id:        z.number().int(),
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
      await db.execute(sql.raw(
        `UPDATE accHome SET txDate=${sq(input.txDate)}, inAmount=${sq(input.inAmount || null)}, outAmount=${sq(input.outAmount || null)}, balance=${sq(balance)}, notes=${sq(input.notes || null)} WHERE id=${input.id}`
      ));
      return { id: input.id };
    }),

  updateAccInstapay: accountingProcedure
    .input(z.object({
      id:        z.number().int(),
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
      await db.execute(sql.raw(
        `UPDATE accInstapay SET txDate=${sq(input.txDate)}, inAmount=${sq(input.inAmount || null)}, outAmount=${sq(input.outAmount || null)}, balance=${sq(balance)}, notes=${sq(input.notes || null)} WHERE id=${input.id}`
      ));
      return { id: input.id };
    }),

  addAccSaadany: accountingProcedure
    .input(z.object({
      txDate:     z.string(),
      withdrawals: z.number().min(0).default(0),
      repayment:  z.number().min(0).default(0),
      notes:      z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const [res] = await db.execute(sql.raw(
        `INSERT INTO accSaadany (txDate, withdrawals, repayment, notes) VALUES (${sq(input.txDate)}, ${sq(input.withdrawals ? -input.withdrawals : null)}, ${sq(input.repayment || null)}, ${sq(input.notes || null)})`
      )) as any;
      return { id: res.insertId };
    }),

  updateAccSaadany: accountingProcedure
    .input(z.object({
      id:         z.number().int(),
      txDate:     z.string(),
      withdrawals: z.number().min(0).default(0),
      repayment:  z.number().min(0).default(0),
      notes:      z.string().max(500).default(""),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const sq = (v: string | number | null) =>
        v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      await db.execute(sql.raw(
        `UPDATE accSaadany SET txDate=${sq(input.txDate)}, withdrawals=${sq(input.withdrawals ? -input.withdrawals : null)}, repayment=${sq(input.repayment || null)}, notes=${sq(input.notes || null)} WHERE id=${input.id}`
      ));
      return { id: input.id };
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
  insta:  "accInstapay",
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
    const [lastRes] = await db.execute(sql.raw(
      `SELECT COALESCE(total, 0) AS t FROM accAdvances WHERE total IS NOT NULL ORDER BY id DESC LIMIT 1`
    )) as any;
    const runningTotal = Number((lastRes as any[])[0]?.t ?? 0) + (isOut ? mirrorAmount : 0) - (isOut ? 0 : mirrorAmount);
    insertSql = `INSERT INTO accAdvances (txDate, advance, repayment, notes, total) VALUES (${sq(today)}, ${advance}, ${repayment}, ${notesVal}, ${sq(runningTotal)})`;
  } else if (table === "accHome" || table === "accInstapay") {
    const inAmt  = isOut ? 0 : mirrorAmount;
    const outAmt = isOut ? mirrorAmount : 0;
    const bal    = inAmt - outAmt;
    const [lastT] = await db.execute(sql.raw(
      `SELECT COALESCE(total, 0) AS t FROM ${table} WHERE total IS NOT NULL ORDER BY id DESC LIMIT 1`
    )) as any;
    const runningT = Number((lastT as any[])[0]?.t ?? 0) + bal;
    insertSql = `INSERT INTO ${table} (txDate, inAmount, outAmount, balance, total, notes) VALUES (${sq(today)}, ${sq(inAmt || null)}, ${sq(outAmt || null)}, ${sq(bal)}, ${sq(runningT)}, ${notesVal})`;
  } else if (table === "accSaadany") {
    const withdrawals = isOut ? mirrorAmount : 0;
    const repayment   = isOut ? 0 : mirrorAmount;
    const [lastSaad] = await db.execute(sql.raw(
      `SELECT COALESCE(total, 0) AS t FROM accSaadany WHERE total IS NOT NULL ORDER BY id DESC LIMIT 1`
    )) as any;
    const saadTotal = Number((lastSaad as any[])[0]?.t ?? 0) + withdrawals - repayment;
    insertSql = `INSERT INTO accSaadany (txDate, withdrawals, repayment, total, notes) VALUES (${sq(today)}, ${sq(withdrawals ? -withdrawals : null)}, ${sq(repayment || null)}, ${sq(saadTotal)}, ${notesVal})`;
  }
  return insertSql ? { table, insertSql } : null;
}

async function deleteMirrorRow(db: any, table: string, id: number) {
  const allowed = Object.values(ENTITY_TABLE);
  if (!allowed.includes(table)) return;
  await db.execute(sql.raw(`DELETE FROM ${table} WHERE id=${id}`)).catch(() => {});
}

async function recalcLedgerTotals(db: any) {
  // Recompute total only for UI-added rows (no accessId); accdb rows keep their synced total
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
}

function buildDateWhere(dateFrom?: string, dateTo?: string): string {
  const parts: string[] = [];
  if (dateFrom) parts.push(`txDate >= '${dateFrom.replace(/'/g, "")}'`);
  if (dateTo)   parts.push(`txDate <= '${dateTo.replace(/'/g, "")}'`);
  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
}

export type AccountingRouter = typeof accountingRouter;
