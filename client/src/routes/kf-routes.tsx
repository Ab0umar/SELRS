import { lazy } from "react";
import { Redirect, Route, useRoute } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
const KfShell = lazy(() => import("../features/kf/KfShell"));
const KfHome = lazy(() => import("../features/kf/KfHome"));
const KfPatients = lazy(() => import("../features/kf/KfPatients"));
const KfPatientForm = lazy(() => import("../features/kf/KfPatientForm"));
const KfPatientDetail = lazy(() => import("../features/kf/KfPatientDetail"));
const KfExamPage = lazy(() => import("../features/kf/KfExamPage"));
const KfVisitForm = lazy(() => import("../features/kf/KfVisitForm"));
const KfExaminationForm = lazy(() => import("../features/kf/KfExaminationForm"));
const KfOperationForm = lazy(() => import("../features/kf/KfOperationForm"));
const KfFollowupForm = lazy(() => import("../features/kf/KfFollowupForm"));
const KfOperations = lazy(() => import("../features/kf/KfOperations"));
const KfFollowups = lazy(() => import("../features/kf/KfFollowups"));
const KfBookings = lazy(() => import("../features/kf/KfBookings"));
const KfConsultantSheet = lazy(() => import("../features/kf/KfConsultantSheet"));
const KfConsultantFollowupSheet = lazy(() => import("../features/kf/KfConsultantFollowupSheet"));
const KfAccounting = lazy(() => import("../features/kf/KfAccounting"));
const KfDailyRevenue = lazy(() => import("../features/kf/KfDailyRevenue"));
const KfServiceRevenue = lazy(() => import("../features/kf/KfServiceRevenue"));
const KfReceipts = lazy(() => import("../features/kf/KfReceipts"));
const KfLedger = lazy(() => import("../features/kf/KfLedger"));
const WritePrescription = lazy(() => import("../pages/WritePrescription"));
const RequestTests = lazy(() => import("../pages/RequestTests"));

export const KfRoutes = (
  <>
      {/* KF Module Routes */}
      <Route
        path={ROUTES.kf}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfHome />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientsNew}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfPatientForm />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientEdit}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfPatientForm />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientVisitNew}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfVisitForm />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientExaminationNew}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfExaminationForm />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientOperationNew}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfOperationForm />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientFollowupNew}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfFollowupForm />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${ROUTES.kfPatientDetail}/history`}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfPatientDetail />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatientDetail}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfExamPage />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPatients}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfPatients />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfOperations}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfOperations />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfFollowups}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfFollowups />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfBookings}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfBookings />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPrescriptionId}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <WritePrescription hidePageChrome />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfPrescription}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <WritePrescription hidePageChrome />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfRequestTestsId}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <RequestTests hidePageChrome />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfRequestTests}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <RequestTests hidePageChrome />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${ROUTES.kfSheetsConsultant}/:kfPatientId`}
        component={() => (
          <ProtectedRoute>
            <KfConsultantSheet />
          </ProtectedRoute>
        )}
      />
      <Route
        path={`${ROUTES.kfSheetsConsultant}/:kfPatientId/followup`}
        component={() => (
          <ProtectedRoute>
            <KfConsultantFollowupSheet />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfSheetsRestWildcard}
        component={() => {
          const [, params] = useRoute("/KFsheets/:rest*");
          return <Redirect to={`/kf/sheets/${params?.["rest*"] ?? ""}`} />;
        }}
      />
      <Route
        path={ROUTES.kfAccounting}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfAccounting />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfAccountingDailyRevenue}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfDailyRevenue />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfAccountingServiceRevenue}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfServiceRevenue />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfAccountingReceipts}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfReceipts />
            </KfShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.kfAccountingLedger}
        component={() => (
          <ProtectedRoute>
            <KfShell>
              <KfLedger />
            </KfShell>
          </ProtectedRoute>
        )}
      />
  </>
);
