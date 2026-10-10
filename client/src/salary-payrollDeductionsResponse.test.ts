import { describe, expect, it } from "vitest";
import { serializePayrollDeductions } from "../../server/services/salary/payrollDeductionsResponse";

describe("serializePayrollDeductions", () => {
  it("preserves salary-leave deductions in dynamic payroll responses", () => {
    const serialized = serializePayrollDeductions({
      absentDeduction: 0,
      leaveDeduction: 103,
      missingCheckoutDeduction: 0,
      lateDeduction: 0,
      earlyLeaveDeduction: 0,
      penaltyDeduction: 0,
      advancesDeduction: 0,
      insuranceDeduction: 0,
      totalDeductions: 103,
    });

    expect(serialized.leaveDeduction).toBe("103");
  });
});
