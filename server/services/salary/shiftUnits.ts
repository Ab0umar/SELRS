// Shared big/small shift unit rules used by the shift payroll page and the
// saved payroll so both produce the same numbers.
export const FULL_SHIFT_MINUTES = 6 * 60;
export const HALF_SHIFT_MINUTES = 4 * 60;

export function shiftDurationMinutes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  fallbackMinutes: number,
): number {
  if (!startTime || !endTime) return fallbackMinutes;
  const [startHour, startMinute] = String(startTime).split(":").map(Number);
  const [endHour, endMinute] = String(endTime).split(":").map(Number);
  let duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (duration < 0) duration += 24 * 60;
  return duration > 0 ? duration : fallbackMinutes;
}

export const DEFAULT_AUTO_SMALL_THRESHOLD_MIN = 270;

/** Shifts shorter than the threshold are small (4h base), others big (6h base). */
export function shiftBaseMinutes(
  durationMinutes: number,
  smallThresholdMin = DEFAULT_AUTO_SMALL_THRESHOLD_MIN,
): number {
  return durationMinutes < smallThresholdMin
    ? HALF_SHIFT_MINUTES
    : FULL_SHIFT_MINUTES;
}

/** Roster rows are stored as "HH:mm-HH:mm"; definitions are matched by that too. */
export function shiftTimeKey(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string {
  return `${String(startTime ?? "").slice(0, 5)}-${String(endTime ?? "").slice(0, 5)}`;
}

export function splitShiftMinutesIntoUnits(
  shifts: { durationMinutes: number; baseMinutes: number }[],
): {
  big: number;
  small: number;
} {
  let big = 0;
  let small = 0;
  let extraMinutes = 0;

  for (const { durationMinutes, baseMinutes } of shifts) {
    if (baseMinutes === FULL_SHIFT_MINUTES) {
      big++;
    } else {
      small++;
    }
    extraMinutes += Math.max(0, durationMinutes - baseMinutes);
  }

  big += Math.floor(extraMinutes / FULL_SHIFT_MINUTES);
  extraMinutes %= FULL_SHIFT_MINUTES;
  small += Math.floor(extraMinutes / HALF_SHIFT_MINUTES);
  return { big, small };
}

/**
 * Base minutes per shift definition, keyed by its name AND its "HH:mm-HH:mm"
 * range (roster rows only carry the range). An explicit size wins; "auto" uses
 * the definition's own small-shift threshold.
 */
export function buildShiftBaseMinutesMap(shiftDefs: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const sd of shiftDefs) {
    const duration = shiftDurationMinutes(
      sd.startTime,
      sd.endTime,
      FULL_SHIFT_MINUTES,
    );
    const base =
      sd.shiftSize === "small"
        ? HALF_SHIFT_MINUTES
        : sd.shiftSize === "big"
          ? FULL_SHIFT_MINUTES
          : shiftBaseMinutes(
              duration,
              Number(sd.autoSmallThresholdMin ?? DEFAULT_AUTO_SMALL_THRESHOLD_MIN),
            );
    map.set(sd.name as string, base);
    // Active definitions win a range collision.
    const key = shiftTimeKey(sd.startTime, sd.endTime);
    if (sd.active !== false || !map.has(key)) map.set(key, base);
  }
  return map;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Share of a linked shift member's pay lost to punches: late/early minutes at
 * the minute rate plus a quarter day per missing checkout.
 */
export function shiftPunchDeductionPct(input: {
  basic: number;
  scheduled: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  missingCheckoutDays: number;
  deductionsEnabled: boolean;
}): number {
  if (!input.deductionsEnabled || input.basic <= 0 || input.scheduled <= 0)
    return 0;
  const dailyRate = input.basic / input.scheduled;
  const minuteRate = dailyRate / 360;
  const total =
    (input.lateMinutes + input.earlyLeaveMinutes) * minuteRate +
    input.missingCheckoutDays * dailyRate * 0.25;
  return Math.min(1, round2(total) / input.basic);
}

export type ShiftAttendanceOverride = {
  bigAttended: number | null;
  smallAttended: number | null;
};

/** Hourly shift pay for one staff member over roster rows (holidays removed). */
export function computeShiftStaffPay(input: {
  rows: any[];
  rateBig: number;
  mainShiftMinutes: number;
  baseMinutesMap: Map<string, number>;
  override?: ShiftAttendanceOverride | null;
  deductionsEnabled: boolean;
  punchDeductionPct: number;
}) {
  const { rows, rateBig, baseMinutesMap, deductionsEnabled } = input;
  const mainShiftMinutes = input.mainShiftMinutes || FULL_SHIFT_MINUTES;
  const hourlyRate = rateBig / mainShiftMinutes;
  const rateSmall = round2(hourlyRate * HALF_SHIFT_MINUTES);
  const byShift: Record<
    string,
    { scheduled: number; attended: number; rate: number }
  > = {};
  let attended = 0;
  let scheduledMinutes = 0;
  let attendedMinutes = 0;
  let bigPay = 0; // hourly pay of shifts classed big / small
  let smallPay = 0;
  const scheduledShiftMinutes: { durationMinutes: number; baseMinutes: number }[] = [];
  const attendedShiftMinutes: { durationMinutes: number; baseMinutes: number }[] = [];

  // The roster flag is the source of truth: a day-level punch cannot tell
  // which of several same-day shifts was worked.
  for (const a of rows) {
    const present = Boolean(a.present);
    const durationMinutes = shiftDurationMinutes(
      a.startTime,
      a.endTime,
      mainShiftMinutes,
    );
    const baseMinutes =
      baseMinutesMap.get(shiftTimeKey(a.startTime, a.endTime)) ??
      baseMinutesMap.get(a.shiftName) ??
      shiftBaseMinutes(durationMinutes);
    const rate = round2(hourlyRate * durationMinutes);
    if (baseMinutes === FULL_SHIFT_MINUTES) bigPay += hourlyRate * durationMinutes;
    else smallPay += hourlyRate * durationMinutes;
    scheduledMinutes += durationMinutes;
    scheduledShiftMinutes.push({ durationMinutes, baseMinutes });
    if (present) {
      attended++;
      attendedMinutes += durationMinutes;
      attendedShiftMinutes.push({ durationMinutes, baseMinutes });
    }
    if (!byShift[a.shiftName])
      byShift[a.shiftName] = { scheduled: 0, attended: 0, rate };
    byShift[a.shiftName].scheduled++;
    if (present) byShift[a.shiftName].attended++;
  }

  const scheduledUnits = splitShiftMinutesIntoUnits(scheduledShiftMinutes);
  const attendedUnits = splitShiftMinutesIntoUnits(attendedShiftMinutes);
  const bigScheduled = scheduledUnits.big;
  const smallScheduled = scheduledUnits.small;
  let bigAttended = attendedUnits.big;
  let smallAttended = attendedUnits.small;

  // Accountant overrides win, capped at what was scheduled.
  const hasBigOverride = input.override?.bigAttended != null;
  const hasSmallOverride = input.override?.smallAttended != null;
  const hasOverride = hasBigOverride || hasSmallOverride;
  if (hasBigOverride)
    bigAttended = Math.min(bigScheduled, input.override!.bigAttended as number);
  if (hasSmallOverride)
    smallAttended = Math.min(
      smallScheduled,
      input.override!.smallAttended as number,
    );

  const scheduled = rows.length;
  const bigAbsent = Math.max(0, bigScheduled - bigAttended);
  const smallAbsent = Math.max(0, smallScheduled - smallAttended);
  const scheduledHourlyPay = round2(hourlyRate * scheduledMinutes);
  const attendedHourlyPay = round2(hourlyRate * attendedMinutes);
  // Basic is always the scheduled hourly pay; an override only changes how
  // much of it counts as absent (pro rata per size, so shift length is kept).
  const basicSalary = scheduledHourlyPay;
  const absentDeduction = !deductionsEnabled
    ? 0
    : hasOverride
      ? round2(
          (bigScheduled > 0 ? bigPay * (bigAbsent / bigScheduled) : 0) +
            (smallScheduled > 0 ? smallPay * (smallAbsent / smallScheduled) : 0),
        )
      : round2(scheduledHourlyPay - attendedHourlyPay);
  const punchDeductionPct = deductionsEnabled ? input.punchDeductionPct : 0;
  const punchDeduction = round2(basicSalary * punchDeductionPct);
  const netPay = round2(basicSalary - absentDeduction - punchDeduction);
  const attendedRatio =
    basicSalary > 0 ? Math.max(0, (basicSalary - absentDeduction) / basicSalary) : 1;

  return {
    rateSmall,
    hourlyRate,
    mainShiftMinutes,
    scheduledMinutes,
    attendedMinutes,
    scheduled,
    attended,
    absent: scheduled - attended,
    bigScheduled,
    bigAttended,
    bigAbsent,
    bigTotal: round2(bigScheduled * rateBig),
    smallScheduled,
    smallAttended,
    smallAbsent,
    smallTotal: round2(smallScheduled * rateSmall),
    basicSalary,
    absentDeduction,
    punchDeductionPct,
    punchDeduction,
    netPay,
    attendedRatio,
    byShift,
    hasOverride,
    hasBigOverride,
    hasSmallOverride,
  };
}
