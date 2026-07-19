import { z } from "zod";
import {
  router,
  makeSalaryProcedure,
  makeSalaryWriteProcedure,
  protectedProcedure,
} from "../_core/procedures";
import { getDb } from "../db";
import {
  salaryBasics,
  salaryPenalties,
  salaryAdvances,
  salaryCommissionPools,
  salaryPayroll,
  salaryRaiseHistory,
  salaryConfig,
  salaryHolidays,
  attendanceEmployees,
  attendanceDaily,
  attendanceMonthlyReport,
  shiftStaff,
  shiftAttendance,
  shiftStaffCycle,
  shiftPayrollAttendanceOverrides,
  attendanceShifts,
  salarySupervisionBonus,
  salaryMissingCheckoutExclude,
} from "../../drizzle/schema";
import {
  eq,
  and,
  gte,
  lte,
  gt,
  isNull,
  or,
  desc,
  inArray,
  sql,
} from "drizzle-orm";
import {
  PayrollComputeService,
  calcPentacamPool,
} from "../services/salary/payrollCompute.service";

const allowanceInput = z.object({
  basicAmount: z.number().min(0),
  socialAllowance: z.number().min(0).optional().default(0),
  costOfLivingAllowance: z.number().min(0).optional().default(0),
  transportAllowance: z.number().min(0).optional().default(0),
  workNatureAllowance: z.number().min(0).optional().default(0),
  receptionAllowance: z.number().min(0).optional().default(0),
  yearlyRaise: z.number().min(0).optional().default(0),
  insuranceDeduction: z.number().min(0).optional().default(0),
});

function dateRangeToYearMonths(
  fromDate: string,
  toDate: string,
): { year: number; month: number }[] {
  const pairs: { year: number; month: number }[] = [];
  const [fy, fm] = fromDate.split("-").map(Number);
  const [ty, tm] = toDate.split("-").map(Number);
  let y = fy,
    m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    pairs.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return pairs.length ? pairs : [{ year: fy, month: fm }];
}

async function fetchShiftAttendanceRange(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  year: number,
  month: number,
  fromDate?: string,
  toDate?: string,
) {
  const pairs =
    fromDate && toDate
      ? dateRangeToYearMonths(fromDate, toDate)
      : [{ year, month }];
  const results = await Promise.all(
    pairs.map(({ year: y, month: m }) =>
      db
        .select()
        .from(shiftAttendance)
        .where(and(eq(shiftAttendance.year, y), eq(shiftAttendance.month, m))),
    ),
  );
  const flat = results.flat();
  if (!fromDate || !toDate) return flat;
  return flat.filter((a: any) => {
    const raw = a.workDate;
    const d =
      raw instanceof Date
        ? `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`
        : String(raw).slice(0, 10);
    return d >= fromDate && d <= toDate;
  });
}

