import {
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Capacitor } from "@capacitor/core";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { getApiUrl } from "./const";
import { type RuntimeIssue } from "./components/AppShellStatus";
import MobileAppEnhancements from "./components/MobileAppEnhancements";
import WebAppEnhancements from "./components/WebAppEnhancements";
import GlobalCommandPalette from "./components/GlobalCommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { AttendanceRoutes } from "./routes/attendance-routes";
import { SalaryRoutes } from "./routes/salary-routes";
import { KfRoutes } from "./routes/kf-routes";
import { AccountingRoutes } from "./routes/accounting-routes";
import { AdminRoutes } from "./routes/admin-routes";
import { MedicalRoutes } from "./routes/medical-routes";
import { MarketingRoutes } from "./routes/marketing-routes";
import { MiscRoutes } from "./routes/misc-routes";
import { DashboardRouteGate } from "./routes/guards";
import { RECENT_KEY, TRACKED_ROUTES } from "./routes/tracked-routes";
import { ROUTES } from "../../shared/routes";
import {
  applyMobileQaState,
  getMobileQaEnabled,
  markOverflowInSheets,
  startMobileQaWatcher,
} from "@/lib/mobileQa";
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
import {
  canUseNativeAndroidPrint,
  requestNativeAndroidPrint,
} from "./lib/nativePrint";
import { ensureNativeNotificationPermission } from "./lib/nativeNotifications";
import { useAuth } from "./hooks/useAuth";

