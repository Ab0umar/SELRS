import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDbConnection } from "../db";
import { withMaterializerTransaction } from "../services/attendance/materializerMutex";
import crypto from "crypto";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  router,
  makeAttProcedure,
  makeAttWriteProcedure,
  protectedProcedure,
  makePageProcedure,
  makePageWriteProcedure,
  adminProcedure,
} from "../_core/procedures";
import { DashboardService } from "../services/attendance/dashboard.service";
import { MonthlyComputeService } from "../services/attendance/monthlyCompute.service";
import { AuditLogService } from "../services/attendance/auditLog.service";
import { PunchesService } from "../services/attendance/punches.service";
import { DailyMaterializer } from "../services/attendance/dailyMaterializer";
import { loadLeaveDayExclusions } from "../services/attendance/leaveDayExclusions";
import { accountLeaveDays } from "../services/attendance/leaveAccounting";
import { getDb, getAllUsers } from "../db";
import { attendanceSyncRoutes } from "./attendance-sync";
import { attendanceShiftsRoutes } from "./attendance-shifts";
import { attendanceLeavesRoutes } from "./attendance-leaves";
import { attendanceReportsRoutes } from "./attendance-reports";
import { fmtDate } from "./_attendance/schedule-helpers";
import {
  getEntryPermissionRequestsEnabled,
  setEntryPermissionRequestsEnabled,
} from "../services/attendance/permissionSettings.service";
import {
  pushAppNotification,
  getAppNotificationSettings,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import {
  attendanceSyncRuns,
  attendancePunches,
  attendanceDaily,
  attendanceOvertimeDays,
  attendanceEmployees,
  attendanceLeaves,
  attendanceShifts,
  attendanceShiftAssignments,
  attendanceShiftCycles,
  attendanceShiftCycleSlots,
  attendanceShiftCycleAssignments,
  attendanceHolidays,
  salaryHolidays,
  attendanceLeaveBalances,
  attendancePermissions,
  employeeAttendanceMapping,
  attendanceShiftChangeRequests,
} from "../../drizzle/schema";
import { isNull } from "drizzle-orm";
import {
  desc,
  eq,
  and,
  or,
  inArray,
  gte,
  lte,
  lt,
  max,
  count,
  sql,
} from "drizzle-orm";
import { getAttendanceDepartmentValues } from "../services/attendance/departmentFilter";

async function loadOvertimeHolidayDates(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> {
  const [attendanceDates, salaryDates] = await Promise.all([
    db.select({ date: attendanceHolidays.date }).from(attendanceHolidays).where(
      and(gte(attendanceHolidays.date, fromDate as any), lte(attendanceHolidays.date, toDate as any)),
    ),
    db.select({ date: salaryHolidays.date }).from(salaryHolidays).where(
      and(gte(salaryHolidays.date, fromDate as any), lte(salaryHolidays.date, toDate as any)),
    ),
  ]);
  return new Set([...attendanceDates, ...salaryDates].map((row) => fmtDate(row.date as any)));
}

// A real calendar date (the regex alone accepts 2026-13-45).
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(`${value}T12:00:00`);
    return (
      !Number.isNaN(d.getTime()) &&
      fmtDate(d as any) === value
    );
  }, "تاريخ غير صالح");

