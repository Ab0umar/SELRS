/**
 * Attendance Rules Engine
 *
 * Pure decision logic for daily attendance: no database access, no
 * Date.now(), every input injected. The caller passes "now"
 * (DayContext.now), so a rerun over the same inputs yields the same
 * row; dailyMaterializer.ts loads the world and calls these functions
 * per employee, day and shift. All Date math is facility-local (the
 * server clock must equal the facility clock) and Shift times are
 * HH:mm strings in that same local time. See docs/ATTENDANCE_SYNC.md,
 * "Rules engine and materializer semantics".
 */

/**
 * One work pattern: clock times, grace, overtime and device rules.
 * startTime/endTime (and the flex windows) are facility-local HH:mm
 * strings on the work date; endTime lands on the next day when
 * crossesMidnight is set. Durations (grace, OT minimums/caps,
 * breakMinutes) are in minutes. weekdayMask gates the weekdays the
 * shift runs on. deviceId filters which readers count for pairing:
 * "both", "fk", "zk" or an exact id (ADMS serials count as ZK,
 * see shiftMatchesDevice).
 */
export interface Shift {
  id: number;
  name: string;
  branch?: "operations" | "center" | "both" | null;
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

/**
 * One raw device scan. punchAt is facility-local, already
 * offset-corrected at ingest for ADMS pushes. direction mirrors the
 * device InOutMode flag, which readers have shown inverted or
 * constant, so nothing in this engine reads it: in/out is derived
 * geometrically in pairPunches. deviceId only feeds device-family
 * matching when punches are partitioned across shifts.
 */
export interface RawPunchRecord {
  id?: number;
  punchAt: Date;
  direction?: "in" | "out" | "unknown";
  source?: string;
  deviceId?: string | null;
}

/**
 * Everything computeDay needs for one employee, work date and shift:
 * the resolved shift, that shift's raw punches (already partitioned
 * by partitionPunchesForShifts), leave/holiday flags, accumulated
 * break minutes, and the caller's current time. Passing now in keeps
 * results reproducible instead of reading the wall clock.
 */
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

/**
 * One computed attendance row for an employee, work date and shift.
 * workedMinutes is null while the checkout is missing, so payroll
 * never sees a guessed total. insideNow marks a day still in
 * progress (checked in, not yet out, work date = today) for live
 * dashboards. The status decision order is documented on computeDay.
 */
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
    "present" | "absent" | "leave" | "holiday" | "partial" | "missing_checkout";
  insideNow: boolean;
  computedAt: Date;
}

/**
 * An approved absence authorization for the day. "in" trims
 * lateMinutes, "out" trims earlyLeaveMin, "mission" clears both
 * and upgrades absent/partial to present. A permission with
 * notAffectSalary: false is meant to affect salary, so it waives
 * nothing (see applyApprovedPermissions). durationMinutes is in
 * minutes.
 */
export interface ApprovedPermission {
  type: "in" | "out" | "mission";
  durationMinutes: number;
  notAffectSalary?: boolean;
}

/**
 * Whether an active cycle assignment displaces direct shift
 * assignments: the cycle wins when its effectiveFrom is on or after
 * the latest covering direct assignment's (same day counts as
 * cycle), so a newly published cycle takes over without deleting
 * the old schedule. Callers drop direct shifts and fall back to
 * resolveCycleShift when this returns true.
 *
 * @param cycleFrom YYYY-MM-DD effectiveFrom of the latest active
 *   cycle assignment, or undefined when none is active.
 * @param directFrom YYYY-MM-DD effectiveFrom of the latest covering
 *   direct assignment, or undefined when none covers the date.
 */
export function cycleOverridesDirectAssignment(
  cycleFrom: string | undefined,
  directFrom: string | undefined,
): boolean {
  return !!cycleFrom && (!directFrom || cycleFrom >= directFrom);
}

