export const PAYROLL_DAY_DIVISOR = 30;
export const DAILY_WORK_MINUTES = 6 * 60;
export const REGULAR_OVERTIME_FACTOR = 1.35;
export const WEEKLY_REST_FACTOR = 2;
export const OFFICIAL_HOLIDAY_FACTOR = 3;

export type OvertimeDayKind = "regular" | "weekly_rest" | "official_holiday";

export type OvertimeDayPay = {
  kind: OvertimeDayKind;
  overtimeMinutes: number;
  overtimePay: number;
  requiresAlternativeDay: boolean;
};

export function calculateOvertimeCompensationBase(input: {
  netBasic: number;
  totalCommission: number;
  day10Allowances: number;
}): number {
  return Math.max(
    0,
    input.netBasic + input.totalCommission - input.day10Allowances,
  );
}

export function calculateOvertimeDayPay(input: {
  compensationBase: number;
  workedMinutes: number;
  kind: OvertimeDayKind;
  scheduledWorkingDays?: number;
}): OvertimeDayPay {
  const dailyRate = input.compensationBase / PAYROLL_DAY_DIVISOR;

  if (input.kind === "official_holiday") {
    return {
      kind: input.kind,
      overtimeMinutes: 0,
      overtimePay: dailyRate * OFFICIAL_HOLIDAY_FACTOR,
      requiresAlternativeDay: false,
    };
  }

  if (input.kind === "weekly_rest") {
    return {
      kind: input.kind,
      overtimeMinutes: 0,
      overtimePay: dailyRate * WEEKLY_REST_FACTOR,
      requiresAlternativeDay: true,
    };
  }

  const overtimeMinutes = Math.max(
    0,
    input.workedMinutes - DAILY_WORK_MINUTES,
  );
  const scheduledDays = input.scheduledWorkingDays ?? PAYROLL_DAY_DIVISOR;
  const minuteRate = scheduledDays > 0
    ? input.compensationBase / scheduledDays / DAILY_WORK_MINUTES
    : 0;
  return {
    kind: input.kind,
    overtimeMinutes,
    overtimePay: overtimeMinutes * minuteRate * REGULAR_OVERTIME_FACTOR,
    requiresAlternativeDay: false,
  };
}
