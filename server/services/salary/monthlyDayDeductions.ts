const MONTHLY_SALARY_DAYS = 30;
const ABSENCE_PENALTY_DAYS = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function monthlySalaryDayRate(basicSalary: number): number {
  return basicSalary / MONTHLY_SALARY_DAYS;
}

export function salaryLeaveDeduction(
  basicSalary: number,
  leaveDays: number,
): number {
  return round2(monthlySalaryDayRate(basicSalary) * leaveDays);
}

export function absenceDeduction(
  basicSalary: number,
  absentDays: number,
): number {
  return round2(
    monthlySalaryDayRate(basicSalary) * absentDays * ABSENCE_PENALTY_DAYS,
  );
}

export function penaltyDaysDeduction(
  basicSalary: number,
  penaltyDays: number,
): number {
  return round2(monthlySalaryDayRate(basicSalary) * penaltyDays);
}
