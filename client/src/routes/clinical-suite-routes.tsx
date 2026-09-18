import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";

const ClinicalSuiteShell = lazy(
  () => import("../features/clinical-suite/ClinicalSuiteShell"),
);

const ClinicalReportsPage = lazy(
  () => import("../pages/ClinicalReportsPage"),
);

const ClinicalDecisionSupportPage = lazy(
  () => import("../pages/ClinicalDecisionSupportPage"),
);

export const ClinicalSuiteRoutes = (
  <>
    <Route
      path={ROUTES.clinicalSuite}
      component={() => (
        <ProtectedRoute>
          <ClinicalSuiteShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.clinicalDecisionSupport}
      component={() => (
        <ProtectedRoute>
          <ClinicalDecisionSupportPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReport}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="medical-report" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReportId}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="medical-report" />
        </ProtectedRoute>
      )}
    />
  </>
);
