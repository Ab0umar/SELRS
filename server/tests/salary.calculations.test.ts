import { describe, expect, it } from "vitest";
import {
  calculateOvertimeCompensationBase,
  calculateOvertimeDayPay,
  DAILY_WORK_MINUTES,
} from "../services/salary/overtimePay";
import {
  calcLateDayTier,
  calcMissingPunchDeduction,
  getPayrollWeekKey,
  normalizeLateTiers,
  sumPayrollDeductions,
  type LateTier,
} from "../services/salary/lateDeduction";
import {
  calcAdjustedCommission,
  calcWeightedCommissionShare,
} from "../services/salary/commissionDistribution";
import {
  absenceDeduction,
  monthlySalaryDayRate,
  penaltyDaysDeduction,
  salaryLeaveDeduction,
} from "../services/salary/monthlyDayDeductions";
import {
  getSinglePunchDayKeys,
  getWorkDateForPunch,
} from "../services/salary/singlePunchDays";
import {
  calcXray1502Pool,
  calcXray1600Pool,
  calcXrayRemainingPool,
} from "../services/salary/xrayCommission";
import { serializePayrollDeductions } from "../services/salary/payrollDeductionsResponse";

describe("overtime pay", () => {
  it("builds the compensation base from basic + commission - day-10 allowances", () => {
    expect(
      calculateOvertimeCompensationBase({
        netBasic: 6000,
        totalCommission: 1500,
        day10Allowances: 500,
      }),
    ).toBe(7000);
  });

  it("never returns a negative base", () => {
    expect(
      calculateOvertimeCompensationBase({
        netBasic: 100,
        totalCommission: 0,
        day10Allowances: 900,
      }),
    ).toBe(0);
  });

  it("pays an official holiday at 3x the daily rate with no overtime minutes", () => {
    expect(
      calculateOvertimeDayPay({
        compensationBase: 3000,
        workedMinutes: 600,
        kind: "official_holiday",
      }),
    ).toEqual({
      kind: "official_holiday",
      overtimeMinutes: 0,
      overtimePay: 300,
      requiresAlternativeDay: false,
    });
  });

  it("pays a weekly rest day at 2x and requires an alternative day", () => {
    expect(
      calculateOvertimeDayPay({
        compensationBase: 3000,
        workedMinutes: 300,
        kind: "weekly_rest",
      }),
    ).toEqual({
      kind: "weekly_rest",
      overtimeMinutes: 0,
      overtimePay: 200,
      requiresAlternativeDay: true,
    });
  });

  it("pays regular overtime per minute above a 6-hour day at 1.35x", () => {
    const pay = calculateOvertimeDayPay({
      compensationBase: 3000,
      workedMinutes: DAILY_WORK_MINUTES + 120,
      kind: "regular",
    });
    expect(pay.overtimeMinutes).toBe(120);
    // 3000 / 30 days / 360 min * 120 min * 1.35
    expect(pay.overtimePay).toBeCloseTo(45, 6);
    expect(pay.requiresAlternativeDay).toBe(false);
  });

  it.each([0, 200, DAILY_WORK_MINUTES])(
    "pays nothing for %i worked minutes on a regular day",
    (workedMinutes) => {
      const pay = calculateOvertimeDayPay({
        compensationBase: 3000,
        workedMinutes,
        kind: "regular",
      });
      expect(pay.overtimeMinutes).toBe(0);
      expect(pay.overtimePay).toBe(0);
    },
  );

  it("uses the scheduled working days for the regular minute rate", () => {
    const pay = calculateOvertimeDayPay({
      compensationBase: 3000,
      workedMinutes: DAILY_WORK_MINUTES + 60,
      kind: "regular",
      scheduledWorkingDays: 26,
    });
    expect(pay.overtimePay).toBeCloseTo((3000 / 26 / 360) * 60 * 1.35, 6);
  });

  it("pays zero regular overtime when there are no scheduled days", () => {
    expect(
      calculateOvertimeDayPay({
        compensationBase: 3000,
        workedMinutes: 600,
        kind: "regular",
        scheduledWorkingDays: 0,
      }).overtimePay,
    ).toBe(0);
  });
});

