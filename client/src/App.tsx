import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch, useLocation, useRoute } from "wouter";
import { getApiUrl } from "./const";
import { type RuntimeIssue } from "./components/AppShellStatus";
import MobileAppEnhancements from "./components/MobileAppEnhancements";
import WebAppEnhancements from "./components/WebAppEnhancements";
import GlobalCommandPalette from "./components/GlobalCommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { applyMobileQaState, getMobileQaEnabled, markOverflowInSheets, startMobileQaWatcher } from "@/lib/mobileQa";
import { toast } from "sonner";
import { useTextZoom } from "@/hooks/useTextZoom";
import { initFirebase, logEvent } from "@/lib/firebase";
import {
  type ApiIssue,
  type BuildInfo,
  type NativeAppInfo,
  formatNativeAppLabel,
  getInitialOnlineState,
  getOfflineCacheSummary,
  loadCachedBuildInfo,
  loadCachedNativeAppInfo,
  queryClient,
  refreshNativeAppInfo,
  saveCachedBuildInfo,
  requestAppReload,
  subscribeAppResume,
  subscribeNetworkStatus,
} from "./lib/appRuntime";
import { canUseNativeAndroidPrint, requestNativeAndroidPrint } from "./lib/nativePrint";
import { ensureNativeNotificationPermission } from "./lib/nativeNotifications";
import { useAuth } from "./hooks/useAuth"

