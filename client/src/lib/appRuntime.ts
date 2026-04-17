import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { QueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";

export type BuildInfo = {
  version: string;
  buildTime: string;
  commit: string;
};

export type ApiIssue = {
  kind: "offline" | "timeout" | "auth" | "server" | "unknown";
  message: string;
  path?: string;
  status?: number;
  time: string;
};

export type NativeAppInfo = {
  version: string;
  build: string;
  platform: string;
};

const BUILD_INFO_STORAGE_KEY = "selrs:build-info";
const NATIVE_APP_INFO_STORAGE_KEY = "selrs:native-app-info";
const QUERY_CACHE_STORAGE_KEY = "selrs:query-cache:v1";
const RELOAD_TRACE_STORAGE_KEY = "selrs:last-reload";
const QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SILENT_API_PATH_FRAGMENTS = [
  "medical.registerPushDeviceToken",
  "medical.unregisterPushDeviceToken",
  "medical.reqisterPushDeviceToken",
  "medical.unreqisterPushDeviceToken",
  "medical.getMssqlSyncStatus",
  "medical.getMssqlSyncRuntimeConfig",
  "appointments_pricing_v1",
  "app_notification_settings_v1",
  "app_notifications_feed_v1",
];
const SAFE_QUERY_FRAGMENTS = [
  "medical.getDoctorDirectory",
  "medical.getServiceDirectory",
  "medical.getSystemSetting",
  "medical.getUserPageState",
  "medical.getPatientPageState",
  "medical.getAllTests",
  "medical.getAllMedications",
  "medical.getAllUsers",
  "medical.getTeamPermissions",
  "medical.getUserPermissionState",
  "medical.getPatientStats",
  // trpc queryKey serialization often splits segments; keep a permissive fallback
  "getDoctorDirectory",
  "getServiceDirectory",
  "getSystemSetting",
  "getUserPageState",
  "getPatientPageState",
  "getAllTests",
  "getAllMedications",
  "getAllUsers",
  "getTeamPermissions",
  "getUserPermissionState",
  "getPatientStats",
];

type PersistedQueryEntry = {
  queryKey: unknown[];
  data: unknown;
  updatedAt: number;
};

const canUseBrowserStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);
const RELOAD_GUARD_WINDOW_MS = 4000;

const getReloadGuardWindow = () => {
  if (typeof window === "undefined") return 0;
  return (window as any).__selrsReloadAllowedAt as number | undefined ?? 0;
};

const setReloadGuardWindow = () => {
  if (typeof window === "undefined") return;
  (window as any).__selrsReloadAllowedAt = Date.now();
};

