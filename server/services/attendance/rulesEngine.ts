/**
 * Attendance Rules Engine
 * Pure functions (no DB, no Date.now()) for computing daily attendance
 * Passed structures are immutable; caller provides current time
 */

export interface Shift {
  id: number;
  name: string;
  branch?: "operations" | "center" | null;
  deviceId?: string | null;
  startTime: string; // HH:mm (or multiple times for split shifts, comma-separated)
  endTime: string;
  crossesMidnight: boolean;
  graceLateMin: number; // Default: 15 (Taratus: Adjusted value)
  graceEarlyMin: number; // Default: 15 (Taratus: Adjusted value)
  allowOT: boolean; // If false, overtime is never counted regardless of hours worked
  allowOTIn?: boolean;
  allowOTOut?: boolean;
  otMinMinutes?: number; // minimum minutes of OT before it counts (0 = any)
  otMinInMinutes?: number;
  otMinOutMinutes?: number;
  otMaxMinutes?: number; // cap on OT minutes per day (0 = unlimited)
  breakMinutes: number;
  weekdayMask: number; // bits 0-6: Sun-Sat; used to skip rest days
  requirePunch: boolean; // false = auto-present even with no fingerprint
  isFlexible?: boolean; // flexible check-in/out windows
  flexInFrom?: string | null; // HH:mm earliest check-in
  flexInTo?: string | null; // HH:mm latest on-time check-in (lateness counted after this)
  flexOutFrom?: string | null; // HH:mm earliest valid check-out (early-leave counted before this)
  flexOutTo?: string | null; // HH:mm latest check-out
  roundingMinutes?: number; // Default: 30 (Taratus: Round value)
}

export interface RawPunchRecord {
  id?: number;
  punchAt: Date;
  direction?: "in" | "out" | "unknown";
  source?: string;
  deviceId?: string | null;
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
  overtimeInMinutes: number;
  overtimeOutMinutes: number;
  overtimeMinutes: number;
  status:
    | "present"
    | "absent"
    | "leave"
    | "holiday"
    | "partial"
    | "missing_checkout";
  insideNow: boolean;
  computedAt: Date;
}

export interface ApprovedPermission {
  type: "in" | "out" | "mission";
  durationMinutes: number;
}

export function applyApprovedPermissions(
  result: DayResult,
  permissions: ApprovedPermission[],
): DayResult {
  const adjusted = { ...result };
  for (const permission of permissions) {
    if (permission.type === "in") {
      adjusted.lateMinutes = Math.max(
        0,
        adjusted.lateMinutes - permission.durationMinutes,
      );
    } else if (permission.type === "out") {
      adjusted.earlyLeaveMin = Math.max(
        0,
        adjusted.earlyLeaveMin - permission.durationMinutes,
      );
    }
  }

  if (permissions.some((permission) => permission.type === "mission")) {
    adjusted.lateMinutes = 0;
    adjusted.earlyLeaveMin = 0;
    if (adjusted.status === "absent" || adjusted.status === "partial") {
      adjusted.status = "present";
    }
  }

  if (
    adjusted.status === "partial" &&
    adjusted.lateMinutes === 0 &&
    adjusted.earlyLeaveMin === 0
  ) {
    adjusted.status = "present";
  }
  return adjusted;
}

/**
 * Resolve which shift applies to an employee on a given date
 * Checks explicit assignments first, falls back to default shift
 */
