import { getDb, getSystemSetting } from "../../db";
import { aggregateAttendanceDays } from "../attendance/dailyAggregation";
import {
  attendanceEmployees,
  attendanceDaily,
  attendancePunches,
  attendanceOvertimeDays,
  attendanceShifts,
  attendanceLeaves,
  attendanceLeaveBalances,
  attendanceHolidays,
  salaryBasics,
  salaryPenalties,
  salaryAdvances,
  salaryCommissionPools,
  salaryPayroll,
  salaryConfig,
  salaryHolidays,
  shiftStaff,
  shiftAttendance,
  salaryMissingCheckoutExclude,
  salaryEmployeeSectionSettings,
  employeeAttendanceMapping,
  shiftPayrollAttendanceOverrides,
} from "../../../drizzle/schema";
import {
  eq,
  and,
  gte,
  lte,
  isNull,
  or,
  inArray,
  notInArray,
  like,
} from "drizzle-orm";
import { computeMarkazEffectivePools } from "./commissionPoolsMssql.service";
import {
  calcAdjustedCommission,
  calcWeightedCommissionShare,
} from "./commissionDistribution";
import {
  calcLateDayTier,
  calcMissingPunchDeduction,
  getPayrollWeekKey,
  normalizeLateTiers,
  sumPayrollDeductions,
  type LateTier,
} from "./lateDeduction";
import {
  APP_NOTIFICATION_FEED_KEY,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
  getAppNotificationSettings,
  pushAppNotification,
} from "../../_core/appNotifications";
import {
  calculateOvertimeCompensationBase,
  calculateOvertimeDayPay,
  DAILY_WORK_MINUTES,
  type OvertimeDayPay,
} from "./overtimePay";
import { getSinglePunchDayKeys } from "./singlePunchDays";
import { loadLeaveDayExclusions } from "../attendance/leaveDayExclusions";
import {
  buildShiftBaseMinutesMap,
  computeShiftStaffPay,
  shiftPunchDeductionPct,
} from "./shiftUnits";
import {
  accountLeaveDays,
  countCommissionAffectingLeaveDays,
} from "../attendance/leaveAccounting";
import {
  absenceDeduction as calculateAbsenceDeduction,
  penaltyDaysDeduction,
  salaryLeaveDeduction,
} from "./monthlyDayDeductions";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundPayrollMoney(row: PayrollRow): PayrollRow {
  const basicSalary = Math.round(row.basicSalary);
  const absentDeduction = Math.round(row.absentDeduction);
  const leaveDeduction = Math.round(row.leaveDeduction);
  const missingCheckoutDeduction = Math.round(row.missingCheckoutDeduction);
  const lateDeduction = Math.round(row.lateDeduction);
  const earlyLeaveDeduction = Math.round(row.earlyLeaveDeduction);
  const penaltyDeduction = Math.round(row.penaltyDeduction);
  const advancesDeduction = Math.round(row.advancesDeduction);
  const insuranceDeduction = Math.round(row.insuranceDeduction);
  const totalDeductions = sumPayrollDeductions({
    absent: absentDeduction,
    leave: leaveDeduction,
    missingCheckout: missingCheckoutDeduction,
    late: lateDeduction,
    earlyLeave: earlyLeaveDeduction,
    penalty: penaltyDeduction,
    advances: advancesDeduction,
    insurance: insuranceDeduction,
  });
  const netBasic = Math.max(0, basicSalary - totalDeductions);
  const attendanceCommissionRaw = Math.round(row.attendanceCommissionRaw);
  const attendanceCommission = Math.round(row.attendanceCommission);
  const examCommissionRaw = Math.round(row.examCommissionRaw);
  const examCommission = Math.round(row.examCommission);
  const pentacamCommissionRaw = Math.round(row.pentacamCommissionRaw);
  const pentacamCommission = Math.round(row.pentacamCommission);
  const costOfLivingAllowance = Math.round(row.costOfLivingAllowance);
  const transportAllowance = Math.round(row.transportAllowance);
  const overtimePay = Math.round(row.overtimePay);
  const totalCommission =
    attendanceCommission +
    examCommission +
    pentacamCommission +
    costOfLivingAllowance +
    transportAllowance;

  return {
    ...row,
    basicSalary,
    absentDeduction,
    leaveDeduction,
    missingCheckoutDeduction,
    lateDeduction,
    earlyLeaveDeduction,
    penaltyDeduction,
    advancesDeduction,
    insuranceDeduction,
    totalDeductions,
    deductionPct: basicSalary > 0 ? totalDeductions / basicSalary : 0,
    netBasic,
    attendanceCommissionRaw,
    attendanceCommission,
    examCommissionRaw,
    examCommission,
    pentacamCommissionRaw,
    pentacamCommission,
    costOfLivingAllowance,
    transportAllowance,
    totalCommission,
    overtimePay,
    totalPay: netBasic + totalCommission + overtimePay,
  };
}

export const PENTACAM_TIERS = [
  { price: 450, deduction: 123.75, empPct: 0.455 },
  { price: 400, deduction: 110, empPct: 0.455 },
  { price: 350, deduction: 85, empPct: 0.47 },
  { price: 250, deduction: 60, empPct: 0.5 },
] as const;

export function calcPentacamPool(
  cases450: number,
  cases400: number,
  cases350: number,
  cases250: number,
): number {
  return round2(
    cases450 * PENTACAM_TIERS[0].deduction * PENTACAM_TIERS[0].empPct +
      cases400 * PENTACAM_TIERS[1].deduction * PENTACAM_TIERS[1].empPct +
      cases350 * PENTACAM_TIERS[2].deduction * PENTACAM_TIERS[2].empPct +
      cases250 * PENTACAM_TIERS[3].deduction * PENTACAM_TIERS[3].empPct,
  );
}

export function calcPentacamDrPool(
  cases450: number,
  cases400: number,
  cases350: number,
  cases250: number,
): number {
  return round2(
    cases450 * PENTACAM_TIERS[0].deduction * (1 - PENTACAM_TIERS[0].empPct) +
      cases400 * PENTACAM_TIERS[1].deduction * (1 - PENTACAM_TIERS[1].empPct) +
      cases350 * PENTACAM_TIERS[2].deduction * (1 - PENTACAM_TIERS[2].empPct) +
      cases250 * PENTACAM_TIERS[3].deduction * (1 - PENTACAM_TIERS[3].empPct),
  );
}

interface AttendanceRates {
  r3: number;
  r5: number;
  r7: number;
  r10: number;
}

function attendanceCommissionRate(
  leaveDays: number,
  rates: AttendanceRates,
): number {
  if (leaveDays <= 3) return rates.r3;
  if (leaveDays <= 5) return rates.r5;
  if (leaveDays <= 7) return rates.r7;
  if (leaveDays <= 10) return rates.r10;
  return 0;
}

function toDateKey(value: any): string {
  return value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value ?? "").slice(0, 10);
}

