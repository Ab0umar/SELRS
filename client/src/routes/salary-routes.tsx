import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
import SalaryLayout from "../features/salary/SalaryLayout.redesigned";
const SalaryDashboard = lazy(
  () => import("../features/salary/SalaryDashboard.redesigned"),
);
const SalaryBasics = lazy(() => import("../features/salary/SalaryBasics"));
const SalaryPenalties = lazy(
  () => import("../features/salary/SalaryPenalties"),
);
const CommissionPools = lazy(
  () => import("../features/salary/CommissionPools"),
);
const EmployeeFunds = lazy(() => import("../features/salary/EmployeeFunds"));
const PayrollReport = lazy(() => import("../features/salary/PayrollReport"));
const SalarySettings = lazy(() => import("../features/salary/SalarySettings"));
const ShiftStaff = lazy(() => import("../features/salary/ShiftStaff"));
const ShiftPayroll = lazy(() => import("../features/salary/ShiftPayroll"));
const AbsentReport = lazy(() => import("../features/salary/AbsentReport"));
const CurrentSalaryData = lazy(
  () => import("../features/salary/CurrentSalaryData.redesigned"),
);

export const SalaryRoutes = (
  <>
    {/* Salary Module Routes */}
    <Route
      path={ROUTES.salary}
      component={() => (
        <ProtectedRoute>
          <SalaryLayout>
            <SalaryDashboard />
          </SalaryLayout>
        </ProtectedRoute>
      )}
    />
    <Route
      path="/salary/basics"
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
      path={ROUTES.salaryFunds}
      component={() => (
        <ProtectedRoute>
          <SalaryLayout>
            <EmployeeFunds />
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
