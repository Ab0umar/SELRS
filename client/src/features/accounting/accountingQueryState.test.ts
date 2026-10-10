import { describe, expect, it } from "vitest";
import { accountingMetricValue } from "./accountingQueryState";
import { fmt } from "./accountingFormat";

describe("accounting metric loading states", () => {
  it("preserves the report-specific money formatter", () => {
    expect(
      accountingMetricValue(
        { isLoading: false, isError: false },
        12.5,
        (value) => value.toFixed(2),
      ),
    ).toBe("12.50");
  });
  it("keeps an actual zero distinct from missing data", () => {
    const query = { isLoading: false, isError: false };
    expect(accountingMetricValue(query, 0)).toBe(fmt(0));
    expect(accountingMetricValue(query, undefined)).toBe("تعذر التحميل");
  });

  it("does not present cached totals as current after a query failure", () => {
    expect(
      accountingMetricValue({ isLoading: false, isError: true }, 1200),
    ).toBe("تعذر التحميل");
  });

  it("identifies loading without displaying a zero balance", () => {
    expect(
      accountingMetricValue({ isLoading: true, isError: false }, undefined),
    ).toBe("جارٍ التحميل");
  });
});