/**
 * Fold approved permissions into a computed day: "in" reduces
 * lateMinutes, "out" reduces earlyLeaveMin (never below zero), and
 * "mission" zeroes both and flips absent/partial to present. A
 * partial day whose late and early minutes both reach zero becomes
 * present. Permissions with notAffectSalary: false change nothing.
 *
 * @param result computeDay output; it is not mutated.
 * @returns An adjusted copy of the result.
 */
export function applyApprovedPermissions(
  result: DayResult,
  permissions: ApprovedPermission[],
): DayResult {
  const adjusted = { ...result };
  const salaryExemptPermissions = permissions.filter(
    (permission) => permission.notAffectSalary !== false,
  );
  for (const permission of salaryExemptPermissions) {
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

  if (
    salaryExemptPermissions.some((permission) => permission.type === "mission")
  ) {
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
 * Resolve which shifts apply to an employee on a date. Direct
 * assignments covering the date and matching the weekday are kept,
 * then only the latest effectiveFrom per branch survives
 * (shift.branch, with an "__unassigned" bucket); distinct shifts
 * saved together on the same effective day remain a multi-shift
 * day. An assignment that covers the date but whose weekdayMask
 * excludes it is an intentional rest day: the default shift is not
 * applied on top of it. With no covering assignment at all, the
 * default shift applies; the materializer passes defaultShiftId
 * null when an active cycle owns the schedule.
 *
 * @returns Shifts for the day, in assignment order; empty on a rest
 *   day.
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
    // A newer schedule replaces older assignments in its branch. Distinct
    // shifts saved together on the same effective day remain a multi-shift day.
    const latestByBranch = new Map<
      string,
      (typeof matchingAssignments)[number]
    >();
    for (const asn of matchingAssignments) {
      const shift = shiftsById.get(asn.shiftId);
      if (!shift) continue;
      const branchKey = shift.branch ?? "__unassigned";
      const current = latestByBranch.get(branchKey);
      if (
        !current ||
        asn.effectiveFrom.getTime() > current.effectiveFrom.getTime()
      ) {
        latestByBranch.set(branchKey, asn);
      }
    }

    const selectedShiftIds = new Set<number>();
    return matchingAssignments
      .filter((asn) => {
        const shift = shiftsById.get(asn.shiftId);
        if (!shift || selectedShiftIds.has(asn.shiftId)) return false;
        const latest = latestByBranch.get(shift.branch ?? "__unassigned");
        if (asn.effectiveFrom.getTime() !== latest?.effectiveFrom.getTime())
          return false;
        selectedShiftIds.add(asn.shiftId);
        return true;
      })
      .map((asn) => shiftsById.get(asn.shiftId))
      .filter((shift): shift is Shift => Boolean(shift));
  }

  // An effective direct assignment whose weekday mask excludes this date is an
  // intentional rest day. Do not turn it into a workday via the default shift.
  const hasEffectiveAssignment = assignments.some((assignment) => {
    if (assignment.empCd !== empCd) return false;
    if (ymd(assignment.effectiveFrom) > dateStr) return false;
    if (assignment.effectiveTo && ymd(assignment.effectiveTo) < dateStr)
      return false;
    return true;
  });
  if (hasEffectiveAssignment) return [];

  // Fall back to default shift only when no direct assignment covers this date.
  if (defaultShiftId) {
    const shift = shiftsById.get(defaultShiftId);
    if (shift) return [shift];
  }

  return [];
}

/**
 * First shift of resolveShifts, or null. Multi-shift days need the
 * full list from resolveShifts; use this only where a single shift
 * is expected.
 */
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
  const shifts = resolveShifts(
    empCd,
    date,
    assignments,
    defaultShiftId,
    shiftsById,
  );
  return shifts[0] ?? null;
}

/**
 * Pair punches by the shift's arrival/departure halves, not by a device's
 * InOutMode flag. FK and ZK devices may emit that flag inverted or unchanged
 * for every scan.
 */
