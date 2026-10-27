import { lazy } from "react";
import { Redirect, Route, useRoute } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
const AdminHubShell = lazy(() => import("../features/admin/AdminHubShell"));

export const AdminRoutes = (
  <>
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
      component={() => <Redirect to="/admin-hub/print-settings" />}
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
      component={() => <Redirect to="/archive?tab=patients" />}
    />
    <Route
      path={ROUTES.opHistory}
      component={() => <Redirect to="/archive?tab=operations" />}
    />
    <Route
      path={ROUTES.whatsappInbox}
      component={() => <Redirect to="/admin-hub/whatsapp-inbox" />}
    />

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
      component={() => <Redirect to="/admin-hub/sheets" />}
    />
    <Route
      path={ROUTES.adminSheets}
      component={() => <Redirect to="/admin-hub/sheets" />}
    />
    <Route
      path={ROUTES.adminSheetDesigner}
      component={() => <Redirect to="/admin-hub/print-settings" />}
    />
    <Route
      path={ROUTES.adminSheetCopies}
      component={() => <Redirect to="/admin-hub/sheets" />}
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
      component={() => <Redirect to={ROUTES.examCatalog} />}
    />
    <Route
      path={ROUTES.adminDataSourceAudit}
      component={() => <Redirect to="/admin-hub/audit" />}
    />
    <Route
      path={ROUTES.adminPentacamId}
      component={() => {
        const [, params] = useRoute(ROUTES.adminPentacamId);
        return (
          <Redirect to={`/admin-hub/pentacam-linking/${params?.id ?? ""}`} />
        );
      }}
    />
    <Route
      path={ROUTES.adminPentacam}
      component={() => <Redirect to="/admin-hub/pentacam-linking" />}
    />
    <Route
      path={`${ROUTES.adminHub}/*`}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminHubShell />
        </ProtectedRoute>
      )}
    />
  </>
);
