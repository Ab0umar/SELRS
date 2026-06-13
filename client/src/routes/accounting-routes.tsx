import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
const AccountingHome = lazy(() => import("../features/accounting/AccountingHome"));
const AccountingPrototypes = lazy(() => import("../features/accounting/AccountingPrototypes"));
const DailyRevenue = lazy(() => import("../features/accounting/DailyRevenue"));
const AccountingCashbook = lazy(() => import("../features/accounting/AccountingCashbook"));
const AccountingLedger = lazy(() => import("../features/accounting/AccountingLedger"));
const AccountingAdvances = lazy(() => import("../features/accounting/AccountingAdvances"));
const AccountingLoans = lazy(() => import("../features/accounting/AccountingLoans"));
const AccountingHomeFund = lazy(() => import("../features/accounting/AccountingHomeFund"));
const AccountingInstapay = lazy(() => import("../features/accounting/AccountingInstapay"));
const AccountingDrSaadany = lazy(() => import("../features/accounting/AccountingDrSaadany"));
const PrintPreview = lazy(() => import("../features/accounting/PrintPreview"));
const AccountingPatientsInquiry = lazy(() => import("../features/accounting/AccountingPatientsInquiry"));
const PatientAccount = lazy(() => import("../features/accounting/PatientAccount"));
const DoctorAccount = lazy(() => import("../features/accounting/DoctorAccount"));
const ReceiptsInquiry = lazy(() => import("../features/accounting/ReceiptsInquiry"));
const ReceiptDetail = lazy(() => import("../features/accounting/ReceiptDetail"));
const LasikRevenue = lazy(() => import("../features/accounting/LasikRevenue"));
const LasikServices = lazy(() => import("../features/accounting/LasikServices"));

export function AccountingRoutes() {
  return (
    <>
      {/* Accounting Module Routes */}
      <Route
        path={ROUTES.accounting}
        component={() => (
          <ProtectedRoute>
            <AccountingHome />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPrototypes}
        component={() => (
          <ProtectedRoute>
            <AccountingPrototypes />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDailyRevenue}
        component={() => (
          <ProtectedRoute>
            <DailyRevenue />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingServiceRevenue}
        component={() => (
          <ProtectedRoute>
            <LasikRevenue />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingReceiptDetail}
        component={() => (
          <ProtectedRoute>
            <ReceiptDetail />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingReceipts}
        component={() => (
          <ProtectedRoute>
            <ReceiptsInquiry />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingServices}
        component={() => (
          <ProtectedRoute>
            <LasikServices />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatientsInquiry}
        component={() => (
          <ProtectedRoute>
            <AccountingPatientsInquiry />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatients}
        component={() => (
          <ProtectedRoute>
            <AccountingPatientsInquiry />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatientCode}
        component={() => (
          <ProtectedRoute>
            <PatientAccount />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatient}
        component={() => (
          <ProtectedRoute>
            <PatientAccount />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatientAccount}
        component={() => (
          <ProtectedRoute>
            <PatientAccount />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDoctor}
        component={() => (
          <ProtectedRoute>
            <DoctorAccount />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDoctorAccount}
        component={() => (
          <ProtectedRoute>
            <DoctorAccount />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDoctorCode}
        component={() => (
          <ProtectedRoute>
            <DoctorAccount />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingCashbook}
        component={() => (
          <ProtectedRoute>
            <AccountingCashbook />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingLedger}
        component={() => (
          <ProtectedRoute>
            <AccountingLedger />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingAdvances}
        component={() => (
          <ProtectedRoute>
            <AccountingAdvances />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingLoans}
        component={() => (
          <ProtectedRoute>
            <AccountingLoans />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingHomeFund}
        component={() => (
          <ProtectedRoute>
            <AccountingHomeFund />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingInstapay}
        component={() => (
          <ProtectedRoute>
            <AccountingInstapay />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDrSaadany}
        component={() => (
          <ProtectedRoute>
            <AccountingDrSaadany />
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPrint}
        component={() => (
          <ProtectedRoute>
            <PrintPreview />
          </ProtectedRoute>
        )}
      />
    </>
  );
}
