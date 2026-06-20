import { z } from "zod";
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
  adminProcedure,
} from "../_core/procedures";
import { DashboardService } from "../services/attendance/dashboard.service";
import { MonthlyComputeService } from "../services/attendance/monthlyCompute.service";
import { AuditLogService } from "../services/attendance/auditLog.service";
import { getDb, getAllUsers } from "../db";
import { attendanceSyncRoutes } from "./attendance-sync";
import { attendanceShiftsRoutes } from "./attendance-shifts";
import { attendanceLeavesRoutes } from "./attendance-leaves";
import { attendanceReportsRoutes } from "./attendance-reports";
import { fmtDate } from "./_attendance/schedule-helpers";
import {
  pushAppNotification,
  getAppNotificationSettings,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import {
  attendanceSyncRuns,
  attendancePunches,
  attendanceDaily,
  attendanceEmployees,
  attendanceLeaves,
  attendanceShifts,
  attendanceShiftAssignments,
  attendanceShiftCycles,
  attendanceShiftCycleSlots,
  attendanceShiftCycleAssignments,
  attendanceHolidays,
  attendanceLeaveBalances,
  attendancePermissions,
  employeeAttendanceMapping,
  attendanceShiftChangeRequests,
} from "../../drizzle/schema";
import { isNull } from "drizzle-orm";
import { desc, eq, and, or, gte, lte, lt, max, count, sql } from "drizzle-orm";

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
  syncStatus: makeAttProcedure("/attendance")
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
  employeesList: makeAttProcedure("/attendance/employees")
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employees = await db
        .select()
        .from(attendanceEmployees)
        .orderBy(attendanceEmployees.empCd);

      return {
        employees: employees.map((e: any) => ({
          empCd: e.empCd,
          fullName: e.fullName,
          department: e.department,
          active: e.active,
        })),
        total: employees.length,
      };
    }),
  rawPunches: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string().optional(),
        fromDate: z.string().optional(), // YYYY-MM-DD
        toDate: z.string().optional(), // YYYY-MM-DD
        limit: z.number().int().min(1).max(1000).default(500),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.empCd) {
        conditions.push(eq(attendancePunches.empCd, input.empCd));
      }

      if (input.fromDate) {
        const from = new Date(input.fromDate);
        conditions.push(gte(attendancePunches.punchAt, from));
      }

      if (input.toDate) {
        const to = new Date(input.toDate);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(attendancePunches.punchAt, to));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const punches = await db
        .select()
        .from(attendancePunches)
        .where(where)
        .orderBy(desc(attendancePunches.punchAt))
        .limit(input.limit)
        .offset(input.offset);

      const total =
        conditions.length > 0
          ? await db
              .select({ count: attendancePunches.id })
              .from(attendancePunches)
              .where(where)
          : [];

      return {
        punches: punches.map((p: any) => ({
          id: p.id,
          empCd: p.empCd,
          punchAt: p.punchAt.toISOString(),
          direction: p.direction,
          deviceId: p.deviceId,
          sourceHash: p.sourceHash,
        })),
        total: total[0]?.count ?? 0,
      };
    }),
  dailyByDate: makeAttProcedure("/attendance")
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          status: attendanceDaily.status,
          insideNow: attendanceDaily.insideNow,
          computedAt: attendanceDaily.computedAt,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(eq(attendanceDaily.workDate, input.date as any))
        .orderBy(attendanceDaily.empCd);

      return daily.map((d: any) => ({
        empCd: d.empCd,
        empName: d.empName ?? null,
        workDate: d.workDate.toISOString().split("T")[0],
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

      const from = new Date(input.fromDate);
      const to = new Date(input.toDate);
      to.setHours(23, 59, 59, 999);

      const daily = await db
        .select()
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, input.empCd),
            gte(attendanceDaily.workDate, from),
            lte(attendanceDaily.workDate, to),
          ),
        )
        .orderBy(attendanceDaily.workDate);

      return daily.map((d: any) => ({
        empCd: d.empCd,
        workDate: d.workDate.toISOString().split("T")[0],
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
  auditLogs: makeAttProcedure("/attendance")
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return AuditLogService.getRecentLogs(input.limit);
    }),
  auditStats: makeAttProcedure("/attendance").query(async () => {
    return AuditLogService.getStats();
  }),
  systemHealth: makeAttProcedure("/attendance").query(async () => {
    const db = await getDb();
    const stats = AuditLogService.getStats();

    return {
      database: db ? "healthy" : "disconnected",
      auditLog: "operational",
      lastSyncTime: stats.lastSyncRun,
      syncRunsLast24h: stats.syncRunsLast24h,
      errorsLast24h: stats.errorsLast24h,
      totalEmployees: 0, // Would query from DB
      totalRecordsProcessed: stats.totalRowsInsertedLast24h,
    };
  }),
  myAttendanceProfile: protectedProcedure.query(async ({ ctx }) => {
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
          sql`${attendanceLeaves.dateFrom} >= ${yearStartStr}`,
          sql`${attendanceLeaves.dateTo} <= ${yearEndStr}`,
        ),
      );
    const usedAnnual = annualLeaves.reduce((s: any, l: any) => {
      const d1 = new Date(String(l.dateFrom));
      const d2 = new Date(String(l.dateTo));
      return s + Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
    }, 0);

    // Sick leaves this year (approved only)
    const sickLeaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.type, "sick"),
          eq(attendanceLeaves.approved, true),
          sql`${attendanceLeaves.dateFrom} >= ${yearStartStr}`,
          sql`${attendanceLeaves.dateTo} <= ${yearEndStr}`,
        ),
      );
    const usedSick = sickLeaves.reduce((s: any, l: any) => {
      const d1 = new Date(String(l.dateFrom));
      const d2 = new Date(String(l.dateTo));
      return s + Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
    }, 0);

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
        remainingAnnual: Math.max(0, annualAllocation - usedAnnual),
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
  }),
  myRequestLeave: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        type: z.enum(["annual", "sick"]),
        note: z.string().optional(),
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

      const dateFrom = input.dateFrom;
      const dateTo =
        input.dateTo < input.dateFrom ? input.dateFrom : input.dateTo;
      const empCd = mapping[0].machineUserId;
      const noteVal = input.note || null;

      // Raw SQL insert — bypasses Drizzle date column mapping entirely
      await db.execute(
        sql`INSERT INTO attendance_leaves (emp_cd, date_from, date_to, type, approved, note)
            VALUES (${empCd}, ${dateFrom}, ${dateTo}, ${input.type}, 0, ${noteVal})`,
      );

      // Read back what was actually stored
      const stored = await db.execute(
        sql`SELECT date_from, date_to FROM attendance_leaves
            WHERE emp_cd = ${empCd}
            ORDER BY id DESC LIMIT 1`,
      );
      const row = (stored as any)[0]?.[0] ?? {};
      const storedFrom = fmtDate(row.date_from ?? dateFrom);
      const storedTo = fmtDate(row.date_to ?? dateTo);

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
  myRequestPermission: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        type: z.enum(["in", "out"]),
        durationMinutes: z.number().int().min(1).max(480),
        timeFrom: z.string().optional(),
        note: z.string().optional(),
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
  myRequestShiftChange: protectedProcedure
    .input(
      z.object({
        requestType: z.enum(["daily", "weekly", "monthly", "swap"]),
        newShiftId: z.number().int().optional(),
        weekdayMask: z.number().int().optional(),
        cycleId: z.number().int().optional(),
        swapEmpCd: z.string().optional(),
        dateFrom: z.string(),
        dateTo: z.string().optional(),
        note: z.string().optional(),
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
        // Remove mapping
        await db
          .delete(employeeAttendanceMapping)
          .where(eq(employeeAttendanceMapping.userId, input.userId));
        return { success: true };
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
    })
});
