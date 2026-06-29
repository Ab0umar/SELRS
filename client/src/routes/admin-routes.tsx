import { lazy } from "react";
import { Redirect, Route, useRoute } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
const AdminHubShell = lazy(() => import("../features/admin/AdminHubShell"));
const AdminUsers = lazy(() => import("../features/admin/AdminUsers"));
const AdminMigrations = lazy(() => import("../features/admin/AdminMigrations"));
const AdminApiTools = lazy(() => import("../features/admin/AdminApiTools"));
const AdminStatus = lazy(() => import("../features/admin/AdminStatus"));
const AdminSettings = lazy(() => import("../features/admin/AdminSettings"));
const AdminNotificationSettings = lazy(
  () => import("../features/admin/AdminNotificationSettings"),
);
const AdminPermissions = lazy(
  () => import("../features/admin/AdminPermissions"),
);
const AdminSheets = lazy(() => import("../features/admin/AdminSheets"));
const AdminSheetDesigner = lazy(
  () => import("../features/admin/AdminSheetDesigner"),
);
const AdminDoctors = lazy(() => import("../features/admin/AdminDoctors"));
const AdminPentacamFailed = lazy(
  () => import("../features/admin/AdminPentacamFailed"),
);
const AdminSheetCopies = lazy(
  () => import("../features/admin/AdminSheetCopies"),
);
const AdminFormsHub = lazy(() => import("../features/admin/AdminFormsHub"));
const AdminPatients = lazy(() => import("../features/admin/AdminPatients"));
const AdminCardVisibility = lazy(
  () => import("../features/admin/AdminCardVisibility"),
);
const AdminDataSourceAudit = lazy(
  () => import("../features/admin/AdminDataSourceAudit"),
);
const AdminServices = lazy(() => import("../features/admin/AdminServices"));
const TestsManagement = lazy(() => import("../pages/TestsManagement"));

export const AdminRoutes = (
  <>
    {/* Admin routes */}
    {/* Admin Hub - handles all /admin-hub routes internally */}
    <Route
      path={ROUTES.adminHubRoot}
      component={() => <Redirect href={ROUTES.adminHub} />}
    />
    <Route
      path={ROUTES.adminHubRestWildcard}
      component={() => {
        const [, params] = useRoute("/admin-hub/:rest*");
        return (
          <Redirect
            href={`${ROUTES.adminHub}/${(params as Record<string, string>)?.["rest*"] ?? ""}`}
          />
        );
      }}
    />
    <Route
      path={ROUTES.adminHub}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={`${ROUTES.adminHub}/:rest*`}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminHubShell />
        </ProtectedRoute>
      )}
    />

    {/* selrs.cc top-level aliases (معادلات للصفحات الإدارية) */}
    <Route
      path={ROUTES.users}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminUsers />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.doctors}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminDoctors />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.permissions}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPermissions />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.services}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminServices />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalSheets}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSheets />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetDesigner}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSheetDesigner />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.systemStatus}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminStatus />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.migrations}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminMigrations />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.apiTools}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminApiTools />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminPatients}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPatients />
        </ProtectedRoute>
      )}
    />

    {/* Legacy admin routes */}
    <Route
      path={ROUTES.adminUsers}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminUsers />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminMigrations}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminMigrations />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminApiTools}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminApiTools />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminStatus}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminStatus />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminCardVisibility}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminCardVisibility />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminSettingsPricingRules}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSettings pricingOnly />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminSettings}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSettings />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminNotificationSettings}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminNotificationSettings />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminPermissions}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPermissions />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminPatientsRoute}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPatients />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminForms}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminFormsHub />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminSheets}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSheets />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminSheetDesigner}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSheetDesigner />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminSheetCopies}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminSheetCopies />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminDoctors}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminDoctors />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminPentacamFailed}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPentacamFailed />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminServices}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminServices />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminTests}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <TestsManagement />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminDataSourceAudit}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminDataSourceAudit />
        </ProtectedRoute>
      )}
    />
  </>
);