export function pairPunches(
  punches: RawPunchRecord[],
  shift?: Shift | null,
  workDate?: Date,
): {
  firstIn: Date | null;
  lastOut: Date | null;
} {
  if (!punches.length) {
    return { firstIn: null, lastOut: null };
  }

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

  if (shift && workDate) {
    const startHm = parseTime(shift.startTime);
    const endHm = parseTime(shift.endTime);
    if (startHm && endHm) {
      const shiftStart = buildDateTime(workDate, startHm);
      let shiftEnd = buildDateTime(workDate, endHm);
      if (shift.crossesMidnight && shiftEnd <= shiftStart) {
        shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      const midpoint = (shiftStart.getTime() + shiftEnd.getTime()) / 2;
      if (collapsed.length === 1) {
        const onlyPunch = collapsed[0];
        return onlyPunch.getTime() <= midpoint
          ? { firstIn: onlyPunch, lastOut: null }
          : { firstIn: null, lastOut: onlyPunch };
      }
      return {
        firstIn:
          collapsed.find((punchAt) => punchAt.getTime() <= midpoint) ?? null,
        lastOut:
          [...collapsed]
            .reverse()
            .find((punchAt) => punchAt.getTime() >= midpoint) ?? null,
      };
    }
  }

  // No assigned shift: retain chronological behaviour for manual review.
  return {
    firstIn: collapsed[0] ?? null,
    lastOut: collapsed.length > 1 ? collapsed[collapsed.length - 1] : null,
  };
}

/**
 * Compute the daily attendance row for one employee, work date and
 * shift. Statuses, in the order the function reaches them:
 * - leave: approved leave, nothing else computed.
 * - holiday: holiday with no punches. Holiday with punches still
 *   computes, then flips to holiday with late/early minutes zeroed
 *   (holiday work is paid as overtime, not deducted as lateness).
 * - partial / missing_checkout: punches without a shift, or any
 *   lone scan on a shifted day (either side of the midpoint), or a
 *   fixed shift with unparseable start/end times.
 * - absent: a shifted day with no raw scans at all and requirePunch
 *   set. With requirePunch false the shift is credited in full
 *   minus breaks (auto-present) even without scans.
 * - present, degraded to partial when late or early minutes
 *   survive.
 *
 * Pairing and rules: pairPunches derives firstIn/lastOut; worked
 * minutes = max(0, out - in - breaks), rounded to minutes. Fixed
 * shifts deduct lateness beyond graceLateMin and early leave
 * beyond graceEarlyMin; flexible shifts measure against
 * flexInTo/flexOutFrom instead. Overtime needs the shift's allowOT
 * flags, must reach its per-side minimum (otMinInMinutes/
 * otMinOutMinutes, falling back to otMinMinutes) and is capped by
 * otMaxMinutes. insideNow is set when the work date is today and
 * the employee is paired as still inside.
 *
 * @param ctx DayContext for the employee/day/shift, now included.
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
      const paired = pairPunches(ctx.punches, ctx.shift, ctx.workDate);
      result.firstIn = paired.firstIn;
      result.lastOut = paired.lastOut;
      if (paired.firstIn && !paired.lastOut) {
        result.status = "missing_checkout";
        result.insideNow = ymd(ctx.workDate) === ymd(ctx.now);
      }
    }
    return result;
  }

  // Pair punches
  const paired = pairPunches(ctx.punches, ctx.shift, ctx.workDate);
  result.firstIn = paired.firstIn;
  result.lastOut = paired.lastOut;

  // No arrival punch. Device direction is unreliable, so a lone scan counts as
  // a single-punch day; absence is only a day with no raw scans.
  if (!paired.firstIn) {
    if (paired.lastOut) {
      result.status = "missing_checkout";
      return result;
    }
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

  if (paired.lastOut) {
    const workedMs = paired.lastOut.getTime() - paired.firstIn.getTime();
    result.workedMinutes = Math.max(
      0,
      Math.round(workedMs / 60_000) - ctx.breakMinutes,
    );
  } else {
    // Missing checkout
    result.status = "missing_checkout";
    result.insideNow = ymd(ctx.workDate) === ymd(ctx.now);
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
    const flexInToHm = ctx.shift.flexInTo
      ? parseTime(ctx.shift.flexInTo)
      : null;
    const flexOutFromHm = ctx.shift.flexOutFrom
      ? parseTime(ctx.shift.flexOutFrom)
      : null;

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
  if (ctx.isHoliday) {
    // Working an official holiday is voluntary extra work paid as holiday
    // overtime; it must not produce late/early deductions.
    result.status = "holiday";
    result.lateMinutes = 0;
    result.earlyLeaveMin = 0;
  }

  // Inside now
  if (
    ymd(ctx.workDate) === ymd(ctx.now) &&
    inMs <= ctx.now.getTime() &&
    (!paired.lastOut || paired.lastOut.getTime() > ctx.now.getTime())
  ) {
    result.insideNow = true;
  }

  return result;
}

/**
 * Back-to-back shifts that all accept both devices (operations until 15:00,
 * center from 15:00) are one continuous working day: the employee arrives on
 * the ZK reader and leaves on the FK reader, with no scan at the hand-over.
 * They are evaluated as ONE shift (first start to last end), which yields one
 * attendance row per day: first ZK scan in, last FK scan out.
 *
 * Returns null unless every shift is "both devices", none crosses midnight and
 * each starts within an hour of the previous one ending.
 */
export function mergeContinuousBothDeviceShifts(shifts: Shift[]): Shift | null {
  if (shifts.length < 2) return null;
  if (
    !shifts.every(
      (shift) =>
        (shift.deviceId ?? "").toLowerCase() === "both" &&
        !shift.crossesMidnight,
    )
  ) {
    return null;
  }
  const minutes = (hm: string): number | null => {
    const parsed = parseTime(hm);
    return parsed ? parsed.h * 60 + parsed.m : null;
  };
  const clock = (total: number): string => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
    return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
  };
  const ordered = [...shifts].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id,
  );
  for (let i = 0; i + 1 < ordered.length; i++) {
    const end = minutes(ordered[i].endTime);
    const start = minutes(ordered[i + 1].startTime);
    if (end === null || start === null || Math.abs(start - end) > 60) {
      return null;
    }
  }
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const firstStart = minutes(first.startTime);
  const lastEnd = minutes(last.endTime);
  if (firstStart === null || lastEnd === null || lastEnd <= firstStart) {
    return null;
  }

  const flexible = ordered.some((shift) => shift.isFlexible);
  return {
    ...first,
    name: ordered.map((shift) => shift.name).join(" + "),
    startTime: first.startTime,
    endTime: last.endTime,
    graceLateMin: first.graceLateMin,
    graceEarlyMin: last.graceEarlyMin,
    breakMinutes: ordered.reduce((sum, shift) => sum + (shift.breakMinutes ?? 0), 0),
    allowOT: first.allowOT || last.allowOT,
    allowOTIn: first.allowOTIn ?? first.allowOT,
    allowOTOut: last.allowOTOut ?? last.allowOT,
    otMinInMinutes: first.otMinInMinutes ?? first.otMinMinutes ?? 0,
    otMinOutMinutes: last.otMinOutMinutes ?? last.otMinMinutes ?? 0,
    otMaxMinutes: first.otMaxMinutes,
    requirePunch: ordered.every((shift) => shift.requirePunch),
    isFlexible: flexible,
    // When flexible, lateness is measured against flexInTo and early leave
    // against flexOutFrom; a fixed edge uses its start/end with its grace.
    flexInFrom: first.isFlexible ? first.flexInFrom : first.startTime,
    flexInTo: first.isFlexible
      ? first.flexInTo
      : clock(firstStart + (first.graceLateMin ?? 0)),
    flexOutFrom: last.isFlexible
      ? last.flexOutFrom
      : clock(lastEnd - (last.graceEarlyMin ?? 0)),
    flexOutTo: last.isFlexible ? last.flexOutTo : last.endTime,
  };
}