const recordReloadTrace = (reason: string, source: "reload" | "assign" | "replace") => {
  if (typeof window === "undefined") return;
  const payload = {
    reason,
    source,
    path: window.location.pathname + window.location.search + window.location.hash,
    time: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(RELOAD_TRACE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
  console.warn("[SELRS] Reload trace", payload);
};

const isReloadAllowed = () => {
  const allowedAt = getReloadGuardWindow();
  return Boolean(allowedAt && Date.now() - allowedAt <= RELOAD_GUARD_WINDOW_MS);
};

export const installReloadGuard = () => {
  if (typeof window === "undefined") return;
  const loc = window.location;
  if (!loc || typeof loc.reload !== "function") return;
  const reloadDescriptor =
    Object.getOwnPropertyDescriptor(loc, "reload") ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(loc), "reload");
  if (reloadDescriptor && !reloadDescriptor.writable && !reloadDescriptor.set) {
    console.warn("[SELRS] Location.reload is read-only; skipping reload guard");
    return;
  }
  const originalReload = loc.reload.bind(loc);
  if ((loc.reload as any).__selrsGuarded) return;

  const guarded = () => {
    if (!isReloadAllowed()) {
      console.warn("[SELRS] Blocked automatic reload");
      return;
    }
    const reason = String((window as any).__selrsReloadReason ?? "location.reload");
    recordReloadTrace(reason, "reload");
    (window as any).__selrsReloadAllowedAt = 0;
    originalReload();
  };
  (guarded as any).__selrsGuarded = true;
  try {
    (loc as any).reload = guarded;
  } catch (error) {
    console.warn("[SELRS] Unable to guard Location.reload", error);
  }
};

export const installNavigationGuard = () => {
  if (typeof window === "undefined") return;
  const loc = window.location;
  if (!loc) return;
  const originalAssign = loc.assign?.bind(loc);
  const originalReplace = loc.replace?.bind(loc);

  if (originalAssign && !(loc.assign as any).__selrsGuarded) {
    const assignDescriptor =
      Object.getOwnPropertyDescriptor(loc, "assign") ??
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(loc), "assign");
    if (assignDescriptor && !assignDescriptor.writable && !assignDescriptor.set) {
      console.warn("[SELRS] Location.assign is read-only; skipping navigation guard");
    } else {
    const guardedAssign = (url: string | URL) => {
      if (!isReloadAllowed()) {
        console.warn("[SELRS] Blocked automatic navigation (assign)");
        return;
      }
      const reason = String((window as any).__selrsReloadReason ?? "location.assign");
      recordReloadTrace(reason, "assign");
      (window as any).__selrsReloadAllowedAt = 0;
      originalAssign(url as any);
    };
    (guardedAssign as any).__selrsGuarded = true;
    try {
      (loc as any).assign = guardedAssign;
    } catch (error) {
      console.warn("[SELRS] Unable to guard Location.assign", error);
    }
    }
  }

  if (originalReplace && !(loc.replace as any).__selrsGuarded) {
    const replaceDescriptor =
      Object.getOwnPropertyDescriptor(loc, "replace") ??
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(loc), "replace");
    if (replaceDescriptor && !replaceDescriptor.writable && !replaceDescriptor.set) {
      console.warn("[SELRS] Location.replace is read-only; skipping navigation guard");
    } else {
    const guardedReplace = (url: string | URL) => {
      if (!isReloadAllowed()) {
        console.warn("[SELRS] Blocked automatic navigation (replace)");
        return;
      }
      const reason = String((window as any).__selrsReloadReason ?? "location.replace");
      recordReloadTrace(reason, "replace");
      (window as any).__selrsReloadAllowedAt = 0;
      originalReplace(url as any);
    };
    (guardedReplace as any).__selrsGuarded = true;
    try {
      (loc as any).replace = guardedReplace;
    } catch (error) {
      console.warn("[SELRS] Unable to guard Location.replace", error);
    }
    }
  }
};

export const installBeforeUnloadGuard = () => {
  if (typeof window === "undefined") return;
  const guardKey = "__selrsBeforeUnloadGuarded";
  if ((window as any)[guardKey]) return;
  (window as any)[guardKey] = true;
  const handler = (event: BeforeUnloadEvent) => {
    recordReloadTrace("beforeunload", "reload");
    if (isReloadAllowed()) {
      (window as any).__selrsReloadAllowedAt = 0;
      return;
    }
    // Disabled: no longer show beforeunload dialog
    // event.preventDefault();
    // event.returnValue = "هل تريد مغادرة الصفحة؟";
  };
  window.addEventListener("beforeunload", handler, { capture: true });
  window.onbeforeunload = handler;
  // Re-apply the guard in case another script overwrites it.
  window.setInterval(() => {
    if (window.onbeforeunload !== handler) {
      window.onbeforeunload = handler;
    }
  }, 2000);
};

export const installHardReloadBlocker = () => {
  if (typeof window === "undefined") return;
  const guardKey = "__selrsHardReloadBlocker";
  if ((window as any)[guardKey]) return;
  (window as any)[guardKey] = true;

  const handler = (event: KeyboardEvent) => {
    const key = event.key?.toLowerCase();
    const isReloadKey = key === "f5";
    const isShortcutReload = (event.ctrlKey || event.metaKey) && key === "r";
    if (isReloadKey || isShortcutReload) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn("[SELRS] Blocked keyboard reload");
    }
  };

  window.addEventListener("keydown", handler, { capture: true });
};

export const requestAppReload = (reason?: string) => {
  if (typeof window === "undefined") return;
  (window as any).__selrsReloadReason = reason || "unknown";
  recordReloadTrace(reason || "unknown", "reload");
  setReloadGuardWindow();
  if (reason) {
    console.warn(`[SELRS] Reload requested: ${reason}`);
  }
  // Hard reloads on web are disruptive (wipe in-memory state and can feel like random resets),
  // so we downgrade them to a soft reload signal handled by the app shell.
  if (!Capacitor.isNativePlatform()) {
    try {
      window.dispatchEvent(
        new CustomEvent("selrs-soft-reload", {
          detail: { reason: reason || "unknown" },
        })
      );
    } catch {
      // If CustomEvent is unavailable for any reason, do nothing.
    }
    return;
  }

  window.location.reload();
};

const toQueryKeyString = (queryKey: unknown) => {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return "";
  }
};

const isSafeOfflineQuery = (queryKey: unknown) => {
  const keyText = toQueryKeyString(queryKey);
  return SAFE_QUERY_FRAGMENTS.some((fragment) => keyText.includes(fragment));
};