describe("late and missing-punch deductions", () => {
  const tiers: LateTier[] = [
    { minMin: 1, maxMin: 15, dayFraction: 0.25 },
    { minMin: 16, maxMin: 60, dayFraction: 0.5 },
    { minMin: 61, maxMin: null, dayFraction: 1 },
  ];

  it.each([
    [0, 0],
    [-5, 0],
    [1, 25],
    [15, 25],
    [16, 50],
    [60, 50],
    [61, 100],
    [600, 100],
  ])("charges the tier fraction for %i late minutes -> %d", (late, expected) => {
    expect(calcLateDayTier(late, 100, 0.5, tiers)).toBe(expected);
  });

  it("charges nothing when no tier covers the minutes", () => {
    expect(
      calcLateDayTier(3, 100, 0.5, [{ minMin: 5, maxMin: 10, dayFraction: 1 }]),
    ).toBe(0);
  });

  it("charges linear tiers per minute with a weekly multiplier capped at 4", () => {
    const linear: LateTier[] = [{ minMin: 1, maxMin: 30, type: "linear" }];
    expect(calcLateDayTier(20, 100, 0.5, linear, 0)).toBe(10);
    expect(calcLateDayTier(20, 100, 0.5, linear, 1)).toBe(10);
    expect(calcLateDayTier(20, 100, 0.5, linear, 2)).toBe(20);
    expect(calcLateDayTier(20, 100, 0.5, linear, 9)).toBe(40);
  });

  it("closes gaps between tiers but keeps the minimum after an open-ended tier", () => {
    expect(
      normalizeLateTiers([
        { minMin: 1, maxMin: 15 },
        { minMin: 20, maxMin: 60 },
        { minMin: 100, maxMin: null },
        { minMin: 200, maxMin: 300 },
      ]).map((tier) => tier.minMin),
    ).toEqual([1, 16, 61, 200]);
  });

  it.each([
    [0, 0],
    [1, 25],
    [2, 50],
    [3, 100],
    [4, 200],
    [5, 300],
  ])("escalates missing punches: %i occurrence(s) -> %d", (count, expected) => {
    expect(calcMissingPunchDeduction(count, 100)).toBe(expected);
  });

  it("sums deductions to two decimals and treats leave as optional", () => {
    expect(
      sumPayrollDeductions({
        absent: 0.1,
        missingCheckout: 0.2,
        late: 0,
        earlyLeave: 0,
        penalty: 0,
        advances: 0,
        insurance: 0,
      }),
    ).toBe(0.3);
    expect(
      sumPayrollDeductions({
        absent: 100,
        leave: 50,
        missingCheckout: 25,
        late: 10,
        earlyLeave: 5,
        penalty: 20,
        advances: 300,
        insurance: 90.5,
      }),
    ).toBe(600.5);
  });
});

describe("payroll week key (cycles start on the 26th, weeks of 7 days)", () => {
  it.each([
    ["2026-03-26", "2026-03-26"],
    ["2026-04-01", "2026-03-26"],
    ["2026-04-02", "2026-04-02"],
    ["2026-04-25", "2026-04-23"],
    ["2026-04-26", "2026-04-26"],
    ["2026-01-10", "2026-01-09"],
  ])("%s -> %s", (date, expected) => {
    expect(getPayrollWeekKey(date)).toBe(expected);
  });

  it("gives the same key for a Date and its ISO date string", () => {
    expect(getPayrollWeekKey(new Date(2026, 3, 10, 23, 30))).toBe(
      getPayrollWeekKey("2026-04-10"),
    );
  });
});

