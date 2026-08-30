import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Capacitor } from "@capacitor/core";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { getApiUrl } from "./const";
import { type RuntimeIssue } from "./components/AppShellStatus";
import MobileAppEnhancements from "./components/MobileAppEnhancements";
import WebAppEnhancements from "./components/WebAppEnhancements";
import GlobalCommandPalette from "./components/GlobalCommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { ThemeProvider } from "./contexts/ThemeContext";
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

    const response = await fetch(getApiUrl("/version"), {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Version check failed with status ${response.status}`);
    }

    const raw = await response.text();
    if (!raw.trim()) {
      throw new Error("Version check returned an empty response");
    }

    let data: Partial<BuildInfo> & { ok?: boolean };
    try {
      data = JSON.parse(raw) as Partial<BuildInfo> & { ok?: boolean };
    } catch {
      throw new Error("Version check returned invalid JSON");
    }

    if (!data.ok) {
      throw new Error("Version check reported an unhealthy state");
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
  try {
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy was rejected");
    }
  } finally {
    input.remove();
  }
}

const Router = memo(function Router() {
  return (
    <Switch>
      <Route path={ROUTES.dashboard} component={DashboardRouteGate} />
      {AttendanceRoutes}
      {SalaryRoutes}
      {KfRoutes}
      {AccountingRoutes}
      {MedicalRoutes}
      {AdminRoutes}
      {MarketingRoutes}
      {MiscRoutes}
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
  const healthCheckSequenceRef = useRef(0);
  const previousOnlineRef = useRef(getInitialOnlineState());

  useEffect(() => {
    const path = currentPath;
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
  }, [currentPath, user?.id]);

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
      const sequence = ++healthCheckSequenceRef.current;
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
        if (sequence !== healthCheckSequenceRef.current) return;
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
        if (sequence !== healthCheckSequenceRef.current) return;
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

    const forceLightThemeForPrint = () => {
      const root = document.documentElement;
      const body = document.body;
      const previousRootDark = root.classList.contains("dark");
      const previousBodyDark = Boolean(body?.classList.contains("dark"));
      const previousColorScheme = root.style.colorScheme;
      const previousBodyColorScheme = body?.style.colorScheme ?? "";

      root.classList.remove("dark");
      root.style.colorScheme = "light";
      body?.classList.remove("dark");
      if (body) body.style.colorScheme = "light";

      return () => {
        root.classList.toggle("dark", previousRootDark);
        root.style.colorScheme = previousColorScheme;
        if (body) {
          body.classList.toggle("dark", previousBodyDark);
          body.style.colorScheme = previousBodyColorScheme;
        }
      };
    };

    const restorePrintThemeLater = (restore: () => void) => {
      window.setTimeout(restore, 1500);
    };

    window.print = () => {
      const restoreTheme = forceLightThemeForPrint();
      if (canUseNativeAndroidPrint()) {
        void requestNativeAndroidPrint(document.title || "SELRS Print")
          .then((result) => {
            if (result.started) {
              restorePrintThemeLater(restoreTheme);
              return;
            }
            restoreTheme();
          })
          .catch((error: unknown) => {
            restoreTheme();
            const message =
              error instanceof Error ? error.message : "Native print failed";
            toast.error(message);
            try {
              const restoreFallbackTheme = forceLightThemeForPrint();
              originalPrint();
              restorePrintThemeLater(restoreFallbackTheme);
            } catch {
              toast.error("Unable to open print dialog");
            }
          });
        return;
      }

      try {
        originalPrint();
        restorePrintThemeLater(restoreTheme);
      } catch {
        restoreTheme();
        toast.error("Unable to open print dialog");
      }
    };

    return () => {
      window.print = originalPrint;
    };
  }, []);

  const retryShell = useCallback(() => {
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
  }, []);

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
        { reason?: string } | undefined;
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
      <ThemeProvider defaultTheme="light" switchable={true}>
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
