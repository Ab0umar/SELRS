import { and, gte, inArray, lte } from "drizzle-orm";
import {
  attendanceDaily,
  attendanceHolidays,
  attendanceShiftAssignments,
  attendanceShiftCycleAssignments,
} from "../../../drizzle/schema";

export type LeaveDayExclusion = (empCd: string, dateKey: string) => boolean;

const keyOf = (value: unknown): string =>
  value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value ?? "").slice(0, 10);

/**
 * Days inside a leave that must not be counted as leave: paid official
 * holidays and the employee's weekly rest days.
 *
 * A day is skipped only on positive evidence:
 *  - it is a paid official holiday, or
 *  - the employee had a schedule in force that day (a direct assignment or a
 *    cycle assignment) AND attendance_daily holds only the shift-0 row for it,
 *    i.e. the schedule did not call for work that day.
 * A shift-0 row on a day before the employee had any schedule means "not
 * scheduled yet", not "rest day", so it keeps counting; so does a day that was
 * never materialized. Only an employee with no schedule on record at all falls
 * back to Friday as the rest day.
 */
export async function loadLeaveDayExclusions(
  db: any,
  empCds: string[],
  year: number,
): Promise<LeaveDayExclusion> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const holidayRows = await db
    .select({ date: attendanceHolidays.date, paid: attendanceHolidays.paid })
    .from(attendanceHolidays)
    .where(
      and(
        gte(attendanceHolidays.date, from as any),
        lte(attendanceHolidays.date, to as any),
      ),
    );
  const holidays = new Set<string>(
    holidayRows.filter((h: any) => h.paid).map((h: any) => keyOf(h.date)),
  );

  // Periods in which each employee had a schedule in force.
  const scheduleBounds = new Map<string, Array<[string, string]>>();
  const addBounds = (rows: any[]) => {
    for (const row of rows) {
      const list = scheduleBounds.get(row.empCd) ?? [];
      list.push([
        keyOf(row.effectiveFrom),
        row.effectiveTo ? keyOf(row.effectiveTo) : "9999-12-31",
      ]);
      scheduleBounds.set(row.empCd, list);
    }
  };
  if (empCds.length > 0) {
    addBounds(
      await db
        .select({
          empCd: attendanceShiftAssignments.empCd,
          effectiveFrom: attendanceShiftAssignments.effectiveFrom,
          effectiveTo: attendanceShiftAssignments.effectiveTo,
        })
        .from(attendanceShiftAssignments)
        .where(inArray(attendanceShiftAssignments.empCd, empCds)),
    );
    addBounds(
      await db
        .select({
          empCd: attendanceShiftCycleAssignments.empCd,
          effectiveFrom: attendanceShiftCycleAssignments.effectiveFrom,
          effectiveTo: attendanceShiftCycleAssignments.effectiveTo,
        })
        .from(attendanceShiftCycleAssignments)
        .where(inArray(attendanceShiftCycleAssignments.empCd, empCds)),
    );
  }
  const hadSchedule = (empCd: string, key: string) =>
    (scheduleBounds.get(empCd) ?? []).some(
      ([start, end]) => start <= key && key <= end,
    );

  const scheduledByEmp = new Map<string, Set<string>>();
  const unscheduledByEmp = new Map<string, Set<string>>();
  if (empCds.length > 0) {
    const rows = await db
      .selectDistinct({
        empCd: attendanceDaily.empCd,
        workDate: attendanceDaily.workDate,
        shiftId: attendanceDaily.shiftId,
      })
      .from(attendanceDaily)
      .where(
        and(
          inArray(attendanceDaily.empCd, empCds),
          gte(attendanceDaily.workDate, from as any),
          lte(attendanceDaily.workDate, to as any),
        ),
      );
    for (const row of rows) {
      const target = row.shiftId === 0 ? unscheduledByEmp : scheduledByEmp;
      const set = target.get(row.empCd) ?? new Set<string>();
      set.add(keyOf(row.workDate));
      target.set(row.empCd, set);
    }
  }

  return (empCd, dateKey) => {
    if (holidays.has(dateKey)) return true;
    if (!scheduleBounds.has(empCd)) {
      return new Date(`${dateKey}T12:00:00`).getDay() === 5;
    }
    if (scheduledByEmp.get(empCd)?.has(dateKey)) return false;
    return (
      (unscheduledByEmp.get(empCd)?.has(dateKey) ?? false) &&
      hadSchedule(empCd, dateKey)
    );
  };
}
