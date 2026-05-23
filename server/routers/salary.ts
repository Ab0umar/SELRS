import { z } from 'zod';
import { router } from '../_core/procedures';
import { managerProcedure } from '../_core/procedures';
import { getDb } from '../db';
import {
  salaryBasics,
  salaryPenalties,
  salaryCommissionPools,
  salaryPayroll,
  attendanceEmployees,
} from '../../drizzle/schema';
import { eq, and, gte, lte, isNull, or, desc } from 'drizzle-orm';
import { PayrollComputeService } from '../services/salary/payrollCompute.service';

export const salaryRouter = router({
  // ── Basics ──────────────────────────────────────────────
  listBasics: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    const rows = await db
      .select({
        id: salaryBasics.id,
        empCd: salaryBasics.empCd,
        basicAmount: salaryBasics.basicAmount,
        effectiveFrom: salaryBasics.effectiveFrom,
        effectiveTo: salaryBasics.effectiveTo,
        notes: salaryBasics.notes,
        fullName: attendanceEmployees.fullName,
        department: attendanceEmployees.department,
      })
      .from(salaryBasics)
      .leftJoin(attendanceEmployees, eq(salaryBasics.empCd, attendanceEmployees.empCd))
      .orderBy(desc(salaryBasics.effectiveFrom));
    return rows;
  }),

  setBasic: managerProcedure
    .input(
      z.object({
        empCd: z.string().min(1),
        basicAmount: z.number().positive(),
        effectiveFrom: z.string(),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const result = await db.insert(salaryBasics).values({
        empCd: input.empCd,
        basicAmount: String(input.basicAmount) as any,
        effectiveFrom: input.effectiveFrom as any,
        effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
        notes: input.notes,
      });
      return { id: (result as any).insertId };
    }),

  updateBasic: managerProcedure
    .input(
      z.object({
        id: z.number().int(),
        basicAmount: z.number().positive().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const upd: any = {};
      if (input.basicAmount !== undefined) upd.basicAmount = String(input.basicAmount);
      if (input.effectiveFrom !== undefined) upd.effectiveFrom = input.effectiveFrom;
      if (input.effectiveTo !== undefined) upd.effectiveTo = input.effectiveTo ?? null;
      if (input.notes !== undefined) upd.notes = input.notes;
      if (Object.keys(upd).length)
        await db.update(salaryBasics).set(upd).where(eq(salaryBasics.id, input.id));
      return { success: true };
    }),

  deleteBasic: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(salaryBasics).where(eq(salaryBasics.id, input.id));
      return { success: true };
    }),

  // ── Penalties ────────────────────────────────────────────
  listPenalties: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const rows = await db
        .select({
          id: salaryPenalties.id,
          empCd: salaryPenalties.empCd,
          year: salaryPenalties.year,
          month: salaryPenalties.month,
          amount: salaryPenalties.amount,
          reason: salaryPenalties.reason,
          createdAt: salaryPenalties.createdAt,
          fullName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
        })
        .from(salaryPenalties)
        .leftJoin(attendanceEmployees, eq(salaryPenalties.empCd, attendanceEmployees.empCd))
        .where(
          and(eq(salaryPenalties.year, input.year), eq(salaryPenalties.month, input.month))
        )
        .orderBy(desc(salaryPenalties.createdAt));
      return rows;
    }),

  addPenalty: managerProcedure
    .input(
      z.object({
        empCd: z.string().min(1),
        year: z.number().int(),
        month: z.number().int(),
        amount: z.number().positive(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const result = await db.insert(salaryPenalties).values({
        empCd: input.empCd,
        year: input.year,
        month: input.month,
        amount: String(input.amount) as any,
        reason: input.reason,
      });
      return { id: (result as any).insertId };
    }),

  deletePenalty: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(salaryPenalties).where(eq(salaryPenalties.id, input.id));
      return { success: true };
    }),

  // ── Commission Pools ─────────────────────────────────────
  getCommissionPool: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const rows = await db
        .select()
        .from(salaryCommissionPools)
        .where(
          and(eq(salaryCommissionPools.year, input.year), eq(salaryCommissionPools.month, input.month))
        )
        .limit(1);
      return rows[0] ?? null;
    }),

  setCommissionPool: managerProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        examPool: z.number().min(0),
        pentacamPool: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db
        .insert(salaryCommissionPools)
        .values({
          year: input.year,
          month: input.month,
          examPool: String(input.examPool) as any,
          pentacamPool: String(input.pentacamPool) as any,
          notes: input.notes,
        })
        .onDuplicateKeyUpdate({
          set: {
            examPool: String(input.examPool) as any,
            pentacamPool: String(input.pentacamPool) as any,
            notes: input.notes,
          },
        });
      return { success: true };
    }),

  // ── Payroll ──────────────────────────────────────────────
  computePayroll: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .mutation(async ({ input }) => {
      const rows = await PayrollComputeService.compute(input.year, input.month);
      const saved = await PayrollComputeService.savePayroll(rows);
      return { saved, rows };
    }),

  getPayroll: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const rows = await db
        .select({
          id: salaryPayroll.id,
          empCd: salaryPayroll.empCd,
          year: salaryPayroll.year,
          month: salaryPayroll.month,
          basicSalary: salaryPayroll.basicSalary,
          workingDays: salaryPayroll.workingDays,
          absentDays: salaryPayroll.absentDays,
          lateMinutes: salaryPayroll.lateMinutes,
          leaveDays: salaryPayroll.leaveDays,
          absentDeduction: salaryPayroll.absentDeduction,
          lateDeduction: salaryPayroll.lateDeduction,
          penaltyDeduction: salaryPayroll.penaltyDeduction,
          totalDeductions: salaryPayroll.totalDeductions,
          deductionPct: salaryPayroll.deductionPct,
          leaveMultiplier: salaryPayroll.leaveMultiplier,
          netBasic: salaryPayroll.netBasic,
          attendanceCommission: salaryPayroll.attendanceCommission,
          examCommission: salaryPayroll.examCommission,
          pentacamCommission: salaryPayroll.pentacamCommission,
          totalCommission: salaryPayroll.totalCommission,
          totalPay: salaryPayroll.totalPay,
          payrollStatus: salaryPayroll.payrollStatus,
          computedAt: salaryPayroll.computedAt,
          fullName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
        })
        .from(salaryPayroll)
        .leftJoin(attendanceEmployees, eq(salaryPayroll.empCd, attendanceEmployees.empCd))
        .where(
          and(eq(salaryPayroll.year, input.year), eq(salaryPayroll.month, input.month))
        )
        .orderBy(attendanceEmployees.fullName);
      return rows;
    }),

  finalizePayroll: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db
        .update(salaryPayroll)
        .set({ payrollStatus: 'final' })
        .where(
          and(eq(salaryPayroll.year, input.year), eq(salaryPayroll.month, input.month))
        );
      return { success: true };
    }),

  listEmployees: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    return await db
      .select({ empCd: attendanceEmployees.empCd, fullName: attendanceEmployees.fullName, department: attendanceEmployees.department })
      .from(attendanceEmployees)
      .orderBy(attendanceEmployees.fullName);
  }),
});
