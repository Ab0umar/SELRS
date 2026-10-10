export type DailyAttendanceStatus =
  "present" | "absent" | "leave" | "holiday" | "partial" | "missing_checkout";

export interface AttendanceShiftRow {
  empCd: string;
  shiftId?: number | null;
  workDate: Date | string;
  status: DailyAttendanceStatus;
  lateMinutes?: number | null;
  earlyLeaveMin?: number | null;
  overtimeMinutes?: number | null;
  workedMinutes?: number | null;
  insideNow?: boolean | null;
  leaveType?: string | null;
  leaveNotAffectCommission?: boolean | null;
}

export interface AttendanceDaySummary extends AttendanceShiftRow {
  shiftCount: number;
  absentShiftCount: number;
  /** False when the day only has the synthetic shift-0 row (a rest day). */
  scheduled: boolean;
}

const dateKey = (value: Date | string) =>
  value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value).slice(0, 10);

function dayStatus(rows: AttendanceShiftRow[]): DailyAttendanceStatus {
  // A scan on any assigned shift means the employee attended that day.
  // An unpunched second shift must not convert that day into an absence.
  if (rows.some((row) => row.status === "present")) return "present";
  if (rows.some((row) => row.status === "partial")) return "partial";
  if (rows.some((row) => row.status === "missing_checkout"))
    return "missing_checkout";
  if (rows.every((row) => row.status === "leave")) return "leave";
  if (rows.every((row) => row.status === "holiday")) return "holiday";
  if (rows.every((row) => row.status === "absent")) return "absent";
  if (rows.some((row) => row.status === "leave")) return "leave";
  if (rows.some((row) => row.status === "holiday")) return "holiday";
  return "absent";
}

export function aggregateAttendanceDays(
  rows: AttendanceShiftRow[],
): AttendanceDaySummary[] {
  const grouped = new Map<string, AttendanceShiftRow[]>();
  for (const row of rows) {
    const key = `${row.empCd}|${dateKey(row.workDate)}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  return Array.from(grouped.values()).map((group) => ({
    empCd: group[0].empCd,
    workDate: dateKey(group[0].workDate),
    status: dayStatus(group),
    lateMinutes: group.reduce((sum, row) => sum + (row.lateMinutes ?? 0), 0),
    earlyLeaveMin: group.reduce(
      (sum, row) => sum + (row.earlyLeaveMin ?? 0),
      0,
    ),
    overtimeMinutes: group.reduce(
      (sum, row) => sum + (row.overtimeMinutes ?? 0),
      0,
    ),
    workedMinutes: group.reduce(
      (sum, row) => sum + (row.workedMinutes ?? 0),
      0,
    ),
    insideNow: group.some((row) => Boolean(row.insideNow)),
    shiftCount: group.length,
    scheduled: group.some((row) => (row.shiftId ?? 1) !== 0),
    absentShiftCount: group.filter((row) => row.status === "absent").length,
    leaveType: group.find((row) => row.leaveType)?.leaveType ?? null,
    leaveNotAffectCommission: group.some((row) => row.leaveNotAffectCommission),
  }));
}
