import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
import AccountingShell from "../features/accounting/AccountingShell";

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

export const AccountingRoutes = (
  <>
      {/* Accounting Module Routes */}
      <Route
        path={ROUTES.accounting}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingHome />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPrototypes}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingPrototypes />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDailyRevenue}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <DailyRevenue />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingServiceRevenue}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <LasikRevenue />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingReceiptDetail}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <ReceiptDetail />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingReceipts}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <ReceiptsInquiry />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingServices}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <LasikServices />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatientsInquiry}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingPatientsInquiry />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatients}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingPatientsInquiry />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatientCode}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <PatientAccount />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatient}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <PatientAccount />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingPatientAccount}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <PatientAccount />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDoctor}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <DoctorAccount />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDoctorAccount}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <DoctorAccount />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDoctorCode}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <DoctorAccount />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingCashbook}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingCashbook />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingLedger}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingLedger />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingAdvances}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingAdvances />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingLoans}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingLoans />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingHomeFund}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingHomeFund />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingInstapay}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingInstapay />
            </AccountingShell>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.accountingDrSaadany}
        component={() => (
          <ProtectedRoute>
            <AccountingShell>
              <AccountingDrSaadany />
            </AccountingShell>
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
