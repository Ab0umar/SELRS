import { z } from "zod";
import crypto from "crypto";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDeviceDiagnostics } from "../services/attendance/deviceDiagnostics.service";
import { FKAttendLogPuller } from "../services/attendance/fkAttendLogPuller";
import {
  FKDeviceSyncService,
  syncFromFKDevice,
} from "../services/attendance/fkDeviceSyncService";
import {
  router,
  makeAttProcedure,
  makeAttWriteProcedure,
  protectedProcedure,
  adminProcedure,
} from "../_core/procedures";
import { DashboardService } from "../services/attendance/dashboard.service";
import { MonthlyComputeService } from "../services/attendance/monthlyCompute.service";
import { LeaveManagementService } from "../services/attendance/leaveManagement.service";
import { PermissionAdjustmentService } from "../services/attendance/permissionAdjustment.service";
import { AuditLogService } from "../services/attendance/auditLog.service";
import { DeviceSettingsService } from "../services/attendance/deviceSettings.service";
import { resetSyncHistory } from "../services/attendance/syncEngine";
import {
  initializeDeviceSync,
  getDeviceSyncEngine,
} from "../services/attendance/deviceSyncEngine";
import { ZKTecoDevice } from "../services/attendance/zktecoDevice";
import { dailyMaterializer } from "../services/attendance/dailyMaterializer";
import { getDb, getAllUsers } from "../db";
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
  attendanceOvertimeDays,
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
import { desc, eq, and, or, inArray, gte, lte, lt, max, count, sql } from "drizzle-orm";
import { aggregateAttendanceDays } from "../services/attendance/dailyAggregation";
import { getAttendanceDepartmentValues } from "../services/attendance/departmentFilter";