export function resolveShifts(
  empCd: string,
  date: Date,
  assignments: Array<{
    empCd: string;
    shiftId: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    weekdayMask: number;
  }>,
  defaultShiftId: number | null,
  shiftsById: Map<number, Shift>,
): Shift[] {
  const weekday = date.getDay(); // 0 = Sunday
  const dateStr = ymd(date);

  // 1. Find all matching assignments
  const matchingAssignments = [];
  for (const asn of assignments) {
    if (asn.empCd !== empCd) continue;
    if (ymd(asn.effectiveFrom) > dateStr) continue;
    if (asn.effectiveTo && ymd(asn.effectiveTo) < dateStr) continue;
    if (!(asn.weekdayMask & (1 << weekday))) continue;
    matchingAssignments.push(asn);
  }

  if (matchingAssignments.length > 0) {
    // Keep the latest assignment in each branch. Legacy shifts without a branch
    // remain mutually exclusive, while operations + center may run in one day.
    const latestByBranch = new Map<string, (typeof matchingAssignments)[number]>();
    for (const asn of matchingAssignments) {
      const shift = shiftsById.get(asn.shiftId);
      if (!shift) continue;
      const branchKey = shift.branch ?? "__unassigned";
      const current = latestByBranch.get(branchKey);
      if (!current || asn.effectiveFrom.getTime() > current.effectiveFrom.getTime()) {
        latestByBranch.set(branchKey, asn);
      }
    }

    return Array.from(latestByBranch.values())
      .map((asn) => shiftsById.get(asn.shiftId))
      .filter((shift): shift is Shift => Boolean(shift));
  }

  // Fall back to default shift — cycle slots handle rest-day exclusion
  if (defaultShiftId) {
    const shift = shiftsById.get(defaultShiftId);
    if (shift) return [shift];
  }

  return [];
}

export function resolveShift(
  empCd: string,
  date: Date,
  assignments: Array<{
    empCd: string;
    shiftId: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    weekdayMask: number;
  }>,
  defaultShiftId: number | null,
  shiftsById: Map<number, Shift>,
): Shift | null {
  const shifts = resolveShifts(empCd, date, assignments, defaultShiftId, shiftsById);
  return shifts[0] ?? null;
}

/**
 * Pair punches chronologically
 * Returns first IN and last OUT, collapsing sub-30s intervals
 */