const getPersistedQueryEntries = (): PersistedQueryEntry[] => {
  if (!canUseBrowserStorage()) return [];

  try {
    const raw = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedQueryEntry[];
    const now = Date.now();
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry) =>
            Array.isArray(entry?.queryKey) &&
            typeof entry?.updatedAt === "number" &&
            now - entry.updatedAt <= QUERY_CACHE_MAX_AGE_MS
        )
      : [];
  } catch {
    return [];
  }
};

const savePersistedQueryEntries = (entries: PersistedQueryEntry[]) => {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(entries.slice(-120)));
  } catch {
    // Ignore storage quota/serialization failures.
  }
};

export const loadCachedBuildInfo = (): BuildInfo | null => {
  if (!canUseBrowserStorage()) return null;

  try {
    const raw = window.localStorage.getItem(BUILD_INFO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BuildInfo>;
    if (!parsed?.version) return null;
    return {
      version: String(parsed.version ?? "unknown"),
      buildTime: String(parsed.buildTime ?? "unknown"),
      commit: String(parsed.commit ?? "unknown"),
    };
  } catch {
    return null;
  }
};

export const saveCachedBuildInfo = (value: BuildInfo) => {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(BUILD_INFO_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
};

const shouldRetry = (failureCount: number, error: unknown) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  if (error instanceof TRPCClientError) {
    const code = error.data?.code ?? "";
    const status = error.data?.httpStatus ?? 0;
    if (code === "UNAUTHORIZED" || status === 401 || status === 403) return false;
    return failureCount < 2;
  }
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60 * 1000,
      retry: shouldRetry,
      // Global reconnect refetches were causing repeated "state resets" in many pages.
      // We now trigger targeted refetch manually from the app shell when needed.
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: shouldRetry,
    },
  },
});

export const hydrateOfflineQueryCache = () => {
  for (const entry of getPersistedQueryEntries()) {
    queryClient.setQueryData(entry.queryKey, entry.data, {
      updatedAt: entry.updatedAt,
    });
  }
};

export const installOfflineQueryCachePersistence = () => {
  if (!canUseBrowserStorage()) return;

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    if (!isSafeOfflineQuery(event.query.queryKey)) return;

    const existing = getPersistedQueryEntries().filter(
      (entry) => toQueryKeyString(entry.queryKey) !== toQueryKeyString(event.query.queryKey)
    );

    existing.push({
      queryKey: event.query.queryKey as unknown[],
      data: event.query.state.data,
      updatedAt: event.query.state.dataUpdatedAt || Date.now(),
    });

    savePersistedQueryEntries(existing);
  });
};

export const getOfflineCacheSummary = () => {
  const entries = getPersistedQueryEntries();
  const latest = entries.reduce((max, entry) => Math.max(max, entry.updatedAt), 0);
  return {
    count: entries.length,
    lastUpdatedAt: latest || null,
  };
};

export const toApiIssue = (error: unknown): ApiIssue => {
  const now = new Date().toISOString();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      kind: "offline",
      message: "No internet connection. Working with cached app data until the server is reachable again.",
      time: now,
    };
  }

  if (error instanceof TRPCClientError) {
    const status = error.data?.httpStatus ?? 0;
    const path = error.data?.path ?? undefined;
    if (status === 401 || error.data?.code === "UNAUTHORIZED") {
      return {
        kind: "auth",
        message: "Your session is no longer valid. Sign in again to continue syncing data.",
        path,
        status,
        time: now,
      };
    }
    return {
      kind: status >= 500 ? "server" : "unknown",
      message: status >= 500 ? "The SELRS server returned an error. Retry when the server is stable." : error.message,
      path,
      status,
      time: now,
    };
  }

  const message = error instanceof Error ? error.message : String(error ?? "Unknown API failure");
  const pathMatch = message.match(/(?:URL|Path):\s*([^\n]+)/i);
  const statusMatch = message.match(/Status:\s*(\d+)/i);
  if (/timeout/i.test(message)) {
    return {
      kind: "timeout",
      message: "The request timed out. Retry when the connection is stable.",
      path: pathMatch?.[1]?.trim(),
      status: statusMatch ? Number(statusMatch[1]) : undefined,
      time: now,
    };
  }
  if (/failed to fetch|networkerror|network error/i.test(message)) {
    return {
      kind: "offline",
      message: "The app could not reach the server. Cached data remains available where possible.",
      path: pathMatch?.[1]?.trim(),
      status: statusMatch ? Number(statusMatch[1]) : undefined,
      time: now,
    };
  }
  if (/html instead of json/i.test(message)) {
    return {
      kind: "server",
      message: "The app received an unexpected server response. Check the server or proxy configuration.",
      path: pathMatch?.[1]?.trim(),
      status: statusMatch ? Number(statusMatch[1]) : undefined,
      time: now,
    };
  }
  return {
    kind: "unknown",
    message,
    path: pathMatch?.[1]?.trim(),
    status: statusMatch ? Number(statusMatch[1]) : undefined,
    time: now,
  };
};