export const salaryRouter = router({
  // ── Basics ──────────────────────────────────────────────
  listBasics: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
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
        insuranceDeduction: salaryBasics.insuranceDeduction,
        effectiveFrom: salaryBasics.effectiveFrom,
        effectiveTo: salaryBasics.effectiveTo,
        notes: salaryBasics.notes,
        fullName: attendanceEmployees.fullName,
        department: attendanceEmployees.department,
      })
      .from(salaryBasics)
      .leftJoin(
        attendanceEmployees,
        eq(salaryBasics.empCd, attendanceEmployees.empCd),
      )
      .orderBy(desc(salaryBasics.effectiveFrom));
    return rows;
  }),

  setBasic: makeSalaryWriteProcedure("/salary")
    .input(
      allowanceInput.extend({
        empCd: z.string().min(1),
        effectiveFrom: z.string(),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(salaryBasics).values({
        empCd: input.empCd,
        basicAmount: String(input.basicAmount) as any,
        socialAllowance: String(input.socialAllowance ?? 0) as any,
        costOfLivingAllowance: String(input.costOfLivingAllowance ?? 0) as any,
        transportAllowance: String(input.transportAllowance ?? 0) as any,
        workNatureAllowance: String(input.workNatureAllowance ?? 0) as any,
        receptionAllowance: String(input.receptionAllowance ?? 0) as any,
        yearlyRaise: String(input.yearlyRaise ?? 0) as any,
        insuranceDeduction: String(input.insuranceDeduction ?? 0) as any,
        effectiveFrom: input.effectiveFrom as any,
        effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
        notes: input.notes,
      });
      return { id: (result as any).insertId };
    }),

  updateBasic: makeSalaryWriteProcedure("/salary")
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
        insuranceDeduction: z.number().min(0).optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const upd: any = {};
      if (input.basicAmount !== undefined)
        upd.basicAmount = String(input.basicAmount);
      if (input.socialAllowance !== undefined)
        upd.socialAllowance = String(input.socialAllowance);
      if (input.costOfLivingAllowance !== undefined)
        upd.costOfLivingAllowance = String(input.costOfLivingAllowance);
      if (input.transportAllowance !== undefined)
        upd.transportAllowance = String(input.transportAllowance);
      if (input.workNatureAllowance !== undefined)
        upd.workNatureAllowance = String(input.workNatureAllowance);
      if (input.receptionAllowance !== undefined)
        upd.receptionAllowance = String(input.receptionAllowance);
      if (input.yearlyRaise !== undefined)
        upd.yearlyRaise = String(input.yearlyRaise);
      if (input.insuranceDeduction !== undefined)
        upd.insuranceDeduction = String(input.insuranceDeduction);
      if (input.effectiveFrom !== undefined)
        upd.effectiveFrom = input.effectiveFrom;
      if (input.effectiveTo !== undefined)
        upd.effectiveTo = input.effectiveTo ?? null;
      if (input.notes !== undefined) upd.notes = input.notes;
      if (Object.keys(upd).length)
        await db
          .update(salaryBasics)
          .set(upd)
          .where(eq(salaryBasics.id, input.id));
      return { success: true };
    }),

  deleteBasic: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(salaryBasics).where(eq(salaryBasics.id, input.id));
      return { success: true };
    }),

  // ── Penalties ────────────────────────────────────────────
  listPenalties: makeSalaryProcedure("/salary/penalties")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ymPairs = dateRangeToYearMonths(input.fromDate, input.toDate);
      const rows = await db
        .select({
          id: salaryPenalties.id,
          empCd: salaryPenalties.empCd,
          year: salaryPenalties.year,
          month: salaryPenalties.month,
          amount: salaryPenalties.amount,
          penaltyDays: salaryPenalties.penaltyDays,
          penaltyDate: salaryPenalties.penaltyDate,
          reason: salaryPenalties.reason,
          createdAt: salaryPenalties.createdAt,
          fullName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
        })
        .from(salaryPenalties)
        .leftJoin(
          attendanceEmployees,
          eq(salaryPenalties.empCd, attendanceEmployees.empCd),
        )
        .where(
          or(
            ...ymPairs.map(({ year, month }) =>
              and(
                eq(salaryPenalties.year, year),
                eq(salaryPenalties.month, month),
              ),
            ),
          ),
        )
        .orderBy(desc(salaryPenalties.createdAt));
      return rows;
    }),

  addPenalty: makeSalaryWriteProcedure("/salary/penalties")
    .input(
      z.object({
        empCd: z.string().min(1),
        year: z.number().int(),
        month: z.number().int(),
        // one of amount or penaltyDays is required
        amount: z.number().min(0).default(0),
        penaltyDays: z.number().min(0.25).optional(),
        penaltyDate: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(salaryPenalties).values({
        empCd: input.empCd,
        year: input.year,
        month: input.month,
        amount: String(input.amount) as any,
        penaltyDays: input.penaltyDays ?? null,
        penaltyDate: input.penaltyDate
          ? (sql.raw(`'${input.penaltyDate}'`) as any)
          : null,
        reason: input.reason,
      });
      return { id: (result as any).insertId };
    }),

  updatePenalty: makeSalaryWriteProcedure("/salary/penalties")
    .input(
      z.object({
        id: z.number().int(),
        empCd: z.string().min(1),
        year: z.number().int(),
        month: z.number().int(),
        amount: z.number().min(0).default(0),
        penaltyDays: z.number().min(0.25).optional(),
        penaltyDate: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(salaryPenalties)
        .set({
          empCd: input.empCd,
          year: input.year,
          month: input.month,
          amount: String(input.amount) as any,
          penaltyDays: input.penaltyDays ?? null,
          penaltyDate: input.penaltyDate
            ? (sql.raw(`'${input.penaltyDate}'`) as any)
            : null,
          reason: input.reason ?? null,
        })
        .where(eq(salaryPenalties.id, input.id));
      return { success: true };
    }),

  deletePenalty: makeSalaryWriteProcedure("/salary/penalties")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(salaryPenalties).where(eq(salaryPenalties.id, input.id));
      return { success: true };
    }),

  // ── Advances ─────────────────────────────────────────────
  listAdvances: makeSalaryProcedure("/salary")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ymPairs = dateRangeToYearMonths(input.fromDate, input.toDate);
      return db
        .select()
        .from(salaryAdvances)
        .where(
          or(
            ...ymPairs.map(({ year, month }) =>
              and(
                eq(salaryAdvances.year, year),
                eq(salaryAdvances.month, month),
              ),
            ),
          ),
        );
    }),

  addAdvance: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        empCd: z.string().min(1),
        year: z.number().int(),
        month: z.number().int(),
        amount: z.number().positive(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(salaryAdvances).values({
        empCd: input.empCd,
        year: input.year,
        month: input.month,
        amount: String(input.amount) as any,
        reason: input.reason,
      });
      return { id: (result as any).insertId };
    }),

  deleteAdvance: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(salaryAdvances).where(eq(salaryAdvances.id, input.id));
      return { success: true };
    }),

  // ── Commission Pools ─────────────────────────────────────
  getCommissionPool: makeSalaryProcedure("/salary/pools")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default("مركز"),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select()
        .from(salaryCommissionPools)
        .where(
          and(
            eq(salaryCommissionPools.year, input.year),
            eq(salaryCommissionPools.month, input.month),
            eq(salaryCommissionPools.section, input.section),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    }),

  getMarkazAutoCommissionPools: makeSalaryProcedure("/salary/pools")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
      }),
    )
    .query(async ({ input }) => {
      const { computeMarkazEffectivePools } =
        await import("../services/salary/commissionPoolsMssql.service");
      return computeMarkazEffectivePools(input.year, input.month);
    }),

  setMarkazManualCommissionPools: makeSalaryWriteProcedure("/salary/pools")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        examPool: z.number().min(0).nullable(),
        pentacamPool: z.number().min(0).nullable(),
        pentacamDrPool: z.number().min(0).nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { setMarkazManualPoolOverrides } =
        await import("../services/salary/commissionPoolsMssql.service");
      await setMarkazManualPoolOverrides(input.year, input.month, {
        examPool: input.examPool,
        pentacamPool: input.pentacamPool,
        pentacamDrPool: input.pentacamDrPool,
      });
      const rows = await PayrollComputeService.compute(
        input.year,
        input.month,
        "مركز",
      );
      const saved = await PayrollComputeService.savePayroll(rows);
      return { success: true, saved };
    }),

  getPriceOverrides: makeSalaryProcedure("/salary/pools").query(async () => {
    const { getPriceOverrides } =
      await import("../services/salary/commissionPoolsMssql.service");
    return getPriceOverrides();
  }),

  setPriceOverrides: makeSalaryWriteProcedure("/salary/pools")
    .input(
      z.object({
        examSpecialist: z.number().min(0).nullable().optional(),
        examConsultant: z.number().min(0).nullable().optional(),
        xray1600: z.number().min(0).nullable().optional(),
        xrayRemaining: z.number().min(0).nullable().optional(),
        xray1502: z.number().min(0).nullable().optional(),
        calculationMode: z
          .enum(["legacy", "fixed_percentage"])
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { setPriceOverrides } =
        await import("../services/salary/commissionPoolsMssql.service");
      return setPriceOverrides(input);
    }),

  setCommissionPool: makeSalaryWriteProcedure("/salary/pools")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default("مركز"),
        examCount: z.number().int().min(0).default(0),
        examPoolOverride: z.number().min(0).optional(), // مركز fallback total
        examCountConsultant: z.number().int().min(0).optional(),
        examCountSpecialist: z.number().int().min(0).optional(),
        examPoolConsultant: z.number().min(0).optional(), // عيادة: استشاري pool
        examPoolSpecialist: z.number().min(0).optional(), // عيادة: أخصائي pool
        costOfLivingAllowanceAmount: z.number().min(0).optional(),
        costOfLivingAllowanceCount: z.number().int().min(0).optional(),
        transportAllowanceAmount: z.number().min(0).optional(),
        transportAllowanceCount: z.number().int().min(0).optional(),
        cases450: z.number().int().min(0).default(0),
        cases400: z.number().int().min(0).default(0),
        cases350: z.number().int().min(0).default(0),
        cases250: z.number().int().min(0).default(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const consultantPool = r2(input.examPoolConsultant ?? 0);
      const specialistPool = r2(input.examPoolSpecialist ?? 0);
      const examPool = String(
        input.examPoolConsultant !== undefined ||
          input.examPoolSpecialist !== undefined
          ? consultantPool + specialistPool
          : input.examPoolOverride !== undefined
            ? r2(input.examPoolOverride)
            : r2(input.examCount * 50),
      ) as any;
      const pentacamPool = String(
        calcPentacamPool(
          input.cases450,
          input.cases400,
          input.cases350,
          input.cases250,
        ),
      ) as any;
      const examPoolConsultantVal =
        input.examPoolConsultant !== undefined
          ? (String(consultantPool) as any)
          : null;
      const examPoolSpecialistVal =
        input.examPoolSpecialist !== undefined
          ? (String(specialistPool) as any)
          : null;
      const examCountConsultantVal = input.examCountConsultant ?? null;
      const examCountSpecialistVal = input.examCountSpecialist ?? null;
      const costOfLivingAllowanceAmount = r2(
        input.costOfLivingAllowanceAmount ?? 0,
      );
      const costOfLivingAllowanceCount = input.costOfLivingAllowanceCount ?? 0;
      const costOfLivingAllowanceTotal = r2(
        costOfLivingAllowanceAmount * costOfLivingAllowanceCount,
      );
      const transportAllowanceAmount = r2(input.transportAllowanceAmount ?? 0);
      const transportAllowanceCount = input.transportAllowanceCount ?? 0;
      const transportAllowanceTotal = r2(
        transportAllowanceAmount * transportAllowanceCount,
      );
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
          costOfLivingAllowanceAmount: String(
            costOfLivingAllowanceAmount,
          ) as any,
          costOfLivingAllowanceCount,
          costOfLivingAllowanceTotal: String(costOfLivingAllowanceTotal) as any,
          transportAllowanceAmount: String(transportAllowanceAmount) as any,
          transportAllowanceCount,
          transportAllowanceTotal: String(transportAllowanceTotal) as any,
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
            costOfLivingAllowanceAmount: String(
              costOfLivingAllowanceAmount,
            ) as any,
            costOfLivingAllowanceCount,
            costOfLivingAllowanceTotal: String(
              costOfLivingAllowanceTotal,
            ) as any,
            transportAllowanceAmount: String(transportAllowanceAmount) as any,
            transportAllowanceCount,
            transportAllowanceTotal: String(transportAllowanceTotal) as any,
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
  computePayroll: makeSalaryWriteProcedure("/salary/payroll")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default("مركز"),
      }),
    )
    .mutation(async ({ input }) => {
      const rows = await PayrollComputeService.compute(
        input.year,
        input.month,
        input.section,
      );
      const saved = await PayrollComputeService.savePayroll(rows);
      return { saved, rows };
    }),

  getSupervisionBonuses: makeSalaryProcedure("/salary/payroll")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default("مركز"),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db
        .select()
        .from(salarySupervisionBonus)
        .where(
          and(
            eq(salarySupervisionBonus.year, input.year),
            eq(salarySupervisionBonus.month, input.month),
            eq(salarySupervisionBonus.section, input.section),
          ),
        );
    }),

  setSupervisionBonus: makeSalaryWriteProcedure("/salary/payroll")
    .input(
      z.object({
        empCd: z.string(),
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default("مركز"),
        amount: z.number().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(salarySupervisionBonus)
        .values({
          empCd: input.empCd,
          year: input.year,
          month: input.month,
          section: input.section,
          amount: String(input.amount) as any,
        })
        .onDuplicateKeyUpdate({ set: { amount: String(input.amount) as any } });
      return { ok: true };
    }),

  getPayroll: makeSalaryProcedure("/salary/payroll")
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        section: z.string().default("مركز"),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      if (input.fromDate || input.toDate) {
        // Dynamic on-the-fly computation
        const dynamicRows = await PayrollComputeService.compute(
          input.year,
          input.month,
          input.section,
          undefined,
          input.fromDate,
          input.toDate,
        );

        // Fetch employee details to join
        const empDetails = await db
          .select({
            empCd: attendanceEmployees.empCd,
            fullName: attendanceEmployees.fullName,
            department: attendanceEmployees.department,
            salaryType: attendanceEmployees.salaryType,
            jobTitle: attendanceEmployees.jobTitle,
          })
          .from(attendanceEmployees);

        const empMap = new Map(empDetails.map((e: any) => [e.empCd, e]));

        // Fetch shift staff names
        const shiftStaffRows = await db
          .select({
            id: shiftStaff.id,
            name: shiftStaff.name,
            type: shiftStaff.type,
          })
          .from(shiftStaff);

        const shiftNameMap = new Map<number, string>();
        for (const s of shiftStaffRows) {
          shiftNameMap.set(
            s.id,
            `${s.name} (${s.type === "doctor" ? "د" : "ف"})`,
          );
        }

        const mappedRows = dynamicRows.map((row) => {
          const isShift = row.empCd.startsWith("shift_");
          let fullName = row.empCd;
          let department = row.section;
          let salaryType: string | null = null;
          let jobTitle: string | null = null;

          if (isShift) {
            const id = parseInt(row.empCd.slice(6), 10);
            fullName = shiftNameMap.get(id) ?? row.empCd;
            department = "مناوبة";
            jobTitle =
              shiftStaffRows.find((s: any) => s.id === id)?.type === "doctor"
                ? "طبيب"
                : "فني";
          } else {
            const emp = empMap.get(row.empCd) as any;
            if (emp) {
              fullName = emp.fullName;
              department = emp.department ?? row.section;
              salaryType = emp.salaryType;
              jobTitle = emp.jobTitle;
            }
          }

          return {
            id: undefined as number | undefined,
            empCd: row.empCd,
            year: row.year,
            month: row.month,
            section: row.section,
            basicSalary: String(row.basicSalary),
            workingDays: row.workingDays,
            absentDays: row.absentDays,
            lateMinutes: row.lateMinutes,
            earlyLeaveMinutes: row.earlyLeaveMinutes,
            overtimeMinutes: row.overtimeMinutes,
            leaveDays: row.leaveDays,
            absentDeduction: String(row.absentDeduction),
            lateDeduction: String(row.lateDeduction),
            earlyLeaveDeduction: String(row.earlyLeaveDeduction),
            penaltyDeduction: String(row.penaltyDeduction),
            advancesDeduction: String(row.advancesDeduction),
            insuranceDeduction: String(row.insuranceDeduction),
            totalDeductions: String(row.totalDeductions),
            deductionPct: String(row.deductionPct),
            leaveMultiplier: String(row.leaveMultiplier),
            netBasic: String(row.netBasic),
            attendanceCommission: String(row.attendanceCommission),
            attendanceCommissionRaw: String(row.attendanceCommissionRaw),
            examCommission: String(row.examCommission),
            examCommissionRaw: String(row.examCommissionRaw),
            pentacamCommission: String(row.pentacamCommission),
            pentacamCommissionRaw: String(row.pentacamCommissionRaw),
            costOfLivingAllowance: String(row.costOfLivingAllowance),
            transportAllowance: String(row.transportAllowance),
            totalCommission: String(row.totalCommission),
            overtimePay: String(row.overtimePay),
            totalPay: String(row.totalPay),
            payrollStatus: "draft" as "draft" | "approved" | "paid",
            computedAt: new Date(),
            fullName,
            department,
            salaryType,
            jobTitle,
          };
        });

        // Order by fullName ascending
        return mappedRows.sort((a, b) => a.fullName.localeCompare(b.fullName));
      }

      // Default monthly calculation (existing code)
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
          advancesDeduction: salaryPayroll.advancesDeduction,
          insuranceDeduction: salaryPayroll.insuranceDeduction,
          totalDeductions: salaryPayroll.totalDeductions,
          deductionPct: salaryPayroll.deductionPct,
          leaveMultiplier: salaryPayroll.leaveMultiplier,
          netBasic: salaryPayroll.netBasic,
          attendanceCommission: salaryPayroll.attendanceCommission,
          attendanceCommissionRaw: salaryPayroll.attendanceCommissionRaw,
          examCommission: salaryPayroll.examCommission,
          examCommissionRaw: salaryPayroll.examCommissionRaw,
          pentacamCommission: salaryPayroll.pentacamCommission,
          pentacamCommissionRaw: salaryPayroll.pentacamCommissionRaw,
          costOfLivingAllowance: salaryPayroll.costOfLivingAllowance,
          transportAllowance: salaryPayroll.transportAllowance,
          totalCommission: salaryPayroll.totalCommission,
          overtimePay: salaryPayroll.overtimePay,
          totalPay: salaryPayroll.totalPay,
          payrollStatus: salaryPayroll.payrollStatus,
          computedAt: salaryPayroll.computedAt,
          fullName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
          salaryType: attendanceEmployees.salaryType,
          jobTitle: attendanceEmployees.jobTitle,
        })
        .from(salaryPayroll)
        .leftJoin(
          attendanceEmployees,
          eq(salaryPayroll.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            eq(salaryPayroll.year, input.year),
            eq(salaryPayroll.month, input.month),
            eq(salaryPayroll.section, input.section),
          ),
        )
        .orderBy(attendanceEmployees.fullName);

      // Resolve names for shift staff rows (empCd = 'shift_<id>')
      const shiftIds = rows
        .filter((r: any) => r.empCd.startsWith("shift_"))
        .map((r: any) => parseInt(r.empCd.slice(6), 10))
        .filter((id: any) => !isNaN(id));

      const shiftNameMap = new Map<number, string>();
      const staffTypeMap = new Map<number, string>();
      if (shiftIds.length > 0) {
        const staffRows = await db
          .select({
            id: shiftStaff.id,
            name: shiftStaff.name,
            type: shiftStaff.type,
          })
          .from(shiftStaff)
          .where(inArray(shiftStaff.id, shiftIds));
        for (const s of staffRows) {
          shiftNameMap.set(
            s.id,
            `${s.name} (${s.type === "doctor" ? "د" : "ف"})`,
          );
          staffTypeMap.set(s.id, s.type);
        }
      }

      return rows.map((r: any) => {
        if (!r.empCd.startsWith("shift_")) return r;
        const id = parseInt(r.empCd.slice(6), 10);
        const staffType = staffTypeMap.get(id);
        return {
          ...r,
          fullName: shiftNameMap.get(id) ?? r.empCd,
          department: "مناوبة",
          jobTitle: staffType === "doctor" ? "طبيب" : "فني",
        };
      });
    }),

  listPayrollDeductions: makeSalaryProcedure("/salary/payroll")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ymPairs = dateRangeToYearMonths(input.fromDate, input.toDate);
      return db
        .select({
          empCd: salaryPayroll.empCd,
          absentDeduction: salaryPayroll.absentDeduction,
          lateDeduction: salaryPayroll.lateDeduction,
          earlyLeaveDeduction: salaryPayroll.earlyLeaveDeduction,
          penaltyDeduction: salaryPayroll.penaltyDeduction,
          advancesDeduction: salaryPayroll.advancesDeduction,
          insuranceDeduction: salaryPayroll.insuranceDeduction,
          totalDeductions: salaryPayroll.totalDeductions,
          fullName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
        })
        .from(salaryPayroll)
        .leftJoin(
          attendanceEmployees,
          eq(salaryPayroll.empCd, attendanceEmployees.empCd),
        )
        .where(
          or(
            ...ymPairs.map(({ year, month }) =>
              and(eq(salaryPayroll.year, year), eq(salaryPayroll.month, month)),
            ),
          ),
        )
        .orderBy(attendanceEmployees.fullName);
    }),

  finalizePayroll: makeSalaryWriteProcedure("/salary/payroll")
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(salaryPayroll)
        .set({ payrollStatus: "final" })
        .where(
          and(
            eq(salaryPayroll.year, input.year),
            eq(salaryPayroll.month, input.month),
          ),
        );
      return { success: true };
    }),

  // ── Raise History ────────────────────────────────────────
  listRaiseHistory: makeSalaryProcedure("/salary")
    .input(z.object({ empCd: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return await db
        .select()
        .from(salaryRaiseHistory)
        .where(eq(salaryRaiseHistory.empCd, input.empCd))
        .orderBy(desc(salaryRaiseHistory.year));
    }),

  setRaise: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        empCd: z.string().min(1),
        year: z.number().int(),
        raiseAmount: z.number().min(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(salaryRaiseHistory)
        .values({
          empCd: input.empCd,
          year: input.year,
          raiseAmount: String(input.raiseAmount) as any,
          notes: input.notes,
        })
        .onDuplicateKeyUpdate({
          set: {
            raiseAmount: String(input.raiseAmount) as any,
            notes: input.notes,
          },
        });
      return { success: true };
    }),

  deleteRaise: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(salaryRaiseHistory)
        .where(eq(salaryRaiseHistory.id, input.id));
      return { success: true };
    }),

  // ── Salary Config ────────────────────────────────────────
  getAttendanceRates: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select()
      .from(salaryConfig)
      .where(
        eq(salaryConfig.key, "attendance_rate_3") ||
          eq(salaryConfig.key, "attendance_rate_5") ||
          eq(salaryConfig.key, "attendance_rate_7") ||
          (eq(salaryConfig.key, "attendance_rate_10") as any),
      );
    const map = Object.fromEntries(
      rows.map((r: any) => [r.key, Number(r.value)]),
    );
    return {
      rate3: map["attendance_rate_3"] ?? 0.25,
      rate5: map["attendance_rate_5"] ?? 0.15,
      rate7: map["attendance_rate_7"] ?? 0.1,
      rate10: map["attendance_rate_10"] ?? 0.05,
    };
  }),

  setAttendanceRates: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        rate3: z.number().min(0).max(1),
        rate5: z.number().min(0).max(1),
        rate7: z.number().min(0).max(1),
        rate10: z.number().min(0).max(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const entries = [
        { key: "attendance_rate_3", value: String(input.rate3) },
        { key: "attendance_rate_5", value: String(input.rate5) },
        { key: "attendance_rate_7", value: String(input.rate7) },
        { key: "attendance_rate_10", value: String(input.rate10) },
      ];
      for (const e of entries) {
        await db
          .insert(salaryConfig)
          .values(e)
          .onDuplicateKeyUpdate({ set: { value: e.value } });
      }
      return { success: true };
    }),

  getDeductionsEnabled: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select({ value: salaryConfig.value })
      .from(salaryConfig)
      .where(eq(salaryConfig.key, "salary_deductions_enabled"))
      .limit(1);
    return rows[0]?.value !== "false";
  }),

  setDeductionsEnabled: makeSalaryWriteProcedure("/salary")
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(salaryConfig)
        .values({
          key: "salary_deductions_enabled",
          value: String(input.enabled),
        })
        .onDuplicateKeyUpdate({ set: { value: String(input.enabled) } });
      return { success: true };
    }),

  getLateTiers: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select()
      .from(salaryConfig)
      .where(eq(salaryConfig.key, "salary_late_tiers"));
    if (rows.length && rows[0].value) {
      try {
        return JSON.parse(rows[0].value as string);
      } catch {}
    }
    return [
      { minMin: 1, maxMin: 14, type: "linear" },
      { minMin: 15, maxMin: 29, dayFraction: 0.25 },
      { minMin: 30, maxMin: 59, dayFraction: 0.5 },
      { minMin: 60, maxMin: 119, dayFraction: 1 },
      { minMin: 120, maxMin: null, dayFraction: 2 },
    ];
  }),

  setLateTiers: makeSalaryWriteProcedure("/salary")
    .input(
      z.array(
        z.object({
          minMin: z.number().int().min(0),
          maxMin: z.number().int().min(0).nullable(),
          type: z.literal("linear").optional(),
          dayFraction: z.number().min(0).optional(),
        }),
      ),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(salaryConfig)
        .values({ key: "salary_late_tiers", value: JSON.stringify(input) })
        .onDuplicateKeyUpdate({ set: { value: JSON.stringify(input) } });
      return { success: true };
    }),

  listEmployees: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return await db
      .select({
        empCd: attendanceEmployees.empCd,
        fullName: attendanceEmployees.fullName,
        department: attendanceEmployees.department,
        salaryType: attendanceEmployees.salaryType,
        attendanceCommissionRate: attendanceEmployees.attendanceCommissionRate,
        attendanceLeaveMultiplier:
          attendanceEmployees.attendanceLeaveMultiplier,
        commAttendance: attendanceEmployees.commAttendance,
        commExam: attendanceEmployees.commExam,
        commPentacam: attendanceEmployees.commPentacam,
        commDay10: attendanceEmployees.commDay10,
        commOvertime: attendanceEmployees.commOvertime,
      })
      .from(attendanceEmployees)
      .orderBy(attendanceEmployees.fullName);
  }),

  getAbsentDays: makeSalaryProcedure("/salary")
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          workDate: attendanceDaily.workDate,
          status: attendanceDaily.status,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            gte(attendanceDaily.workDate, input.from as any),
            lte(attendanceDaily.workDate, input.to as any),
            eq(attendanceDaily.status, "absent"),
          ),
        )
        .orderBy(attendanceDaily.workDate, attendanceEmployees.fullName);
      return rows.map((r: any) => {
        const d = r.workDate as any;
        const workDate =
          d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        return { ...r, workDate };
      });
    }),

  listLateDays: makeSalaryProcedure("/salary")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
          workDate: attendanceDaily.workDate,
          lateMinutes: attendanceDaily.lateMinutes,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            gte(attendanceDaily.workDate, input.fromDate as any),
            lte(attendanceDaily.workDate, input.toDate as any),
            gt(attendanceDaily.lateMinutes, 0),
          ),
        )
        .orderBy(attendanceEmployees.fullName, attendanceDaily.workDate);
      return rows.map((r: any) => {
        const d = r.workDate as any;
        const workDate =
          d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        return { ...r, workDate };
      });
    }),

  listAccAdvancesLinked: makeSalaryProcedure("/salary")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [rows] = (await db.execute(
        sql.raw(
          `SELECT a.emp_cd,
                  MAX(a.employee) AS employee,
                  e.full_name AS fullName,
                  COALESCE(SUM(a.advance), 0) AS totalAdvance,
                  COALESCE(SUM(a.repayment), 0) AS totalRepaid,
                  COALESCE(SUM(a.advance), 0) - COALESCE(SUM(a.repayment), 0) AS net
           FROM accAdvances a
           LEFT JOIN attendance_employees e ON e.emp_cd = a.emp_cd
           WHERE a.emp_cd IS NOT NULL AND a.emp_cd != ''
           GROUP BY a.emp_cd, e.full_name
           HAVING net > 0
           ORDER BY e.full_name, MAX(a.employee)`,
        ),
      )) as any;
      return (rows as any[]).map((r: any) => ({
        empCd: String(r.emp_cd ?? ""),
        employee: String(r.employee ?? ""),
        empName: r.fullName ? String(r.fullName) : String(r.employee ?? ""),
        totalAdvance: Number(r.totalAdvance ?? 0),
        totalRepaid: Number(r.totalRepaid ?? 0),
        net: Number(r.net ?? 0),
      }));
    }),

  listMissingCheckoutExclusions: makeSalaryProcedure("/salary")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select()
        .from(salaryMissingCheckoutExclude)
        .where(
          and(
            gte(salaryMissingCheckoutExclude.workDate, input.fromDate as any),
            lte(salaryMissingCheckoutExclude.workDate, input.toDate as any),
          ),
        );
      return rows.map((r: any) => ({
        empCd: r.empCd,
        workDate:
          r.workDate instanceof Date
            ? `${r.workDate.getFullYear()}-${String(r.workDate.getMonth() + 1).padStart(2, "0")}-${String(r.workDate.getDate()).padStart(2, "0")}`
            : String(r.workDate).slice(0, 10),
      }));
    }),

  toggleMissingCheckoutExclusion: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        empCd: z.string(),
        workDate: z.string(),
        exclude: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      if (input.exclude) {
        await db
          .insert(salaryMissingCheckoutExclude)
          .values({ empCd: input.empCd, workDate: input.workDate as any })
          .onDuplicateKeyUpdate({ set: { empCd: input.empCd } });
      } else {
        await db
          .delete(salaryMissingCheckoutExclude)
          .where(
            and(
              eq(salaryMissingCheckoutExclude.empCd, input.empCd),
              eq(salaryMissingCheckoutExclude.workDate, input.workDate as any),
            ),
          );
      }
      return { success: true };
    }),

  listMissingCheckoutDays: makeSalaryProcedure("/salary")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
          workDate: attendanceDaily.workDate,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            gte(attendanceDaily.workDate, input.fromDate as any),
            lte(attendanceDaily.workDate, input.toDate as any),
            eq(attendanceDaily.status, "missing_checkout"),
          ),
        )
        .orderBy(attendanceEmployees.fullName, attendanceDaily.workDate);
      return rows.map((r: any) => {
        const d = r.workDate as any;
        const workDate =
          d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        return { ...r, workDate };
      });
    }),

  listEarlyLeaveDays: makeSalaryProcedure("/salary")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          department: attendanceEmployees.department,
          workDate: attendanceDaily.workDate,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            gte(attendanceDaily.workDate, input.fromDate as any),
            lte(attendanceDaily.workDate, input.toDate as any),
            gt(attendanceDaily.earlyLeaveMin, 0),
          ),
        )
        .orderBy(attendanceEmployees.fullName, attendanceDaily.workDate);
      return rows.map((r: any) => {
        const d = r.workDate as any;
        const workDate =
          d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        return { ...r, workDate };
      });
    }),

  setCommissionFlags: makeSalaryWriteProcedure("/salary/pools")
    .input(
      z.object({
        empCd: z.string(),
        commAttendance: z.boolean(),
        commExam: z.boolean(),
        commPentacam: z.boolean(),
        commDay10: z.boolean(),
        commOvertime: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(attendanceEmployees)
        .set({
          commAttendance: input.commAttendance,
          commExam: input.commExam,
          commPentacam: input.commPentacam,
          commDay10: input.commDay10,
          commOvertime: input.commOvertime,
        })
        .where(eq(attendanceEmployees.empCd, input.empCd));
      return { success: true };
    }),

  setEmployeeCommissionSettingsBulk: makeSalaryWriteProcedure("/salary/pools")
    .input(
      z.object({
        empCds: z.array(z.string().min(1)).min(1),
        attendanceCommissionRate: z
          .number()
          .min(0)
          .max(1)
          .nullable()
          .optional(),
        attendanceLeaveMultiplier: z
          .number()
          .min(0)
          .max(1)
          .nullable()
          .optional(),
        commAttendance: z.boolean().optional(),
        commExam: z.boolean().optional(),
        commPentacam: z.boolean().optional(),
        commDay10: z.boolean().optional(),
        commOvertime: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const updates: Record<string, unknown> = {};
      if (input.attendanceCommissionRate !== undefined) {
        updates.attendanceCommissionRate =
          input.attendanceCommissionRate === null
            ? null
            : String(input.attendanceCommissionRate);
      }
      if (input.attendanceLeaveMultiplier !== undefined) {
        updates.attendanceLeaveMultiplier =
          input.attendanceLeaveMultiplier === null
            ? null
            : String(input.attendanceLeaveMultiplier);
      }
      for (const field of [
        "commAttendance",
        "commExam",
        "commPentacam",
        "commDay10",
        "commOvertime",
      ] as const) {
        if (input[field] !== undefined) updates[field] = input[field];
      }
      if (Object.keys(updates).length === 0) {
        throw new Error("اختر إعدادًا واحدًا على الأقل للتطبيق");
      }
      await db
        .update(attendanceEmployees)
        .set(updates)
        .where(inArray(attendanceEmployees.empCd, input.empCds));
      return { success: true, updated: input.empCds.length };
    }),

  // ── Shift Staff ──────────────────────────────────────────
  listShiftStaff: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db
      .select()
      .from(shiftStaff)
      .orderBy(shiftStaff.type, shiftStaff.name);
  }),

  addShiftStaff: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["doctor", "tech"]),
        ratePerShift: z.number().min(0),
        rateSmallShift: z.number().min(0).default(0),
        empCd: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(shiftStaff).values({
        name: input.name,
        type: input.type,
        ratePerShift: String(input.ratePerShift) as any,
        rateSmallShift: String(input.rateSmallShift ?? 0) as any,
        empCd: input.empCd ?? null,
      });
      return { id: (result as any).insertId };
    }),

  updateShiftStaff: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        type: z.enum(["doctor", "tech"]),
        ratePerShift: z.number().min(0),
        rateSmallShift: z.number().min(0).default(0),
        active: z.boolean(),
        empCd: z.string().optional(),
        userId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(shiftStaff)
        .set({
          name: input.name,
          type: input.type,
          ratePerShift: String(input.ratePerShift) as any,
          rateSmallShift: String(input.rateSmallShift ?? 0) as any,
          active: input.active,
          empCd: input.empCd ?? null,
          userId: input.userId ?? null,
        } as any)
        .where(eq(shiftStaff.id, input.id));
      return { success: true };
    }),

  deleteShiftStaff: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(shiftStaffCycle)
        .where(eq(shiftStaffCycle.staffId, input.id));
      await db.delete(shiftStaff).where(eq(shiftStaff.id, input.id));
      return { success: true };
    }),

  getShiftSchedule: makeSalaryProcedure("/salary")
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [staff, attendance] = await Promise.all([
        db
          .select()
          .from(shiftStaff)
          .where(eq(shiftStaff.active, true))
          .orderBy(shiftStaff.type, shiftStaff.name),
        fetchShiftAttendanceRange(
          db,
          input.year,
          input.month,
          input.fromDate,
          input.toDate,
        ),
      ]);
      return { staff, attendance };
    }),

  // ── Self-service shift procedures (any logged-in user) ──────────────────
  getShiftScheduleForStaff: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [staff, attendance] = await Promise.all([
        db
          .select()
          .from(shiftStaff)
          .where(eq(shiftStaff.active, true))
          .orderBy(shiftStaff.type, shiftStaff.name),
        fetchShiftAttendanceRange(
          db,
          input.year,
          input.month,
          input.fromDate,
          input.toDate,
        ),
      ]);
      return { staff, attendance };
    }),

  getMyShiftStaffId: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const userId = (ctx.user as any).id;
    const rows = await db
      .select({ id: shiftStaff.id })
      .from(shiftStaff)
      .where(eq(shiftStaff.userId as any, userId))
      .limit(1);
    return rows[0]?.id ?? null;
  }),

  addMyShiftEntry: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int(),
        workDate: z.string(),
        shiftName: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const userId = (ctx.user as any).id;
      const rows = await db
        .select({ id: shiftStaff.id })
        .from(shiftStaff)
        .where(eq(shiftStaff.userId as any, userId))
        .limit(1);
      if (!rows[0])
        throw new Error("No shift staff record linked to your account");
      const staffId = rows[0].id;
      await db
        .insert(shiftAttendance)
        .values({
          staffId,
          year: input.year,
          month: input.month,
          workDate: input.workDate as any,
          shiftName: input.shiftName,
          present: true,
        })
        .onDuplicateKeyUpdate({ set: { present: true } });
      return { success: true };
    }),

  toggleMyShiftEntry: protectedProcedure
    .input(z.object({ id: z.number().int(), present: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const userId = (ctx.user as any).id;
      // verify ownership
      const [entry] = await db
        .select({ staffId: shiftAttendance.staffId })
        .from(shiftAttendance)
        .where(eq(shiftAttendance.id, input.id))
        .limit(1);
      if (!entry) throw new Error("Entry not found");
      const [staff] = await db
        .select({ userId: shiftStaff.userId })
        .from(shiftStaff)
        .where(eq(shiftStaff.id, entry.staffId))
        .limit(1);
      if ((staff as any)?.userId !== userId)
        throw new Error("Not authorized to modify this entry");
      await db
        .update(shiftAttendance)
        .set({ present: input.present })
        .where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  listUsersForShiftLink: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { users } = await import("../../drizzle/schema");
    return db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.name);
  }),

  linkUserToShiftStaff: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        staffId: z.number().int(),
        userId: z.number().int().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(shiftStaff)
        .set({ userId: input.userId } as any)
        .where(eq(shiftStaff.id, input.staffId));
      return { success: true };
    }),

  addShiftEntry: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        staffId: z.number(),
        year: z.number(),
        month: z.number(),
        workDate: z.string(),
        shiftName: z.string().min(1),
        present: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(shiftAttendance)
        .values({
          staffId: input.staffId,
          year: input.year,
          month: input.month,
          workDate: input.workDate as any,
          shiftName: input.shiftName,
          present: input.present,
        })
        .onDuplicateKeyUpdate({ set: { present: input.present } });
      return { success: true };
    }),

  addShiftsBulk: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        staffId: z.number(),
        shiftName: z.string().min(1),
        dates: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      let inserted = 0;
      for (const workDate of input.dates) {
        const d = new Date(workDate);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        await db
          .insert(shiftAttendance)
          .values({
            staffId: input.staffId,
            year,
            month,
            workDate: workDate as any,
            shiftName: input.shiftName,
            present: true,
          })
          .onDuplicateKeyUpdate({ set: { present: true } });
        inserted++;
      }
      return { inserted };
    }),

  toggleShiftPresent: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number(), present: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(shiftAttendance)
        .set({ present: input.present })
        .where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  deleteShiftEntry: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(shiftAttendance).where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  clearRoster: makeSalaryWriteProcedure("/salary")
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(shiftAttendance)
        .where(
          and(
            eq(shiftAttendance.year, input.year),
            eq(shiftAttendance.month, input.month),
          ),
        );
      return { success: true };
    }),

  // ── Official Holidays ─────────────────────────────────────
  // Readable by all authenticated users (needed for the roster view)
  listHolidays: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db
        .select()
        .from(salaryHolidays)
        .where(
          and(
            eq(salaryHolidays.year, input.year),
            eq(salaryHolidays.month, input.month),
          ),
        );
    }),

  addHoliday: makeSalaryWriteProcedure("/salary")
    .input(
      z.object({
        date: z.string(),
        name: z.string().default(""),
        year: z.number().int(),
        month: z.number().int(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(salaryHolidays)
        .values({
          date: input.date as any,
          name: input.name,
          year: input.year,
          month: input.month,
        })
        .onDuplicateKeyUpdate({ set: { name: input.name } });
      return { success: true };
    }),

  deleteHoliday: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(salaryHolidays).where(eq(salaryHolidays.id, input.id));
      return { success: true };
    }),

  computeShiftPayroll: makeSalaryProcedure("/salary/payroll")
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Resolve effective date range
      const mm = String(input.month).padStart(2, "0");
      const lastDay = new Date(input.year, input.month, 0).getDate();
      const rangeFrom = input.fromDate ?? `${input.year}-${mm}-01`;
      const rangeTo =
        input.toDate ??
        `${input.year}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const rangeFromParts = rangeFrom.split("-").map(Number);
      const rangeToParts = rangeTo.split("-").map(Number);

      // Collect all year/month pairs in the range for shiftAttendance query
      const yearMonthPairs: { year: number; month: number }[] = [];
      let cur = new Date(rangeFromParts[0], rangeFromParts[1] - 1, 1);
      const end = new Date(rangeToParts[0], rangeToParts[1] - 1, 1);
      while (cur <= end) {
        yearMonthPairs.push({
          year: cur.getFullYear(),
          month: cur.getMonth() + 1,
        });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }

      const [staff, attendanceAll, monthlyReports, basics, shiftDefs] =
        await Promise.all([
          db.select().from(shiftStaff).where(eq(shiftStaff.active, true)),
          Promise.all(
            yearMonthPairs.map(({ year, month }) =>
              db
                .select()
                .from(shiftAttendance)
                .where(
                  and(
                    eq(shiftAttendance.year, year),
                    eq(shiftAttendance.month, month),
                  ),
                ),
            ),
          ).then((results) =>
            results.flat().filter((a: any) => {
              const raw = a.workDate;
              const d =
                raw instanceof Date
                  ? `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`
                  : String(raw).slice(0, 10);
              return d >= rangeFrom && d <= rangeTo;
            }),
          ),
          db
            .select()
            .from(attendanceMonthlyReport)
            .where(
              and(
                eq(attendanceMonthlyReport.year, input.year),
                eq(attendanceMonthlyReport.month, input.month),
              ),
            ),
          db
            .select()
            .from(salaryBasics)
            .where(
              and(
                lte(salaryBasics.effectiveFrom, rangeTo as any),
                or(
                  isNull(salaryBasics.effectiveTo),
                  gte(salaryBasics.effectiveTo, rangeFrom as any),
                ),
              ),
            ),
          db.select().from(attendanceShifts),
        ]);

      const overrideRows = await db
        .select()
        .from(shiftPayrollAttendanceOverrides)
        .where(
          and(
            eq(shiftPayrollAttendanceOverrides.year, input.year),
            eq(shiftPayrollAttendanceOverrides.month, input.month),
          ),
        );
      const overrideMap = new Map(overrideRows.map((o: any) => [o.staffId, o]));
      const deductionsConfig = await db
        .select({ value: salaryConfig.value })
        .from(salaryConfig)
        .where(eq(salaryConfig.key, "salary_deductions_enabled"))
        .limit(1);
      const deductionsEnabled = deductionsConfig[0]?.value !== "false";

      // Build shift-name → size map
      const shiftSizeMap = new Map<string, "big" | "small">();
      for (const sd of shiftDefs as any[]) {
        let size: "big" | "small" = "big";
        if (sd.shiftSize === "big") size = "big";
        else if (sd.shiftSize === "small") size = "small";
        else {
          // auto: compute duration in minutes
          const [sh, sm] = (sd.startTime as string).split(":").map(Number);
          const [eh, em] = (sd.endTime as string).split(":").map(Number);
          let dur = eh * 60 + em - (sh * 60 + sm);
          if (dur < 0) dur += 24 * 60; // crosses midnight
          const threshold = sd.autoSmallThresholdMin ?? 270;
          size = dur <= threshold ? "small" : "big";
        }
        shiftSizeMap.set(sd.name as string, size);
      }

      const attendance = attendanceAll;

      // For staff linked to attendance employees, fetch fingerprint daily presence and deductions
      const linkedEmpCds = staff
        .filter((s: any) => s.empCd)
        .map((s: any) => s.empCd!);
      const deductionMap = new Map<string, number>();
      if (linkedEmpCds.length > 0) {
        const dailyRows = await db
          .select({
            empCd: attendanceDaily.empCd,
            workDate: attendanceDaily.workDate,
            status: attendanceDaily.status,
          })
          .from(attendanceDaily)
          .where(
            and(
              inArray(attendanceDaily.empCd, linkedEmpCds),
              gte(attendanceDaily.workDate, rangeFrom as any),
              lte(attendanceDaily.workDate, rangeTo as any),
            ),
          );
        // Calculate deductions for linked employees
        for (const empCd of linkedEmpCds) {
          const report = monthlyReports.find((r: any) => r.empCd === empCd);
          const basicRow = basics
            .filter((b: any) => b.empCd === empCd)
            .sort((a: any, b: any) =>
              String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)),
            )[0];
          if (report && basicRow) {
            const basic =
              Number(basicRow.basicAmount) +
              Number((basicRow as any).socialAllowance ?? 0) +
              Number((basicRow as any).costOfLivingAllowance ?? 0) +
              Number((basicRow as any).transportAllowance ?? 0) +
              Number((basicRow as any).workNatureAllowance ?? 0) +
              Number((basicRow as any).receptionAllowance ?? 0) +
              Number((basicRow as any).yearlyRaise ?? 0);
            const lateMinutes = report.totalLateMins ?? 0;
            const earlyLeaveMinutes = report.totalEarlyLeaveMins ?? 0;
            const empDailyRows = dailyRows.filter(
              (d: any) => d.empCd === empCd,
            );
            const missingCheckoutDays = empDailyRows.filter(
              (d: any) => d.status === "missing_checkout",
            ).length;
            const workingDays =
              empDailyRows.filter((d: any) => d.status !== "holiday").length ||
              1;
            const dailyRate = basic / workingDays;
            const minuteRate = dailyRate / 360;
            const totalDeduction =
              (lateMinutes + earlyLeaveMinutes) * minuteRate +
              missingCheckoutDays * dailyRate * 0.25;
            deductionMap.set(empCd, Math.min(1, totalDeduction / basic));
          }
        }
      }

      return staff.map((s: any) => {
        const rows = attendance.filter((a: any) => a.staffId === s.id);
        const rateBig = Number(s.ratePerShift);
        const rateSmall = Number(s.rateSmallShift ?? 0) || rateBig;
        const byShift: Record<
          string,
          { scheduled: number; attended: number; rate: number }
        > = {};
        let attended = 0;
        // Explicit big/small breakdown, sized per each shift's own definition (shiftSizeMap)
        let bigScheduled = 0,
          bigAttended = 0,
          smallScheduled = 0,
          smallAttended = 0;

        // The roster entry is the source of truth for both the shift and its
        // attendance state. A day-level punch cannot identify which one of
        // multiple shifts was worked and must not mark every shift present.
        for (const a of rows) {
          const present = Boolean(a.present);
          if (present) attended++;
          const size: "big" | "small" = shiftSizeMap.get(a.shiftName) ?? "big";
          const rate = size === "small" ? rateSmall : rateBig;
          if (!byShift[a.shiftName])
            byShift[a.shiftName] = { scheduled: 0, attended: 0, rate };
          byShift[a.shiftName].scheduled++;
          if (present) byShift[a.shiftName].attended++;
          if (size === "small") {
            smallScheduled++;
            if (present) smallAttended++;
          } else {
            bigScheduled++;
            if (present) bigAttended++;
          }
        }

        // Manual override: accountant-entered attended counts win over computed attendance.
        const override = overrideMap.get(s.id) as
          | { bigAttended: number | null; smallAttended: number | null }
          | undefined;
        const hasBigOverride = override?.bigAttended != null;
        const hasSmallOverride = override?.smallAttended != null;
        const hasOverride = hasBigOverride || hasSmallOverride;
        if (hasBigOverride) bigAttended = override!.bigAttended as number;
        if (hasSmallOverride) smallAttended = override!.smallAttended as number;

        // Calculate pay per shift type
        const scheduled = rows.length;
        const absent = rows.length - attended;
        const bigAbsent = Math.max(0, bigScheduled - bigAttended);
        const smallAbsent = Math.max(0, smallScheduled - smallAttended);
        const bigTotal = Math.round(bigScheduled * rateBig * 100) / 100;
        const smallTotal = Math.round(smallScheduled * rateSmall * 100) / 100;
        const basicSalary = !deductionsEnabled
          ? Math.round(
              (bigScheduled * rateBig + smallScheduled * rateSmall) * 100,
            ) / 100
          : hasOverride
            ? Math.round(
                (bigAttended * rateBig + smallAttended * rateSmall) * 100,
              ) / 100
            : Math.round(
                Object.values(byShift).reduce(
                  (s, b) => s + b.scheduled * b.rate,
                  0,
                ) * 100,
              ) / 100;
        const absentDeduction = !deductionsEnabled
          ? 0
          : hasOverride
            ? Math.round(
                (bigAbsent * rateBig + smallAbsent * rateSmall) * 100,
              ) / 100
            : Math.round(
                Object.entries(byShift).reduce((s, [, b]) => {
                  const absentInShift = Math.max(0, b.scheduled - b.attended);
                  return s + absentInShift * b.rate;
                }, 0) * 100,
              ) / 100;
        const punchDeductionPct =
          deductionsEnabled && s.empCd ? (deductionMap.get(s.empCd) ?? 0) : 0;
        const punchDeduction =
          Math.round(basicSalary * punchDeductionPct * 100) / 100;
        const netPay =
          Math.round((basicSalary - absentDeduction - punchDeduction) * 100) /
          100;
        const totalPay = netPay;

        return {
          id: s.id,
          name: s.name,
          type: s.type,
          empCd: s.empCd ?? null,
          ratePerShift: rateBig,
          rateSmallShift: rateSmall,
          scheduled,
          attended,
          absent,
          // Big/small breakdown
          bigScheduled,
          bigAttended,
          bigAbsent,
          bigTotal,
          smallScheduled,
          smallAttended,
          smallAbsent,
          smallTotal,
          basicSalary,
          absentDeduction,
          punchDeduction,
          totalPay,
          byShift,
          hasAttendanceOverride: hasOverride,
          hasBigAttendanceOverride: hasBigOverride,
          hasSmallAttendanceOverride: hasSmallOverride,
        };
      });
    }),

  setShiftAttendanceOverride: makeSalaryWriteProcedure("/salary/payroll")
    .input(
      z.object({
        staffId: z.number(),
        year: z.number(),
        month: z.number(),
        bigAttended: z.number().min(0).nullable(),
        smallAttended: z.number().min(0).nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      if (input.bigAttended == null && input.smallAttended == null) {
        await db
          .delete(shiftPayrollAttendanceOverrides)
          .where(
            and(
              eq(shiftPayrollAttendanceOverrides.staffId, input.staffId),
              eq(shiftPayrollAttendanceOverrides.year, input.year),
              eq(shiftPayrollAttendanceOverrides.month, input.month),
            ),
          );
        return { ok: true };
      }

      const existing = await db
        .select()
        .from(shiftPayrollAttendanceOverrides)
        .where(
          and(
            eq(shiftPayrollAttendanceOverrides.staffId, input.staffId),
            eq(shiftPayrollAttendanceOverrides.year, input.year),
            eq(shiftPayrollAttendanceOverrides.month, input.month),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(shiftPayrollAttendanceOverrides)
          .set({
            bigAttended: input.bigAttended,
            smallAttended: input.smallAttended,
            updatedBy: (ctx.user as any).id,
          })
          .where(eq(shiftPayrollAttendanceOverrides.id, existing[0].id));
      } else {
        await db.insert(shiftPayrollAttendanceOverrides).values({
          staffId: input.staffId,
          year: input.year,
          month: input.month,
          bigAttended: input.bigAttended,
          smallAttended: input.smallAttended,
          updatedBy: (ctx as any).user?.id ?? null,
        });
      }
      return { ok: true };
    }),

  // ── Shift Definitions ────────────────────────────────────
  listShiftDefinitions: makeSalaryProcedure("/salary").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(attendanceShifts);
  }),

  // ── Shift Cycles ─────────────────────────────────────────
  getStaffCycles: makeSalaryProcedure("/salary/payroll").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(shiftStaffCycle);
  }),

  setStaffCycle: makeSalaryWriteProcedure("/salary/payroll")
    .input(
      z.object({
        staffId: z.number(),
        // array of {dayOfWeek: 0-6, shiftName: "Morning"|"Night"}
        cycle: z.array(
          z.object({
            dayOfWeek: z.number().min(0).max(6),
            shiftName: z.string().min(1),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Replace all cycle entries for this staff member
      await db
        .delete(shiftStaffCycle)
        .where(eq(shiftStaffCycle.staffId, input.staffId));
      if (input.cycle.length > 0) {
        await db.insert(shiftStaffCycle).values(
          input.cycle.map((c) => ({
            staffId: input.staffId,
            dayOfWeek: c.dayOfWeek,
            shiftName: c.shiftName,
          })),
        );
      }
      return { success: true };
    }),

  clearGeneratedShiftAttendance: makeSalaryWriteProcedure("/salary/payroll")
    .input(
      z.object({ staffId: z.number(), year: z.number(), month: z.number() }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(shiftAttendance)
        .where(
          and(
            eq(shiftAttendance.staffId, input.staffId),
            eq(shiftAttendance.year, input.year),
            eq(shiftAttendance.month, input.month),
          ),
        );
      return { success: true };
    }),

  generateFromCycles: makeSalaryWriteProcedure("/salary/payroll")
    .input(z.object({ year: z.number(), month: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [cycles, staff] = await Promise.all([
        db.select().from(shiftStaffCycle),
        db.select().from(shiftStaff).where(eq(shiftStaff.active, true)),
      ]);

      const daysInMonth = new Date(input.year, input.month, 0).getDate();
      let inserted = 0;

      for (const s of staff) {
        const staffCycles = cycles.filter((c: any) => c.staffId === s.id);
        if (staffCycles.length === 0) continue;

        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(input.year, input.month - 1, day);
          const dow = d.getDay(); // 0=Sun
          const cycleEntries = staffCycles.filter(
            (c: any) => c.dayOfWeek === dow,
          );
          if (cycleEntries.length === 0) continue;

          const mm = String(input.month).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const workDate = `${input.year}-${mm}-${dd}`;

          for (const cycleEntry of cycleEntries) {
            await db
              .insert(shiftAttendance)
              .values({
                staffId: s.id,
                year: input.year,
                month: input.month,
                workDate: workDate as any,
                shiftName: cycleEntry.shiftName,
                present: true,
              })
              .onDuplicateKeyUpdate({
                set: { shiftName: cycleEntry.shiftName },
              }); // no-op: safe to re-run without resetting absences
            inserted++;
          }
        }
      }

      return { inserted };
    }),

  monthSummary: makeSalaryProcedure("/salary")
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [payAgg] = await db
        .select({
          totalPay: sql<string>`COALESCE(SUM(${salaryPayroll.totalPay}), 0)`,
          totalCommission: sql<string>`COALESCE(SUM(${salaryPayroll.totalCommission}), 0)`,
          staffCount: sql<number>`COUNT(*)`,
        })
        .from(salaryPayroll)
        .where(
          and(
            eq(salaryPayroll.year, input.year),
            eq(salaryPayroll.month, input.month),
          ),
        );
      const [penAgg] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${salaryPenalties.amount}), 0)`,
        })
        .from(salaryPenalties)
        .where(
          and(
            eq(salaryPenalties.year, input.year),
            eq(salaryPenalties.month, input.month),
          ),
        );
      return {
        totalPay: Number(payAgg?.totalPay ?? 0),
        totalCommissions: Number(payAgg?.totalCommission ?? 0),
        staffCount: Number(payAgg?.staffCount ?? 0),
        totalPenalties: Number(penAgg?.total ?? 0),
      };
    }),
});
