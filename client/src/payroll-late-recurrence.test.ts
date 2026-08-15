import { describe, expect, it } from "vitest";
import {
  calcLateDayTier,
  calcMissingPunchDeduction,
  normalizeLateTiers,
  type LateTier,
} from "../../server/services/salary/lateDeduction";

const tiers: LateTier[] = [
  { minMin: 1, maxMin: 14, type: "linear" },
  { minMin: 15, maxMin: 29, dayFraction: 0.25 },
];

describe("progressive linear lateness deductions", () => {
  it("escalates only linear occurrences within the payroll period", () => {
    const dailyRate = 120;
    const minuteRate = dailyRate / 360;

    expect(calcLateDayTier(10, dailyRate, minuteRate, tiers, 1)).toBe(3.33);
    expect(calcLateDayTier(10, dailyRate, minuteRate, tiers, 2)).toBe(3.33);
    expect(calcLateDayTier(10, dailyRate, minuteRate, tiers, 3)).toBe(30);
    expect(calcLateDayTier(10, dailyRate, minuteRate, tiers, 4)).toBe(30);
    expect(calcLateDayTier(10, dailyRate, minuteRate, tiers, 5)).toBe(60);
    expect(calcLateDayTier(10, dailyRate, minuteRate, tiers, 8)).toBe(60);
  });

  it("does not escalate an existing fixed day-fraction tier", () => {
    expect(calcLateDayTier(20, 120, 120 / 360, tiers, 9)).toBe(30);
  });

  it("moves the next tier to the end of the edited linear boundary", () => {
    const normalized = normalizeLateTiers([
      { minMin: 1, maxMin: 10, type: "linear" },
      { minMin: 15, maxMin: 29, dayFraction: 0.25 },
    ]);

    expect(normalized[1].minMin).toBe(11);
    expect(calcLateDayTier(11, 120, 120 / 360, normalized, 0)).toBe(30);
  });

  it("does not silently apply linear deduction outside configured tiers", () => {
    expect(calcLateDayTier(30, 120, 120 / 360, tiers, 0)).toBe(0);
  });
});

describe("missing punch recurrence within a payroll cycle", () => {
  it("uses quarter day twice, half day third, and full day from fourth", () => {
    const dailyRate = 120;

    expect(calcMissingPunchDeduction(1, dailyRate)).toBe(30);
    expect(calcMissingPunchDeduction(2, dailyRate)).toBe(60);
    expect(calcMissingPunchDeduction(3, dailyRate)).toBe(120);
    expect(calcMissingPunchDeduction(4, dailyRate)).toBe(240);
    expect(calcMissingPunchDeduction(5, dailyRate)).toBe(360);
  });
});