const shouldSuppressApiIssue = (issue: ApiIssue) => {
  const haystack = `${issue.path ?? ""}\n${issue.message}`.toLowerCase();
  return SILENT_API_PATH_FRAGMENTS.some((fragment) => haystack.includes(fragment.toLowerCase()));
};

export const dispatchApiIssue = (error: unknown) => {
  if (typeof window === "undefined") return;
  const issue = toApiIssue(error);
  if (shouldSuppressApiIssue(issue)) return;
  window.dispatchEvent(new CustomEvent("selrs-api-issue", { detail: issue }));
};

export const formatBuildLabel = (build: BuildInfo | null) => {
  if (!build) return "Build unknown";
  const commit = build.commit && build.commit !== "unknown" ? build.commit.slice(0, 7) : "local";
  const time = build.buildTime && build.buildTime !== "unknown" ? build.buildTime : "untracked";
  return `v${build.version} · ${commit} · ${time}`;
};

export const loadCachedNativeAppInfo = (): NativeAppInfo | null => {
  if (!canUseBrowserStorage()) return null;

  try {
    const raw = window.localStorage.getItem(NATIVE_APP_INFO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NativeAppInfo>;
    if (!parsed?.version) return null;
    return {
      version: String(parsed.version ?? "unknown"),
      build: String(parsed.build ?? "unknown"),
      platform: String(parsed.platform ?? "web"),
    };
  } catch {
    return null;
  }
};

export const saveCachedNativeAppInfo = (value: NativeAppInfo) => {
  if (!canUseBrowserStorage()) return;
  try {
    window.localStorage.setItem(NATIVE_APP_INFO_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
};

export const refreshNativeAppInfo = async (): Promise<NativeAppInfo | null> => {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const info = await CapacitorApp.getInfo();
    const next = {
      version: String(info.version ?? "unknown"),
      build: String(info.build ?? "unknown"),
      platform: Capacitor.getPlatform(),
    };
    saveCachedNativeAppInfo(next);
    return next;
  } catch {
    return null;
  }
};

export const formatNativeAppLabel = (info: NativeAppInfo | null) => {
  if (!info) return "Web shell";
  return `${info.platform} app v${info.version} (${info.build})`;
};

export const getInitialOnlineState = () =>
  typeof navigator !== "undefined" ? navigator.onLine : true;

export const subscribeNetworkStatus = (
  onChange: (next: { connected: boolean; connectionType?: string }) => void
) => {
  let cleanup = () => {};

  const browserHandler = () =>
    onChange({
      connected: navigator.onLine,
      connectionType: navigator.onLine ? "online" : "offline",
    });

  window.addEventListener("online", browserHandler);
  window.addEventListener("offline", browserHandler);
  cleanup = () => {
    window.removeEventListener("online", browserHandler);
    window.removeEventListener("offline", browserHandler);
  };

  if (Capacitor.isNativePlatform()) {
    void Network.getStatus()
      .then((status) => onChange({ connected: status.connected, connectionType: status.connectionType }))
      .catch(() => {});

    void Network.addListener("networkStatusChange", (status) => {
      onChange({ connected: status.connected, connectionType: status.connectionType });
    }).then((listener) => {
      const prevCleanup = cleanup;
      cleanup = () => {
        prevCleanup();
        void listener.remove();
      };
    });
  }

  return cleanup;
};

export const subscribeAppResume = (onResume: () => void) => {
  if (typeof window === "undefined") return () => {};

  if (Capacitor.isNativePlatform()) {
    let cleanup = () => {};
    void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) onResume();
    }).then((listener) => {
      cleanup = () => {
        void listener.remove();
      };
    });
    return cleanup;
  }

  const browserHandler = () => onResume();
  window.addEventListener("focus", browserHandler);
  window.addEventListener("pageshow", browserHandler);

  let cleanup = () => {
    window.removeEventListener("focus", browserHandler);
    window.removeEventListener("pageshow", browserHandler);
  };

  return cleanup;
};
