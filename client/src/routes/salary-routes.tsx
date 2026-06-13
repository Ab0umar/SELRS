import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
import SalaryLayout from "../features/salary/SalaryLayout";
const SalaryBasics = lazy(() => import("../features/salary/SalaryBasics"));
const SalaryPenalties = lazy(() => import("../features/salary/SalaryPenalties"));
const CommissionPools = lazy(() => import("../features/salary/CommissionPools"));
const PayrollReport = lazy(() => import("../features/salary/PayrollReport"));
const SalarySettings = lazy(() => import("../features/salary/SalarySettings"));
const ShiftStaff = lazy(() => import("../features/salary/ShiftStaff"));
const ShiftPayroll = lazy(() => import("../features/salary/ShiftPayroll"));
const AbsentReport = lazy(() => import("../features/salary/AbsentReport"));
const CurrentSalaryData = lazy(() => import("../features/salary/CurrentSalaryData"));

export function SalaryRoutes() {
  return (
    <>
      {/* Salary Module Routes */}
      <Route
        path={ROUTES.salary}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <SalaryBasics />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryPenalties}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <SalaryPenalties />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryPools}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <CommissionPools />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryPayroll}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <PayrollReport />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salarySettings}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <SalarySettings />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryShiftStaff}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <ShiftStaff />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryShiftPayroll}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <ShiftPayroll />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryAbsentReport}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <AbsentReport />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.salaryCurrentData}
        component={() => (
          <ProtectedRoute>
            <SalaryLayout>
              <CurrentSalaryData />
            </SalaryLayout>
          </ProtectedRoute>
        )}
      />
    </>
  );
}
