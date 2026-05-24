import { z } from 'zod';
import { router, attendanceManagerProcedure as managerProcedure } from '../_core/procedures';
import { getDb } from '../db';
import {
  salaryBasics,
  salaryPenalties,
  salaryCommissionPools,
  salaryPayroll,
  salaryRaiseHistory,
  salaryConfig,
  attendanceEmployees,
  shiftStaff,
  shiftAttendance,
} from '../../drizzle/schema';
import { eq, and, gte, lte, isNull, or, desc } from 'drizzle-orm';
import { PayrollComputeService, calcPentacamPool } from '../services/salary/payrollCompute.service';

const allowanceInput = z.object({
  basicAmount: z.number().min(0),
  socialAllowance: z.number().min(0).optional().default(0),
  costOfLivingAllowance: z.number().min(0).optional().default(0),
  transportAllowance: z.number().min(0).optional().default(0),
  workNatureAllowance: z.number().min(0).optional().default(0),
  receptionAllowance: z.number().min(0).optional().default(0),
  yearlyRaise: z.number().min(0).optional().default(0),
});

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
        socialAllowance: salaryBasics.socialAllowance,
        costOfLivingAllowance: salaryBasics.costOfLivingAllowance,
        transportAllowance: salaryBasics.transportAllowance,
        workNatureAllowance: salaryBasics.workNatureAllowance,
        receptionAllowance: salaryBasics.receptionAllowance,
        yearlyRaise: salaryBasics.yearlyRaise,
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
      allowanceInput.extend({
        empCd: z.string().min(1),
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
        socialAllowance: String(input.socialAllowance ?? 0) as any,
        costOfLivingAllowance: String(input.costOfLivingAllowance ?? 0) as any,
        transportAllowance: String(input.transportAllowance ?? 0) as any,
        workNatureAllowance: String(input.workNatureAllowance ?? 0) as any,
        receptionAllowance: String(input.receptionAllowance ?? 0) as any,
        yearlyRaise: String(input.yearlyRaise ?? 0) as any,
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
        basicAmount: z.number().min(0).optional(),
        socialAllowance: z.number().min(0).optional(),
        costOfLivingAllowance: z.number().min(0).optional(),
        transportAllowance: z.number().min(0).optional(),
        workNatureAllowance: z.number().min(0).optional(),
        receptionAllowance: z.number().min(0).optional(),
        yearlyRaise: z.number().min(0).optional(),
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
      if (input.socialAllowance !== undefined) upd.socialAllowance = String(input.socialAllowance);
      if (input.costOfLivingAllowance !== undefined) upd.costOfLivingAllowance = String(input.costOfLivingAllowance);
      if (input.transportAllowance !== undefined) upd.transportAllowance = String(input.transportAllowance);
      if (input.workNatureAllowance !== undefined) upd.workNatureAllowance = String(input.workNatureAllowance);
      if (input.receptionAllowance !== undefined) upd.receptionAllowance = String(input.receptionAllowance);
      if (input.yearlyRaise !== undefined) upd.yearlyRaise = String(input.yearlyRaise);
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
    .input(z.object({ year: z.number().int(), month: z.number().int(), section: z.string().default('مركز') }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const rows = await db
        .select()
        .from(salaryCommissionPools)
        .where(
          and(eq(salaryCommissionPools.year, input.year), eq(salaryCommissionPools.month, input.month), eq(salaryCommissionPools.section, input.section))
        )
        .limit(1);
      return rows[0] ?? null;
    }),

  setCommissionPool: managerProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default('مركز'),
        examCount: z.number().int().min(0).default(0),
        examPoolOverride: z.number().min(0).optional(), // مركز fallback total
        examCountConsultant: z.number().int().min(0).optional(),
        examCountSpecialist: z.number().int().min(0).optional(),
        examPoolConsultant: z.number().min(0).optional(), // عيادة: استشاري pool
        examPoolSpecialist: z.number().min(0).optional(), // عيادة: أخصائي pool
        cases450: z.number().int().min(0).default(0),
        cases400: z.number().int().min(0).default(0),
        cases350: z.number().int().min(0).default(0),
        cases250: z.number().int().min(0).default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const consultantPool = r2(input.examPoolConsultant ?? 0);
      const specialistPool = r2(input.examPoolSpecialist ?? 0);
      const examPool = String(
        input.examPoolConsultant !== undefined || input.examPoolSpecialist !== undefined
          ? consultantPool + specialistPool
          : input.examPoolOverride !== undefined
            ? r2(input.examPoolOverride)
            : r2(input.examCount * 50 * 0.40)
      ) as any;
      const pentacamPool = String(calcPentacamPool(input.cases450, input.cases400, input.cases350, input.cases250)) as any;
      const examPoolConsultantVal = input.examPoolConsultant !== undefined ? String(consultantPool) as any : null;
      const examPoolSpecialistVal = input.examPoolSpecialist !== undefined ? String(specialistPool) as any : null;
      const examCountConsultantVal = input.examCountConsultant ?? null;
      const examCountSpecialistVal = input.examCountSpecialist ?? null;
      await db
        .insert(salaryCommissionPools)
        .values({
          year: input.year,
          month: input.month,
          section: input.section,
          examCount: input.examCount,
          examPool,
          examCountConsultant: examCountConsultantVal,
          examCountSpecialist: examCountSpecialistVal,
          examPoolConsultant: examPoolConsultantVal,
          examPoolSpecialist: examPoolSpecialistVal,
          pentacamPool,
          cases450: input.cases450,
          cases400: input.cases400,
          cases350: input.cases350,
          cases250: input.cases250,
          notes: input.notes,
        })
        .onDuplicateKeyUpdate({
          set: {
            examCount: input.examCount,
            examPool,
            examCountConsultant: examCountConsultantVal,
            examCountSpecialist: examCountSpecialistVal,
            examPoolConsultant: examPoolConsultantVal,
            examPoolSpecialist: examPoolSpecialistVal,
            pentacamPool,
            cases450: input.cases450,
            cases400: input.cases400,
            cases350: input.cases350,
            cases250: input.cases250,
            notes: input.notes,
          },
        });
      return { success: true };
    }),

  // ── Payroll ──────────────────────────────────────────────
  computePayroll: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int(), section: z.string().default('مركز') }))
    .mutation(async ({ input }) => {
      const rows = await PayrollComputeService.compute(input.year, input.month, input.section);
      const saved = await PayrollComputeService.savePayroll(rows);
      return { saved, rows };
    }),

  getPayroll: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int(), section: z.string().default('مركز') }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const rows = await db
        .select({
          id: salaryPayroll.id,
          empCd: salaryPayroll.empCd,
          year: salaryPayroll.year,
          month: salaryPayroll.month,
          section: salaryPayroll.section,
          basicSalary: salaryPayroll.basicSalary,
          workingDays: salaryPayroll.workingDays,
          absentDays: salaryPayroll.absentDays,
          lateMinutes: salaryPayroll.lateMinutes,
          earlyLeaveMinutes: salaryPayroll.earlyLeaveMinutes,
          overtimeMinutes: salaryPayroll.overtimeMinutes,
          leaveDays: salaryPayroll.leaveDays,
          absentDeduction: salaryPayroll.absentDeduction,
          lateDeduction: salaryPayroll.lateDeduction,
          earlyLeaveDeduction: salaryPayroll.earlyLeaveDeduction,
          penaltyDeduction: salaryPayroll.penaltyDeduction,
          totalDeductions: salaryPayroll.totalDeductions,
          deductionPct: salaryPayroll.deductionPct,
          leaveMultiplier: salaryPayroll.leaveMultiplier,
          netBasic: salaryPayroll.netBasic,
          attendanceCommission: salaryPayroll.attendanceCommission,
          examCommission: salaryPayroll.examCommission,
          pentacamCommission: salaryPayroll.pentacamCommission,
          totalCommission: salaryPayroll.totalCommission,
          overtimePay: salaryPayroll.overtimePay,
          totalPay: salaryPayroll.totalPay,
          payrollStatus: salaryPayroll.payrollStatus,
          computedAt: salaryPayroll.computedAt,
          fullName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
          salaryType: attendanceEmployees.salaryType,
        })
        .from(salaryPayroll)
        .leftJoin(attendanceEmployees, eq(salaryPayroll.empCd, attendanceEmployees.empCd))
        .where(
          and(eq(salaryPayroll.year, input.year), eq(salaryPayroll.month, input.month), eq(salaryPayroll.section, input.section))
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

  // ── Raise History ────────────────────────────────────────
  listRaiseHistory: managerProcedure
    .input(z.object({ empCd: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      return await db
        .select()
        .from(salaryRaiseHistory)
        .where(eq(salaryRaiseHistory.empCd, input.empCd))
        .orderBy(desc(salaryRaiseHistory.year));
    }),

  setRaise: managerProcedure
    .input(z.object({
      empCd: z.string().min(1),
      year: z.number().int(),
      raiseAmount: z.number().min(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.insert(salaryRaiseHistory)
        .values({ empCd: input.empCd, year: input.year, raiseAmount: String(input.raiseAmount) as any, notes: input.notes })
        .onDuplicateKeyUpdate({ set: { raiseAmount: String(input.raiseAmount) as any, notes: input.notes } });
      return { success: true };
    }),

  deleteRaise: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(salaryRaiseHistory).where(eq(salaryRaiseHistory.id, input.id));
      return { success: true };
    }),

  // ── Salary Config ────────────────────────────────────────
  getAttendanceRates: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    const rows = await db.select().from(salaryConfig)
      .where(eq(salaryConfig.key, 'attendance_rate_3')
        || eq(salaryConfig.key, 'attendance_rate_5')
        || eq(salaryConfig.key, 'attendance_rate_7')
        || eq(salaryConfig.key, 'attendance_rate_10') as any);
    const map = Object.fromEntries(rows.map(r => [r.key, Number(r.value)]));
    return {
      rate3:  map['attendance_rate_3']  ?? 0.25,
      rate5:  map['attendance_rate_5']  ?? 0.15,
      rate7:  map['attendance_rate_7']  ?? 0.10,
      rate10: map['attendance_rate_10'] ?? 0.05,
    };
  }),

  setAttendanceRates: managerProcedure
    .input(z.object({
      rate3:  z.number().min(0).max(1),
      rate5:  z.number().min(0).max(1),
      rate7:  z.number().min(0).max(1),
      rate10: z.number().min(0).max(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const entries = [
        { key: 'attendance_rate_3',  value: String(input.rate3)  },
        { key: 'attendance_rate_5',  value: String(input.rate5)  },
        { key: 'attendance_rate_7',  value: String(input.rate7)  },
        { key: 'attendance_rate_10', value: String(input.rate10) },
      ];
      for (const e of entries) {
        await db.insert(salaryConfig).values(e).onDuplicateKeyUpdate({ set: { value: e.value } });
      }
      return { success: true };
    }),

  listEmployees: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    return await db
      .select({ empCd: attendanceEmployees.empCd, fullName: attendanceEmployees.fullName, department: attendanceEmployees.department, salaryType: attendanceEmployees.salaryType, attendanceCommissionRate: attendanceEmployees.attendanceCommissionRate })
      .from(attendanceEmployees)
      .orderBy(attendanceEmployees.fullName);
  }),

  // ── Shift Staff ──────────────────────────────────────────
  listShiftStaff: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    return db.select().from(shiftStaff).orderBy(shiftStaff.type, shiftStaff.name);
  }),

  addShiftStaff: managerProcedure
    .input(z.object({ name: z.string().min(1), type: z.enum(['doctor', 'tech']), ratePerShift: z.number().min(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const result = await db.insert(shiftStaff).values({ name: input.name, type: input.type, ratePerShift: String(input.ratePerShift) as any });
      return { id: (result as any).insertId };
    }),

  updateShiftStaff: managerProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), type: z.enum(['doctor', 'tech']), ratePerShift: z.number().min(0), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.update(shiftStaff).set({ name: input.name, type: input.type, ratePerShift: String(input.ratePerShift) as any, active: input.active }).where(eq(shiftStaff.id, input.id));
      return { success: true };
    }),

  getShiftSchedule: managerProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const [staff, attendance] = await Promise.all([
        db.select().from(shiftStaff).where(eq(shiftStaff.active, true)).orderBy(shiftStaff.type, shiftStaff.name),
        db.select().from(shiftAttendance).where(and(eq(shiftAttendance.year, input.year), eq(shiftAttendance.month, input.month))),
      ]);
      return { staff, attendance };
    }),

  addShiftEntry: managerProcedure
    .input(z.object({ staffId: z.number(), year: z.number(), month: z.number(), workDate: z.string(), shiftName: z.string().min(1), present: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.insert(shiftAttendance)
        .values({ staffId: input.staffId, year: input.year, month: input.month, workDate: input.workDate as any, shiftName: input.shiftName, present: input.present })
        .onDuplicateKeyUpdate({ set: { present: input.present } });
      return { success: true };
    }),

  toggleShiftPresent: managerProcedure
    .input(z.object({ id: z.number(), present: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.update(shiftAttendance).set({ present: input.present }).where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  deleteShiftEntry: managerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(shiftAttendance).where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  computeShiftPayroll: managerProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const [staff, attendance] = await Promise.all([
        db.select().from(shiftStaff).where(eq(shiftStaff.active, true)),
        db.select().from(shiftAttendance).where(and(eq(shiftAttendance.year, input.year), eq(shiftAttendance.month, input.month))),
      ]);
      return staff.map(s => {
        const rows = attendance.filter(a => a.staffId === s.id);
        const attended = rows.filter(a => a.present).length;
        const rate = Number(s.ratePerShift);
        return { id: s.id, name: s.name, type: s.type, ratePerShift: rate, scheduled: rows.length, attended, absent: rows.length - attended, totalPay: Math.round(attended * rate * 100) / 100 };
      });
    }),
});
