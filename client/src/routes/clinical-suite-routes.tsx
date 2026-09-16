import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";

const ClinicalSuiteShell = lazy(
  () => import("../features/clinical-suite/ClinicalSuiteShell"),
);

const PrintableMedicalReport = lazy(
  () => import("../components/reports/PrintableMedicalReport"),
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
      path={ROUTES.medicalReport}
      component={() => (
        <ProtectedRoute>
          <PrintableMedicalReport />
        </ProtectedRoute>
      )}
    />
  </>
);
