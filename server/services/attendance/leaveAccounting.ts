export type AccountedLeaveType =
  "annual" | "sick" | "other" | "salary" | "unpaid";

export interface LeaveAccountingRow {
  dateFrom: Date | string;
  dateTo: Date | string;
  type: AccountedLeaveType;
  notAffectCommission?: boolean | null;
}

export interface LeaveYearUsage {
  balanceDays: number;
  salaryDays: number;
  salaryDateKeys: Set<string>;
  salaryCommissionDateKeys: Set<string>;
}

export function countCommissionAffectingLeaveDays(
  dailyDays: Array<{
    status: string;
    leaveType?: string | null;
    leaveNotAffectCommission?: boolean | null;
    /** false on a rest day (no scheduled shift): it is not a leave day. */
    scheduled?: boolean;
  }>,
): number {
  return dailyDays.filter(
    (day) =>
      day.status === "leave" &&
      day.scheduled !== false &&
      !day.leaveNotAffectCommission,
  ).length;
}

function dateKey(value: Date | string): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  return String(value).slice(0, 10);
}

/** True for a day that must not count (holiday or weekly rest day). */
export type LeaveDayFilter = (dateKey: string) => boolean;

function leaveDateKeys(
  leave: LeaveAccountingRow,
  year: number,
  skip?: LeaveDayFilter,
): string[] {
  const from = dateKey(leave.dateFrom);
  const to = dateKey(leave.dateTo);
  const start = from < `${year}-01-01` ? `${year}-01-01` : from;
  const end = to > `${year}-12-31` ? `${year}-12-31` : to;
  if (start > end) return [];

  const keys: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    const key = dateKey(cursor);
    if (!skip || !skip(key)) keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/** Apply annual/sick leave to the balance, then let `other` use what remains. */
export function accountLeaveDays(
  leaves: LeaveAccountingRow[],
  balanceAllocation: number,
  year: number,
  skipDay?: LeaveDayFilter,
): LeaveYearUsage {
  const balanceLeaveDates = new Set<string>();
  const otherLeaveDates = new Set<string>();
  const otherCommissionDates = new Set<string>();
  const salaryDateKeys = new Set<string>();
  const salaryCommissionDateKeys = new Set<string>();

  for (const leave of leaves) {
    for (const key of leaveDateKeys(leave, year, skipDay)) {
      if (leave.type === "annual" || leave.type === "sick") {
        balanceLeaveDates.add(key);
      } else if (leave.type === "other") {
        otherLeaveDates.add(key);
        if (!leave.notAffectCommission) otherCommissionDates.add(key);
      } else if (leave.type === "salary" || leave.type === "unpaid") {
        salaryDateKeys.add(key);
        if (!leave.notAffectCommission) salaryCommissionDateKeys.add(key);
      }
    }
  }

  let remainingBalance = Math.max(
    0,
    Math.floor(balanceAllocation) - balanceLeaveDates.size,
  );
  for (const key of [...otherLeaveDates].sort()) {
    if (balanceLeaveDates.has(key)) continue;
    if (remainingBalance > 0) {
      balanceLeaveDates.add(key);
      remainingBalance -= 1;
    } else {
      salaryDateKeys.add(key);
      if (otherCommissionDates.has(key)) salaryCommissionDateKeys.add(key);
    }
  }

  return {
    balanceDays: balanceLeaveDates.size,
    salaryDays: salaryDateKeys.size,
    salaryDateKeys,
    salaryCommissionDateKeys,
  };
}