const NotFound = lazy(() => import("./pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));
const ExaminationForm = lazy(() => import("./pages/ExaminationForm"));
const Operations = lazy(() => import("./pages/Operations"));
const MedicalReports = lazy(() => import("./pages/MedicalReports"));
const ConsultantSheet = lazy(() => import("./pages/ConsultantSheet"));
const ConsultantFollowupPage = lazy(
  () => import("./pages/ConsultantFollowupPage"),
);
const SpecialistSheet = lazy(() => import("./pages/SpecialistSheet"));
const LasikExamSheet = lazy(() => import("./pages/LasikExamSheet"));
const LasikFollowupPage = lazy(() => import("./pages/LasikFollowupPage"));
const PentacamSheet = lazy(() => import("./pages/PentacamSheet"));
const AdminPentacamLinking = lazy(() => import("./features/admin/AdminPentacamLinking"));
const PentacamResultsDashboard = lazy(
  () => import("./pages/PentacamResultsDashboard"),
);
const RefractionsDashboard = lazy(() => import("./pages/RefractionsDashboard"));
const AutorefsDashboard = lazy(() => import("./pages/AutorefsDashboard"));
const PrescriptionsDashboard = lazy(
  () => import("./pages/PrescriptionsDashboard"),
);
const ExternalOperationSheet = lazy(
  () => import("./pages/ExternalOperationSheet"),
);
const RefractionPage = lazy(() => import("./pages/RefractionPage"));
const PatientSummary = lazy(() => import("./pages/PatientSummary"));
const MedicationsTestsManagement = lazy(
  () => import("./pages/MedicationsTestsManagement"),
);
const MedicationsCatalogPage = lazy(
  () => import("./pages/MedicationsCatalogPage"),
);
const MedicationsManagement = lazy(
  () => import("./pages/MedicationsManagement"),
);
const ExaminationsCatalogPage = lazy(
  () => import("./pages/ExaminationsCatalogPage"),
);
const TxHubPage = lazy(() => import("./pages/TxHubPage"));
const WritePrescription = lazy(() => import("./pages/WritePrescription"));
const PrescriptionsList = lazy(() => import("./pages/PrescriptionsList"));
const RequestTests = lazy(() => import("./pages/RequestTests"));
const AdminUsers = lazy(() => import("./features/admin/AdminUsers"));
const AdminMigrations = lazy(() => import("./features/admin/AdminMigrations"));
const AdminApiTools = lazy(() => import("./features/admin/AdminApiTools"));
const AdminStatus = lazy(() => import("./features/admin/AdminStatus"));
const AdminSettings = lazy(() => import("./features/admin/AdminSettings"));
const AdminNotificationSettings = lazy(
  () => import("./features/admin/AdminNotificationSettings"),
);
const AdminPermissions = lazy(() => import("./features/admin/AdminPermissions"));
const AdminSheets = lazy(() => import("./features/admin/AdminSheets"));
const AdminSheetDesigner = lazy(() => import("./features/admin/AdminSheetDesigner"));
const AdminDoctors = lazy(() => import("./features/admin/AdminDoctors"));
const AdminPentacamFailed = lazy(() => import("./features/admin/AdminPentacamFailed"));
const AdminSheetCopies = lazy(() => import("./features/admin/AdminSheetCopies"));
const AdminFormsHub = lazy(() => import("./features/admin/AdminFormsHub"));
const AdminPatients = lazy(() => import("./features/admin/AdminPatients"));
const AdminCardVisibility = lazy(() => import("./features/admin/AdminCardVisibility"));
const AdminDiagnostics = lazy(() => import("./features/admin/AdminDiagnostics"));
const AdminDataSourceAudit = lazy(() => import("./features/admin/AdminDataSourceAudit"));
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
const AdminHubShell = lazy(() => import("./features/admin/AdminHubShell"));
const Followups = lazy(() => import("./pages/Followups"));
const Visits = lazy(() => import("./pages/Visits"));
const AdminServices = lazy(() => import("./features/admin/AdminServices"));
const TestsManagement = lazy(() => import("./pages/TestsManagement"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const Styleguide = lazy(() => import("./pages/dev/Styleguide"));
const ComponentsGallery = lazy(() => import("./pages/dev/ComponentsGallery"));
const Prototypes = lazy(() => import("./pages/dev/Prototypes"));
const Documentation = lazy(() => import("./pages/dev/Documentation"));
const TodayPatients = lazy(() => import("./pages/TodayPatients"));
const WorkflowHub = lazy(() => import("./pages/WorkflowHub"));
const StockroomShell = lazy(() => import("./features/stockroom/StockroomShell"));
const KfShell = lazy(() => import("./features/kf/KfShell"));
const KfHome = lazy(() => import("./features/kf/KfHome"));
const KfPatients = lazy(() => import("./features/kf/KfPatients"));
const KfPatientForm = lazy(() => import("./features/kf/KfPatientForm"));
const KfPatientDetail = lazy(() => import("./features/kf/KfPatientDetail"));
const KfVisitForm = lazy(() => import("./features/kf/KfVisitForm"));
const KfExaminationForm = lazy(() => import("./features/kf/KfExaminationForm"));
const KfOperationForm = lazy(() => import("./features/kf/KfOperationForm"));
const KfFollowupForm = lazy(() => import("./features/kf/KfFollowupForm"));
const KfOperations = lazy(() => import("./features/kf/KfOperations"));
const KfFollowups = lazy(() => import("./features/kf/KfFollowups"));
const KfConsultantSheet = lazy(
  () => import("./features/kf/KfConsultantSheet"),
);
const KfConsultantFollowupSheet = lazy(
  () => import("./features/kf/KfConsultantFollowupSheet"),
);
const KfAccounting = lazy(() => import("./features/kf/KfAccounting"));
const KfDailyRevenue = lazy(() => import("./features/kf/KfDailyRevenue"));
const KfServiceRevenue = lazy(() => import("./features/kf/KfServiceRevenue"));
const KfReceipts = lazy(() => import("./features/kf/KfReceipts"));
const KfLedger = lazy(() => import("./features/kf/KfLedger"));
// Marketing module
import MarketingLayout from "./pages/marketing/MarketingLayout";
const MarketingDashboard = lazy(
  () => import("./pages/marketing/MarketingDashboard"),
);
const PostHistory = lazy(() => import("./pages/marketing/PostHistory"));
const DraftPosts = lazy(() => import("./pages/marketing/DraftPosts"));
const MarketingSettings = lazy(
  () => import("./pages/marketing/MarketingSettings"),
);
const BrandLibrary = lazy(() => import("./pages/marketing/BrandLibrary"));
// Attendance module
import AttendanceLayout from "./features/attendance/AttendanceLayout";
const AttendanceHome = lazy(() => import("./features/attendance/AttendanceHome"));
const AttendanceLive = lazy(() => import("./features/attendance/LiveBoard"));
const AttendanceMyProfile = lazy(
  () => import("./features/attendance/MyAttendanceProfile"),
);
const AttendanceEmployeeDetail = lazy(
  () => import("./features/attendance/EmployeeDetail"),
);
const AttendanceEmployeesHub = lazy(
  () => import("./features/attendance/EmployeesHub"),
);
const AttendanceReportsHub = lazy(
  () => import("./features/attendance/ReportsHub"),
);
const AttendanceSettingsHub = lazy(
  () => import("./features/attendance/SettingsHub"),
);
const AttendanceDeviceSettings = lazy(
  () => import("./features/attendance/admin/DeviceSettings"),
);
const AttendanceSyncStatus = lazy(
  () => import("./features/attendance/admin/SyncStatus"),
);
// Salary module
import SalaryLayout from "./features/salary/SalaryLayout";
const SalaryBasics = lazy(() => import("./features/salary/SalaryBasics"));
const SalaryPenalties = lazy(() => import("./features/salary/SalaryPenalties"));
const CommissionPools = lazy(() => import("./features/salary/CommissionPools"));
const PayrollReport = lazy(() => import("./features/salary/PayrollReport"));
const SalarySettings = lazy(() => import("./features/salary/SalarySettings"));
const ShiftStaff = lazy(() => import("./features/salary/ShiftStaff"));
const ShiftSchedule = lazy(() => import("./features/salary/ShiftSchedule"));
const ShiftPayroll = lazy(() => import("./features/salary/ShiftPayroll"));
const AbsentReport = lazy(() => import("./features/salary/AbsentReport"));
const CurrentSalaryData = lazy(
  () => import("./features/salary/CurrentSalaryData"),
);
// External Doctors module
const ExternalDoctors = lazy(() => import("./pages/ExternalDoctors"));
const ExternalDoctorReferrals = lazy(
  () => import("./pages/ExternalDoctorReferrals"),
);
// Doctor portal
const DoctorLogin = lazy(() => import("./features/doctor-portal/DoctorLogin"));
const DoctorDashboard = lazy(
  () => import("./features/doctor-portal/DoctorDashboard"),
);
const DoctorPatientImages = lazy(
  () => import("./features/doctor-portal/DoctorPatientImages"),
);
import DoctorPortalRoute from "./components/DoctorPortalRoute";
// Patient portal
const PatientLogin = lazy(() => import("./features/patient-portal/PatientLogin"));
const PatientGuestBook = lazy(
  () => import("./features/patient-portal/PatientGuestBook"),
);
const PatientFile = lazy(() => import("./features/patient-portal/PatientFile"));
const PatientRefraction = lazy(
  () => import("./features/patient-portal/PatientRefraction"),
);
const PatientPrescription = lazy(
  () => import("./features/patient-portal/PatientPrescription"),
);
const PatientScans = lazy(() => import("./features/patient-portal/PatientScans"));
const PatientBook = lazy(() => import("./features/patient-portal/PatientBook"));
const PatientBookings = lazy(
  () => import("./features/patient-portal/PatientBookings"),
);
import PatientPortalRoute from "./components/PatientPortalRoute";
const AccountingHome = lazy(() => import("./features/accounting/AccountingHome"));
const AccountingPrototypes = lazy(
  () => import("./features/accounting/AccountingPrototypes"),
);
const AccountingCashbook = lazy(
  () => import("./features/accounting/AccountingCashbook"),
);
const AccountingLedger = lazy(
  () => import("./features/accounting/AccountingLedger"),
);
const AccountingAdvances = lazy(
  () => import("./features/accounting/AccountingAdvances"),
);
const AccountingLoans = lazy(
  () => import("./features/accounting/AccountingLoans"),
);
const AccountingHomeFund = lazy(
  () => import("./features/accounting/AccountingHomeFund"),
);
const AccountingInstapay = lazy(
  () => import("./features/accounting/AccountingInstapay"),
);
const AccountingDrSaadany = lazy(
  () => import("./features/accounting/AccountingDrSaadany"),
);
const DailyRevenue = lazy(() => import("./features/accounting/DailyRevenue"));
const LasikRevenue = lazy(() => import("./features/accounting/LasikRevenue"));
const ReceiptsInquiry = lazy(
  () => import("./features/accounting/ReceiptsInquiry"),
);
const ReceiptDetail = lazy(() => import("./features/accounting/ReceiptDetail"));
const LasikServices = lazy(() => import("./features/accounting/LasikServices"));
const AccountingPatientsInquiry = lazy(
  () => import("./features/accounting/AccountingPatientsInquiry"),
);
const PatientAccount = lazy(() => import("./features/accounting/PatientAccount"));
const DoctorAccount = lazy(() => import("./features/accounting/DoctorAccount"));
const PrintPreview = lazy(() => import("./features/accounting/PrintPreview"));
const RUNTIME_ISSUE_STORAGE_KEY = "selrs:last-runtime-issue";
const HEALTH_POLL_MS = 60_000;
const NATIVE_HEALTH_POLL_MS = 5 * 60_000;
const NATIVE_HEALTH_FAILURE_THRESHOLD = 3;
const DESKTOP_SHELL_HEALTH_POLL_MS = 15 * 60_000;
async function fetchHealthSnapshot(signal?: AbortSignal): Promise<BuildInfo> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), 8_000);
  try {
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener(
          "abort",
          () => controller.abort(signal.reason),
          { once: true },
        );
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

const Router = memo(function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <Route path={ROUTES.dashboard} component={DashboardRouteGate} />
      <AttendanceRoutes />
      <SalaryRoutes />
      <KfRoutes />
      <AccountingRoutes />
      <MedicalRoutes />
      <AdminRoutes />
      <MarketingRoutes />
      <MiscRoutes />
    </>
  );
});

function App() {
  const { user } = useAuth();
  const [currentPath] = useLocation();
  const textZoom = useTextZoom();
  const isNativeShell = Capacitor.isNativePlatform();
  const isDesktopShell =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("SELRSDesktop/1") ||
      navigator.userAgent.includes("SELRS/1"));
  const [qaEnabled, setQaEnabled] = useState(false);
  const [overflowCount, setOverflowCount] = useState(0);
  const [booting, setBooting] = useState(
    () => !loadCachedBuildInfo() && getInitialOnlineState(),
  );
  const [isOnline, setIsOnline] = useState(() => getInitialOnlineState());
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(() =>
    loadCachedBuildInfo(),
  );
  const [nativeAppInfo, setNativeAppInfo] = useState<NativeAppInfo | null>(() =>
    loadCachedNativeAppInfo(),
  );
  const [updateAvailable, setUpdateAvailable] = useState<BuildInfo | null>(
    null,
  );
  const [apiIssue, setApiIssue] = useState<ApiIssue | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<RuntimeIssue | null>(null);
  const [offlineCacheSummary, setOfflineCacheSummary] = useState(() =>
    getOfflineCacheSummary(),
  );
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );
  const initialBuildRef = useRef<BuildInfo | null>(null);
  const announcedOfflineRef = useRef(false);
  const nativeHealthFailureCountRef = useRef(0);
  const previousOnlineRef = useRef(getInitialOnlineState());
  const [locationPath, setLocationPath] = useState(
    () => window.location.pathname + window.location.search,
  );

  useEffect(() => {
    setLocationPath(window.location.pathname + window.location.search);
  }, [currentPath]);

  useEffect(() => {
    const path = locationPath;
    const tracked = TRACKED_ROUTES.find((t) => path.startsWith(t.pathPrefix));
    if (!tracked) return;
    const key = RECENT_KEY(user?.id);
    const raw = localStorage.getItem(key);
    let list: Array<{
      path: string;
      label: string;
      count: number;
      updatedAt: number;
    }> = raw ? JSON.parse(raw) : [];
    const existing = list.find((r) => r.path === tracked.pathPrefix);
    if (existing) {
      existing.count += 1;
      existing.updatedAt = Date.now();
    } else {
      list.push({
        path: tracked.pathPrefix,
        label: tracked.label,
        count: 1,
        updatedAt: Date.now(),
      });
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
          if (
            nativeHealthFailureCountRef.current >=
            NATIVE_HEALTH_FAILURE_THRESHOLD
          ) {
            setServerReachable(false);
          }
        } else {
          setServerReachable(false);
        }
        if (
          !silent &&
          (!isNativePlatform ||
            nativeHealthFailureCountRef.current >=
              NATIVE_HEALTH_FAILURE_THRESHOLD)
        ) {
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
      isNativePlatform
        ? NATIVE_HEALTH_POLL_MS
        : isDesktopShell
          ? DESKTOP_SHELL_HEALTH_POLL_MS
          : HEALTH_POLL_MS,
    );
    const stopNetworkSubscription = subscribeNetworkStatus((status) =>
      syncNetwork(status),
    );
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
            const message =
              error instanceof Error ? error.message : "Native print failed";
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
    [retryShell],
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
      const detail = (event as CustomEvent).detail as
        | { reason?: string }
        | undefined;
      softRefresh(detail?.reason);
    };
    window.addEventListener("selrs-soft-reload", handler as EventListener);
    return () =>
      window.removeEventListener("selrs-soft-reload", handler as EventListener);
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <GlobalCommandPalette />
          {isNativeShell ? (
            <MobileAppEnhancements nativeAppInfo={nativeAppInfo} />
          ) : (
            <WebAppEnhancements nativeAppInfo={nativeAppInfo} />
          )}
          <Toaster />
          <div className="page-layout" dir="rtl">
            <Suspense fallback={<AppShellSkeleton />}>
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