// Shift Cycle Resolution

/**
 * A rotating shift pattern. slotIndex meaning depends on period:
 * for "day" and "week" it is the weekday (0 = Sunday, matching
 * getDay()), for "month" the day of month (1..31), for
 * "rotation" a 0-based day index counted from anchorDate. A slot
 * with shiftId 0 is a rest slot and resolves to no shift (see
 * resolveCycleShift).
 */
export interface ShiftCycle {
  id: number;
  period: "day" | "week" | "month" | "rotation";
  anchorDate: Date;
  slots: { slotIndex: number; shiftId: number }[]; // day: 0..slotCount-1; week: 0..6; month: 1..31
}

/**
 * Binds an employee to a ShiftCycle from effectiveFrom (optionally
 * to effectiveTo). When several are active, the latest effectiveFrom
 * wins regardless of list order.
 */
export interface CycleAssignment {
  empCd: string;
  cycleId: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/**
 * Resolve the day's shift from a rotating cycle assignment: the
 * latest active CycleAssignment wins, then the slot for the date is
 * picked from its cycle ("day"/"week" by weekday, "month" by day
 * of month, "rotation" by days elapsed since anchorDate modulo the
 * pattern length). Unconfigured days and rest slots (shiftId 0)
 * yield null, so the day falls through to the no-shift handling in
 * the materializer.
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
    cycle.slots.map((slot) => slot.slotIndex),
  );
  const slot = cycle.slots.find((s) => s.slotIndex === idx);
  return slot ? (shiftsById.get(slot.shiftId) ?? null) : null;
}

function calcCycleSlotIndex(
  period: "day" | "week" | "month" | "rotation",
  anchorDate: Date,
  workDate: Date,
  totalSlots: number,
  configuredSlotIndexes: number[],
): number {
  const dayNumber = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) /
    86_400_000;
  // Legacy "day" cycles were weekday maps. Keep their historical meaning;
  // anchored rotating patterns use the explicit "rotation" period.
  if (period === "rotation") {
    // The pattern length is the last configured day; unconfigured days in
    // between and rest slots (shiftId 0) resolve to no shift.
    if (configuredSlotIndexes.length === 0) return -1;
    const count = Math.max(...configuredSlotIndexes) + 1;
    const elapsedDays = dayNumber(workDate) - dayNumber(anchorDate);
    return ((elapsedDays % count) + count) % count;
  }
  // The UI defines weekly cycles by weekday and monthly cycles by day-of-month.
  if (period === "day" || period === "week") return workDate.getDay();
  return workDate.getDate();
}

// Helpers

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

/**
 * FK devices are "fk" or "fk_*"; anything else (ADMS serial
 * numbers included) is ZK family. Empty when the punch carries no
 * device id.
 */
const deviceFamily = (deviceId: string | null | undefined): "fk" | "zk" | "" => {
  const id = deviceId?.toLowerCase();
  if (!id) return "";
  return id === "fk" || id.startsWith("fk_") ? "fk" : "zk";
};

/**
 * Bucket the day's punches per shift id for multi-shift days. Each
 * punch lands in exactly one bucket: a next-day punch is eligible
 * only for crossesMidnight shifts whose end time has not passed at
 * the punch's minute of day; a shift whose deviceId matches the
 * punch wins, otherwise the punch still counts, assigned to the
 * nearest shift-window midpoint (dropping it would manufacture a
 * deduction). Two special shapes: a rest day (no shifts) puts every
 * punch under the synthetic shift 0 so the day reads partial
 * instead of absent, and a day where every shift accepts "both"
 * devices is paired as a whole: first ZK scan in, last FK scan out,
 * attached to the first and last shift.
 *
 * @param includeNextDayPunches Extends the window through the next
 *   day for cross-midnight checkouts and disables the both-device
 *   fast path.
 * @returns Punches keyed by shift id; key 0 is the rest-day bucket.
 */
export function partitionPunchesForShifts(
  punches: RawPunchRecord[],
  shifts: Shift[],
  workDate: Date,
  includeNextDayPunches = false,
): Map<number, RawPunchRecord[]> {
  const groups = new Map<number, RawPunchRecord[]>();
  for (const s of shifts) {
    groups.set(s.id, []);
  }

  // Punches on a rest day stay under the synthetic shift 0, so the day is
  // partial rather than absent.
  if (shifts.length === 0) {
    const dayStart = new Date(workDate);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    groups.set(
      0,
      punches.filter(
        (punch) =>
          punch.punchAt >= dayStart &&
          (includeNextDayPunches || punch.punchAt < nextDayStart),
      ),
    );
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

  const dayStart = new Date(workDate);
  dayStart.setHours(0, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  const dayAfterNextStart = new Date(nextDayStart);
  dayAfterNextStart.setDate(dayAfterNextStart.getDate() + 1);

  // Both-device shifts: arrival is the first ZK scan and departure the last FK
  // scan, assigned to the day's first and last shift.
  if (
    !includeNextDayPunches &&
    shifts.every((shift) => (shift.deviceId ?? "").toLowerCase() === "both")
  ) {
    const todays = punches
      .filter((p) => p.punchAt >= dayStart && p.punchAt < nextDayStart)
      .sort((a, b) => a.punchAt.getTime() - b.punchAt.getTime());
    const zk = todays.filter((p) => deviceFamily(p.deviceId) === "zk");
    const fk = todays.filter((p) => deviceFamily(p.deviceId) === "fk");
    if (zk.length > 0 && fk.length > 0) {
      const arrival = zk[0];
      const departure = fk[fk.length - 1];
      if (arrival.punchAt.getTime() < departure.punchAt.getTime()) {
        const ordered = [...shifts].sort(
          (a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id,
        );
        if (ordered.length === 1) {
          groups.set(ordered[0].id, [arrival, departure]);
        } else {
          groups.get(ordered[0].id)!.push(arrival);
          groups.get(ordered[ordered.length - 1].id)!.push(departure);
        }
        return groups;
      }
    }
  }

  for (const p of punches) {
    const time = p.punchAt.getTime();
    const isNextDayPunch = p.punchAt >= nextDayStart;
    if (
      p.punchAt < dayStart ||
      (isNextDayPunch &&
        (!includeNextDayPunches || p.punchAt >= dayAfterNextStart))
    ) {
      continue;
    }
    const punchDeviceId = p.deviceId;
    const eligibleShifts = isNextDayPunch
      ? shifts.filter((shift) => {
          const endHm = parseTime(shift.endTime);
          const startHm = parseTime(shift.startTime);
          if (!shift.crossesMidnight || !startHm || !endHm) return false;
          const punchMinute =
            p.punchAt.getHours() * 60 + p.punchAt.getMinutes();
          const endMinute = endHm.h * 60 + endHm.m;
          return punchMinute <= endMinute;
        })
      : shifts;
    if (isNextDayPunch && eligibleShifts.length === 0) continue;
    const deviceCandidates = punchDeviceId
      ? eligibleShifts.filter((shift) =>
          shiftMatchesDevice(shift.deviceId, punchDeviceId),
        )
      : [];
    // A device match narrows the choice. With none, the punch still counts
    // (nearest shift): dropping it would become an absence, deducted as 3 days.
    const candidates =
      deviceCandidates.length > 0 ? deviceCandidates : eligibleShifts;
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

function shiftMatchesDevice(
  shiftDeviceId: string | null | undefined,
  punchDeviceId: string,
): boolean {
  if (!shiftDeviceId) return true;

  const configured = shiftDeviceId.toLowerCase();
  const actual = punchDeviceId.toLowerCase();
  const isFkDevice = actual === "fk" || actual.startsWith("fk_");
  // ADMS devices report their serial number (digits and/or letters), so any
  // device that is not an FK alias is a ZK device.
  const isZkDevice = !isFkDevice;
  if (configured === "both") {
    return isFkDevice || isZkDevice;
  }
  if (configured === "fk") return isFkDevice;
  // ADMS identifies ZK devices by serial number instead of a zk_* alias.
  if (configured === "zk") return isZkDevice;
  return configured === actual;
}