function dayDiff(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00`).getTime() -
      new Date(`${from}T12:00:00`).getTime()) /
      86_400_000,
  );
}

const MAX_SELF_LEAVE_DAYS = 60;
const MAX_PERMISSION_BACKDATE_DAYS = 31;
const MAX_PERMISSION_AHEAD_DAYS = 60;

export const attendanceRouter = router({
  ...attendanceSyncRoutes,
  ...attendanceShiftsRoutes,
  ...attendanceLeavesRoutes,
  ...attendanceReportsRoutes,
  dashboardSummary: makeAttProcedure("/attendance").query(async () => {
    return DashboardService.getSummary();
  }),
  offTodayList: makeAttProcedure("/attendance").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const rows = await db
      .select({
        empCd: attendanceLeaves.empCd,
        fullName: attendanceEmployees.fullName,
        department: attendanceEmployees.department,
        type: attendanceLeaves.type,
        approved: attendanceLeaves.approved,
      })
      .from(attendanceLeaves)
      .leftJoin(
        attendanceEmployees,
        eq(attendanceLeaves.empCd, attendanceEmployees.empCd),
      )
      .where(
        sql`${attendanceLeaves.dateFrom} <= ${todayStr} AND ${attendanceLeaves.dateTo} >= ${todayStr}`,
      )
      .orderBy(attendanceEmployees.fullName);
    return rows.map((r: any) => ({
      empCd: r.empCd,
      fullName: String(r.fullName ?? r.empCd),
      department: r.department ?? null,
      type: r.type,
      approved: r.approved,
    }));
  }),
  syncStatus: makeAttProcedure(["/attendance", "/attendance/settings", "/attendance/admin/sync"])
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const runs = await db
        .select()
        .from(attendanceSyncRuns)
        .orderBy(desc(attendanceSyncRuns.startedAt))
        .limit(input.limit);

      const current = runs.find((r: any) => r.status === "running");

      return {
        runs: runs.map((r: any) => ({
          id: r.id,
          startedAt: r.startedAt.toISOString(),
          finishedAt: r.finishedAt?.toISOString() ?? null,
          source: r.source,
          trigger: r.trigger,
          triggeredBy: r.triggeredBy,
          status: r.status,
          rowsSeen: r.rowsSeen,
          rowsInserted: r.rowsInserted,
          rowsSkipped: r.rowsSkipped,
          rowsQuarantined: r.rowsQuarantined,
          highWaterMark: r.highWaterMark?.toISOString() ?? null,
          error: r.error,
        })),
        current: current
          ? {
              id: current.id,
              startedAt: current.startedAt.toISOString(),
              finishedAt: current.finishedAt?.toISOString() ?? null,
              source: current.source,
              trigger: current.trigger,
              triggeredBy: current.triggeredBy,
              status: current.status,
              rowsSeen: current.rowsSeen,
              rowsInserted: current.rowsInserted,
              rowsSkipped: current.rowsSkipped,
              rowsQuarantined: current.rowsQuarantined,
              highWaterMark: current.highWaterMark?.toISOString() ?? null,
              error: current.error,
            }
          : null,
      };
    }),
  employeesList: makeAttProcedure(["/attendance/employees", "/attendance/reports"])
    .input(z.object({ includeFormer: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employees = await db
        .select()
        .from(attendanceEmployees)
        .where(
          input?.includeFormer
            ? undefined
            : eq(attendanceEmployees.active, true),
        )
        .orderBy(attendanceEmployees.empCd);

      return {
        employees: employees.map((e: any) => ({
          empCd: e.empCd,
          fullName: e.fullName,
          department: e.department,
          salaryType: e.salaryType,
          jobTitle: e.jobTitle,
          active: e.active,
          terminationDate: e.terminationDate,
        })),
        total: employees.length,
      };
    }),
  rawPunches: makeAttProcedure(["/attendance", "/attendance/employees", "/attendance/reports", "/attendance/live"])
    .input(
      z.object({
        empCd: z.string().optional(),
        fromDate: z.string().optional(), // YYYY-MM-DD
        toDate: z.string().optional(), // YYYY-MM-DD
        department: z.string().optional(),
        source: z.enum(["access", "tcp", "manual"]).optional(),
        limit: z.number().int().min(1).max(1000).default(500),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [];

      if (input.empCd) {
        conditions.push(eq(attendancePunches.empCd, input.empCd));
      }

      if (input.source) {
        conditions.push(eq(attendancePunches.source, input.source));
      }

      if (input.fromDate) {
        const from = new Date(`${input.fromDate}T00:00:00`);
        conditions.push(gte(attendancePunches.punchAt, from));
      }

      if (input.toDate) {
        const toExclusive = new Date(`${input.toDate}T00:00:00`);
        toExclusive.setDate(toExclusive.getDate() + 1);
        conditions.push(lt(attendancePunches.punchAt, toExclusive));
      }

      if (input.department) {
        conditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const needsJoin = !!input.department;

      const punches = needsJoin
        ? await db
            .select({
              id: attendancePunches.id,
              empCd: attendancePunches.empCd,
              punchAt: attendancePunches.punchAt,
              direction: attendancePunches.direction,
              deviceId: attendancePunches.deviceId,
              sourceHash: attendancePunches.sourceHash,
              source: attendancePunches.source,
              note: attendancePunches.note,
            })
            .from(attendancePunches)
            .leftJoin(
              attendanceEmployees,
              eq(attendancePunches.empCd, attendanceEmployees.empCd),
            )
            .where(where)
            .orderBy(desc(attendancePunches.punchAt))
            .limit(input.limit)
            .offset(input.offset)
        : await db
            .select()
            .from(attendancePunches)
            .where(where)
            .orderBy(desc(attendancePunches.punchAt))
            .limit(input.limit)
            .offset(input.offset);

      const totalRows = needsJoin
        ? await db
            .select({ count: count() })
            .from(attendancePunches)
            .leftJoin(
              attendanceEmployees,
              eq(attendancePunches.empCd, attendanceEmployees.empCd),
            )
            .where(where)
        : await db
            .select({ count: count() })
            .from(attendancePunches)
            .where(where);

      return {
        punches: punches.map((p: any) => ({
          id: p.id,
          empCd: p.empCd,
          punchAt: p.punchAt.toISOString(),
          direction: p.direction,
          deviceId: p.deviceId,
          sourceHash: p.sourceHash,
          source: p.source,
          note: p.note,
        })),
        total: Number(totalRows[0]?.count ?? 0),
      };
    }),
  addManualPunch: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
        direction: z.enum(["in", "out", "unknown"]).default("unknown"),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const punchAt = new Date(`${input.date}T${input.time}:00`);
      if (Number.isNaN(punchAt.getTime()))
        throw new Error("تاريخ/وقت غير صالح");

      const insertId = await withMaterializerTransaction(
        await getDbConnection(),
        db,
        async (tx: any) => {
          const emp = await tx
            .select({ empCd: attendanceEmployees.empCd })
            .from(attendanceEmployees)
            .where(eq(attendanceEmployees.empCd, input.empCd))
            .limit(1);
          if (!emp[0]) throw new Error("الموظف غير موجود");

          const duplicate = await tx
            .select({ id: attendancePunches.id })
            .from(attendancePunches)
            .where(
              and(
                eq(attendancePunches.empCd, input.empCd),
                eq(attendancePunches.punchAt, punchAt),
                eq(attendancePunches.source, "manual"),
              ),
            )
            .limit(1);
          if (duplicate[0])
            throw new Error("توجد بصمة يدوية مسجلة في نفس الوقت");

          const id = await PunchesService.insertManualAdjustment(
            {
              empCd: input.empCd,
              punchAt,
              direction: input.direction,
              sourceRowId: `manual_${input.empCd}_${punchAt.getTime()}`,
            },
            ctx.user.id,
            input.note || "",
            tx,
          );

          await DailyMaterializer.recomputeRange(
            punchAt,
            punchAt,
            { empCd: input.empCd },
            tx,
          );
          return id;
        },
      );

      const [year, month] = input.date.split("-").map(Number);
      await MonthlyComputeService.saveEmployeeMonth(input.empCd, year, month);

      await AuditLogService.log({
        action: "manual_punch_added",
        empCd: input.empCd,
        details: {
          punchAt: punchAt.toISOString(),
          direction: input.direction,
          note: input.note,
        },
        userId: ctx.user.id,
        status: "success",
      });

      return { success: true, id: insertId };
    }),
  deleteManualPunch: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const deleted = await withMaterializerTransaction(
        await getDbConnection(),
        db,
        async (tx: any) => {
          const row = await tx
            .select()
            .from(attendancePunches)
            .where(eq(attendancePunches.id, input.id))
            .limit(1);
          if (!row[0]) throw new Error("البصمة غير موجودة");
          if (row[0].source !== "manual") {
            throw new Error("لا يمكن حذف بصمات الأجهزة، فقط البصمات اليدوية");
          }

          const punchAt = new Date(row[0].punchAt);
          await tx
            .delete(attendancePunches)
            .where(eq(attendancePunches.id, input.id));
          await DailyMaterializer.recomputeRange(
            punchAt,
            punchAt,
            { empCd: row[0].empCd },
            tx,
          );
          return { punchAt, empCd: row[0].empCd };
        },
      );

      const deletedDate = fmtDate(deleted.punchAt);
      const [year, month] = deletedDate.split("-").map(Number);
      await MonthlyComputeService.saveEmployeeMonth(deleted.empCd, year, month);

      await AuditLogService.log({
        action: "manual_punch_deleted",
        empCd: deleted.empCd,
        details: { punchAt: deleted.punchAt.toISOString(), id: input.id },
        userId: ctx.user.id,
        status: "success",
      });

      return { success: true };
    }),
  listDepartments: makeAttProcedure(["/attendance", "/attendance/reports", "/attendance/employees"]).query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db
      .selectDistinct({ department: attendanceEmployees.department })
      .from(attendanceEmployees)
      .where(
        sql`${attendanceEmployees.department} IS NOT NULL AND ${attendanceEmployees.department} != ''`,
      )
      .orderBy(attendanceEmployees.department);
    return rows.map((r: any) => r.department as string);
  }),

  dailyByDate: makeAttProcedure(["/attendance", "/attendance/reports"])
    .input(
      z
        .object({
          date: z.string().optional(), // YYYY-MM-DD
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          department: z.string().optional(),
        })
        .refine(
          (value) => Boolean(value.date || (value.fromDate && value.toDate)),
          {
            message: "date or fromDate/toDate is required",
          },
        )
        .refine(
          (value) => {
            if (value.date || !value.fromDate || !value.toDate) return true;
            const from = Date.parse(`${value.fromDate}T00:00:00Z`);
            const to = Date.parse(`${value.toDate}T00:00:00Z`);
            return (
              Number.isFinite(from) &&
              Number.isFinite(to) &&
              to >= from &&
              (to - from) / 86_400_000 < 366
            );
          },
          { message: "الفترة لازم تكون صحيحة ولا تتجاوز 366 يومًا" },
        ),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = input.date
        ? [eq(attendanceDaily.workDate, input.date as any)]
        : [
            gte(attendanceDaily.workDate, input.fromDate as any),
            lte(attendanceDaily.workDate, input.toDate as any),
          ];
      if (input.department) {
        conditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }

      const daily = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          workDate: attendanceDaily.workDate,
          shiftId: attendanceDaily.shiftId,
          firstIn: attendanceDaily.firstIn,
          lastOut: attendanceDaily.lastOut,
          workedMinutes: attendanceDaily.workedMinutes,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeInMinutes: attendanceDaily.overtimeInMinutes,
          overtimeOutMinutes: attendanceDaily.overtimeOutMinutes,
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          overtimeInEnabled: attendanceOvertimeDays.inEnabled,
          overtimeOutEnabled: attendanceOvertimeDays.outEnabled,
          extraDayEnabled: attendanceOvertimeDays.extraDayEnabled,
          status: attendanceDaily.status,
          insideNow: attendanceDaily.insideNow,
          computedAt: attendanceDaily.computedAt,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .leftJoin(
          attendanceOvertimeDays,
          and(
            eq(attendanceDaily.empCd, attendanceOvertimeDays.empCd),
            eq(attendanceDaily.workDate, attendanceOvertimeDays.workDate),
          ),
        )
        .where(and(...conditions))
        .orderBy(
          attendanceDaily.workDate,
          attendanceDaily.empCd,
          attendanceDaily.shiftId,
        );

      const permissionConditions: any[] = [
        input.date
          ? eq(attendancePermissions.date, input.date as any)
          : gte(attendancePermissions.date, input.fromDate as any),
        ...(input.date
          ? []
          : [lte(attendancePermissions.date, input.toDate as any)]),
        eq(attendancePermissions.approved, true),
      ];
      if (input.department) {
        permissionConditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }
      const permissions = await db
        .select({
          empCd: attendancePermissions.empCd,
          date: attendancePermissions.date,
          type: attendancePermissions.type,
          durationMinutes: attendancePermissions.durationMinutes,
        })
        .from(attendancePermissions)
        .leftJoin(
          attendanceEmployees,
          eq(attendancePermissions.empCd, attendanceEmployees.empCd),
        )
        .where(and(...permissionConditions));

      const permissionByEmployee = new Map<
        string,
        { entryMinutes: number; exitMinutes: number }
      >();
      for (const permission of permissions) {
        const permissionDate = permission.date as Date | string;
        const permissionDateKey =
          typeof permissionDate === "string"
            ? permissionDate.slice(0, 10)
            : `${permissionDate.getFullYear()}-${String(permissionDate.getMonth() + 1).padStart(2, "0")}-${String(permissionDate.getDate()).padStart(2, "0")}`;
        const key = input.date
          ? permission.empCd
          : `${permission.empCd}|${permissionDateKey}`;
        const totals = permissionByEmployee.get(key) ?? {
          entryMinutes: 0,
          exitMinutes: 0,
        };
        const minutes = Number(permission.durationMinutes ?? 0);
        if (permission.type === "in") totals.entryMinutes += minutes;
        if (permission.type === "out") totals.exitMinutes += minutes;
        permissionByEmployee.set(key, totals);
      }

      const overtimeHolidayDates = await loadOvertimeHolidayDates(
        db,
        (input.date ?? input.fromDate)!,
        (input.date ?? input.toDate)!,
      );
      return daily.map((d: any) => {
        const workDate =
          typeof d.workDate === "string"
            ? d.workDate.slice(0, 10)
            : `${d.workDate.getFullYear()}-${String(d.workDate.getMonth() + 1).padStart(2, "0")}-${String(d.workDate.getDate()).padStart(2, "0")}`;
        const permission = permissionByEmployee.get(
          input.date ? d.empCd : `${d.empCd}|${workDate}`,
        ) ?? {
          entryMinutes: 0,
          exitMinutes: 0,
        };
        return {
          empCd: d.empCd,
          empName: d.empName ?? null,
          workDate,
          shiftId: d.shiftId,
          firstIn: d.firstIn?.toISOString() ?? null,
          lastOut: d.lastOut?.toISOString() ?? null,
          workedMinutes: d.workedMinutes,
          lateMinutes: d.lateMinutes,
          earlyLeaveMin: d.earlyLeaveMin,
          overtimeInMinutes: d.overtimeInMinutes,
          overtimeOutMinutes: d.overtimeOutMinutes,
          overtimeMinutes: d.overtimeMinutes,
          overtimeInEnabled:
            d.overtimeInEnabled == null ? false : Boolean(d.overtimeInEnabled),
          overtimeOutEnabled:
            d.overtimeOutEnabled == null
              ? false
              : Boolean(d.overtimeOutEnabled),
          extraDayEnabled:
            d.extraDayEnabled == null ? overtimeHolidayDates.has(workDate) : Boolean(d.extraDayEnabled),
          status: d.status,
          insideNow: d.insideNow,
          computedAt: d.computedAt.toISOString(),
          entryPermissionMinutes: permission.entryMinutes,
          exitPermissionMinutes: permission.exitMinutes,
        };
      });
    }),
  setDailyOvertimeEnabled: makeAttWriteProcedure(["/attendance", "/attendance/reports"])
    .input(
      z.object({
        empCd: z.string().min(1),
        workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["in", "out", "day"]),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const overtimeHolidayDates = await loadOvertimeHolidayDates(db, input.workDate, input.workDate);
      const values = {
        empCd: input.empCd,
        workDate: input.workDate as any,
        inEnabled: input.type === "in" ? input.enabled : false,
        outEnabled: input.type === "out" ? input.enabled : false,
        // Preserve payroll's default: holidays enabled, weekly rest opt-in.
        extraDayEnabled: input.type === "day" ? input.enabled : overtimeHolidayDates.has(input.workDate),
      };
      if (input.type === "in") {
        await db
          .insert(attendanceOvertimeDays)
          .values(values)
          .onDuplicateKeyUpdate({
            set: { inEnabled: input.enabled, updatedAt: new Date() },
          });
      } else if (input.type === "out") {
        await db
          .insert(attendanceOvertimeDays)
          .values(values)
          .onDuplicateKeyUpdate({
            set: { outEnabled: input.enabled, updatedAt: new Date() },
          });
      } else {
        await db
          .insert(attendanceOvertimeDays)
          .values(values)
          .onDuplicateKeyUpdate({
            set: { extraDayEnabled: input.enabled, updatedAt: new Date() },
          });
      }

      return { success: true, type: input.type, enabled: input.enabled };
    }),

  dailyByEmployee: makeAttProcedure("/attendance/employees")
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const daily = await db
        .select()
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, input.empCd),
            gte(attendanceDaily.workDate, input.fromDate as any),
            lte(attendanceDaily.workDate, input.toDate as any),
          ),
        )
        .orderBy(attendanceDaily.workDate);

      return daily.map((d: any) => ({
        empCd: d.empCd,
        workDate:
          typeof d.workDate === "string"
            ? d.workDate.slice(0, 10)
            : `${d.workDate.getFullYear()}-${String(d.workDate.getMonth() + 1).padStart(2, "0")}-${String(d.workDate.getDate()).padStart(2, "0")}`,
        shiftId: d.shiftId,
        firstIn: d.firstIn?.toISOString() ?? null,
        lastOut: d.lastOut?.toISOString() ?? null,
        workedMinutes: d.workedMinutes,
        lateMinutes: d.lateMinutes,
        earlyLeaveMin: d.earlyLeaveMin,
        overtimeMinutes: d.overtimeMinutes,
        status: d.status,
        insideNow: d.insideNow,
        computedAt: d.computedAt.toISOString(),
      }));
    }),
  auditLogs: makeAttProcedure(["/attendance", "/attendance/settings"])
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return AuditLogService.getRecentLogs(input.limit);
    }),
  auditStats: makeAttProcedure(["/attendance", "/attendance/settings"]).query(async () => {
    return AuditLogService.getStats();
  }),
  systemHealth: makeAttProcedure(["/attendance", "/attendance/settings"]).query(async () => {
    const db = await getDb();
    const stats = await AuditLogService.getStats();
    const [{ value: totalEmployees } = { value: 0 }] = db
      ? await db
          .select({ value: count() })
          .from(attendanceEmployees)
          .where(eq(attendanceEmployees.active, true))
      : [];

    // Sync health comes from persisted sync runs; the audit log is in-memory
    // and nothing writes sync_run entries to it.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [runStats] = db
      ? await db
          .select({
            runs: count(),
            errors: sql<number>`COALESCE(SUM(${attendanceSyncRuns.status} = 'failed'), 0)`,
            inserted: sql<number>`COALESCE(SUM(${attendanceSyncRuns.rowsInserted}), 0)`,
            lastRun: max(attendanceSyncRuns.finishedAt),
          })
          .from(attendanceSyncRuns)
          .where(gte(attendanceSyncRuns.startedAt, since))
      : [];
    const [lastRunRow] = db
      ? await db
          .select({ finishedAt: max(attendanceSyncRuns.finishedAt) })
          .from(attendanceSyncRuns)
      : [];
    return {
      database: db ? "healthy" : "disconnected",
      auditLog: "operational",
      lastSyncTime: lastRunRow?.finishedAt ?? stats.lastSyncRun,
      syncRunsLast24h: Number(runStats?.runs ?? 0),
      errorsLast24h: Number(runStats?.errors ?? 0) + stats.errorsLast24h,
      totalEmployees: Number(totalEmployees ?? 0),
      totalRecordsProcessed: Number(runStats?.inserted ?? 0),
    };
  }),
  getEntryPermissionRequestsEnabled: protectedProcedure.query(async () => ({
    enabled: await getEntryPermissionRequestsEnabled(),
  })),
  setEntryPermissionRequestsEnabled: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await setEntryPermissionRequestsEnabled(input.enabled);
      return { success: true, enabled: input.enabled };
    }),
  myAttendanceProfile: makePageProcedure("/attendance/my").query(
    async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Resolve empCd from logged-in user
      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);

      if (!mapping[0]) return { linked: false };

      const empCd = mapping[0].machineUserId;
      const year = new Date().getFullYear();
      const now = new Date();
      const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const monthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const yearStartStr = `${year}-01-01`;
      const yearEndStr = `${year}-12-31`;

      // Annual leave balance
      const annualLeaves = await db
        .select()
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, empCd),
            eq(attendanceLeaves.type, "annual"),
            eq(attendanceLeaves.approved, true),
            sql`${attendanceLeaves.dateFrom} <= ${yearEndStr}`,
            sql`${attendanceLeaves.dateTo} >= ${yearStartStr}`,
          ),
        );
      // Holidays and weekly rest days inside a leave are not leave days.
      const isRestOrHoliday = await loadLeaveDayExclusions(db, [empCd], year);
      const skipDay = (key: string) => isRestOrHoliday(empCd, key);
      const usedAnnual = accountLeaveDays(
        annualLeaves as any[],
        0,
        year,
        skipDay,
      ).balanceDays;

      // Sick leaves this year (approved only)
      const sickLeaves = await db
        .select()
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, empCd),
            eq(attendanceLeaves.type, "sick"),
            eq(attendanceLeaves.approved, true),
            sql`${attendanceLeaves.dateFrom} <= ${yearEndStr}`,
            sql`${attendanceLeaves.dateTo} >= ${yearStartStr}`,
          ),
        );
      const usedSick = accountLeaveDays(
        sickLeaves as any[],
        0,
        year,
        skipDay,
      ).balanceDays;
      const otherLeaves = await db
        .select()
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, empCd),
            eq(attendanceLeaves.type, "other"),
            eq(attendanceLeaves.approved, true),
            sql`${attendanceLeaves.dateFrom} <= ${yearEndStr}`,
            sql`${attendanceLeaves.dateTo} >= ${yearStartStr}`,
          ),
        );

      // Leave balance config (allocation)
      const balRow = await db
        .select()
        .from(attendanceLeaveBalances)
        .where(
          and(
            eq(attendanceLeaveBalances.empCd, empCd),
            eq(attendanceLeaveBalances.year, year),
          ),
        )
        .limit(1);
      const annualAllocation = balRow[0]?.annualAllocation ?? 21;
      const carryOver = balRow[0]?.carryOver ?? 0;
      const leaveUsage = accountLeaveDays(
        [...annualLeaves, ...sickLeaves, ...otherLeaves] as any[],
        annualAllocation + carryOver,
        year,
        skipDay,
      );
      const usedOther = Math.max(
        0,
        leaveUsage.balanceDays - usedAnnual - usedSick,
      );

      // Current month daily stats
      const monthlyDaily = await db
        .select({
          lateMins: sql<number>`COALESCE(SUM(${attendanceDaily.lateMinutes}),0)`,
          earlyMins: sql<number>`COALESCE(SUM(${attendanceDaily.earlyLeaveMin}),0)`,
        })
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, empCd),
            sql`${attendanceDaily.workDate} >= ${monthStartStr}`,
            sql`${attendanceDaily.workDate} <= ${monthEndStr}`,
          ),
        );

      // Current month permissions
      const monthPerms = await db
        .select()
        .from(attendancePermissions)
        .where(
          and(
            eq(attendancePermissions.empCd, empCd),
            eq(attendancePermissions.approved, true),
            sql`${attendancePermissions.date} >= ${monthStartStr}`,
            sql`${attendancePermissions.date} <= ${monthEndStr}`,
          ),
        );
      const permInMins = monthPerms
        .filter((p: any) => p.type === "in")
        .reduce((s: any, p: any) => s + p.durationMinutes, 0);
      const permOutMins = monthPerms
        .filter((p: any) => p.type === "out")
        .reduce((s: any, p: any) => s + p.durationMinutes, 0);

      // Pending leaves (approved: false)
      const pendingLeaves = await db
        .select()
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, empCd),
            eq(attendanceLeaves.approved, false),
          ),
        )
        .orderBy(desc(attendanceLeaves.createdAt));

      // Pending permissions (approved: false)
      const pendingPerms = await db
        .select()
        .from(attendancePermissions)
        .where(
          and(
            eq(attendancePermissions.empCd, empCd),
            eq(attendancePermissions.approved, false),
          ),
        )
        .orderBy(desc(attendancePermissions.createdAt));

      const pendingShiftChanges = await db
        .select()
        .from(attendanceShiftChangeRequests)
        .where(
          and(
            eq(attendanceShiftChangeRequests.empCd, empCd),
            eq(attendanceShiftChangeRequests.status, "pending"),
          ),
        )
        .orderBy(desc(attendanceShiftChangeRequests.createdAt));

      return {
        linked: true,
        empCd,
        leaveBalance: {
          annualAllocation,
          usedAnnual,
          usedOther,
          remainingAnnual: Math.max(
            0,
            annualAllocation + carryOver - leaveUsage.balanceDays,
          ),
          usedSick,
        },
        monthStats: {
          lateMins: monthlyDaily[0]?.lateMins ?? 0,
          earlyMins: monthlyDaily[0]?.earlyMins ?? 0,
          permInMins,
          permOutMins,
        },
        pendingLeaves: pendingLeaves.map((l: any) => ({
          ...l,
          dateFrom: fmtDate(l.dateFrom as any),
          dateTo: fmtDate(l.dateTo as any),
          date: fmtDate((l as any).date),
        })),
        pendingPerms: pendingPerms.map((p: any) => ({
          ...p,
          date: fmtDate(p.date as any),
        })),
        pendingShiftChanges: pendingShiftChanges.map((s: any) => ({
          ...s,
          dateFrom: fmtDate(s.dateFrom as any),
          dateTo: s.dateTo ? fmtDate(s.dateTo as any) : null,
        })),
      };
    },
  ),
  // Minimal lists for the self-service shift-change form; employees do not
  // hold the schedule/employees page permissions behind listShifts etc.
  myShiftRequestOptions: makePageProcedure("/attendance/my").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [shifts, cycles, colleagues] = await Promise.all([
      db
        .select({
          id: attendanceShifts.id,
          name: attendanceShifts.name,
          startTime: attendanceShifts.startTime,
          endTime: attendanceShifts.endTime,
        })
        .from(attendanceShifts)
        .where(eq(attendanceShifts.active, true))
        .orderBy(attendanceShifts.name),
      db
        .select({
          id: attendanceShiftCycles.id,
          name: attendanceShiftCycles.name,
          period: attendanceShiftCycles.period,
        })
        .from(attendanceShiftCycles),
      db
        .select({
          empCd: attendanceEmployees.empCd,
          fullName: attendanceEmployees.fullName,
        })
        .from(attendanceEmployees)
        .where(eq(attendanceEmployees.active, true))
        .orderBy(attendanceEmployees.fullName),
    ]);
    return { shifts, cycles, colleagues };
  }),
  myRequestLeave: makePageWriteProcedure("/attendance/my")
    .input(
      z.object({
        dateFrom: calendarDate,
        dateTo: calendarDate,
        type: z.enum(["annual", "sick"]),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.dateTo < input.dateFrom) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
        });
      }
      if (dayDiff(input.dateFrom, input.dateTo) + 1 > MAX_SELF_LEAVE_DAYS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `لا يمكن طلب إجازة أطول من ${MAX_SELF_LEAVE_DAYS} يومًا`,
        });
      }
      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);
      if (!mapping[0]) throw new Error("لم يتم ربط حسابك بسجل موظف");

      const dateFrom = input.dateFrom;
      const dateTo = input.dateTo;
      const empCd = mapping[0].machineUserId;
      const noteVal = input.note || null;

      const overlaps = await db
        .select({ id: attendanceLeaves.id })
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, empCd),
            lte(attendanceLeaves.dateFrom, dateTo as any),
            gte(attendanceLeaves.dateTo, dateFrom as any),
          ),
        )
        .limit(1);
      if (overlaps.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "توجد إجازة متداخلة مع هذه الفترة",
        });
      }

      const insertResult = await db.insert(attendanceLeaves).values({
        empCd,
        dateFrom: dateFrom as any,
        dateTo: dateTo as any,
        type: input.type,
        approved: false,
        note: noteVal,
      });
      const rawLeaveId =
        (insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId;
      const leaveId = Number(rawLeaveId);
      if (!Number.isSafeInteger(leaveId) || leaveId <= 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر تحديد طلب الإجازة الذي تم تسجيله",
        });
      }

      // Read back what was actually stored
      const [stored] = await db
        .select({
          dateFrom: attendanceLeaves.dateFrom,
          dateTo: attendanceLeaves.dateTo,
        })
        .from(attendanceLeaves)
        .where(eq(attendanceLeaves.id, leaveId))
        .limit(1);
      const storedFrom = fmtDate(stored?.dateFrom ?? dateFrom);
      const storedTo = fmtDate(stored?.dateTo ?? dateTo);

      const userName = String(ctx.user.name || ctx.user.username || "");
      const ns = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );
      if (ns.attendance.enabled) {
        const fmtDayMonth = (d: string) => {
          const dt = new Date(`${d}T00:00:00`);
          const weekday = dt.toLocaleDateString("ar-EG", {
            timeZone: "Africa/Cairo",
            weekday: "long",
          });
          return `${weekday} ${dt.getDate()}/${dt.getMonth() + 1}`;
        };
        pushAppNotification({
          title: "طلب اجازه",
          message: `${userName} طلب اجازه من ${fmtDayMonth(dateFrom)} حتي ${fmtDayMonth(dateTo)}`,
          kind: "info",
          targetRoles: ns.attendance.managerId ? null : ["admin", "manager"],
          targetUserIds: ns.attendance.managerId
            ? [ns.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "leave_request",
          meta: { path: "/attendance/employees", empCd },
          channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
        }).catch(() => {});
      }

      return { success: true, dateFrom: storedFrom, dateTo: storedTo };
    }),
  myRequestPermission: makePageWriteProcedure("/attendance/my")
    .input(
      z.object({
        date: calendarDate,
        type: z.enum(["in", "out"]),
        durationMinutes: z.number().int().min(1).max(480),
        timeFrom: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.type === "in" && !(await getEntryPermissionRequestsEnabled())) {
        throw new Error("طلب إذن الدخول غير متاح حاليًا");
      }

      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);
      if (!mapping[0]) throw new Error("لم يتم ربط حسابك بسجل موظف");

      const todayKey = fmtDate(new Date() as any);
      const offset = dayDiff(todayKey, input.date);
      if (offset < -MAX_PERMISSION_BACKDATE_DAYS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `لا يمكن طلب إذن لتاريخ أقدم من ${MAX_PERMISSION_BACKDATE_DAYS} يومًا`,
        });
      }
      if (offset > MAX_PERMISSION_AHEAD_DAYS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تاريخ الإذن بعيد جدًا",
        });
      }
      const duplicate = await db
        .select({ id: attendancePermissions.id })
        .from(attendancePermissions)
        .where(
          and(
            eq(attendancePermissions.empCd, mapping[0].machineUserId),
            eq(attendancePermissions.date, input.date as any),
            eq(attendancePermissions.type, input.type),
          ),
        )
        .limit(1);
      if (duplicate.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يوجد طلب إذن من نفس النوع في هذا اليوم",
        });
      }

      await db.insert(attendancePermissions).values({
        empCd: mapping[0].machineUserId,
        date: input.date as any,
        type: input.type,
        durationMinutes: input.durationMinutes,
        approved: false,
        note: input.note ?? null,
      });

      const userName = String(ctx.user.name || ctx.user.username || "");
      const typeAr = input.type === "out" ? "خروج" : "دخول";
      const ns = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );
      if (ns.attendance.enabled) {
        const mins = input.durationMinutes;
        const durationAr =
          mins % 60 === 0
            ? mins / 60 === 1
              ? "ساعة"
              : mins / 60 === 2
                ? "ساعتين"
                : `${mins / 60} ساعات`
            : mins < 60
              ? `${mins} دقيقة`
              : `${Math.floor(mins / 60)} ساعة ${mins % 60} دقيقة`;
        const dt = new Date(`${input.date}T00:00:00`);
        const weekday = dt.toLocaleDateString("ar-EG", {
          timeZone: "Africa/Cairo",
          weekday: "long",
        });
        const dayMonth = `${dt.getDate()}/${dt.getMonth() + 1}`;
        let timeRange = "";
        if (input.timeFrom) {
          const [fh, fm] = input.timeFrom.split(":").map(Number);
          const toMins = (fh ?? 0) * 60 + (fm ?? 0) + mins;
          const th = Math.floor(toMins / 60) % 24;
          const tm = toMins % 60;
          const pad = (n: number) => String(n).padStart(2, "0");
          timeRange = ` من ${pad(fh ?? 0)}:${pad(fm ?? 0)} حتي ${pad(th)}:${pad(tm)}`;
        }
        pushAppNotification({
          title: "طلب اذن",
          message: `${userName} طلب اذن ${typeAr} لمدة ${durationAr} ${weekday} ${dayMonth}${timeRange}`,
          kind: "info",
          targetRoles: ns.attendance.managerId ? null : ["admin", "manager"],
          targetUserIds: ns.attendance.managerId
            ? [ns.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "permission_request",
          meta: {
            path: "/attendance/employees",
            empCd: mapping[0].machineUserId,
          },
          channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
        }).catch(() => {});
      }

      return { success: true };
    }),
  myRequestShiftChange: makePageWriteProcedure("/attendance/my")
    .input(
      z.object({
        requestType: z.enum(["daily", "weekly", "monthly", "swap"]),
        newShiftId: z.number().int().optional(),
        weekdayMask: z.number().int().min(1).max(127).optional(),
        cycleId: z.number().int().optional(),
        swapEmpCd: z.string().max(32).optional(),
        dateFrom: calendarDate,
        dateTo: calendarDate.optional(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);
      if (!mapping[0]) throw new Error("لم يتم ربط حسابك بسجل موظف");

      const empCd = mapping[0].machineUserId;
      const bad = (message: string) =>
        new TRPCError({ code: "BAD_REQUEST", message });
      if (input.dateTo && input.dateTo < input.dateFrom)
        throw bad("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      if (
        (input.requestType === "daily" || input.requestType === "weekly") &&
        !input.newShiftId
      )
        throw bad("يرجى تحديد الوردية المطلوبة");
      if (input.requestType === "weekly" && !input.weekdayMask)
        throw bad("يرجى تحديد يوم عمل واحد على الأقل");
      if (input.requestType === "monthly" && !input.cycleId)
        throw bad("يرجى تحديد الدورة المطلوبة");
      if (input.requestType === "swap") {
        if (!input.swapEmpCd || input.swapEmpCd === empCd)
          throw bad("يرجى تحديد زميل آخر للتبادل");
        const [colleague] = await db
          .select({ empCd: attendanceEmployees.empCd })
          .from(attendanceEmployees)
          .where(
            and(
              eq(attendanceEmployees.empCd, input.swapEmpCd),
              eq(attendanceEmployees.active, true),
            ),
          )
          .limit(1);
        if (!colleague) throw bad("الزميل غير موجود");
      }
      if (input.cycleId) {
        const [cycle] = await db
          .select({ id: attendanceShiftCycles.id })
          .from(attendanceShiftCycles)
          .where(eq(attendanceShiftCycles.id, input.cycleId))
          .limit(1);
        if (!cycle) throw bad("الدورة غير موجودة");
      }
      if (input.newShiftId) {
        const [shift] = await db
          .select({ id: attendanceShifts.id })
          .from(attendanceShifts)
          .where(
            and(
              eq(attendanceShifts.id, input.newShiftId),
              eq(attendanceShifts.active, true),
            ),
          )
          .limit(1);
        if (!shift) throw bad("الوردية غير موجودة");
      }

      await db.insert(attendanceShiftChangeRequests).values({
        empCd,
        requestType: input.requestType,
        newShiftId: input.newShiftId || null,
        weekdayMask: input.weekdayMask || null,
        cycleId: input.cycleId || null,
        swapEmpCd: input.swapEmpCd || null,
        dateFrom: input.dateFrom as any,
        dateTo: input.dateTo ? (input.dateTo as any) : null,
        status: "pending",
        note: input.note || null,
      });

      const userName = String(ctx.user.name || ctx.user.username || "");
      const typeAr =
        input.requestType === "daily"
          ? "يومي"
          : input.requestType === "weekly"
            ? "أسبوعي"
            : input.requestType === "monthly"
              ? "شهري"
              : "تبادل مع زميل";
      const ns = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );
      if (ns.attendance.enabled) {
        pushAppNotification({
          title: "طلب تغيير موعد",
          message: `${userName} طلب تغيير موعد (${typeAr}) من تاريخ ${input.dateFrom}`,
          kind: "info",
          targetRoles: ns.attendance.managerId ? null : ["admin", "manager"],
          targetUserIds: ns.attendance.managerId
            ? [ns.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "schedule_change_request",
          meta: { path: "/attendance/employees", empCd },
          channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
        }).catch(() => {});
      }

      return { success: true };
    }),
  listUserMappings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allUsers = await getAllUsers();

    const mappings = await db.select().from(employeeAttendanceMapping);
    const byUserId = new Map(mappings.map((m: any) => [m.userId, m]));

    return allUsers
      .sort((a: any, b: any) =>
        (a.name || a.username).localeCompare(b.name || b.username, "ar"),
      )
      .map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        empCd: (byUserId.get(u.id) as any)?.machineUserId ?? null,
        mappingId: (byUserId.get(u.id) as any)?.id ?? null,
      }));
  }),
  setUserMapping: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        empCd: z.string().max(50).nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!input.empCd) {
        await db
          .delete(employeeAttendanceMapping)
          .where(eq(employeeAttendanceMapping.userId, input.userId));
        return { success: true };
      }

      const [employee] = await db
        .select({ empCd: attendanceEmployees.empCd })
        .from(attendanceEmployees)
        .where(eq(attendanceEmployees.empCd, input.empCd))
        .limit(1);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "كود الموظف غير موجود في سجلات الحضور",
        });
      }

      const [existingEmployeeMapping] = await db
        .select({ userId: employeeAttendanceMapping.userId })
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.machineUserId, input.empCd))
        .limit(1);
      if (
        existingEmployeeMapping &&
        existingEmployeeMapping.userId !== input.userId
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "هذا الموظف مرتبط بالفعل بحساب مستخدم آخر",
        });
      }

      const existing = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, input.userId))
        .limit(1);

      if (existing[0]) {
        await db
          .update(employeeAttendanceMapping)
          .set({ machineUserId: input.empCd })
          .where(eq(employeeAttendanceMapping.userId, input.userId));
      } else {
        await db.insert(employeeAttendanceMapping).values({
          userId: input.userId,
          machineUserId: input.empCd,
        });
      }
      return { success: true };
    }),
});