describe("commission distribution", () => {
  it.each([
    [100, 1000, 500, 1, 50],
    [100, 1000, 2000, 1, 100],
    [100, 1000, -50, 1, 0],
    [100, 1000, 500, 0.5, 25],
    [100, 1000, 1000, 2, 100],
    [100, 1000, 1000, -1, 0],
    [0, 1000, 1000, 1, 0],
    [-10, 1000, 1000, 1, 0],
    [100, 0, 1000, 1, 0],
  ])(
    "adjusts raw %d on gross %d / net %d / leave x%d -> %d",
    (raw, gross, net, leave, expected) => {
      expect(calcAdjustedCommission(raw, gross, net, leave)).toBe(expected);
    },
  );

  it("splits a pool by gross weight", () => {
    const weights = [100, 100, 200];
    const total = 400;
    const shares = weights.map(
      (weight) => calcWeightedCommissionShare(1000, weight, total, weight).raw,
    );
    expect(shares).toEqual([250, 250, 500]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("reduces the payable share by the net/gross ratio", () => {
    expect(calcWeightedCommissionShare(1000, 200, 800, 100)).toEqual({
      raw: 250,
      payable: 125,
    });
  });

  it("rounds the raw share to two decimals", () => {
    expect(calcWeightedCommissionShare(100, 1, 3, 1).raw).toBe(33.33);
  });

  it.each([
    [0, 100, 100],
    [1000, 0, 100],
    [1000, 100, 0],
  ])("returns zeros for pool %d / weight %d / total %d", (pool, weight, total) => {
    expect(calcWeightedCommissionShare(pool, weight, total, weight)).toEqual({
      raw: 0,
      payable: 0,
    });
  });
});

describe("monthly day-based deductions", () => {
  it("divides the basic salary by 30 days", () => {
    expect(monthlySalaryDayRate(3000)).toBe(100);
  });

  it("deducts leave days at the daily rate", () => {
    expect(salaryLeaveDeduction(3000, 2)).toBe(200);
    expect(salaryLeaveDeduction(1000, 1)).toBe(33.33);
  });

  it("deducts each absent day as three salary days", () => {
    expect(absenceDeduction(3000, 2)).toBe(600);
    expect(absenceDeduction(1000, 1)).toBe(100);
  });

  it("deducts penalty days at the daily rate, including fractions", () => {
    expect(penaltyDaysDeduction(3000, 1.5)).toBe(150);
  });

  it("deducts nothing for zero days", () => {
    expect(salaryLeaveDeduction(3000, 0)).toBe(0);
    expect(absenceDeduction(3000, 0)).toBe(0);
    expect(penaltyDaysDeduction(3000, 0)).toBe(0);
  });
});

describe("single punch days", () => {
  it("flags only employee/date pairs with exactly one scan", () => {
    const keys = getSinglePunchDayKeys([
      { empCd: "A", punchAt: new Date(2026, 2, 1, 8, 0) },
      { empCd: "A", punchAt: new Date(2026, 2, 2, 8, 0) },
      { empCd: "A", punchAt: new Date(2026, 2, 2, 16, 0) },
      { empCd: "B", punchAt: new Date(2026, 2, 1, 9, 0) },
      { empCd: "C", punchAt: new Date(2026, 2, 3, 9, 0) },
      { empCd: "C", punchAt: new Date(2026, 2, 3, 12, 0) },
      { empCd: "C", punchAt: new Date(2026, 2, 3, 17, 0) },
    ]);
    expect([...keys].sort()).toEqual(["A|2026-03-01", "B|2026-03-01"]);
  });

  it("ignores the device direction", () => {
    const keys = getSinglePunchDayKeys([
      { empCd: "A", punchAt: new Date(2026, 2, 1, 8, 0), direction: "in" },
      { empCd: "A", punchAt: new Date(2026, 2, 1, 16, 0), direction: "in" },
    ]);
    expect(keys.size).toBe(0);
  });

  it("builds the local work date for Date and string inputs", () => {
    expect(getWorkDateForPunch(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(getWorkDateForPunch("2026-01-05T08:00:00")).toBe("2026-01-05");
  });
});

describe("x-ray commission pools", () => {
  it("takes 24.5% of 1600-series revenue", () => {
    expect(calcXray1600Pool(1100, 550)).toBe(269.5);
  });

  it("takes 27.5% of 1502-series revenue", () => {
    expect(calcXray1502Pool(900, 450)).toBe(247.5);
  });

  it("deducts 110 per remaining x-ray (revenue / price)", () => {
    expect(calcXrayRemainingPool(800, 400)).toBe(220);
    expect(calcXrayRemainingPool(500, 400)).toBe(137.5);
  });

  it.each([
    ["1600", calcXray1600Pool],
    ["1502", calcXray1502Pool],
    ["remaining", calcXrayRemainingPool],
  ])("returns 0 for a non-positive %s price", (_name, calc) => {
    expect(calc(1000, 0)).toBe(0);
    expect(calc(1000, -10)).toBe(0);
  });
});

describe("payroll deductions response", () => {
  it("stringifies every amount and defaults missing leave/missing-checkout to 0", () => {
    expect(
      serializePayrollDeductions({
        absentDeduction: 10,
        leaveDeduction: undefined,
        missingCheckoutDeduction: undefined,
        lateDeduction: 5.5,
        earlyLeaveDeduction: 0,
        penaltyDeduction: 2,
        advancesDeduction: 100,
        insuranceDeduction: 50,
        totalDeductions: 167.5,
      } as any),
    ).toEqual({
      absentDeduction: "10",
      leaveDeduction: "0",
      missingCheckoutDeduction: "0",
      lateDeduction: "5.5",
      earlyLeaveDeduction: "0",
      penaltyDeduction: "2",
      advancesDeduction: "100",
      insuranceDeduction: "50",
      totalDeductions: "167.5",
    });
  });
});
