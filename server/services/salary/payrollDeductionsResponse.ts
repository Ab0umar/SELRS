import type { PayrollRow } from "./payrollCompute.service";

type PayrollDeductionFields = Pick<
  PayrollRow,
  | "absentDeduction"
  | "leaveDeduction"
  | "missingCheckoutDeduction"
  | "lateDeduction"
  | "earlyLeaveDeduction"
  | "penaltyDeduction"
  | "advancesDeduction"
  | "insuranceDeduction"
  | "totalDeductions"
>;

export function serializePayrollDeductions(row: PayrollDeductionFields) {
  return {
    absentDeduction: String(row.absentDeduction),
    leaveDeduction: String(row.leaveDeduction ?? 0),
    missingCheckoutDeduction: String(row.missingCheckoutDeduction ?? 0),
    lateDeduction: String(row.lateDeduction),
    earlyLeaveDeduction: String(row.earlyLeaveDeduction),
    penaltyDeduction: String(row.penaltyDeduction),
    advancesDeduction: String(row.advancesDeduction),
    insuranceDeduction: String(row.insuranceDeduction),
    totalDeductions: String(row.totalDeductions),
  };
}
