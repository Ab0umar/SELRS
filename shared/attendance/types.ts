/**
 * Shared TypeScript types for Attendance module
 * Exported to both frontend and backend
 */

/**
 * Employee record from attendance_employees
 */
export interface EmployeeRow {
  empCd: string;
  fullName: string;
  department: string | null;
  defaultShiftId: number | null;
  active: boolean;
}

/**
 * Raw punch record from attendance_punches
 */
export interface PunchRow {
  id: number;
  empCd: string;
  punchAt: string; // ISO string
  direction: 'in' | 'out' | 'unknown';
  source: 'access' | 'tcp' | 'manual';
  sourceRowId: string | null;
  note: string | null;
  importedAt: string; // ISO string
}

/**
 * Processed daily attendance record from attendance_daily
 */
export interface DailyRow {
  empCd: string;
  fullName: string;
  workDate: string; // ISO date YYYY-MM-DD
  shiftId: number | null;
  firstIn: string | null; // ISO string or null
  lastOut: string | null; // ISO string or null
  workedMinutes: number | null;
  lateMinutes: number;
  earlyLeaveMin: number;
  overtimeMinutes: number;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'partial' | 'missing_checkout';
  insideNow: boolean;
  computedAt: string; // ISO string
}

/**
 * Sync run record from attendance_sync_runs
 */
export interface SyncRunRow {
  id: number;
  startedAt: string; // ISO string
  finishedAt: string | null; // ISO string or null
  source: 'access' | 'tcp';
  trigger: 'cron' | 'manual';
  triggeredBy: number | null; // user ID
  status: 'running' | 'ok' | 'partial' | 'failed' | 'locked';
  rowsSeen: number;
  rowsInserted: number;
  rowsSkipped: number;
  rowsQuarantined: number;
  highWaterMark: string | null; // ISO string or null
  error: string | null;
}

/**
 * Shift definition from attendance_shifts
 */
export interface ShiftRow {
  id: number;
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  crossesMidnight: boolean;
  graceLateMin: number;
  graceEarlyMin: number;
  breakMinutes: number;
  active: boolean;
}

/**
 * Shift assignment from attendance_shift_assignments
 */
export interface AssignmentRow {
  id: number;
  empCd: string;
  shiftId: number;
  effectiveFrom: string; // ISO date
  effectiveTo: string | null; // ISO date or null
  weekdayMask: number; // bitmask: bit 0=Sunday, ..., bit 6=Saturday
}

/**
 * Leave record from attendance_leaves
 */
export interface LeaveRow {
  id: number;
  empCd: string;
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  leaveType: string; // e.g., "vacation", "sick", "unpaid"
  approved: boolean;
  approvedBy: number | null; // user ID
}

/**
 * Holiday record from attendance_holidays
 */
export interface HolidayRow {
  id: number;
  date: string; // ISO date
  name: string;
}