export const attendanceReportsRoutes = {
  monthlyReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return monthly;
    }),

  lateReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.lateReport(monthly);
    }),

  absentReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.absentReport(monthly);
    }),

  otReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.otReport(monthly);
    }),

  summaryReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.summaryReport(monthly);
    }),

  monthlyPunches: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        empCd: z.string().optional(),
        department: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.toDate < input.fromDate) {
        throw new Error("تاريخ النهاية لازم يكون بعد أو يساوي تاريخ البداية");
      }
      const requestedDays =
        (Date.parse(`${input.toDate}T00:00:00Z`) -
          Date.parse(`${input.fromDate}T00:00:00Z`)) /
          86_400_000 +
        1;
      if (requestedDays > 366) {
        throw new Error("الفترة لا يمكن أن تتجاوز 366 يومًا");
      }

      const fromDate = new Date(`${input.fromDate}T00:00:00`);
      const toDateExclusive = new Date(`${input.toDate}T00:00:00`);
      toDateExclusive.setDate(toDateExclusive.getDate() + 1);
      const conditions: any[] = [
        gte(attendancePunches.punchAt, fromDate),
        lt(attendancePunches.punchAt, toDateExclusive),
      ];

      if (input.empCd) {
        conditions.push(eq(attendancePunches.empCd, input.empCd));
      }
      if (input.department) {
        conditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }

      const punches: any[] = [];
      const pageSize = 5000;
      for (let offset = 0; ; offset += pageSize) {
        const page = await db
          .select({
            id: attendancePunches.id,
            empCd: attendancePunches.empCd,
            empName: attendanceEmployees.fullName,
            department: attendanceEmployees.department,
            punchAt: attendancePunches.punchAt,
            direction: attendancePunches.direction,
          })
          .from(attendancePunches)
          .leftJoin(
            attendanceEmployees,
            eq(attendancePunches.empCd, attendanceEmployees.empCd),
          )
          .where(and(...conditions))
          .orderBy(
            attendancePunches.empCd,
            attendancePunches.punchAt,
            attendancePunches.id,
          )
          .limit(pageSize)
          .offset(offset);
        punches.push(...page);
        if (page.length < pageSize) break;
      }

      type DayPunches = { in: string[]; out: string[]; other: string[] };
      type EmployeePunches = {
        empCd: string;
        empName: string;
        department: string | null;
        section: "center" | "clinic";
        days: Record<string, DayPunches>;
        totalPunches: number;
      };

      const grouped = new Map<string, EmployeePunches>();
      for (const punch of punches) {
        const punchAt = new Date(punch.punchAt);
        const dateKey = `${punchAt.getFullYear()}-${String(punchAt.getMonth() + 1).padStart(2, "0")}-${String(punchAt.getDate()).padStart(2, "0")}`;
        const employee: EmployeePunches = grouped.get(punch.empCd) ?? {
          empCd: punch.empCd,
          empName: punch.empName ?? "-",
          department: punch.department ?? null,
          section:
            punch.department === "عيادة" ||
            punch.department === "العيادة" ||
            punch.department === "clinic" ||
            punch.department === "المركز والعيادة"
              ? "clinic"
              : "center",
          days: {} as Record<string, DayPunches>,
          totalPunches: 0,
        };
        const day = employee.days[dateKey] ?? { in: [], out: [], other: [] };
        const iso = punchAt.toISOString();
        if (punch.direction === "in") day.in.push(iso);
        else if (punch.direction === "out") day.out.push(iso);
        else day.other.push(iso);
        employee.days[dateKey] = day;
        employee.totalPunches += 1;
        grouped.set(punch.empCd, employee);
      }

      return {
        fromDate: input.fromDate,
        toDate: input.toDate,
        totalDays:
          Math.floor(
            (Date.parse(`${input.toDate}T00:00:00Z`) -
              Date.parse(`${input.fromDate}T00:00:00Z`)) /
              86_400_000,
          ) + 1,
        totalPunches: punches.length,
        truncated: false,
        employees: Array.from(grouped.values()).sort((a, b) =>
          a.empCd.localeCompare(b.empCd, undefined, { numeric: true }),
        ),
      };
    }),

  rangeReport: makeAttProcedure(["/attendance", "/attendance/reports"])
    .input(
      z.object({
        from: z.string(),
        to: z.string(),
        department: z.string().optional(),
        limit: z.number().int().min(1).max(50000).default(10000),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.to < input.from) {
        throw new Error("تاريخ النهاية لازم يكون بعد أو يساوي تاريخ البداية");
      }
      const requestedDays =
        (Date.parse(`${input.to}T00:00:00Z`) -
          Date.parse(`${input.from}T00:00:00Z`)) /
          86_400_000 +
        1;
      if (requestedDays > 366) {
        throw new Error("الفترة لا يمكن أن تتجاوز 366 يومًا");
      }
      const conditions: any[] = [
        gte(attendanceDaily.workDate, input.from as any),
        lte(attendanceDaily.workDate, input.to as any),
      ];
      if (input.department) {
        conditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }
      const shiftRows = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          shiftId: attendanceDaily.shiftId,
          workDate: attendanceDaily.workDate,
          status: attendanceDaily.status,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeInMinutes: attendanceDaily.overtimeInMinutes,
          overtimeOutMinutes: attendanceDaily.overtimeOutMinutes,
          overtimeInEnabled: attendanceOvertimeDays.inEnabled,
          overtimeOutEnabled: attendanceOvertimeDays.outEnabled,
          workedMinutes: attendanceDaily.workedMinutes,
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
        .orderBy(attendanceDaily.workDate, attendanceDaily.empCd, attendanceDaily.shiftId)
        .then((rows: any[]) =>
          // Overtime only counts where the day's toggle enables it (as payroll does).
          rows.map((row) => ({
            ...row,
            overtimeMinutes:
              (row.overtimeInEnabled ? Number(row.overtimeInMinutes ?? 0) : 0) +
              (row.overtimeOutEnabled ? Number(row.overtimeOutMinutes ?? 0) : 0),
          })),
        );

      const employeeNames = new Map(
        shiftRows.map((row: any) => [row.empCd, row.empName]),
      );
      const daily = aggregateAttendanceDays(shiftRows as any[]);
      const paidHolidayKeys = new Set(
        (
          await db
            .select({ date: attendanceHolidays.date, paid: attendanceHolidays.paid })
            .from(attendanceHolidays)
            .where(
              and(
                gte(attendanceHolidays.date, input.from as any),
                lte(attendanceHolidays.date, input.to as any),
              ),
            )
        )
          .filter((h: any) => h.paid)
          .map((h: any) => fmtDate(h.date as any)),
      );

      const grouped = new Map<string, any>();
      for (const d of daily) {
        // A leave row on a rest day (no scheduled shift) is not a leave day.
        if (d.status === "leave" && !d.scheduled) continue;
        // A leave that spans an official holiday counts that day as the holiday.
        if (d.status === "leave" && paidHolidayKeys.has(String(d.workDate))) {
          d.status = "holiday";
        }
        if (!grouped.has(d.empCd))
          grouped.set(d.empCd, {
            empCd: d.empCd,
            empName: employeeNames.get(d.empCd) ?? null,
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            leaveDays: 0,
            holidayDays: 0,
            totalLateMins: 0,
            totalEarlyMins: 0,
            totalOTMins: 0,
            totalWorkedMins: 0,
          });
        const a = grouped.get(d.empCd)!;
        a.totalDays++;
        if (
          d.status === "present" ||
          d.status === "partial" ||
          d.status === "missing_checkout"
        )
          a.presentDays++;
        else if (d.status === "absent") a.absentDays++;
        else if (d.status === "leave") a.leaveDays++;
        else if (d.status === "holiday") a.holidayDays++;
        a.totalLateMins += d.lateMinutes ?? 0;
        a.totalEarlyMins += d.earlyLeaveMin ?? 0;
        a.totalOTMins += d.overtimeMinutes ?? 0;
        a.totalWorkedMins += d.workedMinutes ?? 0;
      }
      return Array.from(grouped.values())
        .sort((a, b) => a.empCd.localeCompare(b.empCd))
        .slice(0, input.limit);
    }),
};
