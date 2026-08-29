import { lazy } from "react";
import { Redirect, Route } from "wouter";
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
const AdminLegacyPatients = lazy(
  () => import("../features/admin/AdminLegacyPatients"),
);
const OpHistory = lazy(() => import("../features/admin/OpHistory"));
const AdminWhatsAppInbox = lazy(
  () => import("../features/admin/AdminWhatsAppInbox"),
);
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
    {/* Legacy namespace remains functional, but all generated navigation stays canonical under Admin Hub. */}
    <Route
      path={ROUTES.legacyAdminHub}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminHubShell basePath={ROUTES.legacyAdminHub} />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.legacyAdminHubRestWildcard}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminHubShell basePath={ROUTES.legacyAdminHub} />
        </ProtectedRoute>
      )}
    />

    {/* Admin Hub - handles all /admin-hub routes internally */}
    <Route
      path={ROUTES.adminHubRoot}
      component={() => <Redirect to={ROUTES.adminHub} />}
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
      component={() => <Redirect to="/admin-hub/users" />}
    />
    <Route
      path={ROUTES.doctors}
      component={() => <Redirect to="/admin-hub/doctors" />}
    />
    <Route
      path={ROUTES.permissions}
      component={() => <Redirect to="/admin-hub/permissions" />}
    />
    <Route
      path={ROUTES.services}
      component={() => <Redirect to="/admin-hub/services" />}
    />
    <Route
      path={ROUTES.medicalSheets}
      component={() => <Redirect to="/admin-hub/sheets" />}
    />
    <Route
      path={ROUTES.sheetDesigner}
      component={() => <Redirect to="/admin-hub/sheet-designer" />}
    />
    <Route
      path={ROUTES.systemStatus}
      component={() => <Redirect to="/admin-hub/status" />}
    />
    <Route
      path={ROUTES.migrations}
      component={() => <Redirect to="/admin-hub/migrations" />}
    />
    <Route
      path={ROUTES.apiTools}
      component={() => <Redirect to="/admin-hub/api" />}
    />
    <Route
      path={ROUTES.adminPatients}
      component={() => <Redirect to="/admin-hub/patients" />}
    />
    <Route
      path={ROUTES.adminLegacyPatients}
      component={() => <Redirect to="/admin-hub/legacy-patients" />}
    />
    <Route
      path={ROUTES.opHistory}
      component={() => <Redirect to="/admin-hub/op-history" />}
    />
    <Route
      path={ROUTES.whatsappInbox}
      component={() => <Redirect to="/admin-hub/whatsapp-inbox" />}
    />

    {/* Legacy admin routes */}
    <Route
      path={ROUTES.adminUsers}
      component={() => <Redirect to="/admin-hub/users" />}
    />
    <Route
      path={ROUTES.adminMigrations}
      component={() => <Redirect to="/admin-hub/migrations" />}
    />
    <Route
      path={ROUTES.adminApiTools}
      component={() => <Redirect to="/admin-hub/api" />}
    />
    <Route
      path={ROUTES.adminStatus}
      component={() => <Redirect to="/admin-hub/status" />}
    />
    <Route
      path={ROUTES.adminCardVisibility}
      component={() => <Redirect to="/admin-hub/card-visibility" />}
    />
    <Route
      path={ROUTES.adminSettingsPricingRules}
      component={() => <Redirect to="/admin-hub/settings/pricing-rules" />}
    />
    <Route
      path={ROUTES.adminSettings}
      component={() => <Redirect to="/admin-hub/settings" />}
    />
    <Route
      path={ROUTES.adminNotificationSettings}
      component={() => <Redirect to="/admin-hub/notifications" />}
    />
    <Route
      path={ROUTES.adminPermissions}
      component={() => <Redirect to="/admin-hub/permissions" />}
    />
    <Route
      path={ROUTES.adminPatientsRoute}
      component={() => <Redirect to="/admin-hub/patients" />}
    />
    <Route
      path={ROUTES.adminForms}
      component={() => <Redirect to="/admin-hub/forms" />}
    />
    <Route
      path={ROUTES.adminSheets}
      component={() => <Redirect to="/admin-hub/sheets" />}
    />
    <Route
      path={ROUTES.adminSheetDesigner}
      component={() => <Redirect to="/admin-hub/sheet-designer" />}
    />
    <Route
      path={ROUTES.adminSheetCopies}
      component={() => <Redirect to="/admin-hub/sheet-copies" />}
    />
    <Route
      path={ROUTES.adminDoctors}
      component={() => <Redirect to="/admin-hub/doctors" />}
    />
    <Route
      path={ROUTES.adminPentacamFailed}
      component={() => <Redirect to="/admin-hub/pentacam-failed" />}
    />
    <Route
      path={ROUTES.adminServices}
      component={() => <Redirect to="/admin-hub/services" />}
    />
    <Route
      path={ROUTES.adminTests}
      component={() => <Redirect to="/admin-hub/tests" />}
    />
    <Route
      path={ROUTES.adminDataSourceAudit}
      component={() => <Redirect to="/admin-hub/audit" />}
    />
  </>
);
