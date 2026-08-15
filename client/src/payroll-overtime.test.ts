import { describe, expect, it } from "vitest";
import {
  calculateOvertimeCompensationBase,
  calculateOvertimeDayPay,
  DAILY_WORK_MINUTES,
} from "../../server/services/salary/overtimePay";

describe("payroll overtime", () => {
  it("calculates regular overtime after six actual hours at 135%", () => {
    const result = calculateOvertimeDayPay({
      compensationBase: 6000,
      workedMinutes: DAILY_WORK_MINUTES + 120,
      kind: "regular",
    });

    expect(result.overtimeMinutes).toBe(120);
    expect(result.overtimePay).toBeCloseTo(90, 6);
  });

  it("pays weekly rest attendance at two daily wages", () => {
    const result = calculateOvertimeDayPay({
      compensationBase: 6000,
      workedMinutes: 60,
      kind: "weekly_rest",
    });

    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimePay).toBe(400);
    expect(result.requiresAlternativeDay).toBe(true);
  });

  it("gives official holidays priority and pays three daily wages", () => {
    const result = calculateOvertimeDayPay({
      compensationBase: 6000,
      workedMinutes: 600,
      kind: "official_holiday",
    });

    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimePay).toBe(600);
    expect(result.requiresAlternativeDay).toBe(false);
  });

  it("excludes day-10 allowances from the overtime compensation base", () => {
    const compensationBase = calculateOvertimeCompensationBase({
      netBasic: 6000,
      totalCommission: 2500,
      day10Allowances: 1500,
    });
    const result = calculateOvertimeDayPay({
      compensationBase,
      workedMinutes: DAILY_WORK_MINUTES + 120,
      kind: "regular",
    });

    expect(compensationBase).toBe(7000);
    expect(result.overtimePay).toBeCloseTo(105, 6);
  });
});
