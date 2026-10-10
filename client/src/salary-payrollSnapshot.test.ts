import { describe, expect, it } from "vitest";
import { payrollSnapshot } from "../../shared/payrollSnapshot";

describe("payroll approval snapshot", () => {
  it("matches the displayed decimal strings to computed numbers regardless of row order", () => {
    expect(
      payrollSnapshot([
        { empCd: "b", totalPay: "100.00" },
        { empCd: "a", netBasic: "50.00" },
      ]),
    ).toBe(
      payrollSnapshot([
        { empCd: "a", netBasic: 50 },
        { empCd: "b", totalPay: 100 },
      ]),
    );
  });
  it("rejects changed deductions even when the final total stays the same", () => {
    expect(
      payrollSnapshot([{ empCd: "a", totalDeductions: 10, totalPay: 100 }]),
    ).not.toBe(
      payrollSnapshot([{ empCd: "a", totalDeductions: 20, totalPay: 100 }]),
    );
  });
  it("rejects additions, removals and changes in attendance or commission amounts", () => {
    const rows = [{ empCd: "a", workingDays: 20, examCommission: 30 }];
    expect(payrollSnapshot(rows)).not.toBe(payrollSnapshot([]));
    expect(payrollSnapshot(rows)).not.toBe(
      payrollSnapshot([...rows, { empCd: "b" }]),
    );
    expect(payrollSnapshot(rows)).not.toBe(
      payrollSnapshot([{ ...rows[0], workingDays: 19 }]),
    );
    expect(payrollSnapshot(rows)).not.toBe(
      payrollSnapshot([{ ...rows[0], examCommission: 40 }]),
    );
  });
});
