/** Stable comparison of the amounts and day counts shown in a payroll preview. */
export function payrollSnapshot(rows: ReadonlyArray<object>): string {
  const fields = [
    "basicSalary",
    "workingDays",
    "absentDays",
    "lateMinutes",
    "earlyLeaveMinutes",
    "overtimeMinutes",
    "leaveDays",
    "absentDeduction",
    "leaveDeduction",
    "lateDeduction",
    "earlyLeaveDeduction",
    "penaltyDeduction",
    "advancesDeduction",
    "insuranceDeduction",
    "totalDeductions",
    "netBasic",
    "attendanceCommission",
    "examCommission",
    "pentacamCommission",
    "costOfLivingAllowance",
    "transportAllowance",
    "totalCommission",
    "overtimePay",
    "totalPay",
  ];
  return JSON.stringify(
    rows
      .map((value) => {
        const row = value as Record<string, unknown>;
        return [
          String(row.empCd),
          ...fields.map((field) => Number(row[field] ?? 0)),
        ];
      })
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}
