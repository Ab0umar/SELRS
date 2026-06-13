import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
import AttendanceLayout from "../features/attendance/AttendanceLayout";
const AttendanceHome = lazy(() => import("../features/attendance/AttendanceHome"));
const AttendanceLive = lazy(() => import("../features/attendance/LiveBoard"));
const AttendanceMyProfile = lazy(() => import("../features/attendance/MyAttendanceProfile"));
const AttendanceEmployeeDetail = lazy(() => import("../features/attendance/EmployeeDetail"));
const AttendanceEmployeesHub = lazy(() => import("../features/attendance/EmployeesHub"));
const AttendanceReportsHub = lazy(() => import("../features/attendance/ReportsHub"));
const AttendanceSettingsHub = lazy(() => import("../features/attendance/SettingsHub"));
const AttendanceDeviceSettings = lazy(() => import("../features/attendance/admin/DeviceSettings"));
const AttendanceSyncStatus = lazy(() => import("../features/attendance/admin/SyncStatus"));
const ShiftSchedule = lazy(() => import("../features/salary/ShiftSchedule"));

export function AttendanceRoutes() {
  return (
    <>
      {/* Attendance Module Routes — 5 top-level pages */}
      <Route
        path={ROUTES.attendance}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceHome />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceLive}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceLive />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceMy}
        component={() => (
          <ProtectedRoute>
            <AttendanceMyProfile />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceEmployeeDetail}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceEmployeeDetail />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceEmployees}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceEmployeesHub />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceReports}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceReportsHub />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceSettings}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceSettingsHub />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceAdminDevice}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceDeviceSettings />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceAdminSync}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <AttendanceSyncStatus />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.attendanceShiftSchedule}
        component={() => (
          <ProtectedRoute>
            <AttendanceLayout>
              <ShiftSchedule />
            </AttendanceLayout>
          </ProtectedRoute>
        )}
      />
    </>
  );
}
