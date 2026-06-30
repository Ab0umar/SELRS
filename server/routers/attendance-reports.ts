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

  rangeReport: makeAttProcedure("/attendance")
    .input(z.object({ from: z.string(), to: z.string(), department: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conditions: any[] = [
        gte(attendanceDaily.workDate, input.from as any),
        lte(attendanceDaily.workDate, input.to as any),
      ];
      if (input.department) {
        conditions.push(eq(attendanceEmployees.department, input.department));
      }
      const daily = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          status: attendanceDaily.status,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          workedMinutes: attendanceDaily.workedMinutes,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(and(...conditions));

      const grouped = new Map<string, any>();
      for (const d of daily) {
        if (!grouped.has(d.empCd))
          grouped.set(d.empCd, {
            empCd: d.empCd,
            empName: d.empName,
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            leaveDays: 0,
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
        a.totalLateMins += d.lateMinutes ?? 0;
        a.totalEarlyMins += d.earlyLeaveMin ?? 0;
        a.totalOTMins += d.overtimeMinutes ?? 0;
        a.totalWorkedMins += d.workedMinutes ?? 0;
      }
      return Array.from(grouped.values()).sort((a, b) =>
        a.empCd.localeCompare(b.empCd),
      );
    })
};