export function pairPunches(punches: RawPunchRecord[]): {
  firstIn: Date | null;
  lastOut: Date | null;
} {
  if (!punches.length) {
    return { firstIn: null, lastOut: null };
  }

  // Sort by time
  const sorted = [...punches].sort(
    (a, b) => a.punchAt.getTime() - b.punchAt.getTime(),
  );

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
    overtimeInMinutes: 0,
    overtimeOutMinutes: 0,
    overtimeMinutes: 0,
    status: "absent",
    insideNow: false,
    computedAt: ctx.now,
  };

  // Override if on approved leave
  if (ctx.leaveApproved) {
    result.status = "leave";
    return result;
  }

  // A holiday without punches needs no further attendance calculation. When
  // punches exist, retain them so payroll can approve a full extra day.
  if (ctx.isHoliday && ctx.punches.length === 0) {
    result.status = "holiday";
    return result;
  }

  // If no shift, can't compute lateness
  if (!ctx.shift) {
    if (ctx.punches.length > 0) {
      result.status = "partial";
      const paired = pairPunches(ctx.punches);
      result.firstIn = paired.firstIn;
      result.lastOut = paired.lastOut;
      if (paired.firstIn && !paired.lastOut) {
        result.status = "missing_checkout";
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
      result.status = "present";
      const shiftStartHmAuto = parseTime(ctx.shift.startTime);
      const shiftEndHmAuto = parseTime(ctx.shift.endTime);
      if (shiftStartHmAuto && shiftEndHmAuto) {
        result.firstIn = buildDateTime(ctx.workDate, shiftStartHmAuto);
        result.lastOut = buildDateTime(ctx.workDate, shiftEndHmAuto);
        if (ctx.shift.crossesMidnight && result.lastOut <= result.firstIn) {
          result.lastOut = new Date(
            result.lastOut.getTime() + 24 * 60 * 60 * 1000,
          );
        }
        const workedMs = result.lastOut.getTime() - result.firstIn.getTime();
        result.workedMinutes = Math.max(
          0,
          Math.round(workedMs / 60_000) - ctx.breakMinutes,
        );
      }
    } else {
      result.status = "absent";
    }
    return result;
  }

  // Compute worked minutes
  if (paired.lastOut) {
    const workedMs = paired.lastOut.getTime() - paired.firstIn.getTime();
    result.workedMinutes = Math.max(
      0,
      Math.round(workedMs / 60_000) - ctx.breakMinutes,
    );
  } else {
    // Missing checkout
    result.status = "missing_checkout";
    result.insideNow = true;
    result.workedMinutes = null;
    return result;
  }

  const inMs = paired.firstIn.getTime();
  const outMs = paired.lastOut.getTime();
  const allowOTIn = ctx.shift.allowOTIn ?? ctx.shift.allowOT;
  const allowOTOut = ctx.shift.allowOTOut ?? ctx.shift.allowOT;
  const otMinIn = ctx.shift.otMinInMinutes ?? ctx.shift.otMinMinutes ?? 0;
  const otMinOut = ctx.shift.otMinOutMinutes ?? ctx.shift.otMinMinutes ?? 0;

  if (ctx.shift.isFlexible) {
    // Flexible shift: lateness counted only after flexInTo; early-leave before flexOutFrom
    const flexInToHm = ctx.shift.flexInTo ? parseTime(ctx.shift.flexInTo) : null;
    const flexOutFromHm = ctx.shift.flexOutFrom ? parseTime(ctx.shift.flexOutFrom) : null;

    if (flexInToHm) {
      const inDeadline = buildDateTime(ctx.workDate, flexInToHm).getTime();
      if (inMs > inDeadline) {
        result.lateMinutes = Math.round((inMs - inDeadline) / 60_000);
      }
    }

    if (flexOutFromHm) {
      const outDeadline = buildDateTime(ctx.workDate, flexOutFromHm).getTime();
      if (outMs < outDeadline) {
        result.earlyLeaveMin = Math.round((outDeadline - outMs) / 60_000);
      }
    }

    if (allowOTIn && ctx.shift.flexInFrom) {
      const flexInFromHm = parseTime(ctx.shift.flexInFrom);
      if (flexInFromHm) {
        const minIn = buildDateTime(ctx.workDate, flexInFromHm).getTime();
        if (inMs < minIn) {
          result.overtimeInMinutes = applyOTMinimum(
            Math.round((minIn - inMs) / 60_000),
            otMinIn,
          );
        }
      }
    }

    // Departure OT: worked beyond flexOutTo.
    if (allowOTOut && ctx.shift.flexOutTo) {
      const flexOutToHm = parseTime(ctx.shift.flexOutTo);
      if (flexOutToHm) {
        const maxOut = buildDateTime(ctx.workDate, flexOutToHm).getTime();
        if (outMs > maxOut && result.workedMinutes) {
          result.overtimeOutMinutes = applyOTMinimum(
            Math.round((outMs - maxOut) / 60_000),
            otMinOut,
          );
        }
      }
    }
    result.overtimeMinutes = capOTTotal(
      result.overtimeInMinutes + result.overtimeOutMinutes,
      ctx.shift.otMaxMinutes,
    );
  } else {
    // Fixed shift: use startTime / endTime
    const shiftStartHm = parseTime(ctx.shift.startTime);
    const shiftEndHm = parseTime(ctx.shift.endTime);

    if (!shiftStartHm || !shiftEndHm) {
      result.status = "partial";
      return result;
    }

    const shiftStartDt = buildDateTime(ctx.workDate, shiftStartHm);
    let shiftEndDt = buildDateTime(ctx.workDate, shiftEndHm);

    if (ctx.shift.crossesMidnight && shiftEndDt <= shiftStartDt) {
      shiftEndDt = new Date(shiftEndDt.getTime() + 24 * 60 * 60 * 1000);
    }

    if (inMs > shiftStartDt.getTime()) {
      const lateMin = Math.round((inMs - shiftStartDt.getTime()) / 60_000);
      result.lateMinutes = Math.max(0, lateMin - ctx.shift.graceLateMin);
    }

    if (outMs < shiftEndDt.getTime()) {
      const earlyMin = Math.round((shiftEndDt.getTime() - outMs) / 60_000);
      result.earlyLeaveMin = Math.max(0, earlyMin - ctx.shift.graceEarlyMin);
    }

    if (allowOTIn || allowOTOut) {
      if (allowOTIn && inMs < shiftStartDt.getTime()) {
        result.overtimeInMinutes = applyOTMinimum(
          Math.round((shiftStartDt.getTime() - inMs) / 60_000),
          otMinIn,
        );
      }
      if (allowOTOut && outMs > shiftEndDt.getTime()) {
        result.overtimeOutMinutes = applyOTMinimum(
          Math.round((outMs - shiftEndDt.getTime()) / 60_000),
          otMinOut,
        );
      }
      result.overtimeMinutes = capOTTotal(
        result.overtimeInMinutes + result.overtimeOutMinutes,
        ctx.shift.otMaxMinutes,
      );
    }
  }

  // Determine status
  result.status = "present";
  if (result.lateMinutes > 0 || result.earlyLeaveMin > 0) {
    result.status = "partial";
  }
  if (ctx.isHoliday) result.status = "holiday";

  // Inside now
  if (
    inMs <= ctx.now.getTime() &&
    (!paired.lastOut || paired.lastOut.getTime() > ctx.now.getTime())
  ) {
    result.insideNow = true;
  }

  return result;
}

