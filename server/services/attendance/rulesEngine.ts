/**
 * Attendance Rules Engine
 * Pure functions (no DB, no Date.now()) for computing daily attendance
 * Passed structures are immutable; caller provides current time
 */

export interface Shift {
  id: number;
  name: string;
  startTime: string; // HH:mm (or multiple times for split shifts, comma-separated)
  endTime: string;
  crossesMidnight: boolean;
  graceLateMin: number; // Default: 15 (Taratus: Adjusted value)
  graceEarlyMin: number; // Default: 15 (Taratus: Adjusted value)
  breakMinutes: number;
  roundingMinutes?: number; // Default: 30 (Taratus: Round value)
}

export interface RawPunchRecord {
  id?: number;
  punchAt: Date;
  direction?: 'in' | 'out' | 'unknown';
  source?: string;
}

export interface DayContext {
  empCd: string;
  workDate: Date; // Shift-anchor date
  shift: Shift | null;
  punches: RawPunchRecord[]; // All punches for this employee on this day (raw)
  leaveApproved: boolean;
  isHoliday: boolean;
  breakMinutes: number; // Accumulated breaks for the day
  now: Date; // Current time for "inside now" logic
}

export interface DayResult {
  empCd: string;
  workDate: Date;
  shiftId: number | null;
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number | null; // null if missing checkout
  lateMinutes: number;
  earlyLeaveMin: number;
  overtimeMinutes: number;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'partial' | 'missing_checkout';
  insideNow: boolean;
  computedAt: Date;
}

/**
 * Resolve which shift applies to an employee on a given date
 * Checks explicit assignments first, falls back to default shift
 */
export function resolveShift(
  empCd: string,
  date: Date,
  assignments: Array<{ empCd: string; shiftId: number; effectiveFrom: Date; effectiveTo: Date | null; weekdayMask: number }>,
  defaultShiftId: number | null,
  shiftsById: Map<number, Shift>
): Shift | null {
  const weekday = date.getDay(); // 0 = Sunday

  // Find latest assignment that matches this date and weekday
  let matchingAssignment = null;
  for (const asn of assignments) {
    if (asn.empCd !== empCd) continue;
    if (asn.effectiveFrom > date) continue;
    if (asn.effectiveTo && asn.effectiveTo < date) continue;
    if (!(asn.weekdayMask & (1 << weekday))) continue;

    if (!matchingAssignment || asn.effectiveFrom > matchingAssignment.effectiveFrom) {
      matchingAssignment = asn;
    }
  }

  const shiftId = matchingAssignment?.shiftId ?? defaultShiftId;
  return shiftId ? shiftsById.get(shiftId) ?? null : null;
}

/**
 * Pair punches chronologically
 * Returns first IN and last OUT, collapsing sub-30s intervals
 */
export function pairPunches(
  punches: RawPunchRecord[]
): { firstIn: Date | null; lastOut: Date | null } {
  if (!punches.length) {
    return { firstIn: null, lastOut: null };
  }

  // Sort by time
  const sorted = [...punches].sort((a, b) => a.punchAt.getTime() - b.punchAt.getTime());

  // Collapse punches within 30 seconds
  const collapsed: Date[] = [];
  for (const p of sorted) {
    if (collapsed.length === 0) {
      collapsed.push(p.punchAt);
    } else {
      const last = collapsed[collapsed.length - 1];
      if (p.punchAt.getTime() - last.getTime() > 30_000) {
        collapsed.push(p.punchAt);
      }
    }
  }

  // First and last
  return {
    firstIn: collapsed[0] ?? null,
    lastOut: collapsed[collapsed.length - 1] ?? null,
  };
}

/**
 * Compute all daily attendance metrics
 */