const NotFound = lazy(() => import("./pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));
const ExaminationForm = lazy(() => import("./pages/ExaminationForm"));
const Operations = lazy(() => import("./pages/Operations"));
const MedicalReports = lazy(() => import("./pages/MedicalReports"));
const ConsultantSheet = lazy(() => import("./pages/ConsultantSheet"));
const ConsultantFollowupPage = lazy(() => import("./pages/ConsultantFollowupPage"));
const SpecialistSheet = lazy(() => import("./pages/SpecialistSheet"));
const LasikExamSheet = lazy(() => import("./pages/LasikExamSheet"));
const LasikFollowupPage = lazy(() => import("./pages/LasikFollowupPage"));
const PentacamSheet = lazy(() => import("./pages/PentacamSheet"));
const PentacamResultsDashboard = lazy(() => import("./pages/PentacamResultsDashboard"));
const RefractionsDashboard = lazy(() => import("./pages/RefractionsDashboard"));
const AutorefsDashboard = lazy(() => import("./pages/AutorefsDashboard"));
const PrescriptionsDashboard = lazy(() => import("./pages/PrescriptionsDashboard"));
const ExternalOperationSheet = lazy(() => import("./pages/ExternalOperationSheet"));
const RefractionPage = lazy(() => import("./pages/RefractionPage"));
const PatientSummary = lazy(() => import("./pages/PatientSummary"));
const MedicationsTestsManagement = lazy(() => import("./pages/MedicationsTestsManagement"));
const MedicationsCatalogPage = lazy(() => import("./pages/MedicationsCatalogPage"));
const MedicationsManagement = lazy(() => import("./pages/MedicationsManagement"));
const ExaminationsCatalogPage = lazy(() => import("./pages/ExaminationsCatalogPage"));
const TxHubPage = lazy(() => import("./pages/TxHubPage"));
const WritePrescription = lazy(() => import("./pages/WritePrescription"));
const PrescriptionsList = lazy(() => import("./pages/PrescriptionsList"));
const RequestTests = lazy(() => import("./pages/RequestTests"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminMigrations = lazy(() => import("./pages/AdminMigrations"));
const AdminApiTools = lazy(() => import("./pages/AdminApiTools"));
const AdminStatus = lazy(() => import("./pages/AdminStatus"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminNotificationSettings = lazy(() => import("./pages/AdminNotificationSettings"));
const AdminPermissions = lazy(() => import("./pages/AdminPermissions"));
const AdminSheets = lazy(() => import("./pages/AdminSheets"));
const AdminSheetDesigner = lazy(() => import("./pages/AdminSheetDesigner"));
const AdminDoctors = lazy(() => import("./pages/AdminDoctors"));
const AdminPentacamFailed = lazy(() => import("./pages/AdminPentacamFailed"));
const AdminSheetCopies = lazy(() => import("./pages/AdminSheetCopies"));
const AdminFormsHub = lazy(() => import("./pages/AdminFormsHub"));
const AdminPatients = lazy(() => import("./pages/AdminPatients"));
const AdminCardVisibility = lazy(() => import("./pages/AdminCardVisibility"));
const AdminDiagnostics = lazy(() => import("./pages/AdminDiagnostics"));
const AdminDataSourceAudit = lazy(() => import("./pages/AdminDataSourceAudit"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const Profile = lazy(() => import("./pages/Profile"));
const QuickPatientEntry = lazy(() => import("./pages/QuickPatientEntry"));
const NewCases = lazy(() => import("./pages/NewCases"));
const FollowupForm = lazy(() => import("./pages/FollowupForm"));
const DoctorPatientView = lazy(() => import("./pages/DoctorPatientView"));
const PatientHubShell = lazy(() => import("./pages/PatientHubShell"));
const ClinicsHubShell = lazy(() => import("./pages/ClinicsHubShell"));
const PatientsHubShell = lazy(() => import("./pages/PatientsHubShell"));
const ServicesHubShell = lazy(() => import("./pages/ServicesHubShell"));
const WorkflowShell = lazy(() => import("./pages/WorkflowShell"));
const AdminHubShell = lazy(() => import("./pages/AdminHubShell"));
const Followups = lazy(() => import("./pages/Followups"));
const Visits = lazy(() => import("./pages/Visits"));
const AdminServices = lazy(() => import("./pages/AdminServices"));
const TestsManagement = lazy(() => import("./pages/TestsManagement"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const Styleguide = lazy(() => import("./pages/dev/Styleguide"));
const ComponentsGallery = lazy(() => import("./pages/dev/ComponentsGallery"));
const Prototypes = lazy(() => import("./pages/dev/Prototypes"));
const Documentation = lazy(() => import("./pages/dev/Documentation"));
const TodayPatients = lazy(() => import("./pages/TodayPatients"));
const WorkflowHub = lazy(() => import("./pages/WorkflowHub"));
const StockroomShell = lazy(() => import("./pages/StockroomShell"));
// Attendance module
import AttendanceLayout from "./pages/attendance/AttendanceLayout";
const AttendanceHome = lazy(() => import("./pages/attendance/AttendanceHome"));
const AttendanceLive = lazy(() => import("./pages/attendance/LiveBoard"));
const AttendanceMyProfile = lazy(() => import("./pages/attendance/MyAttendanceProfile"));
const AttendanceEmployeeDetail = lazy(() => import("./pages/attendance/EmployeeDetail"));
const AttendanceEmployeesHub = lazy(() => import("./pages/attendance/EmployeesHub"));
const AttendanceReportsHub = lazy(() => import("./pages/attendance/ReportsHub"));
const AttendanceSettingsHub = lazy(() => import("./pages/attendance/SettingsHub"));
const AttendanceDeviceSettings = lazy(() => import("./pages/attendance/admin/DeviceSettings"));
const AttendanceSyncStatus = lazy(() => import("./pages/attendance/admin/SyncStatus"));
// Salary module
import SalaryLayout from "./pages/salary/SalaryLayout";
const SalaryBasics = lazy(() => import("./pages/salary/SalaryBasics"));
const SalaryPenalties = lazy(() => import("./pages/salary/SalaryPenalties"));
const CommissionPools = lazy(() => import("./pages/salary/CommissionPools"));
const PayrollReport = lazy(() => import("./pages/salary/PayrollReport"));
const SalarySettings = lazy(() => import("./pages/salary/SalarySettings"));
const ShiftStaff = lazy(() => import("./pages/salary/ShiftStaff"));
const ShiftSchedule = lazy(() => import("./pages/salary/ShiftSchedule"));
const AccountingHome = lazy(() => import("./pages/accounting/AccountingHome"));
const AccountingPrototypes = lazy(() => import("./pages/accounting/AccountingPrototypes"));
const AccountingCashbook = lazy(() => import("./pages/accounting/AccountingCashbook"));
const AccountingLedger  = lazy(() => import("./pages/accounting/AccountingLedger"));
const AccountingAdvances = lazy(() => import("./pages/accounting/AccountingAdvances"));
const AccountingLoans = lazy(() => import("./pages/accounting/AccountingLoans"));
const AccountingHomeFund = lazy(() => import("./pages/accounting/AccountingHomeFund"));
const AccountingInstapay = lazy(() => import("./pages/accounting/AccountingInstapay"));
const AccountingDrSaadany = lazy(() => import("./pages/accounting/AccountingDrSaadany"));
const DailyRevenue = lazy(() => import("./pages/accounting/DailyRevenue"));
const LasikRevenue = lazy(() => import("./pages/accounting/LasikRevenue"));
const ReceiptsInquiry = lazy(() => import("./pages/accounting/ReceiptsInquiry"));
const ReceiptDetail = lazy(() => import("./pages/accounting/ReceiptDetail"));
const LasikServices = lazy(() => import("./pages/accounting/LasikServices"));
const AccountingPatientsInquiry = lazy(() => import("./pages/accounting/AccountingPatientsInquiry"));
const PatientAccount = lazy(() => import("./pages/accounting/PatientAccount"));
const DoctorAccount = lazy(() => import("./pages/accounting/DoctorAccount"));
const PrintPreview = lazy(() => import("./pages/accounting/PrintPreview"));
const RUNTIME_ISSUE_STORAGE_KEY = "selrs:last-runtime-issue";
const HEALTH_POLL_MS = 60_000;
const NATIVE_HEALTH_POLL_MS = 5 * 60_000;
const NATIVE_HEALTH_FAILURE_THRESHOLD = 3;
const DESKTOP_SHELL_HEALTH_POLL_MS = 15 * 60_000;
const RECENT_KEY = (userId?: string | number | null) => `selrs:recent:${userId ?? "anon"}`;
const TRACKED_ROUTES: Array<{ pathPrefix: string; label: string }> = [
  { pathPrefix: "/dashboard", label: "لوحة التحكم" },
  { pathPrefix: "/patients", label: "المرضى" },
  { pathPrefix: "/patient-file", label: "ملف المريض" },
  { pathPrefix: "/patient-summary", label: "التقرير المجمع" },
  { pathPrefix: "/medical-reports", label: "التقارير الطبية" },
  { pathPrefix: "/examination", label: "الفحوصات" },
  { pathPrefix: "/quick-entry", label: "دخول سريع" },
  { pathPrefix: "/new-cases", label: "حالات جديدة" },
  { pathPrefix: "/followups", label: "المتابعات" },
  { pathPrefix: "/visits", label: "الزيارات" },
  { pathPrefix: "/sheets/pentacam/dashboard", label: "نتائج البنتكام" },
  { pathPrefix: "/sheets/refractions/dashboard", label: "لوحة الانكسارات" },
  { pathPrefix: "/sheets/autorefs/dashboard", label: "لوحة Autoref" },
  { pathPrefix: "/sheets/prescriptions/dashboard", label: "لوحة الروشتات" },
  { pathPrefix: "/today", label: "مرضى اليوم" },
  { pathPrefix: "/operations", label: "العمليات" },
  { pathPrefix: "/prescriptions", label: "الروشتات" },
  { pathPrefix: "/medications", label: "الأدوية" },
  { pathPrefix: "/examinations/catalog", label: "إدارة الاختبارات" },
  { pathPrefix: "/txhub", label: "TXhub" },
  { pathPrefix: "/admin", label: "الإدارة" },
];

async function fetchHealthSnapshot(signal?: AbortSignal): Promise<BuildInfo> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), 8_000);
  try {
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
      }
    }

    const response = await fetch(getApiUrl("/healthz"), {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const raw = await response.text();
    if (!raw.trim()) {
      throw new Error("Health check returned an empty response");
    }

    let data: Partial<BuildInfo> & { ok?: boolean };
    try {
      data = JSON.parse(raw) as Partial<BuildInfo> & { ok?: boolean };
    } catch {
      throw new Error("Health check returned invalid JSON");
    }

    if (!data.ok) {
      throw new Error("Health check reported an unhealthy state");
    }

    return {
      version: String(data.version ?? "unknown"),
      buildTime: String(data.buildTime ?? "unknown"),
      commit: String(data.commit ?? "unknown"),
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function LegacySurgerySheetRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const match = window.location.pathname.match(/^\/sheets\/surgery\/([^/?#]+)/i);
    const id = match?.[1];
    if (id) {
      setLocation(`/sheets/external/${id}`);
    } else {
      setLocation("/");
    }
  }, [setLocation]);
  return null;
}

/** `/prescriptions/:id` كان يُستخدم لفتح الكاتب؛ يُوجَّه الآن إلى `/prescription/:id`. */
function PrescriptionsWriterDeepLinkRedirect() {
  const [, params] = useRoute("/prescriptions/:id");
  const id = params?.id?.trim();
  if (!id) return null;
  return <Redirect to={`/prescription/${id}`} />;
}

function DashboardRouteGate() {
  const { user } = useAuth();
  const role = String(user?.role ?? "").toLowerCase();
  if (user && role !== "admin") {
    if (role === "accountant") return <Redirect to="/accounting" />;
    return <Redirect to="/today" />;
  }
  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <Dashboard />
    </ProtectedRoute>
  );
}

const Router = memo(function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Home} />
      <Route path={"/force-password-change"} component={() => <ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
      <Route path={"/profile"} component={() => <ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path={"/"} component={Home} />

      <Route path={"/dashboard"} component={DashboardRouteGate} />

      {/* Attendance Module Routes — 5 top-level pages */}
      <Route path={"/attendance"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceHome /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/live"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceLive /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/my"} component={() => <ProtectedRoute><AttendanceMyProfile /></ProtectedRoute>} />
      <Route path={"/attendance/employees/:empCd"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceEmployeeDetail /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/employees"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceEmployeesHub /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/reports"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceReportsHub /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/settings"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceSettingsHub /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/admin/device"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceDeviceSettings /></AttendanceLayout></ProtectedRoute>} />
      <Route path={"/attendance/admin/sync"} component={() => <ProtectedRoute><AttendanceLayout><AttendanceSyncStatus /></AttendanceLayout></ProtectedRoute>} />

      {/* Salary Module Routes */}
      <Route path={"/salary"} component={() => <ProtectedRoute><SalaryLayout><SalaryBasics /></SalaryLayout></ProtectedRoute>} />
      <Route path={"/salary/penalties"} component={() => <ProtectedRoute><SalaryLayout><SalaryPenalties /></SalaryLayout></ProtectedRoute>} />
      <Route path={"/salary/pools"} component={() => <ProtectedRoute><SalaryLayout><CommissionPools /></SalaryLayout></ProtectedRoute>} />
      <Route path={"/salary/payroll"} component={() => <ProtectedRoute><SalaryLayout><PayrollReport /></SalaryLayout></ProtectedRoute>} />
      <Route path={"/salary/settings"} component={() => <ProtectedRoute><SalaryLayout><SalarySettings /></SalaryLayout></ProtectedRoute>} />
      <Route path={"/salary/shift-staff"} component={() => <ProtectedRoute><SalaryLayout><ShiftStaff /></SalaryLayout></ProtectedRoute>} />
      <Route path={"/salary/shift-schedule"} component={() => <ProtectedRoute><SalaryLayout><ShiftSchedule /></SalaryLayout></ProtectedRoute>} />

      {/* Accounting Module Routes */}
      <Route path={"/accounting"} component={() => <ProtectedRoute><AccountingHome /></ProtectedRoute>} />
      <Route path={"/accounting/prototypes"} component={() => <ProtectedRoute><AccountingPrototypes /></ProtectedRoute>} />
      <Route path={"/accounting/daily-revenue"} component={() => <ProtectedRoute><DailyRevenue /></ProtectedRoute>} />
      <Route path={"/accounting/service-revenue"} component={() => <ProtectedRoute><LasikRevenue /></ProtectedRoute>} />
      <Route path={"/accounting/receipts/:secCd/:trTy/:trNo"} component={() => <ProtectedRoute><ReceiptDetail /></ProtectedRoute>} />
      <Route path={"/accounting/receipts"} component={() => <ProtectedRoute><ReceiptsInquiry /></ProtectedRoute>} />
      <Route path={"/accounting/services"} component={() => <ProtectedRoute><LasikServices /></ProtectedRoute>} />
      <Route path={"/accounting/patients-inquiry"} component={() => <ProtectedRoute><AccountingPatientsInquiry /></ProtectedRoute>} />
      <Route path={"/accounting/patients"} component={() => <ProtectedRoute><AccountingPatientsInquiry /></ProtectedRoute>} />
      <Route path={"/accounting/patient/:patientCode"} component={() => <ProtectedRoute><PatientAccount /></ProtectedRoute>} />
      <Route path={"/accounting/patient"} component={() => <ProtectedRoute><PatientAccount /></ProtectedRoute>} />
      <Route path={"/accounting/patient-account"} component={() => <ProtectedRoute><PatientAccount /></ProtectedRoute>} />
      <Route path={"/accounting/doctor"} component={() => <ProtectedRoute><DoctorAccount /></ProtectedRoute>} />
      <Route path={"/accounting/doctor-account"} component={() => <ProtectedRoute><DoctorAccount /></ProtectedRoute>} />
      <Route path={"/accounting/doctor/:doctorCode"} component={() => <ProtectedRoute><DoctorAccount /></ProtectedRoute>} />
      <Route path={"/accounting/cashbook"} component={() => <ProtectedRoute><AccountingCashbook /></ProtectedRoute>} />
      <Route path={"/accounting/ledger"}   component={() => <ProtectedRoute><AccountingLedger  /></ProtectedRoute>} />
      <Route path={"/accounting/advances"} component={() => <ProtectedRoute><AccountingAdvances /></ProtectedRoute>} />
      <Route path={"/accounting/loans"} component={() => <ProtectedRoute><AccountingLoans /></ProtectedRoute>} />
      <Route path={"/accounting/home-fund"} component={() => <ProtectedRoute><AccountingHomeFund /></ProtectedRoute>} />
      <Route path={"/accounting/instapay"} component={() => <ProtectedRoute><AccountingInstapay /></ProtectedRoute>} />
      <Route path={"/accounting/dr-saadany"} component={() => <ProtectedRoute><AccountingDrSaadany /></ProtectedRoute>} />
      <Route path={"/accounting/print"} component={() => <ProtectedRoute><PrintPreview /></ProtectedRoute>} />

      {/* Patient hub: pattern must be `/patient-hub/*?` not `/patient-hub*` — regexparam only treats `*` as a wildcard at the start of a path segment. */}
      <Route path={"/patient-hub/*?"} component={() => <ProtectedRoute><PatientHubShell /></ProtectedRoute>} />

      {/* Clinics hub */}
      <Route path={"/clinics-hub"} component={() => <ProtectedRoute><ClinicsHubShell /></ProtectedRoute>} />
      <Route path={"/clinics-hub/*"} component={() => <ProtectedRoute><ClinicsHubShell /></ProtectedRoute>} />

      {/* Patients hub */}
      <Route path={"/patients-hub"} component={() => <ProtectedRoute><PatientsHubShell /></ProtectedRoute>} />
      <Route path={"/patients-hub/*"} component={() => <ProtectedRoute><PatientsHubShell /></ProtectedRoute>} />

      {/* Services hub */}
      <Route path={"/services-hub"} component={() => <ProtectedRoute><ServicesHubShell /></ProtectedRoute>} />
      <Route path={"/services-hub/*"} component={() => <ProtectedRoute><ServicesHubShell /></ProtectedRoute>} />

      {/* Workflow routes */}
      <Route path={"/examination/:id"} component={() => <ProtectedRoute><ExaminationForm /></ProtectedRoute>} />
      <Route path={"/examination"} component={() => <ProtectedRoute><ExaminationForm /></ProtectedRoute>} />
      <Route path={"/quick-entry"} component={() => <ProtectedRoute><QuickPatientEntry /></ProtectedRoute>} />
      <Route path={"/quick-entry/:id"} component={() => <ProtectedRoute><QuickPatientEntry /></ProtectedRoute>} />
      <Route path={"/new-cases"} component={() => <ProtectedRoute><NewCases /></ProtectedRoute>} />
      <Route path={"/new-cases/:id"} component={() => <ProtectedRoute><NewCases /></ProtectedRoute>} />
      <Route path={"/followup/:id"} component={() => <ProtectedRoute><FollowupForm /></ProtectedRoute>} />
      <Route path={"/followups"} component={() => <ProtectedRoute><Followups /></ProtectedRoute>} />
      <Route path={"/visits/:id"} component={() => <ProtectedRoute><Visits /></ProtectedRoute>} />
      <Route path={"/visits"} component={() => <ProtectedRoute><Visits /></ProtectedRoute>} />
      <Route path={"/today"} component={() => <ProtectedRoute><TodayPatients /></ProtectedRoute>} />
      <Route path={"/operations"} component={() => <ProtectedRoute><Operations /></ProtectedRoute>} />
      <Route path={"/workflow-hub"} component={() => <ProtectedRoute><WorkflowHub /></ProtectedRoute>} />

      {/* Stockroom routes */}
      <Route path={"/stockroom"} component={() => <ProtectedRoute><StockroomShell /></ProtectedRoute>} />
      <Route path={"/stockroom/*"} component={() => <ProtectedRoute><StockroomShell /></ProtectedRoute>} />

      {/* Patient views */}
      <Route path={"/patients"} component={() => <ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path={"/patients/:id"} component={() => <ProtectedRoute><PatientDetails /></ProtectedRoute>} />
      <Route path={"/medicalfile/:id"} component={() => <ProtectedRoute><PatientDetails /></ProtectedRoute>} />
      <Route path={"/medicalfile"} component={() => <ProtectedRoute><PatientDetails /></ProtectedRoute>} />
      <Route path={"/patient-file/:id"} component={() => <ProtectedRoute><PatientDetails /></ProtectedRoute>} />
      <Route path={"/patient-file"} component={() => <ProtectedRoute><PatientDetails /></ProtectedRoute>} />
      <Route path={"/medical-reports/:id"} component={() => <ProtectedRoute><MedicalReports /></ProtectedRoute>} />
      <Route path={"/medical-reports"} component={() => <ProtectedRoute><MedicalReports /></ProtectedRoute>} />
      <Route path={"/patient-summary/:id"} component={() => <ProtectedRoute><PatientSummary /></ProtectedRoute>} />
      <Route path={"/patient-summary"} component={() => <ProtectedRoute><PatientSummary /></ProtectedRoute>} />
      <Route path={"/doctor/patient/:id"} component={() => <ProtectedRoute><DoctorPatientView /></ProtectedRoute>} />

      {/* Sheets and tools */}
      <Route path={"/sheets/consultant/:id"} component={() => <ProtectedRoute><ConsultantSheet /></ProtectedRoute>} />
      <Route path={"/sheets/consultant/:id/followup"} component={() => <ProtectedRoute><ConsultantFollowupPage /></ProtectedRoute>} />
      <Route path={"/sheets/specialist/:id"} component={() => <ProtectedRoute><SpecialistSheet /></ProtectedRoute>} />
      <Route path={"/sheets/external/:id"} component={() => <ProtectedRoute><ExternalOperationSheet /></ProtectedRoute>} />
      <Route path={"/sheets/lasik/:id"} component={() => <ProtectedRoute><LasikExamSheet /></ProtectedRoute>} />
      <Route path={"/sheets/lasik/:id/followup"} component={() => <ProtectedRoute><LasikFollowupPage /></ProtectedRoute>} />
      <Route
        path={"/sheets/pentacam/dashboard"}
        component={() => (
          <ProtectedRoute>
            <PentacamResultsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path={"/sheets/refractions/dashboard"}
        component={() => (
          <ProtectedRoute>
            <RefractionsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path={"/sheets/refractions"}
        component={() => (
          <ProtectedRoute>
            <RefractionsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path={"/sheets/autorefs/dashboard"}
        component={() => (
          <ProtectedRoute>
            <AutorefsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path={"/sheets/autorefs"}
        component={() => (
          <ProtectedRoute>
            <AutorefsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path={"/sheets/prescriptions/dashboard"}
        component={() => (
          <ProtectedRoute>
            <PrescriptionsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path={"/sheets/prescriptions"}
        component={() => (
          <ProtectedRoute>
            <PrescriptionsDashboard />
          </ProtectedRoute>
        )}
      />
      <Route path={"/sheets/pentacam/:id"} component={() => <ProtectedRoute><PentacamSheet /></ProtectedRoute>} />
      <Route path={"/sheets/pentacam"} component={() => <ProtectedRoute><PentacamSheet /></ProtectedRoute>} />
      <Route path={"/sheets/operation/:id"} component={() => <ProtectedRoute><ExternalOperationSheet /></ProtectedRoute>} />
      <Route path={"/refraction/:id"} component={() => <ProtectedRoute><RefractionPage /></ProtectedRoute>} />
      <Route path={"/refraction"} component={() => <ProtectedRoute><RefractionPage /></ProtectedRoute>} />
      <Route path={"/medications"} component={() => <ProtectedRoute><MedicationsCatalogPage /></ProtectedRoute>} />
      <Route path={"/medications/registry"} component={() => <ProtectedRoute><MedicationsManagement /></ProtectedRoute>} />
      <Route path={"/examinations/catalog"} component={() => <ProtectedRoute><ExaminationsCatalogPage /></ProtectedRoute>} />
      <Route path={"/txhub"} component={() => <ProtectedRoute><TxHubPage /></ProtectedRoute>} />
      <Route path={"/prescription/:id"} component={() => <ProtectedRoute><WritePrescription /></ProtectedRoute>} />
      <Route path={"/prescription"} component={() => <ProtectedRoute><WritePrescription /></ProtectedRoute>} />
      <Route path={"/prescriptions/:id"} component={() => <ProtectedRoute><PrescriptionsWriterDeepLinkRedirect /></ProtectedRoute>} />
      <Route path={"/prescriptions"} component={() => <ProtectedRoute><PrescriptionsList /></ProtectedRoute>} />
      <Route path={"/medications-tests"} component={() => <ProtectedRoute><MedicationsTestsManagement /></ProtectedRoute>} />
      <Route path={"/tests"} component={() => <ProtectedRoute><MedicationsTestsManagement /></ProtectedRoute>} />
      <Route path={"/tests-management"} component={() => <ProtectedRoute requiredRoles={["admin"]}><TestsManagement /></ProtectedRoute>} />
      <Route path={"/pentacam"} component={() => <Redirect href="/sheets/pentacam" />} />
      <Route path={"/request-tests/:id"} component={() => <ProtectedRoute><RequestTests /></ProtectedRoute>} />
      <Route path={"/request-tests"} component={() => <ProtectedRoute><RequestTests /></ProtectedRoute>} />
      <Route path={"/sheet-copies"} component={() => <ProtectedRoute><AdminSheetCopies /></ProtectedRoute>} />

      {/* Admin routes */}
      {/* Admin Hub - handles all /admin-hub routes internally */}
      <Route path={"/admin-hub"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminHubShell /></ProtectedRoute>} />
      <Route path={"/admin-hub/*"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminHubShell /></ProtectedRoute>} />

      {/* selrs.cc top-level aliases (معادلات للصفحات الإدارية) */}
      <Route path={"/users"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
      <Route path={"/doctors"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminDoctors /></ProtectedRoute>} />
      <Route path={"/permissions"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminPermissions /></ProtectedRoute>} />
      <Route path={"/services"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminServices /></ProtectedRoute>} />
      <Route path={"/medical-sheets"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheets /></ProtectedRoute>} />
      <Route path={"/sheet-designer"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheetDesigner /></ProtectedRoute>} />
      <Route path={"/system-status"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminStatus /></ProtectedRoute>} />
      <Route path={"/migrations"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminMigrations /></ProtectedRoute>} />
      <Route path={"/api-tools"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminApiTools /></ProtectedRoute>} />
      <Route path={"/admin-patients"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminPatients /></ProtectedRoute>} />

      {/* Legacy admin routes */}
      <Route path={"/admin/users"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
      <Route path={"/admin/migrations"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminMigrations /></ProtectedRoute>} />
      <Route path={"/admin/api-tools"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminApiTools /></ProtectedRoute>} />
      <Route path={"/admin/status"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminStatus /></ProtectedRoute>} />
      <Route path={"/admin/card-visibility"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminCardVisibility /></ProtectedRoute>} />
      <Route path={"/admin/settings/pricing-rules"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSettings pricingOnly /></ProtectedRoute>} />
      <Route path={"/admin/settings"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
      <Route path={"/admin/notification-settings"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminNotificationSettings /></ProtectedRoute>} />
      <Route path={"/admin/permissions"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminPermissions /></ProtectedRoute>} />
      <Route path={"/admin/patients"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminPatients /></ProtectedRoute>} />
      <Route path={"/admin/forms"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminFormsHub /></ProtectedRoute>} />
      <Route path={"/admin/sheets"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheets /></ProtectedRoute>} />
      <Route path={"/admin/sheet-designer"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheetDesigner /></ProtectedRoute>} />
      <Route path={"/admin/sheet-copies"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheetCopies /></ProtectedRoute>} />
      <Route path={"/admin/doctors"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminDoctors /></ProtectedRoute>} />
      <Route path={"/admin/pentacam-failed"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminPentacamFailed /></ProtectedRoute>} />
      <Route path={"/admin/services"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminServices /></ProtectedRoute>} />
      <Route path={"/admin/tests"} component={() => <ProtectedRoute requiredRoles={["admin"]}><TestsManagement /></ProtectedRoute>} />
      <Route path={"/admin/data-source-audit"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminDataSourceAudit /></ProtectedRoute>} />

      <Route path={"/showcase"} component={() => <ProtectedRoute requiredRoles={["admin"]}><ComponentShowcase /></ProtectedRoute>} />
      <Route path={"/styleguide"} component={() => <ProtectedRoute requiredRoles={["admin"]}><Styleguide /></ProtectedRoute>} />
      <Route
        path={"/components-gallery"}
        component={() => <ProtectedRoute requiredRoles={["admin"]}><ComponentsGallery /></ProtectedRoute>}
      />
      <Route path={"/prototypes"} component={() => <ProtectedRoute requiredRoles={["admin"]}><Prototypes /></ProtectedRoute>} />
      <Route path={"/documentation"} component={() => <ProtectedRoute requiredRoles={["admin"]}><Documentation /></ProtectedRoute>} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
});

function App() {
  const { user } = useAuth();
  const [currentPath] = useLocation();
  const textZoom = useTextZoom();
  const isNativeShell = Capacitor.isNativePlatform();
  const isDesktopShell =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("SELRSDesktop/1") || navigator.userAgent.includes("SELRS/1"));
  const [qaEnabled, setQaEnabled] = useState(false);
  const [overflowCount, setOverflowCount] = useState(0);
  const [booting, setBooting] = useState(() => !loadCachedBuildInfo() && getInitialOnlineState());
  const [isOnline, setIsOnline] = useState(() => getInitialOnlineState());
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(() => loadCachedBuildInfo());
  const [nativeAppInfo, setNativeAppInfo] = useState<NativeAppInfo | null>(() => loadCachedNativeAppInfo());
  const [updateAvailable, setUpdateAvailable] = useState<BuildInfo | null>(null);
  const [apiIssue, setApiIssue] = useState<ApiIssue | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<RuntimeIssue | null>(null);
  const [offlineCacheSummary, setOfflineCacheSummary] = useState(() => getOfflineCacheSummary());
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const initialBuildRef = useRef<BuildInfo | null>(null);
  const announcedOfflineRef = useRef(false);
  const nativeHealthFailureCountRef = useRef(0);
  const previousOnlineRef = useRef(getInitialOnlineState());
  const [locationPath, setLocationPath] = useState(() => window.location.pathname + window.location.search);

  useEffect(() => {
    setLocationPath(window.location.pathname + window.location.search);
  }, [currentPath]);

  useEffect(() => {
    const path = locationPath;
    const tracked = TRACKED_ROUTES.find((t) => path.startsWith(t.pathPrefix));
    if (!tracked) return;
    const key = RECENT_KEY(user?.id);
    const raw = localStorage.getItem(key);
    let list: Array<{ path: string; label: string; count: number; updatedAt: number }> = raw ? JSON.parse(raw) : [];
    const existing = list.find((r) => r.path === tracked.pathPrefix);
    if (existing) {
      existing.count += 1;
      existing.updatedAt = Date.now();
    } else {
      list.push({ path: tracked.pathPrefix, label: tracked.label, count: 1, updatedAt: Date.now() });
    }
    list = list
      .sort((a, b) => b.count - a.count || b.updatedAt - a.updatedAt)
      .slice(0, 10);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("selrs-recent-updated"));
  }, [locationPath, user?.id]);

  useEffect(() => {
    let stopWatcher: () => void = () => {};

    const syncQa = () => {
      const enabled = getMobileQaEnabled();
      setQaEnabled(enabled);
      applyMobileQaState(enabled);
      stopWatcher();
      if (enabled) {
        stopWatcher = startMobileQaWatcher((count) => setOverflowCount(count));
      } else {
        stopWatcher = () => {};
        setOverflowCount(markOverflowInSheets());
      }
    };

    syncQa();
    window.addEventListener("mobile-qa-toggle", syncQa);
    return () => {
      stopWatcher();
      window.removeEventListener("mobile-qa-toggle", syncQa);
    };
  }, []);

  useEffect(() => {
    void initFirebase();
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void ensureNativeNotificationPermission(true).then((granted) => {
        if (!granted) {
          toast("Enable notifications from settings to stay updated.");
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setOrientation(isLandscape ? "landscape" : "portrait");
    };
    handleOrientationChange();
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    void refreshNativeAppInfo().then((info) => {
      if (info) {
        setNativeAppInfo(info);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isNativePlatform = Capacitor.isNativePlatform();
    if (isDesktopShell) {
      setBooting(false);
      setServerReachable(true);
      window.dispatchEvent(new Event("selrs-shell-ready"));
      return;
    }

    const emitReady = () => {
      window.dispatchEvent(new Event("selrs-shell-ready"));
    };

    const refetchActiveData = () =>
      queryClient.refetchQueries({
        type: "active",
      });

    const runHealthCheck = async (silent = false) => {
      if (!navigator.onLine) {
        setServerReachable(false);
        nativeHealthFailureCountRef.current = 0;
        if (!silent) {
          setBooting(false);
          emitReady();
        }
        return;
      }

      try {
        const nextBuild = await fetchHealthSnapshot();
        nativeHealthFailureCountRef.current = 0;
        setServerReachable(true);
        setBuildInfo((prev) => {
          if (
            prev &&
            prev.version === nextBuild.version &&
            prev.buildTime === nextBuild.buildTime &&
            prev.commit === nextBuild.commit
          ) {
            return prev;
          }
          return nextBuild;
        });
        saveCachedBuildInfo(nextBuild);
        setApiIssue(null);
        setOfflineCacheSummary(getOfflineCacheSummary());

        if (!initialBuildRef.current) {
          initialBuildRef.current = nextBuild;
        } else if (
          initialBuildRef.current.version !== nextBuild.version ||
          initialBuildRef.current.buildTime !== nextBuild.buildTime ||
          initialBuildRef.current.commit !== nextBuild.commit
        ) {
          setUpdateAvailable(nextBuild);
        }
      } catch (error) {
        if (isNativePlatform) {
          nativeHealthFailureCountRef.current += 1;
          if (nativeHealthFailureCountRef.current >= NATIVE_HEALTH_FAILURE_THRESHOLD) {
            setServerReachable(false);
          }
        } else {
          setServerReachable(false);
        }
        if (!silent && (!isNativePlatform || nativeHealthFailureCountRef.current >= NATIVE_HEALTH_FAILURE_THRESHOLD)) {
          console.warn("[SELRS] Health check failed", error);
        }
      } finally {
        if (!silent) {
          setBooting(false);
          emitReady();
        }
      }
    };

    const syncNetwork = (status?: { connected: boolean }) => {
      const nextOnline = status?.connected ?? navigator.onLine;
      const wasOnline = previousOnlineRef.current;
      previousOnlineRef.current = nextOnline;
      setIsOnline(nextOnline);
      if (nextOnline) {
        // Ignore duplicate "online" events; only react on a real offline -> online transition.
        if (wasOnline) return;
        if (announcedOfflineRef.current) {
          toast.success("Connection restored");
        }
        announcedOfflineRef.current = false;
        void runHealthCheck(true);
        // Avoid aggressive refetch on web/desktop shell because it can wipe local in-page edits.
        if (isNativePlatform && !isDesktopShell) {
          void refetchActiveData();
        }
      } else if (!announcedOfflineRef.current) {
        announcedOfflineRef.current = true;
        setServerReachable(false);
        toast.error("You are offline");
      }
    };

    void runHealthCheck(false);
    const interval = window.setInterval(
      () => void runHealthCheck(true),
      isNativePlatform ? NATIVE_HEALTH_POLL_MS : isDesktopShell ? DESKTOP_SHELL_HEALTH_POLL_MS : HEALTH_POLL_MS
    );
    const stopNetworkSubscription = subscribeNetworkStatus((status) => syncNetwork(status));
    const stopResumeSubscription = isNativePlatform
      ? subscribeAppResume(() => {
          void refreshNativeAppInfo().then((info) => {
            if (info) setNativeAppInfo(info);
          });
          void runHealthCheck(true);
          if (!isDesktopShell) {
            void refetchActiveData();
          }
        })
      : () => {};

    return () => {
      window.clearInterval(interval);
      stopNetworkSubscription();
      stopResumeSubscription();
    };
  }, [isDesktopShell]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onRuntimeIssue = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeIssue>).detail;
      if (!detail?.message) return;
      setRuntimeIssue(detail);
    };
    const onApiIssue = (event: Event) => {
      const detail = (event as CustomEvent<ApiIssue>).detail;
      if (!detail?.message) return;
      setApiIssue(detail);
      setOfflineCacheSummary(getOfflineCacheSummary());
    };

    window.addEventListener("selrs-runtime-issue", onRuntimeIssue);
    window.addEventListener("selrs-api-issue", onApiIssue);

    try {
      const raw = window.localStorage.getItem(RUNTIME_ISSUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RuntimeIssue;
        if (parsed?.message) {
          setRuntimeIssue(parsed);
        }
      }
    } catch {
      // Ignore invalid cached runtime issue payloads.
    }

    return () => {
      window.removeEventListener("selrs-runtime-issue", onRuntimeIssue);
      window.removeEventListener("selrs-api-issue", onApiIssue);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const resolved = new URL(href, window.location.href);
      if (resolved.origin !== window.location.origin) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }

      if (anchor.hasAttribute("download")) {
        toast.info("Download starting...");
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const originalPrint = window.print?.bind(window);
    if (!originalPrint) return;

    window.print = () => {
      if (canUseNativeAndroidPrint()) {
        void requestNativeAndroidPrint(document.title || "SELRS Print")
          .then((result) => {
            if (result.started) return;
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "Native print failed";
            toast.error(message);
            try {
              originalPrint();
            } catch {
              toast.error("Unable to open print dialog");
            }
          });
        return;
      }

        try {
          originalPrint();
        } catch {
          toast.error("Unable to open print dialog");
        }
    };

    return () => {
      window.print = originalPrint;
    };
  }, []);

  const retryShell = () => {
    setBooting(true);
    setUpdateAvailable(null);
    setApiIssue(null);
    void fetchHealthSnapshot()
      .then((nextBuild) => {
        setServerReachable(true);
        setBuildInfo((prev) => {
          if (
            prev &&
            prev.version === nextBuild.version &&
            prev.buildTime === nextBuild.buildTime &&
            prev.commit === nextBuild.commit
          ) {
            return prev;
          }
          return nextBuild;
        });
        saveCachedBuildInfo(nextBuild);
        if (!initialBuildRef.current) {
          initialBuildRef.current = nextBuild;
        }
      })
      .catch((error) => {
        setServerReachable(false);
        toast.error(error instanceof Error ? error.message : "Retry failed");
      })
      .finally(() => {
        setBooting(false);
        window.dispatchEvent(new Event("selrs-shell-ready"));
      });
  };

  const retrySync = () => {
    setApiIssue(null);
    void queryClient.refetchQueries({
      type: "active",
    });
    retryShell();
  };

  const softRefresh = useCallback(
    (reason?: string) => {
      // Web-safe refresh: keep the SPA alive and just refetch active data.
      if (reason) {
        console.warn(`[SELRS] Soft refresh requested: ${reason}`);
      }
      setApiIssue(null);
      setRuntimeIssue(null);
      void queryClient
        .refetchQueries({
          type: "active",
        })
        .catch(() => {
          // Ignore - the banners will show connectivity issues if needed.
        });
      retryShell();
    },
    [retryShell]
  );

  const reloadApp = () => {
    if (isDesktopShell) {
      void queryClient.refetchQueries({ type: "active" });
      return;
    }
    // Keep hard reload only for the native shell.
    if (isNativeShell) {
      requestAppReload("user-action");
      return;
    }
    softRefresh("user-action");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { reason?: string } | undefined;
      softRefresh(detail?.reason);
    };
    window.addEventListener("selrs-soft-reload", handler as EventListener);
    return () => window.removeEventListener("selrs-soft-reload", handler as EventListener);
  }, [softRefresh]);

  const dismissRuntimeIssue = () => {
    setRuntimeIssue(null);
    try {
      window.localStorage.removeItem(RUNTIME_ISSUE_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const copyRuntimeIssue = async () => {
    if (!runtimeIssue) return;

    const payload = [
      `time=${runtimeIssue.time}`,
      `source=${runtimeIssue.source}`,
      `message=${runtimeIssue.message}`,
      runtimeIssue.stack ? `stack=${runtimeIssue.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await copyToClipboard(payload);
      toast.success("Issue details copied");
    } catch {
      toast.error("Failed to copy issue details");
    }
  };

  const offlineCacheTimeLabel = offlineCacheSummary.lastUpdatedAt
    ? new Date(offlineCacheSummary.lastUpdatedAt).toLocaleString()
    : null;

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <GlobalCommandPalette />
          {isNativeShell ? (
            <MobileAppEnhancements nativeAppInfo={nativeAppInfo} />
          ) : (
            <WebAppEnhancements nativeAppInfo={nativeAppInfo} />
          )}
          <Toaster />
          <div className="page-layout" dir="rtl">
            <Suspense
              fallback={<AppShellSkeleton />}
            >
              <Router />
            </Suspense>
          </div>
          {/* Unified bottom sheet actions are disabled to keep actions within each page header. */}
          {qaEnabled && (
            <div className="fixed bottom-3 right-3 z-[1000] rounded-md border border-warning bg-warning/10 px-3 py-1 text-xs font-semibold text-warning shadow-sm">
              Overflow: {overflowCount}
            </div>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
