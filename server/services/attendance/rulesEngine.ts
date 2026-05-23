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
  allowOT: boolean; // If false, overtime is never counted regardless of hours worked
  breakMinutes: number;
  weekdayMask: number; // bits 0-6: Sun-Sat; used to skip rest days
  requirePunch: boolean; // false = auto-present even with no fingerprint
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

  const dateStr = ymd(date);
  // Find latest assignment that matches this date and weekday
  let matchingAssignment = null;
  for (const asn of assignments) {
    if (asn.empCd !== empCd) continue;
    if (ymd(asn.effectiveFrom) > dateStr) continue;
    if (asn.effectiveTo && ymd(asn.effectiveTo) < dateStr) continue;
    if (!(asn.weekdayMask & (1 << weekday))) continue;

    if (!matchingAssignment || ymd(asn.effectiveFrom) > ymd(matchingAssignment.effectiveFrom)) {
      matchingAssignment = asn;
    }
  }

  if (matchingAssignment) {
    return shiftsById.get(matchingAssignment.shiftId) ?? null;
  }

  // Fall back to default shift — cycle slots handle rest-day exclusion
  if (defaultShiftId) {
    return shiftsById.get(defaultShiftId) ?? null;
  }

  return null;
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

  // First and last — need at least 2 distinct punches to have a lastOut
  return {
    firstIn: collapsed[0] ?? null,
    lastOut: collapsed.length > 1 ? collapsed[collapsed.length - 1] : null,
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
        result.insideNow = true; // checked in, not yet out
      }
    }
    return result;
  }

  // Pair punches
  const paired = pairPunches(ctx.punches);
  result.firstIn = paired.firstIn;
  result.lastOut = paired.lastOut;

  // No punches
  if (!paired.firstIn) {
    if (!ctx.shift.requirePunch) {
      // Auto-present: assume full shift worked
      result.status = 'present';
      const shiftStartHmAuto = parseTime(ctx.shift.startTime);
      const shiftEndHmAuto = parseTime(ctx.shift.endTime);
      if (shiftStartHmAuto && shiftEndHmAuto) {
        result.firstIn = buildDateTime(ctx.workDate, shiftStartHmAuto);
        result.lastOut = buildDateTime(ctx.workDate, shiftEndHmAuto);
        if (ctx.shift.crossesMidnight && result.lastOut <= result.firstIn) {
          result.lastOut = new Date(result.lastOut.getTime() + 24 * 60 * 60 * 1000);
        }
        const workedMs = result.lastOut.getTime() - result.firstIn.getTime();
        result.workedMinutes = Math.max(0, Math.round(workedMs / 60_000) - ctx.breakMinutes);
      }
    } else {
      result.status = 'absent';
    }
    return result;
  }

  // Compute worked minutes
  if (paired.lastOut) {
    const workedMs = paired.lastOut.getTime() - paired.firstIn.getTime();
    result.workedMinutes = Math.max(0, Math.round(workedMs / 60_000) - ctx.breakMinutes);
  } else {
    // Missing checkout
    result.status = 'missing_checkout';
    result.insideNow = true;
    result.workedMinutes = null;
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
    const lateMin = Math.round((inMs - shiftStartDt.getTime()) / 60_000);
    result.lateMinutes = Math.max(0, lateMin - ctx.shift.graceLateMin);
  }

  if (outMs < shiftEndDt.getTime()) {
    const earlyMin = Math.round((shiftEndDt.getTime() - outMs) / 60_000);
    result.earlyLeaveMin = Math.max(0, earlyMin - ctx.shift.graceEarlyMin);
  }

  // Compute overtime — only if allowOT is enabled for this shift
  const shiftDurationMin = (shiftEndDt.getTime() - shiftStartDt.getTime()) / 60_000 - ctx.breakMinutes;
  if (ctx.shift.allowOT && result.workedMinutes && result.workedMinutes > shiftDurationMin) {
    result.overtimeMinutes = Math.round(result.workedMinutes - shiftDurationMin);
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

// ============ Shift Cycle Resolution ============

export interface ShiftCycle {
  id: number;
  period: 'day' | 'week' | 'month';
  anchorDate: Date;
  slots: { slotIndex: number; shiftId: number }[]; // sorted by slotIndex asc
}

export interface CycleAssignment {
  empCd: string;
  cycleId: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/**
 * Resolve which shift applies via a rotating cycle assignment.
 * Called as a fallback when no direct shift assignment exists.
 */
export function resolveCycleShift(
  empCd: string,
  date: Date,
  cycleAssignments: CycleAssignment[],
  cyclesById: Map<number, ShiftCycle>,
  shiftsById: Map<number, Shift>
): Shift | null {
  const dateStr = ymd(date);
  // Find latest active cycle assignment
  let best: CycleAssignment | null = null;
  for (const a of cycleAssignments) {
    if (a.empCd !== empCd) continue;
    if (ymd(a.effectiveFrom) > dateStr) continue;
    if (a.effectiveTo && ymd(a.effectiveTo) < dateStr) continue;
    if (!best || ymd(a.effectiveFrom) > ymd(best.effectiveFrom)) best = a;
  }
  if (!best) return null;

  const cycle = cyclesById.get(best.cycleId);
  if (!cycle || !cycle.slots.length) return null;

  const idx = calcCycleSlotIndex(cycle.period, cycle.anchorDate, date, cycle.slots.length);
  const slot = cycle.slots.find((s) => s.slotIndex === idx);
  return slot ? (shiftsById.get(slot.shiftId) ?? null) : null;
}

function calcCycleSlotIndex(
  period: 'day' | 'week' | 'month',
  anchorDate: Date,
  workDate: Date,
  totalSlots: number
): number {
  // day / week: slot index = day of week (0=Sun … 6=Sat)
  if (period === 'day' || period === 'week') return workDate.getDay();
  // month: slot index = day of month (1-31)
  return workDate.getDate();
}

// ============ Helpers ============

/** YYYY-MM-DD using local getters — avoids UTC-vs-local shift on DB date strings */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