export function computeDay(ctx: DayContext): DayResult {
  const result: DayResult = {
    empCd: ctx.empCd,
    workDate: ctx.workDate,
    shiftId: ctx.shift?.id ?? null,
    firstIn: null,
    lastOut: null,
    workedMinutes: null,
    lateMinutes: 0,
    earlyLeaveMin: 0,
    overtimeMinutes: 0,
    status: 'absent',
    insideNow: false,
    computedAt: ctx.now,
  };

  // Override if on approved leave
  if (ctx.leaveApproved) {
    result.status = 'leave';
    return result;
  }

  // Override if holiday
  if (ctx.isHoliday) {
    result.status = 'holiday';
    return result;
  }

  // If no shift, can't compute lateness
  if (!ctx.shift) {
    if (ctx.punches.length > 0) {
      result.status = 'partial';
      const paired = pairPunches(ctx.punches);
      result.firstIn = paired.firstIn;
      result.lastOut = paired.lastOut;
      if (paired.firstIn && !paired.lastOut) {
        result.status = 'missing_checkout';
      }
    }
    return result;
  }

  // Pair punches
  const paired = pairPunches(ctx.punches);
  result.firstIn = paired.firstIn;
  result.lastOut = paired.lastOut;

  // No punches = absent
  if (!paired.firstIn) {
    result.status = 'absent';
    return result;
  }

  // Compute worked minutes
  if (paired.lastOut) {
    const workedMs = paired.lastOut.getTime() - paired.firstIn.getTime();
    result.workedMinutes = Math.max(0, Math.round(workedMs / 60_000) - ctx.breakMinutes);
  } else {
    // Missing checkout
    result.status = 'missing_checkout';
    const elapsed = ctx.now.getTime() - paired.firstIn.getTime();
    result.workedMinutes = null; // Don't compute for missing checkout
    return result;
  }

  // Parse shift times
  const shiftStartHm = parseTime(ctx.shift.startTime);
  const shiftEndHm = parseTime(ctx.shift.endTime);

  if (!shiftStartHm || !shiftEndHm) {
    result.status = 'partial';
    return result;
  }

  // Build shift window times (on workDate for overnight, might cross to next day)
  const shiftStartDt = buildDateTime(ctx.workDate, shiftStartHm);
  let shiftEndDt = buildDateTime(ctx.workDate, shiftEndHm);

  // If shift crosses midnight, move end to next day
  if (ctx.shift.crossesMidnight && shiftEndDt <= shiftStartDt) {
    shiftEndDt = new Date(shiftEndDt.getTime() + 24 * 60 * 60 * 1000);
  }

  // Compute lateness and early leave
  const inMs = paired.firstIn.getTime();
  const outMs = paired.lastOut.getTime();

  if (inMs > shiftStartDt.getTime()) {
    const lateMs = inMs - shiftStartDt.getTime();
    const lateMin = Math.round(lateMs / 60_000);
    result.lateMinutes = Math.max(0, lateMin - ctx.shift.graceLateMin);
    // Round to Taratus rounding increment (default 30 minutes)
    const roundingMin = ctx.shift.roundingMinutes ?? 30;
    if (roundingMin > 0 && result.lateMinutes > 0) {
      result.lateMinutes = Math.ceil(result.lateMinutes / roundingMin) * roundingMin;
    }
  }

  if (outMs < shiftEndDt.getTime()) {
    const earlyMs = shiftEndDt.getTime() - outMs;
    const earlyMin = Math.round(earlyMs / 60_000);
    result.earlyLeaveMin = Math.max(0, earlyMin - ctx.shift.graceEarlyMin);
    // Round to Taratus rounding increment (default 30 minutes)
    const roundingMin = ctx.shift.roundingMinutes ?? 30;
    if (roundingMin > 0 && result.earlyLeaveMin > 0) {
      result.earlyLeaveMin = Math.ceil(result.earlyLeaveMin / roundingMin) * roundingMin;
    }
  }

  // Compute overtime
  const shiftDurationMs = shiftEndDt.getTime() - shiftStartDt.getTime();
  const shiftDurationMin = shiftDurationMs / 60_000 - ctx.breakMinutes;

  if (result.workedMinutes && result.workedMinutes > shiftDurationMin) {
    result.overtimeMinutes = result.workedMinutes - shiftDurationMin;
    // Round to Taratus rounding increment (default 30 minutes)
    const roundingMin = ctx.shift.roundingMinutes ?? 30;
    if (roundingMin > 0 && result.overtimeMinutes > 0) {
      result.overtimeMinutes = Math.ceil(result.overtimeMinutes / roundingMin) * roundingMin;
    }
  }

  // Determine status
  result.status = 'present';
  if (result.lateMinutes > 0 || result.earlyLeaveMin > 0) {
    result.status = 'partial';
  }

  // Inside now
  if (inMs <= ctx.now.getTime() && (!paired.lastOut || paired.lastOut.getTime() > ctx.now.getTime())) {
    result.insideNow = true;
  }

  return result;
}

// ============ Helpers ============

function parseTime(hm: string): { h: number; m: number } | null {
  const [h, m] = hm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function buildDateTime(date: Date, time: { h: number; m: number }): Date {
  const dt = new Date(date);
  dt.setHours(time.h, time.m, 0, 0);
  return dt;
}
