import { describe, expect, it } from "vitest";
import {
  accountingRevenuePeriods,
  accountingRevenuePeriodsForDate,
} from "./accountingRevenuePeriods";

describe("accounting revenue periods", () => {
  it("uses the selected date and its month", () => {
    expect(accountingRevenuePeriodsForDate("2026-09-08")).toEqual({
      day: { dateFrom: "2026-09-08", dateTo: "2026-09-08" },
      month: { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
    });
  });
  it("rejects incomplete and impossible selected dates", () => {
    for (const date of [null, "", "2026-13-08", "2026-02-30", "2026-09-0"])
      expect(accountingRevenuePeriodsForDate(date)).toBeNull();
  });
  it("uses the current Cairo day rather than the UTC day", () => {
    expect(accountingRevenuePeriods(new Date("2026-10-06T22:30:00Z"))).toEqual({
      day: { dateFrom: "2026-10-07", dateTo: "2026-10-07" },
      month: { dateFrom: "2026-10-01", dateTo: "2026-10-31" },
    });
  });
  it("handles leap-year month ends", () => {
    expect(
      accountingRevenuePeriods(new Date("2028-02-15T12:00:00Z")).month,
    ).toEqual({
      dateFrom: "2028-02-01",
      dateTo: "2028-02-29",
    });
  });
  it("handles a year change at Cairo midnight", () => {
    expect(
      accountingRevenuePeriods(new Date("2026-12-31T22:30:00Z")).month,
    ).toEqual({
      dateFrom: "2027-01-01",
      dateTo: "2027-01-31",
    });
  });
});
