import { describe, expect, it } from "vitest";
import {
  absenceDeduction,
  monthlySalaryDayRate,
  penaltyDaysDeduction,
  salaryLeaveDeduction,
} from "../../server/services/salary/monthlyDayDeductions";

describe("monthly salary day deductions", () => {
  it("uses a 30-day divisor for salary leave and penalty days", () => {
    expect(monthlySalaryDayRate(3000)).toBe(100);
    expect(salaryLeaveDeduction(3000, 1)).toBe(100);
    expect(penaltyDaysDeduction(3000, 2)).toBe(200);
  });

  it("deducts three salary days for each full absence day", () => {
    expect(absenceDeduction(3000, 1)).toBe(300);
    expect(absenceDeduction(3000, 2)).toBe(600);
  });
});