async function loadAttendanceRates(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<AttendanceRates> {
  const keys = [
    "attendance_rate_3",
    "attendance_rate_5",
    "attendance_rate_7",
    "attendance_rate_10",
  ];
  const rows = await db!
    .select()
    .from(salaryConfig)
    .where(inArray(salaryConfig.key, keys));
  const map = Object.fromEntries(
    rows.map((r: any) => [r.key, parseFloat(r.value)]),
  );
  return {
    r3: map["attendance_rate_3"] ?? 0.25,
    r5: map["attendance_rate_5"] ?? 0.15,
    r7: map["attendance_rate_7"] ?? 0.1,
    r10: map["attendance_rate_10"] ?? 0.05,
  };
}

const DEFAULT_LATE_TIERS: LateTier[] = [
  { minMin: 1, maxMin: 14, type: "linear" },
  { minMin: 15, maxMin: 29, dayFraction: 0.25 },
  { minMin: 30, maxMin: 59, dayFraction: 0.5 },
  { minMin: 60, maxMin: 119, dayFraction: 1 },
  { minMin: 120, maxMin: null, dayFraction: 2 },
];

async function loadLateTiers(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<LateTier[]> {
  const rows = await db!
    .select()
    .from(salaryConfig)
    .where(eq(salaryConfig.key, "salary_late_tiers"));
  if (rows.length && rows[0].value) {
    try {
      return normalizeLateTiers(
        JSON.parse(rows[0].value as string) as LateTier[],
      );
    } catch {}
  }
  return DEFAULT_LATE_TIERS;
}

async function loadDeductionsEnabled(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<boolean> {
  const rows = await db!
    .select({ value: salaryConfig.value })
    .from(salaryConfig)
    .where(eq(salaryConfig.key, "salary_deductions_enabled"))
    .limit(1);
  return rows[0]?.value !== "false";
}

// Leave multiplier for exam/pentacam commissions (separate rule the user specified)
function leaveMultiplier(leaveDays: number): number {
  if (leaveDays <= 3) return 1.0;
  if (leaveDays <= 5) return 0.75;
  if (leaveDays <= 7) return 0.5;
  if (leaveDays <= 10) return 0.25;
  return 0;
}

function monthRange(year: number, month: number): [string, string] {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return [
    `${year}-${mm}-01`,
    `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  ];
}

export interface PayrollRow {
  empCd: string;
  year: number;
  month: number;
  section: string;
  basicSalary: number;
  workingDays: number;
  absentDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  leaveDays: number;
  absentDeduction: number;
  leaveDeduction: number;
  missingCheckoutDeduction: number;
  lateDeduction: number;
  earlyLeaveDeduction: number;
  penaltyDeduction: number;
  advancesDeduction: number;
  insuranceDeduction: number;
  totalDeductions: number;
  deductionPct: number;
  leaveMultiplier: number;
  netBasic: number;
  attendanceCommission: number;
  attendanceCommissionRaw: number;
  examCommission: number;
  examCommissionRaw: number;
  pentacamCommission: number;
  pentacamCommissionRaw: number;
  costOfLivingAllowance: number;
  transportAllowance: number;
  totalCommission: number;
  overtimePay: number;
  totalPay: number;
}

export class PayrollComputeService {
  static async compute(
    year: number,
    month: number,
    section = "مركز",
    filterEmpCd?: string,
    fromDate?: string,
    toDate?: string,
    options: { notify?: boolean } = {},
  ): Promise<PayrollRow[]> {
    const notify = options.notify !== false;
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const firstDay = fromDate || monthRange(year, month)[0];
    const lastDay = toDate || monthRange(year, month)[1];

    const employeeRows = filterEmpCd
      ? await db
          .select()
          .from(attendanceEmployees)
          .where(eq(attendanceEmployees.empCd, filterEmpCd))
      : await db
          .select()
          .from(attendanceEmployees)
          .where(
            and(
              // Department spellings vary ("العيادة", "المركز والعيادة", ...).
              or(
                eq(attendanceEmployees.department, section),
                like(
                  attendanceEmployees.department,
                  section === "عيادة" ? "%عياد%" : "%مركز%",
                ),
              ),
              or(
                eq(attendanceEmployees.active, true),
                gte(
                  attendanceEmployees.terminationDate,
                  new Date(`${firstDay}T00:00:00`),
                ),
              ),
            ),
          );

    const isMarkaz = section === "مركز";

    const sectionSettings = await db
      .select()
      .from(salaryEmployeeSectionSettings)
      .where(eq(salaryEmployeeSectionSettings.section, section));
    const sectionSettingsByEmp = new Map(
      sectionSettings.map((settings: any) => [settings.empCd, settings]),
    );
    const employees = employeeRows.map((employee: any) => ({
      ...employee,
      ...(sectionSettingsByEmp.get(employee.empCd) ?? {}),
    }));

    const employeeCodes = employees.map((employee: any) => employee.empCd);
    const attendanceMappings = employeeCodes.length
      ? await db
          .select()
          .from(employeeAttendanceMapping)
          .where(
            inArray(employeeAttendanceMapping.machineUserId, employeeCodes),
          )
      : [];
    const userIdByEmpCd = new Map<string, number>(
      attendanceMappings.map((mapping: any) => [
        String(mapping.machineUserId),
        Number(mapping.userId),
      ]),
    );
    const notificationSettings = await getAppNotificationSettings().catch(
      () => DEFAULT_APP_NOTIFICATION_SETTINGS,
    );
    const notificationFeedRow = await getSystemSetting(
      APP_NOTIFICATION_FEED_KEY,
    ).catch(() => null);
    let notificationFeed: any[] = [];
    try {
      notificationFeed = notificationFeedRow?.value
        ? JSON.parse(String(notificationFeedRow.value))
        : [];
    } catch {
      notificationFeed = [];
    }
    const sentLateWarningKeys = new Set(
      notificationFeed
        .map((item: any) => String(item?.meta?.dedupeKey ?? ""))
        .filter(Boolean),
    );

    const acRates = await loadAttendanceRates(db);
    const lateTiers = await loadLateTiers(db);
    const deductionsEnabled = await loadDeductionsEnabled(db);

    const [
      poolRows,
      basics,
      dailyRows,
      penalties,
      advances,
      shiftAttendanceRows,
      salaryHolidayRows,
      attendanceHolidayRows,
      shiftDefs,
      mcExcludeRows,
      sickLeaveRows,
      leaveBalanceRows,
      overtimeDayRows,
      rawPunchRows,
    ] = await Promise.all([
      db
        .select()
        .from(salaryCommissionPools)
        .where(
          and(
            eq(salaryCommissionPools.year, year),
            eq(salaryCommissionPools.month, month),
          ),
        ),
      db
        .select()
        .from(salaryBasics)
        .where(
          and(
            eq(salaryBasics.section, section),
            lte(salaryBasics.effectiveFrom, lastDay as any),
            or(
              isNull(salaryBasics.effectiveTo),
              gte(salaryBasics.effectiveTo, firstDay as any),
            ),
          ),
        ),
      db
        .select({
          empCd: attendanceDaily.empCd,
          shiftId: attendanceDaily.shiftId,
          firstIn: attendanceDaily.firstIn,
          lastOut: attendanceDaily.lastOut,
          workedMinutes: attendanceDaily.workedMinutes,
          status: attendanceDaily.status,
          workDate: attendanceDaily.workDate,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeInMinutes: attendanceDaily.overtimeInMinutes,
          overtimeOutMinutes: attendanceDaily.overtimeOutMinutes,
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          leaveType: attendanceDaily.leaveType,
          leaveNotAffectCommission: attendanceDaily.leaveNotAffectCommission,
        })
        .from(attendanceDaily)
        .where(
          and(
            gte(attendanceDaily.workDate, firstDay as any),
            lte(attendanceDaily.workDate, lastDay as any),
          ),
        ),
      db
        .select()
        .from(salaryPenalties)
        .where(
          or(
            and(
              gte(salaryPenalties.penaltyDate, firstDay as any),
              lte(salaryPenalties.penaltyDate, lastDay as any),
            ),
            and(
              isNull(salaryPenalties.penaltyDate),
              eq(salaryPenalties.year, year),
              eq(salaryPenalties.month, month),
            ),
          ),
        ),
      db
        .select()
        .from(salaryAdvances)
        .where(
          and(eq(salaryAdvances.year, year), eq(salaryAdvances.month, month)),
        ),
      isMarkaz
        ? db
            .select()
            .from(shiftAttendance)
            .where(
              and(
                gte(shiftAttendance.workDate, firstDay as any),
                lte(shiftAttendance.workDate, lastDay as any),
              ),
            )
        : Promise.resolve([]),
      db
        .select()
        .from(salaryHolidays)
        .where(
          and(
            gte(salaryHolidays.date, firstDay as any),
            lte(salaryHolidays.date, lastDay as any),
          ),
        ),
      db
        .select()
        .from(attendanceHolidays)
        .where(
          and(
            gte(attendanceHolidays.date, firstDay as any),
            lte(attendanceHolidays.date, lastDay as any),
          ),
        ),
      db.select().from(attendanceShifts),
      db
        .select()
        .from(salaryMissingCheckoutExclude)
        .where(
          and(
            gte(salaryMissingCheckoutExclude.workDate, firstDay as any),
            lte(salaryMissingCheckoutExclude.workDate, lastDay as any),
          ),
        ),
      employeeCodes.length
        ? db
            .select({
              empCd: attendanceLeaves.empCd,
              dateFrom: attendanceLeaves.dateFrom,
              dateTo: attendanceLeaves.dateTo,
              type: attendanceLeaves.type,
              notAffectCommission: attendanceLeaves.notAffectCommission,
            })
            .from(attendanceLeaves)
            .where(
              and(
                inArray(attendanceLeaves.empCd, employeeCodes),
                eq(attendanceLeaves.approved, true),
                lte(attendanceLeaves.dateFrom, `${year}-12-31` as any),
                gte(attendanceLeaves.dateTo, `${year}-01-01` as any),
              ),
            )
        : Promise.resolve([]),
      employeeCodes.length
        ? db
            .select()
            .from(attendanceLeaveBalances)
            .where(
              and(
                inArray(attendanceLeaveBalances.empCd, employeeCodes),
                eq(attendanceLeaveBalances.year, year),
              ),
            )
        : Promise.resolve([]),
      db
        .select()
        .from(attendanceOvertimeDays)
        .where(
          and(
            gte(attendanceOvertimeDays.workDate, firstDay as any),
            lte(attendanceOvertimeDays.workDate, lastDay as any),
          ),
        ),
      employeeCodes.length
        ? db
            .select({
              empCd: attendancePunches.empCd,
              punchAt: attendancePunches.punchAt,
            })
            .from(attendancePunches)
            .where(
              and(
                inArray(attendancePunches.empCd, employeeCodes),
                gte(
                  attendancePunches.punchAt,
                  new Date(`${firstDay}T00:00:00`),
                ),
                lte(
                  attendancePunches.punchAt,
                  new Date(`${lastDay}T23:59:59.999`),
                ),
              ),
            )
        : Promise.resolve([]),
    ]);

    // Group once: the per-employee loops below would otherwise rescan every row.
    const dailyRowsByEmp = new Map<string, any[]>();
    for (const row of dailyRows as any[]) {
      const list = dailyRowsByEmp.get(row.empCd) ?? [];
      list.push(row);
      dailyRowsByEmp.set(row.empCd, list);
    }

    const overtimeEnabledDays = new Map(
      (overtimeDayRows as any[]).map((row) => {
        const date = row.workDate;
        const dateKey =
          date instanceof Date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            : String(date).slice(0, 10);
        return [
          `${row.empCd}|${dateKey}`,
          {
            in: Boolean(row.inEnabled),
            out: Boolean(row.outEnabled),
            day: Boolean(row.extraDayEnabled),
          },
        ] as const;
      }),
    );

    // Set of holiday date strings YYYY-MM-DD (not Fridays — already excluded from roster)
    const holidayDates = new Set<string>(
      [
        ...salaryHolidayRows,
        ...attendanceHolidayRows.filter((holiday: any) => holiday.paid),
      ]
        .map((h: any) => {
          const d = h.date as any;
          return d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        })
        .filter((ds: any) => ds >= firstDay && ds <= lastDay),
    );
    // Set of "empCd|workDate" strings excluded from missing-checkout deduction
    const mcExcludeSet = new Set<string>(
      (mcExcludeRows as any[]).map((r) => {
        const d = r.workDate as any;
        const ds =
          d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        return `${r.empCd}|${ds}`;
      }),
    );
    const singlePunchDaySet = getSinglePunchDayKeys(rawPunchRows as any[]);

    const leaveBalanceByEmp = new Map(
      (leaveBalanceRows as any[]).map((row) => [
        row.empCd,
        Number(row.annualAllocation ?? 21) + Number(row.carryOver ?? 0),
      ]),
    );
    const leavesByEmp = new Map<string, any[]>();
    for (const leave of sickLeaveRows as any[]) {
      const rows = leavesByEmp.get(leave.empCd) ?? [];
      rows.push(leave);
      leavesByEmp.set(leave.empCd, rows);
    }
    const salaryLeaveDatesByEmp = new Map<string, Set<string>>();
    const salaryLeaveCommissionDatesByEmp = new Map<string, Set<string>>();
    // Paid holidays and weekly rest days inside a leave are not leave days.
    const isRestOrHoliday = await loadLeaveDayExclusions(
      db,
      employeeCodes,
      year,
    );
    for (const empCd of employeeCodes) {
      const usage = accountLeaveDays(
        leavesByEmp.get(empCd) ?? [],
        leaveBalanceByEmp.get(empCd) ?? 21,
        year,
        (key) => isRestOrHoliday(empCd, key),
      );
      salaryLeaveDatesByEmp.set(empCd, usage.salaryDateKeys);
      salaryLeaveCommissionDatesByEmp.set(
        empCd,
        usage.salaryCommissionDateKeys,
      );
    }



    const pool =
      poolRows.find((p: any) => p.section === section);
    const allowancePool =
      poolRows.find(
        (p: any) =>
          Number((p as any).costOfLivingAllowanceAmount ?? 0) > 0 ||
          Number((p as any).transportAllowanceAmount ?? 0) > 0,
      ) ?? pool;
    const markazAutoPools = isMarkaz
      ? await computeMarkazEffectivePools(year, month)
      : null;
    const examPool = markazAutoPools
      ? markazAutoPools.examPool
      : pool
        ? Number(pool.examPool)
        : 0;
    const examPoolConsultant =
      pool?.examPoolConsultant != null ? Number(pool.examPoolConsultant) : null;
    const examPoolSpecialist =
      pool?.examPoolSpecialist != null ? Number(pool.examPoolSpecialist) : null;
    const costOfLivingAllowance = allowancePool
      ? Number((allowancePool as any).costOfLivingAllowanceAmount ?? 0)
      : 0;
    const transportAllowance = allowancePool
      ? Number((allowancePool as any).transportAllowanceAmount ?? 0)
      : 0;
    const pentacamPool = markazAutoPools
      ? markazAutoPools.pentacamPool
      : pool
        ? calcPentacamPool(
            pool.cases450 ?? 0,
            pool.cases400 ?? 0,
            pool.cases350 ?? 0,
            pool.cases250 ?? 0,
          )
        : 0;
    const pentacamDrPool = markazAutoPools
      ? markazAutoPools.pentacamDrPool
      : pool
        ? calcPentacamDrPool(
            pool.cases450 ?? 0,
            pool.cases400 ?? 0,
            pool.cases350 ?? 0,
            pool.cases250 ?? 0,
          )
        : 0;

    // Resolve each employee's current basic (most recent effectiveFrom)
    const empBasicMap = new Map<string, number>();
    for (const emp of employees) {
      const rows = basics
        .filter((b: any) => b.empCd === emp.empCd)
        .sort((a: any, b: any) =>
          toDateKey(b.effectiveFrom).localeCompare(toDateKey(a.effectiveFrom)),
        );
      if (rows.length > 0) {
        const r = rows[0];
        const total =
          Number(r.basicAmount) +
          Number((r as any).socialAllowance ?? 0) +
          Number((r as any).costOfLivingAllowance ?? 0) +
          Number((r as any).transportAllowance ?? 0) +
          Number((r as any).workNatureAllowance ?? 0) +
          Number((r as any).receptionAllowance ?? 0) +
          Number((r as any).yearlyRaise ?? 0);
        empBasicMap.set(emp.empCd, total);
      }
    }

    // Commission eligibility flags per employee
    const commFlagsMap = new Map<
      string,
      {
        commAttendance: boolean;
        commExam: boolean;
        commPentacam: boolean;
        commDay10: boolean;
        commOvertime: boolean;
      }
    >();
    for (const emp of employees) {
      commFlagsMap.set(emp.empCd, {
        commAttendance: emp.commAttendance !== false,
        commExam: emp.commExam !== false,
        commPentacam: emp.commPentacam !== false,
        commDay10: emp.commDay10 !== false,
        commOvertime: emp.commOvertime !== false,
      });
    }
    const employeeSettingsMap = new Map<string, any>(
      employees.map((emp: any) => [String(emp.empCd), emp]),
    );
    const getShiftEmployeeSettings = (staff: any) => {
      // A linked employee with a salary line earns every commission and the
      // overtime on that line; the shift line carries basic shift pay only.
      if (staff.empCd && empBasicMap.has(String(staff.empCd))) {
        return {
          attendanceRate: 0,
          commissionMultiplier: 1,
          commAttendance: false,
          commExam: false,
          commPentacam: false,
          commDay10: false,
          commOvertime: false,
        };
      }
      const employee = staff.empCd
        ? employeeSettingsMap.get(String(staff.empCd))
        : null;
      const flags = employee
        ? commFlagsMap.get(String(employee.empCd))
        : undefined;
      return {
        attendanceRate:
          employee?.attendanceCommissionRate != null
            ? Number(employee.attendanceCommissionRate)
            : 0.25,
        commissionMultiplier:
          employee?.attendanceLeaveMultiplier != null
            ? Number(employee.attendanceLeaveMultiplier)
            : 1,
        commAttendance: flags?.commAttendance ?? true,
        commExam: flags?.commExam ?? true,
        commPentacam: flags?.commPentacam ?? true,
        commDay10: employee ? (flags?.commDay10 ?? true) : false,
        commOvertime: employee ? (flags?.commOvertime ?? true) : false,
      };
    };

    // Employees linked to a shift-roster member get basic pay from the shift
    // line; their employee line keeps commissions only, with no basic or deductions.
    const shiftPaidEmpCds = new Set<string>(
      isMarkaz
        ? (await db.select().from(shiftStaff))
            .filter((ss: any) => ss.empCd)
            .map((ss: any) => String(ss.empCd))
        : [],
    );

    const sumAllBasics = Array.from(empBasicMap.values()).reduce(
      (s, b) => s + b,
      0,
    );
    const activeCount = empBasicMap.size;

    // Pre-pass: compute net-for-ratios per employee (basic minus all deductions except insurance)
    const netForRatioMap = new Map<string, number>();
    for (const emp of employees) {
      const basic = empBasicMap.get(emp.empCd);
      if (!basic) continue;
      const empDailyRows = dailyRowsByEmp.get(emp.empCd) ?? [];
      const empAttendanceDays = aggregateAttendanceDays(empDailyRows as any[]);
      const wDays = empAttendanceDays.filter(
        (day: any) => day.status !== "holiday",
      ).length;
      let rawAbsent = 0,
        lateMins = 0,
        earlyMins = 0,
        missingCoDays = 0;
      rawAbsent = empAttendanceDays.filter(
        (d: any) => d.status === "absent",
      ).length;
      missingCoDays = [...singlePunchDaySet].filter(
        (key) => key.startsWith(`${emp.empCd}|`) && !mcExcludeSet.has(key),
      ).length;
      lateMins = empDailyRows.reduce(
        (s: any, d: any) => s + (d.lateMinutes ?? 0),
        0,
      );
      earlyMins = empDailyRows.reduce(
        (s: any, d: any) => s + (d.earlyLeaveMin ?? 0),
        0,
      );
      // Holiday days already carry status "holiday", so they are never absent.
      const absentD = rawAbsent;
      const dayRate = wDays > 0 ? basic / wDays : 0;
      const minRate = dayRate / 360;
      const deductions = deductionsEnabled
        ? round2(
            calculateAbsenceDeduction(basic, absentD) +
              calcMissingPunchDeduction(missingCoDays, dayRate) +
              lateMins * minRate +
              earlyMins * minRate +
              penalties
                .filter((p: any) => p.empCd === emp.empCd)
                .reduce(
                  (s: any, p: any) =>
                    s +
                    (p.penaltyDays
                      ? penaltyDaysDeduction(basic, Number(p.penaltyDays))
                      : Number(p.amount)),
                  0,
                ) +
              advances
                .filter((a: any) => a.empCd === emp.empCd)
                .reduce((s: any, a: any) => s + Number(a.amount), 0),
          )
        : 0;
      netForRatioMap.set(emp.empCd, round2(Math.max(0, basic - deductions)));
    }

    // Pentacam uses full salary/shift values as distribution weights. Deductions
    // and leave rules are applied once to each person's resulting share.
    const sumGrossBasicsForPenta = Array.from(empBasicMap.entries())
      .filter(([cd]) => commFlagsMap.get(cd)?.commPentacam !== false)
      .reduce((s, [, gross]) => s + gross, 0);
    const activeExamCount = Array.from(empBasicMap.keys()).filter(
      (cd) => commFlagsMap.get(cd)?.commExam !== false,
    ).length;

    // Load shift staff for مركز — they share the same exam/pentacam pools
    const activeShiftStaff = isMarkaz
      ? (await db.select().from(shiftStaff)).filter(
          (ss: any) =>
            ss.active ||
            // deactivated staff are still paid for roster days in this period
            shiftAttendanceRows.some((a: any) => a.staffId === ss.id),
        )
      : [];
    const shiftAttRows = activeShiftStaff.length > 0 ? shiftAttendanceRows : [];

    function fmtDate(d: any): string {
      return d instanceof Date
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : String(d).slice(0, 10);
    }

    // Same shift rules as the /salary/shift-payroll page (shared calculator).
    const shiftBaseMinutesMap = buildShiftBaseMinutesMap(shiftDefs as any[]);
    const shiftOverrideRows =
      activeShiftStaff.length > 0
        ? await db
            .select()
            .from(shiftPayrollAttendanceOverrides)
            .where(
              and(
                eq(shiftPayrollAttendanceOverrides.year, year),
                eq(shiftPayrollAttendanceOverrides.month, month),
              ),
            )
        : [];
    const shiftOverrideMap = new Map(
      shiftOverrideRows.map((o: any) => [o.staffId, o]),
    );

    type ShiftStats = {
      scheduled: number;
      attended: number;
      commMult: number;
      grossPay: number;
      shiftPay: number;
      deductionPct: number;
      netPay: number;
    };
    const shiftStatsMap = new Map<number, ShiftStats>();
    for (const ss of activeShiftStaff) {
      // Exclude entries on official holidays — those days are off, not absent
      const rows = shiftAttRows.filter((a: any) => {
        const ds = fmtDate(a.workDate);
        return a.staffId === ss.id && !holidayDates.has(ds);
      });

      let deductionPct = 0;
      if (ss.empCd) {
        const empDailyRows = dailyRowsByEmp.get(ss.empCd) ?? [];
        deductionPct = shiftPunchDeductionPct({
          basic: empBasicMap.get(ss.empCd) ?? 0,
          scheduled: rows.length,
          lateMinutes: empDailyRows.reduce(
            (s: number, d: any) => s + Number(d.lateMinutes ?? 0),
            0,
          ),
          earlyLeaveMinutes: empDailyRows.reduce(
            (s: number, d: any) => s + Number(d.earlyLeaveMin ?? 0),
            0,
          ),
          missingCheckoutDays: empDailyRows.filter(
            (d: any) => d.status === "missing_checkout",
          ).length,
          deductionsEnabled,
        });
      }

      const pay = computeShiftStaffPay({
        rows,
        rateBig: Number(ss.ratePerShift),
        mainShiftMinutes: Number(ss.mainShiftMinutes ?? 360) || 360,
        baseMinutesMap: shiftBaseMinutesMap,
        override: shiftOverrideMap.get(ss.id) as any,
        deductionsEnabled,
        punchDeductionPct: deductionPct,
      });

      shiftStatsMap.set(ss.id, {
        scheduled: pay.scheduled,
        attended: pay.attended,
        commMult: deductionsEnabled
          ? pay.attendedRatio * (1 - pay.punchDeductionPct)
          : 1,
        grossPay: pay.basicSalary,
        shiftPay: round2(pay.basicSalary - pay.absentDeduction),
        deductionPct: pay.punchDeductionPct,
        netPay: pay.netPay,
      });
    }

    // Separate doctors and techs — techs join employee pools, doctors get remainder
    const doctors = activeShiftStaff.filter((ss: any) => ss.type === "doctor");
    const techs = activeShiftStaff.filter((ss: any) => ss.type === "tech");
    const sumTechGrossPay = techs
      .filter((ss: any) => getShiftEmployeeSettings(ss).commPentacam)
      .reduce(
        (s: any, ss: any) => s + (shiftStatsMap.get(ss.id)?.grossPay ?? 0),
        0,
      );
    const totalGrossForPentacam = sumGrossBasicsForPenta + sumTechGrossPay;
    const activeTechsThisMonth = techs.filter(
      (ss: any) =>
        getShiftEmployeeSettings(ss).commExam &&
        (shiftStatsMap.get(ss.id)?.scheduled ?? 0) > 0,
    );
    const totalCountForExam = activeExamCount + activeTechsThisMonth.length;
    const examDoctorPercent =
      markazAutoPools?.breakdown.examDoctorPercent ?? 60;
    const examEmployeePercent =
      markazAutoPools?.breakdown.examEmployeePercent ?? 40;
    const examPoolDrs = round2(examPool * (examDoctorPercent / 100));
    const examPoolEmpsTechs = round2(examPool * (examEmployeePercent / 100));

    // عيادة: count eligible employees per pool to avoid double-paying
    const consultantEligible = !isMarkaz
      ? employees.filter(
          (e: any) =>
            empBasicMap.has(e.empCd) &&
            (e.salaryType === "استشاري" || e.salaryType === "الاثنين"),
        ).length
      : 0;
    const specialistEligible = !isMarkaz
      ? employees.filter(
          (e: any) =>
            empBasicMap.has(e.empCd) &&
            (e.salaryType === "أخصائي" || e.salaryType === "الاثنين"),
        ).length
      : 0;
    const perConsultant =
      examPoolConsultant !== null && consultantEligible > 0
        ? examPoolConsultant / consultantEligible
        : 0;
    const perSpecialist =
      examPoolSpecialist !== null && specialistEligible > 0
        ? examPoolSpecialist / specialistEligible
        : 0;

    const results: PayrollRow[] = [];

    for (const emp of employees) {
      const basic = empBasicMap.get(emp.empCd);
      if (!basic) continue;
      const flags = commFlagsMap.get(emp.empCd) ?? {
        commAttendance: true,
        commExam: true,
        commPentacam: true,
        commDay10: true,
        commOvertime: true,
      };

      const empDailyRows = dailyRowsByEmp.get(emp.empCd) ?? [];
      const empAttendanceDays = aggregateAttendanceDays(empDailyRows as any[]);

      // Working days = scheduled days (all statuses except holiday)
      const overtimeScheduledDays = new Set(
        empDailyRows
          .filter((day: any) => day.shiftId && !holidayDates.has(fmtDate(day.workDate)))
          .map((day: any) => fmtDate(day.workDate)),
      ).size;
      const workingDays = empAttendanceDays.filter(
        (day: any) => day.status !== "holiday",
      ).length;

      // Official holidays count as paid non-working days — don't deduct absence for them
      let rawAbsentDays = 0;
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;
      let overtimeMinutes = 0;
      let leaveDays = 0;

      let missingCheckoutDays = 0;
      rawAbsentDays = empAttendanceDays.filter(
        (day: any) => day.status === "absent",
      ).length;
      missingCheckoutDays = [...singlePunchDaySet].filter(
        (key) => key.startsWith(`${emp.empCd}|`) && !mcExcludeSet.has(key),
      ).length;
      lateMinutes = empDailyRows.reduce(
        (s: any, d: any) => s + (d.lateMinutes ?? 0),
        0,
      );
      earlyLeaveMinutes = empDailyRows.reduce(
        (s: any, d: any) => s + (d.earlyLeaveMin ?? 0),
        0,
      );
      leaveDays = countCommissionAffectingLeaveDays(
        (empAttendanceDays as any[]).filter(
          (day) => !holidayDates.has(String(day.workDate)),
        ),
      );
      const overtimeDays: Array<
        OvertimeDayPay & { dateKey: string; workedMinutes: number }
      > = empDailyRows.flatMap((day: any) => {
        if (!day.firstIn || !day.lastOut) return [];
        const date = day.workDate;
        const dateKey =
          date instanceof Date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            : String(date).slice(0, 10);
        const firstIn = new Date(day.firstIn).getTime();
        const lastOut = new Date(day.lastOut).getTime();
        const actualMinutes = Math.max(
          0,
          Math.round((lastOut - firstIn) / 60_000),
        );
        const kind = holidayDates.has(dateKey)
          ? "official_holiday"
          : !day.shiftId
            ? "weekly_rest"
            : "regular";
        const enabled = overtimeEnabledDays.get(`${emp.empCd}|${dateKey}`);
        const isEnabled =
          flags.commOvertime &&
          (kind === "regular"
            ? enabled?.out === true || enabled?.in === true
            : kind === "weekly_rest"
              ? enabled?.day === true
              : enabled?.day !== false);
        if (!isEnabled) return [];
        // Regular days pay only the materializer's approved overtime minutes.
        const workedMinutes =
          kind === "regular"
            ? DAILY_WORK_MINUTES +
              Math.min(
                Number(day.overtimeMinutes ?? 0),
                (enabled?.out ? Number(day.overtimeOutMinutes ?? 0) : 0) +
                (enabled?.in ? Number(day.overtimeInMinutes ?? 0) : 0),
              )
            : actualMinutes;
        return [
          {
            dateKey,
            workedMinutes,
            ...calculateOvertimeDayPay({
              compensationBase: basic,
              workedMinutes,
              kind,
            }),
          },
        ];
      });
      overtimeMinutes = overtimeDays.reduce(
        (sum, day) => sum + day.overtimeMinutes,
        0,
      );
      for (const overtimeDay of overtimeDays) {
        if (
          !notify ||
          !overtimeDay.requiresAlternativeDay ||
          !notificationSettings.attendance.enabled
        ) {
          continue;
        }
        const restDayWarningKey = `weekly-rest-replacement:${emp.empCd}:${overtimeDay.dateKey}`;
        if (sentLateWarningKeys.has(restDayWarningKey)) continue;

        const replacementDeadline = new Date(`${overtimeDay.dateKey}T12:00:00`);
        replacementDeadline.setDate(replacementDeadline.getDate() + 7);
        const deadlineKey = `${replacementDeadline.getFullYear()}-${String(replacementDeadline.getMonth() + 1).padStart(2, "0")}-${String(replacementDeadline.getDate()).padStart(2, "0")}`;
        await pushAppNotification({
          title: "مطلوب يوم راحة بديل",
          message: `${emp.fullName} عمل يوم راحته الأسبوعية بتاريخ ${overtimeDay.dateKey}. يجب تحديد يوم راحة بديل بحد أقصى ${deadlineKey}.`,
          kind: "warning",
          targetRoles: notificationSettings.attendance.managerId
            ? null
            : ["admin", "manager"],
          targetUserIds: notificationSettings.attendance.managerId
            ? [notificationSettings.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "weekly_rest_replacement",
          meta: {
            path: "/attendance/employees",
            empCd: emp.empCd,
            workDate: overtimeDay.dateKey,
            replacementDeadline: deadlineKey,
            dedupeKey: restDayWarningKey,
          },
          channels: {
            inApp: notificationSettings.attendance.inApp,
            push: notificationSettings.attendance.push,
            local: notificationSettings.attendance.local,
          },
        }).catch((error) => {
          console.warn("[Payroll] Failed to send rest-day warning:", error);
        });
        sentLateWarningKeys.add(restDayWarningKey);
      }
      // Holiday days already carry status "holiday", so they are never absent.
      const absentDays = rawAbsentDays;

      const dailyRate = workingDays > 0 ? basic / workingDays : 0;
      const minuteRate = dailyRate / 360; // 6h × 60min

      const absentDeduction = deductionsEnabled
        ? calculateAbsenceDeduction(basic, absentDays)
        : 0;
      const salaryLeaveDates =
        salaryLeaveDatesByEmp.get(emp.empCd) ?? new Set();
      const salaryLeaveCommissionDates =
        salaryLeaveCommissionDatesByEmp.get(emp.empCd) ?? new Set();
      const salaryLeaveDays = [...salaryLeaveDates].filter(
        (dateKey) => dateKey >= firstDay && dateKey <= lastDay,
      ).length;
      const salaryLeaveCommissionDays = [...salaryLeaveCommissionDates].filter(
        (dateKey) => dateKey >= firstDay && dateKey <= lastDay,
      ).length;
      const leaveDeduction = deductionsEnabled
        ? salaryLeaveDeduction(basic, salaryLeaveDays)
        : 0;
      const leaveCommissionDeduction = deductionsEnabled
        ? salaryLeaveDeduction(basic, salaryLeaveCommissionDays)
        : 0;
      const missingCheckoutDeduction = deductionsEnabled
        ? calcMissingPunchDeduction(missingCheckoutDays, dailyRate)
        : 0;

      // Per-day late tier deduction — always use daily rows for tier classification
      const empDailyRowsForLate = empDailyRows;
      const lateDeduction = deductionsEnabled
        ? round2(
            [...empDailyRowsForLate]
              .sort((a: any, b: any) => {
                const aDate =
                  a.workDate instanceof Date
                    ? a.workDate.getTime()
                    : new Date(
                        `${String(a.workDate).slice(0, 10)}T12:00:00`,
                      ).getTime();
                const bDate =
                  b.workDate instanceof Date
                    ? b.workDate.getTime()
                    : new Date(
                        `${String(b.workDate).slice(0, 10)}T12:00:00`,
                      ).getTime();
                return aDate - bDate;
              })
              .reduce(
                (
                  state: {
                    deduction: number;
                    linearCount: number;
                    weekKey: string | null;
                  },
                  d: any,
                ) => {
                  const mins = d.lateMinutes ?? 0;
                  const tier = lateTiers.find(
                    (item) =>
                      mins >= item.minMin &&
                      (item.maxMin === null || mins <= item.maxMin),
                  );
                  const weekKey =
                    tier?.type === "linear"
                      ? getPayrollWeekKey(d.workDate)
                      : state.weekKey;
                  const linearCount =
                    tier?.type === "linear"
                      ? state.weekKey === weekKey
                        ? state.linearCount + 1
                        : 1
                      : state.linearCount;
                  return {
                    linearCount,
                    weekKey,
                    deduction:
                      state.deduction +
                      calcLateDayTier(
                        mins,
                        dailyRate,
                        minuteRate,
                        lateTiers,
                        linearCount,
                      ),
                  };
                },
                { deduction: 0, linearCount: 0, weekKey: null },
              ).deduction,
          )
        : 0;

      const linearLateWeekCounts = new Map<string, number>();
      for (const day of empDailyRowsForLate) {
        const minutes = Number(day.lateMinutes ?? 0);
        const isLinear =
          lateTiers.find(
            (tier) =>
              minutes >= tier.minMin &&
              (tier.maxMin === null || minutes <= tier.maxMin),
          )?.type === "linear";
        if (!isLinear) continue;

        const weekKey = getPayrollWeekKey(day.workDate);
        linearLateWeekCounts.set(
          weekKey,
          (linearLateWeekCounts.get(weekKey) ?? 0) + 1,
        );
      }
      const hasRepeatedLinearLateInWeek = [
        ...linearLateWeekCounts.values(),
      ].some((count) => count >= 2);
      const lateWarningKey = `late-linear-weekly-2:${emp.empCd}:${firstDay}:${lastDay}`;
      if (
        notify &&
        hasRepeatedLinearLateInWeek &&
        notificationSettings.attendance.enabled &&
        !sentLateWarningKeys.has(lateWarningKey)
      ) {
        const employeeUserId = userIdByEmpCd.get(String(emp.empCd));
        await pushAppNotification({
          title: "تنبيه تأخير",
          message: `${emp.fullName}: تكرار التأخير الخطي يتصاعد أسبوعيًا داخل دورة المرتب: الثانية ×2، الثالثة ×3، والرابعة فأكثر ×4.`,
          kind: "warning",
          targetRoles:
            employeeUserId || notificationSettings.attendance.managerId
              ? null
              : ["admin", "manager"],
          targetUserIds: employeeUserId
            ? [employeeUserId]
            : notificationSettings.attendance.managerId
              ? [notificationSettings.attendance.managerId]
              : null,
          source: "attendance",
          entityType: "late_recurrence_warning",
          meta: {
            path: "/attendance/employees",
            empCd: emp.empCd,
            fromDate: firstDay,
            toDate: lastDay,
            dedupeKey: lateWarningKey,
          },
          channels: {
            inApp: notificationSettings.attendance.inApp,
            push: notificationSettings.attendance.push,
            local: notificationSettings.attendance.local,
          },
        }).catch((error) => {
          console.warn("[Payroll] Failed to send late warning:", error);
        });
        sentLateWarningKeys.add(lateWarningKey);
      }

      const earlyLeaveDeduction = deductionsEnabled
        ? round2(earlyLeaveMinutes * minuteRate)
        : 0;
      const penaltyDeduction = deductionsEnabled
        ? round2(
            penalties
              .filter((p: any) => p.empCd === emp.empCd)
              .reduce((s: any, p: any) => {
                if (p.penaltyDays)
                  return s + penaltyDaysDeduction(basic, Number(p.penaltyDays));
                return s + Number(p.amount);
              }, 0),
          )
        : 0;
      const advancesDeduction = deductionsEnabled
        ? round2(
            advances
              .filter((a: any) => a.empCd === emp.empCd)
              .reduce((s: any, a: any) => s + Number(a.amount), 0),
          )
        : 0;
      const basicRow = basics
        .filter((b: any) => b.empCd === emp.empCd)
        .sort((a: any, b: any) =>
          toDateKey(b.effectiveFrom).localeCompare(toDateKey(a.effectiveFrom)),
        )[0];
      const insuranceDeduction = round2(
        Number((basicRow as any)?.insuranceDeduction ?? 0),
      );
      const totalDeductions = sumPayrollDeductions({
        absent: absentDeduction,
        leave: leaveDeduction,
        missingCheckout: missingCheckoutDeduction,
        late: lateDeduction,
        earlyLeave: earlyLeaveDeduction,
        penalty: penaltyDeduction,
        advances: advancesDeduction,
        insurance: insuranceDeduction,
      });
      const deductionPct = basic > 0 ? Math.min(1, totalDeductions / basic) : 0;

      const netBasic = round2(Math.max(0, basic - totalDeductions));
      const customLm =
        emp.attendanceLeaveMultiplier != null
          ? Number(emp.attendanceLeaveMultiplier)
          : null;
      const lm =
        customLm !== null
          ? customLm
          : deductionsEnabled
            ? leaveMultiplier(leaveDays)
            : 1;
      // Insurance affects take-home salary only, not commission eligibility.
      const deductionsForComm = round2(
        absentDeduction +
          leaveCommissionDeduction +
          missingCheckoutDeduction +
          lateDeduction +
          earlyLeaveDeduction +
          penaltyDeduction,
      );
      const deductionPctForComm =
        basic > 0 ? Math.min(1, deductionsForComm / basic) : 0;
      const commMult = lm * (1 - deductionPctForComm);
      const empRate =
        emp.attendanceCommissionRate != null
          ? Number(emp.attendanceCommissionRate)
          : null;
      const acRate =
        empRate !== null
          ? empRate
          : deductionsEnabled
            ? attendanceCommissionRate(leaveDays, acRates)
            : acRates.r3;

      const attendanceCommissionRaw = flags.commAttendance
        ? round2(acRate * basic)
        : 0;
      const attendanceCommission = round2(attendanceCommissionRaw * commMult);
      let examCommissionRaw: number;
      if (!flags.commExam) {
        examCommissionRaw = 0;
      } else if (
        !isMarkaz &&
        (examPoolConsultant !== null || examPoolSpecialist !== null)
      ) {
        const t = emp.salaryType;
        const cShare = t === "استشاري" || t === "الاثنين" ? perConsultant : 0;
        const sShare = t === "أخصائي" || t === "الاثنين" ? perSpecialist : 0;
        examCommissionRaw = round2(cShare + sShare);
      } else {
        if (isMarkaz) {
          examCommissionRaw =
            totalCountForExam > 0
              ? round2(examPoolEmpsTechs / totalCountForExam)
              : 0;
        } else {
          const empShares = emp.salaryType === "الاثنين" ? 2 : 1;
          examCommissionRaw = round2((examPool / 3) * empShares);
        }
      }
      const netForRatio = netForRatioMap.get(emp.empCd) ?? 0;
      const examCommission =
        isMarkaz && flags.commExam
          ? calcAdjustedCommission(examCommissionRaw, basic, netForRatio, lm)
          : round2(examCommissionRaw * commMult);
      const pentacamShare =
        isMarkaz && flags.commPentacam
          ? calcWeightedCommissionShare(
              pentacamPool,
              basic,
              totalGrossForPentacam,
              netForRatio,
              lm,
            )
          : { raw: 0, payable: 0 };
      const pentacamCommissionRaw = pentacamShare.raw;
      const pentacamCommission = pentacamShare.payable;
      const costOfLivingAllowancePay =
        flags.commDay10 && netBasic > 0 ? round2(costOfLivingAllowance) : 0;
      const transportAllowancePay =
        flags.commDay10 && netBasic > 0 ? round2(transportAllowance) : 0;
      const day10Allowances = round2(
        costOfLivingAllowancePay + transportAllowancePay,
      );
      const totalCommission = round2(
        attendanceCommission +
          examCommission +
          pentacamCommission +
          day10Allowances,
      );
      const overtimeNetBasic = round2(
        Math.max(
          0,
          basic -
            absentDeduction -
            leaveCommissionDeduction -
            missingCheckoutDeduction -
            lateDeduction -
            earlyLeaveDeduction -
            penaltyDeduction,
        ),
      );
      const overtimeCompensationBase = round2(
        calculateOvertimeCompensationBase({
          netBasic: overtimeNetBasic,
          totalCommission,
          day10Allowances,
        }),
      );
      const overtimePay = flags.commOvertime
        ? round2(
            overtimeDays.reduce(
              (sum, day) =>
                sum +
                calculateOvertimeDayPay({
                  compensationBase: overtimeCompensationBase,
                  scheduledWorkingDays: overtimeScheduledDays,
                  workedMinutes: day.workedMinutes,
                  kind: day.kind,
                }).overtimePay,
              0,
            ),
          )
        : 0;
      const totalPay = round2(netBasic + totalCommission + overtimePay);
      const row: PayrollRow = {
        empCd: emp.empCd,
        year,
        month,
        section,
        basicSalary: basic,
        workingDays,
        absentDays,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        leaveDays,
        absentDeduction,
        leaveDeduction,
        missingCheckoutDeduction,
        lateDeduction,
        earlyLeaveDeduction,
        penaltyDeduction,
        advancesDeduction,
        insuranceDeduction,
        totalDeductions,
        deductionPct,
        leaveMultiplier: lm,
        netBasic,
        attendanceCommission,
        attendanceCommissionRaw,
        examCommission,
        examCommissionRaw,
        pentacamCommission,
        pentacamCommissionRaw,
        costOfLivingAllowance: costOfLivingAllowancePay,
        transportAllowance: transportAllowancePay,
        totalCommission,
        overtimePay,
        totalPay,
      };
      // Linked to the shift roster: basic and attendance deductions sit on the
      // shift line. This line keeps commissions and overtime, less personal deductions.
      if (shiftPaidEmpCds.has(emp.empCd)) {
        const personalDeductions = round2(
          penaltyDeduction + advancesDeduction + insuranceDeduction,
        );
        Object.assign(row, {
          basicSalary: 0,
          absentDeduction: 0,
          leaveDeduction: 0,
          missingCheckoutDeduction: 0,
          lateDeduction: 0,
          earlyLeaveDeduction: 0,
          totalDeductions: personalDeductions,
          deductionPct: 0,
          netBasic: 0,
          totalPay: round2(totalCommission + overtimePay - personalDeductions),
        });
      }
      results.push(row);
    }

    // Add shift staff rows (مركز only)
    // Techs: share pools proportionally with regular employees
    let usedExam = 0;
    let usedPenta = 0;
    for (const ss of techs) {
      const stats = shiftStatsMap.get(ss.id) ?? {
        scheduled: 0,
        attended: 0,
        commMult: 1,
        grossPay: 0,
        shiftPay: 0,
        deductionPct: 0,
        netPay: 0,
      };
      const { scheduled, attended, grossPay, deductionPct, netPay } = stats;

      const absent = scheduled - attended;
      const basicSalary = grossPay;
      const punchDeduction = round2(basicSalary * deductionPct);
      const absentDeduction = round2(
        Math.max(0, basicSalary - netPay - punchDeduction),
      );
      const totalDeductions = round2(absentDeduction + punchDeduction);
      const netBasic = netPay;
      const settings = getShiftEmployeeSettings(ss);
      const overtimeScheduledDays = new Set(
        shiftAttRows
          .filter((entry: any) => entry.staffId === ss.id && !holidayDates.has(fmtDate(entry.workDate)))
          .map((entry: any) => fmtDate(entry.workDate)),
      ).size;
      const overtimeDays: Array<
        OvertimeDayPay & { dateKey: string; workedMinutes: number }
      > = ss.empCd
        ? dailyRows
            .filter((day: any) => day.empCd === ss.empCd)
            .flatMap((day: any) => {
              if (!day.firstIn || !day.lastOut) return [];
              const dateKey = fmtDate(day.workDate);
              const firstIn = new Date(day.firstIn).getTime();
              const lastOut = new Date(day.lastOut).getTime();
              let workedMinutes = Math.max(
                0,
                Math.round((lastOut - firstIn) / 60_000),
              );
              const kind = holidayDates.has(dateKey)
                ? "official_holiday"
                : !day.shiftId
                  ? "weekly_rest"
                  : "regular";
              const enabled = overtimeEnabledDays.get(`${ss.empCd}|${dateKey}`);
              const isEnabled =
                settings.commOvertime &&
                (kind === "regular"
                  ? enabled?.out === true || enabled?.in === true
                  : kind === "weekly_rest"
                    ? enabled?.day === true
                    : enabled?.day !== false);
              if (!isEnabled) return [];
              if (kind === "regular") {
                workedMinutes =
                  DAILY_WORK_MINUTES +
                  Math.min(
                    Number(day.overtimeMinutes ?? 0),
                    (enabled?.out ? Number(day.overtimeOutMinutes ?? 0) : 0) +
                    (enabled?.in ? Number(day.overtimeInMinutes ?? 0) : 0),
                  );
              }

              return [
                {
                  dateKey,
                  workedMinutes,
                  ...calculateOvertimeDayPay({
                    compensationBase: basicSalary,
                    workedMinutes,
                    kind,
                  }),
                },
              ];
            })
        : [];
      const overtimeMinutes = overtimeDays.reduce(
        (sum, day) => sum + day.overtimeMinutes,
        0,
      );

      const attendanceCommissionRaw = settings.commAttendance
        ? round2(settings.attendanceRate * netBasic)
        : 0;
      const attendanceCommission = round2(
        attendanceCommissionRaw * settings.commissionMultiplier,
      );
      const examCommissionRaw =
        settings.commExam && scheduled > 0 && totalCountForExam > 0
          ? round2(examPoolEmpsTechs / totalCountForExam)
          : 0;
      const examCommission = calcAdjustedCommission(
        examCommissionRaw,
        grossPay,
        netBasic,
        settings.commissionMultiplier,
      );
      const pentacamShare = settings.commPentacam
        ? calcWeightedCommissionShare(
            pentacamPool,
            grossPay,
            totalGrossForPentacam,
            netBasic,
            settings.commissionMultiplier,
          )
        : { raw: 0, payable: 0 };
      const pentacamCommission = pentacamShare.payable;
      const costOfLivingAllowancePay =
        settings.commDay10 && netBasic > 0 ? round2(costOfLivingAllowance) : 0;
      const transportAllowancePay =
        settings.commDay10 && netBasic > 0 ? round2(transportAllowance) : 0;
      usedExam = round2(usedExam + examCommission);
      usedPenta = round2(usedPenta + pentacamCommission);
      const totalCommission = round2(
        attendanceCommission +
          examCommission +
          pentacamCommission +
          costOfLivingAllowancePay +
          transportAllowancePay,
      );
      const overtimeCompensationBase = round2(
        calculateOvertimeCompensationBase({
          netBasic,
          totalCommission,
          day10Allowances: round2(
            costOfLivingAllowancePay + transportAllowancePay,
          ),
        }),
      );
      const overtimePay = settings.commOvertime
        ? round2(
            overtimeDays.reduce(
              (sum, day) =>
                sum +
                calculateOvertimeDayPay({
                  compensationBase: overtimeCompensationBase,
                  scheduledWorkingDays: overtimeScheduledDays,
                  workedMinutes: day.workedMinutes,
                  kind: day.kind,
                }).overtimePay,
              0,
            ),
          )
        : 0;
      const totalPay = round2(netBasic + totalCommission + overtimePay);

      results.push({
        empCd: `shift_${ss.id}`,
        year,
        month,
        section,
        basicSalary,
        workingDays: scheduled,
        absentDays: absent,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes,
        leaveDays: 0,
        absentDeduction,
        leaveDeduction: 0,
        missingCheckoutDeduction: 0,
        lateDeduction: punchDeduction,
        earlyLeaveDeduction: 0,
        penaltyDeduction: 0,
        advancesDeduction: 0,
        insuranceDeduction: 0,
        totalDeductions,
        deductionPct,
        leaveMultiplier: settings.commissionMultiplier,
        netBasic,
        attendanceCommission,
        attendanceCommissionRaw,
        examCommission,
        examCommissionRaw,
        pentacamCommission,
        pentacamCommissionRaw: pentacamShare.raw,
        costOfLivingAllowance: costOfLivingAllowancePay,
        transportAllowance: transportAllowancePay,
        totalCommission,
        overtimePay,
        totalPay,
      });
    }

    // Doctors: distribute by full shift value, then apply net ratio and leave rules.
    const sumDoctorExamBasics = doctors
      .filter((ss: any) => getShiftEmployeeSettings(ss).commExam)
      .reduce(
        (s: any, ss: any) => s + (shiftStatsMap.get(ss.id)?.grossPay ?? 0),
        0,
      );
    const sumDoctorPentacamBasics = doctors
      .filter((ss: any) => getShiftEmployeeSettings(ss).commPentacam)
      .reduce(
        (s: any, ss: any) => s + (shiftStatsMap.get(ss.id)?.grossPay ?? 0),
        0,
      );
    for (const ss of doctors) {
      const stats = shiftStatsMap.get(ss.id) ?? {
        scheduled: 0,
        attended: 0,
        commMult: 1,
        grossPay: 0,
        shiftPay: 0,
        deductionPct: 0,
        netPay: 0,
      };
      const { scheduled, attended, grossPay, deductionPct, netPay } = stats;

      const absent = scheduled - attended;
      const basicSalary = grossPay;
      const punchDeduction = round2(basicSalary * deductionPct);
      const absentDeduction = round2(
        Math.max(0, basicSalary - netPay - punchDeduction),
      );
      const totalDeductions = round2(absentDeduction + punchDeduction);
      const netBasic = netPay;
      const settings = getShiftEmployeeSettings(ss);

      const attendanceCommissionRaw = settings.commAttendance
        ? round2(settings.attendanceRate * netBasic)
        : 0;
      const attendanceCommission = round2(
        attendanceCommissionRaw * settings.commissionMultiplier,
      );
      const examShare = settings.commExam
        ? calcWeightedCommissionShare(
            examPoolDrs,
            grossPay,
            sumDoctorExamBasics,
            netBasic,
            settings.commissionMultiplier,
          )
        : { raw: 0, payable: 0 };
      const examCommission = examShare.payable;
      const pentacamShare = settings.commPentacam
        ? calcWeightedCommissionShare(
            pentacamDrPool,
            grossPay,
            sumDoctorPentacamBasics,
            netBasic,
            settings.commissionMultiplier,
          )
        : { raw: 0, payable: 0 };
      const pentacamCommission = pentacamShare.payable;
      const costOfLivingAllowancePay =
        settings.commDay10 && netBasic > 0 ? round2(costOfLivingAllowance) : 0;
      const transportAllowancePay =
        settings.commDay10 && netBasic > 0 ? round2(transportAllowance) : 0;
      const totalCommission = round2(
        attendanceCommission +
          examCommission +
          pentacamCommission +
          costOfLivingAllowancePay +
          transportAllowancePay,
      );
      const totalPay = round2(netBasic + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year,
        month,
        section,
        basicSalary,
        workingDays: scheduled,
        absentDays: absent,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        leaveDays: 0,
        absentDeduction,
        leaveDeduction: 0,
        missingCheckoutDeduction: 0,
        lateDeduction: punchDeduction,
        earlyLeaveDeduction: 0,
        penaltyDeduction: 0,
        advancesDeduction: 0,
        insuranceDeduction: 0,
        totalDeductions,
        deductionPct,
        leaveMultiplier: settings.commissionMultiplier,
        netBasic,
        attendanceCommission,
        attendanceCommissionRaw,
        examCommission,
        examCommissionRaw: examShare.raw,
        pentacamCommission,
        pentacamCommissionRaw: pentacamShare.raw,
        costOfLivingAllowance: costOfLivingAllowancePay,
        transportAllowance: transportAllowancePay,
        totalCommission,
        overtimePay: 0,
        totalPay,
      });
    }

    return results.map(roundPayrollMoney);
  }

  static async savePayroll(
    rows: PayrollRow[],
    options: {
      /** Full recompute of year/month/section: drop draft rows no longer produced. */
      replacePeriod?: { year: number; month: number; section: string };
      finalize?: boolean;
    } = {},
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    let saved = 0;

    await db.transaction(async (tx: any) => {
    // Lock the period before checking status; finalization and recompute use
    // the same lock so neither can overwrite a concurrently finalized row.
    const periodKeys = Array.from(
      new Set(rows.map((r) => `${r.year}|${r.month}|${r.section}`)),
    );
    const finalKeys = new Set<string>();
    for (const key of periodKeys) {
      const [y, m, section] = key.split("|");
      const lockedRows = await tx
        .select({ empCd: salaryPayroll.empCd, status: salaryPayroll.payrollStatus })
        .from(salaryPayroll)
        .where(
          and(
            eq(salaryPayroll.year, Number(y)),
            eq(salaryPayroll.month, Number(m)),
            eq(salaryPayroll.section, section),
          ),
        ).for("update");
      for (const f of lockedRows) {
        if (f.status === "final") finalKeys.add(`${key}|${f.empCd}`);
      }
    }

    const period = options.replacePeriod;
    if (period) {
      const keep = rows
        .filter(
          (r) =>
            r.year === period.year &&
            r.month === period.month &&
            r.section === period.section,
        )
        .map((r) => r.empCd);
      await tx.delete(salaryPayroll).where(
        and(
          eq(salaryPayroll.year, period.year),
          eq(salaryPayroll.month, period.month),
          eq(salaryPayroll.section, period.section),
          eq(salaryPayroll.payrollStatus, "draft"),
          keep.length ? notInArray(salaryPayroll.empCd, keep) : undefined,
        ),
      );
    }
    for (const r of rows) {
      if (finalKeys.has(`${r.year}|${r.month}|${r.section}|${r.empCd}`)) {
        continue;
      }
      await tx
        .insert(salaryPayroll)
        .values({
          empCd: r.empCd,
          year: r.year,
          month: r.month,
          section: r.section,
          basicSalary: String(r.basicSalary) as any,
          workingDays: r.workingDays,
          absentDays: r.absentDays,
          lateMinutes: r.lateMinutes,
          earlyLeaveMinutes: r.earlyLeaveMinutes,
          overtimeMinutes: r.overtimeMinutes,
          leaveDays: r.leaveDays,
          absentDeduction: String(r.absentDeduction) as any,
          leaveDeduction: String(r.leaveDeduction) as any,
          lateDeduction: String(r.lateDeduction) as any,
          earlyLeaveDeduction: String(r.earlyLeaveDeduction) as any,
          penaltyDeduction: String(r.penaltyDeduction) as any,
          advancesDeduction: String(r.advancesDeduction) as any,
          insuranceDeduction: String(r.insuranceDeduction) as any,
          totalDeductions: String(r.totalDeductions) as any,
          deductionPct: String(r.deductionPct) as any,
          leaveMultiplier: String(r.leaveMultiplier) as any,
          netBasic: String(r.netBasic) as any,
          attendanceCommission: String(r.attendanceCommission) as any,
          attendanceCommissionRaw: String(r.attendanceCommissionRaw) as any,
          examCommission: String(r.examCommission) as any,
          examCommissionRaw: String(r.examCommissionRaw) as any,
          pentacamCommission: String(r.pentacamCommission) as any,
          pentacamCommissionRaw: String(r.pentacamCommissionRaw) as any,
          costOfLivingAllowance: String(r.costOfLivingAllowance) as any,
          transportAllowance: String(r.transportAllowance) as any,
          totalCommission: String(r.totalCommission) as any,
          overtimePay: String(r.overtimePay) as any,
          totalPay: String(r.totalPay) as any,
          payrollStatus: options.finalize ? "final" : "draft",
          computedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            payrollStatus: options.finalize ? "final" : "draft",
            basicSalary: String(r.basicSalary) as any,
            workingDays: r.workingDays,
            absentDays: r.absentDays,
            lateMinutes: r.lateMinutes,
            earlyLeaveMinutes: r.earlyLeaveMinutes,
            overtimeMinutes: r.overtimeMinutes,
            leaveDays: r.leaveDays,
            absentDeduction: String(r.absentDeduction) as any,
            leaveDeduction: String(r.leaveDeduction) as any,
            lateDeduction: String(r.lateDeduction) as any,
            earlyLeaveDeduction: String(r.earlyLeaveDeduction) as any,
            penaltyDeduction: String(r.penaltyDeduction) as any,
            advancesDeduction: String(r.advancesDeduction) as any,
            insuranceDeduction: String(r.insuranceDeduction) as any,
            totalDeductions: String(r.totalDeductions) as any,
            deductionPct: String(r.deductionPct) as any,
            leaveMultiplier: String(r.leaveMultiplier) as any,
            netBasic: String(r.netBasic) as any,
            attendanceCommission: String(r.attendanceCommission) as any,
            attendanceCommissionRaw: String(r.attendanceCommissionRaw) as any,
            examCommission: String(r.examCommission) as any,
            examCommissionRaw: String(r.examCommissionRaw) as any,
            pentacamCommission: String(r.pentacamCommission) as any,
            pentacamCommissionRaw: String(r.pentacamCommissionRaw) as any,
            costOfLivingAllowance: String(r.costOfLivingAllowance) as any,
            transportAllowance: String(r.transportAllowance) as any,
            totalCommission: String(r.totalCommission) as any,
            overtimePay: String(r.overtimePay) as any,
            totalPay: String(r.totalPay) as any,
            computedAt: now,
          },
        });
      saved++;
    }
    });

    return saved;
  }
}