// ============ Shift Cycle Resolution ============

export interface ShiftCycle {
  id: number;
  period: "day" | "week" | "month";
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
  shiftsById: Map<number, Shift>,
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

  const idx = calcCycleSlotIndex(
    cycle.period,
    cycle.anchorDate,
    date,
    cycle.slots.length,
  );
  const slot = cycle.slots.find((s) => s.slotIndex === idx);
  return slot ? (shiftsById.get(slot.shiftId) ?? null) : null;
}

function calcCycleSlotIndex(
  period: "day" | "week" | "month",
  anchorDate: Date,
  workDate: Date,
  totalSlots: number,
): number {
  // day / week: slot index = day of week (0=Sun … 6=Sat)
  if (period === "day" || period === "week") return workDate.getDay();
  // month: slot index = day of month (1-31)
  return workDate.getDate();
}

// ============ Helpers ============

/** YYYY-MM-DD using local getters — avoids UTC-vs-local shift on DB date strings */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function applyOTMinimum(minutes: number, minimum: number): number {
  return minutes < minimum ? 0 : minutes;
}

function capOTTotal(minutes: number, maximum = 0): number {
  return maximum > 0 ? Math.min(minutes, maximum) : minutes;
}

function parseTime(hm: string): { h: number; m: number } | null {
  const [h, m] = hm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function buildDateTime(date: Date, time: { h: number; m: number }): Date {
  const dt = new Date(date);
  dt.setHours(time.h, time.m, 0, 0);
  return dt;
}

export function partitionPunchesForShifts(
  punches: RawPunchRecord[],
  shifts: Shift[],
  workDate: Date,
): Map<number, RawPunchRecord[]> {
  const groups = new Map<number, RawPunchRecord[]>();
  for (const s of shifts) {
    groups.set(s.id, []);
  }

  if (shifts.length <= 1) {
    const shiftId = shifts[0]?.id ?? 0;
    groups.set(shiftId, [...punches]);
    return groups;
  }

  // Calculate midpoints for each shift. Device match takes priority because
  // overlapping center shifts cannot be identified reliably by time alone.
  const shiftMidpoints = shifts.map((s) => {
    const startHm = parseTime(s.startTime);
    const endHm = parseTime(s.endTime);
    if (!startHm || !endHm) {
      return { shiftId: s.id, midpoint: 0 };
    }
    const startDt = buildDateTime(workDate, startHm);
    let endDt = buildDateTime(workDate, endHm);
    if (s.crossesMidnight && endDt <= startDt) {
      endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000);
    }
    const midpoint = (startDt.getTime() + endDt.getTime()) / 2;
    return { shiftId: s.id, midpoint };
  });

  for (const p of punches) {
    const time = p.punchAt.getTime();
    const deviceCandidates = p.deviceId
      ? shifts.filter((shift) => shift.deviceId === p.deviceId)
      : [];
    const candidates = deviceCandidates.length > 0 ? deviceCandidates : shifts;
    let closestShiftId = candidates[0].id;
    let minDistance = Infinity;

    for (const m of shiftMidpoints.filter((midpoint) =>
      candidates.some((shift) => shift.id === midpoint.shiftId),
    )) {
      if (m.midpoint === 0) continue;
      const dist = Math.abs(time - m.midpoint);
      if (dist < minDistance) {
        minDistance = dist;
        closestShiftId = m.shiftId;
      }
    }

    const list = groups.get(closestShiftId);
    if (list) {
      list.push(p);
    } else {
      groups.set(closestShiftId, [p]);
    }
  }

  return groups;
}
