import { describe, expect, it } from "vitest";
import {
  accountLeaveDays,
  countCommissionAffectingLeaveDays,
} from "../../server/services/attendance/leaveAccounting";

describe("attendance leave balance and salary accounting", () => {
  it("deducts annual and sick days from balance and sends excess other leave to payroll", () => {
    const usage = accountLeaveDays(
      [
        { dateFrom: "2026-01-01", dateTo: "2026-01-02", type: "annual" },
        { dateFrom: "2026-01-03", dateTo: "2026-01-03", type: "sick" },
        { dateFrom: "2026-01-04", dateTo: "2026-01-06", type: "other" },
      ],
      4,
      2026,
    );

    expect(usage.balanceDays).toBe(4);
    expect(usage.salaryDateKeys).toEqual(new Set(["2026-01-05", "2026-01-06"]));
    expect(usage.salaryDays).toBe(2);
  });

  it("deducts explicit salary leave regardless of remaining leave balance", () => {
    const usage = accountLeaveDays(
      [{ dateFrom: "2026-02-10", dateTo: "2026-02-11", type: "salary" }],
      21,
      2026,
    );

    expect(usage.balanceDays).toBe(0);
    expect(usage.salaryDays).toBe(2);
  });

  it("does not reduce commission for leave dates marked not-affecting", () => {
    const usage = accountLeaveDays(
      [
        {
          dateFrom: "2026-03-01",
          dateTo: "2026-03-02",
          type: "salary",
          notAffectCommission: true,
        },
        {
          dateFrom: "2026-03-03",
          dateTo: "2026-03-03",
          type: "other",
          notAffectCommission: true,
        },
      ],
      0,
      2026,
    );

    expect(usage.salaryDays).toBe(3);
    expect(usage.salaryCommissionDateKeys.size).toBe(0);
  });

  it("keeps legacy unpaid leave as a salary deduction", () => {
    const usage = accountLeaveDays(
      [{ dateFrom: "2026-04-15", dateTo: "2026-04-15", type: "unpaid" }],
      21,
      2026,
    );

    expect(usage.salaryDateKeys.has("2026-04-15")).toBe(true);
  });

  it("lets each leave type follow its commission-impact choice", () => {
    expect(
      countCommissionAffectingLeaveDays([
        { status: "leave", leaveType: "annual" },
        { status: "leave", leaveType: "sick" },
        {
          status: "leave",
          leaveType: "salary",
          leaveNotAffectCommission: true,
        },
        { status: "absent", leaveType: null },
      ]),
    ).toBe(2);
  });
});

describe("leave days skip holidays and weekly rest days", () => {
  // 2026-03-01 is a Sunday; the week below runs Sun..Sat.
  const restOrHoliday = (key: string) =>
    key === "2026-03-06" /* Friday rest day */ ||
    key === "2026-03-04"; /* paid holiday */

  it("does not charge the annual balance for rest days or holidays", () => {
    const usage = accountLeaveDays(
      [{ dateFrom: "2026-03-01", dateTo: "2026-03-07", type: "annual" }],
      21,
      2026,
      restOrHoliday,
    );
    expect(usage.balanceDays).toBe(5);
  });

  it("does not deduct unpaid leave for rest days or holidays", () => {
    const usage = accountLeaveDays(
      [{ dateFrom: "2026-03-01", dateTo: "2026-03-07", type: "unpaid" }],
      21,
      2026,
      restOrHoliday,
    );
    expect(usage.salaryDays).toBe(5);
    expect(usage.salaryDateKeys.has("2026-03-06")).toBe(false);
  });

  it("does not count a rest-day leave row toward the commission leave multiplier", () => {
    expect(
      countCommissionAffectingLeaveDays([
        { status: "leave", scheduled: true },
        { status: "leave", scheduled: false },
        { status: "leave" },
      ]),
    ).toBe(2);
  });
});
