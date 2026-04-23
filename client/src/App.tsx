import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingShortcuts from "@/components/FloatingShortcuts";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import { getApiUrl } from "./const";
import { type RuntimeIssue } from "./components/AppShellStatus";
import MobileAppEnhancements from "./components/MobileAppEnhancements";
import WebAppEnhancements from "./components/WebAppEnhancements";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { applyMobileQaState, getMobileQaEnabled, markOverflowInSheets, startMobileQaWatcher } from "@/lib/mobileQa";
import { toast } from "sonner";
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
import { useAuth } from "./hooks/useAuth";

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
const ExternalOperationSheet = lazy(() => import("./pages/ExternalOperationSheet"));
const RefractionPage = lazy(() => import("./pages/RefractionPage"));
const PatientSummary = lazy(() => import("./pages/PatientSummary"));
const MedicationsTestsManagement = lazy(() => import("./pages/MedicationsTestsManagement"));
const MedicationsManagement = lazy(() => import("./pages/MedicationsManagement"));
const WritePrescription = lazy(() => import("./pages/WritePrescription"));
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
const AdminCardVisibility = lazy(() => import("./pages/AdminCardVisibility"));
const AdminDiagnostics = lazy(() => import("./pages/AdminDiagnostics"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const Profile = lazy(() => import("./pages/Profile"));
const QuickPatientEntry = lazy(() => import("./pages/QuickPatientEntry"));
const NewCases = lazy(() => import("./pages/NewCases"));
const FollowupForm = lazy(() => import("./pages/FollowupForm"));
const DoctorPatientView = lazy(() => import("./pages/DoctorPatientView"));
const PatientHubShell = lazy(() => import("./pages/PatientHubShell"));
const WorkflowShell = lazy(() => import("./pages/WorkflowShell"));
const AdminHubShell = lazy(() => import("./pages/AdminHubShell"));
const Followups = lazy(() => import("./pages/Followups"));
const Visits = lazy(() => import("./pages/Visits"));
const AdminServices = lazy(() => import("./pages/AdminServices"));
const TestsManagement = lazy(() => import("./pages/TestsManagement"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const TodayPatients = lazy(() => import("./pages/TodayPatients"));
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
  { pathPrefix: "/today", label: "مرضى اليوم" },
  { pathPrefix: "/operations", label: "العمليات" },
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
    const suffix = window.location.search || "";
  }, [setLocation]);
  return null;
}

const Router = memo(function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Home} />
      <Route path={"/force-password-change"} component={() => <ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
      <Route path={"/profile"} component={() => <ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path={"/"} component={Home} />

      <Route path={"/dashboard"} component={() => <ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Patient hub optional entry */}
      <Route path={"/patient-hub*"} component={() => <ProtectedRoute><PatientHubShell /></ProtectedRoute>} />

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
      <Route path={"/sheets/pentacam/:id"} component={() => <ProtectedRoute><PentacamSheet /></ProtectedRoute>} />
      <Route path={"/sheets/pentacam"} component={() => <ProtectedRoute><PentacamSheet /></ProtectedRoute>} />
      <Route path={"/sheets/operation/:id"} component={() => <ProtectedRoute><ExternalOperationSheet /></ProtectedRoute>} />
      <Route path={"/refraction/:id"} component={() => <ProtectedRoute><RefractionPage /></ProtectedRoute>} />
      <Route path={"/refraction"} component={() => <ProtectedRoute><RefractionPage /></ProtectedRoute>} />
      <Route path={"/medications"} component={() => <ProtectedRoute><MedicationsManagement /></ProtectedRoute>} />
      <Route path={"/prescription/:id"} component={() => <ProtectedRoute><WritePrescription /></ProtectedRoute>} />
      <Route path={"/prescription"} component={() => <ProtectedRoute><WritePrescription /></ProtectedRoute>} />
      <Route path={"/tests"} component={() => <ProtectedRoute><MedicationsTestsManagement /></ProtectedRoute>} />
      <Route path={"/request-tests/:id"} component={() => <ProtectedRoute><RequestTests /></ProtectedRoute>} />
      <Route path={"/request-tests"} component={() => <ProtectedRoute><RequestTests /></ProtectedRoute>} />
      <Route path={"/sheet-copies"} component={() => <ProtectedRoute><AdminSheetCopies /></ProtectedRoute>} />

      {/* Admin routes */}
      {/* Admin Hub - handles all /admin-hub routes internally */}
      <Route path={"/admin-hub"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminHubShell /></ProtectedRoute>} />
      <Route path={"/admin-hub/*"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminHubShell /></ProtectedRoute>} />

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
      <Route path={"/admin/sheets"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheets /></ProtectedRoute>} />
      <Route path={"/admin/sheet-designer"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheetDesigner /></ProtectedRoute>} />
      <Route path={"/admin/sheet-copies"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminSheetCopies /></ProtectedRoute>} />
      <Route path={"/admin/doctors"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminDoctors /></ProtectedRoute>} />
      <Route path={"/admin/pentacam-failed"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminPentacamFailed /></ProtectedRoute>} />
      <Route path={"/admin/services"} component={() => <ProtectedRoute requiredRoles={["admin"]}><AdminServices /></ProtectedRoute>} />
      <Route path={"/admin/tests"} component={() => <ProtectedRoute requiredRoles={["admin"]}><TestsManagement /></ProtectedRoute>} />

      <Route path={"/showcase"} component={() => <ProtectedRoute requiredRoles={["admin"]}><ComponentShowcase /></ProtectedRoute>} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
});

function App() {
  const { user } = useAuth();
  const [currentPath] = useLocation();
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
    if (Capacitor.isNativePlatform()) {
      void ensureNativeNotificationPermission(true).then((granted) => {
        if (!granted) {
          toast("Enable notifications from settings to stay updated.");
        }
      });
    }
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
        switchable
      >
        <TooltipProvider>
          {isNativeShell ? (
            <MobileAppEnhancements nativeAppInfo={nativeAppInfo} />
          ) : (
            <WebAppEnhancements nativeAppInfo={nativeAppInfo} />
          )}
          <FloatingShortcuts />

          <Toaster />
          <div className="page-layout">
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.12),transparent_42%),linear-gradient(180deg,#f8fbfb_0%,#f1f7f6_100%)] p-6">
                  <div className="rounded-3xl border border-emerald-100 bg-white/90 px-6 py-5 text-center shadow-xl backdrop-blur">
                    <div className="text-lg font-semibold text-slate-900">Loading SELRS</div>
                    <div className="mt-1 text-sm text-slate-600">Preparing mobile workspace...</div>
                    <div className="mt-3 text-xs text-slate-500">{formatNativeAppLabel(nativeAppInfo)}</div>
                  </div>
                </div>
              }
            >
              <Router />
            </Suspense>
          </div>
          {/* Unified bottom sheet actions are disabled to keep actions within each page header. */}
          {qaEnabled && (
            <div className="fixed bottom-3 right-3 z-[1000] rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
              Overflow: {overflowCount}
            </div>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
