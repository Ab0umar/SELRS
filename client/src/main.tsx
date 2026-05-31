import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
const App = lazy(() => import("./App"));
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { getApiUrl, getLoginUrl } from "./const";
import {
  dispatchApiIssue,
  hydrateOfflineQueryCache,
  installBeforeUnloadGuard,
  installHardReloadBlocker,
  installOfflineQueryCachePersistence,
  queryClient,
} from "./lib/appRuntime";

if (__FAST_BUILD__) {
  await import("./styles/web.css");
} else if (Capacitor.isNativePlatform()) {
  await import("./styles/mobile.css");
} else {
  await import("./styles/web.css");
}

// Helps us distinguish "state wiped because of a real browser reload" vs "soft reset".
// sessionStorage survives reloads for the same tab, but not a new tab/window.
(() => {
  if (typeof window === "undefined") return;
  const key = "selrs:boot-count";
  let count = 0;
  try {
    count = Number(window.sessionStorage.getItem(key) ?? 0) || 0;
    window.sessionStorage.setItem(key, String(count + 1));
  } catch {
    // Ignore storage failures.
  }
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    window.localStorage.setItem(
      "selrs:last-boot",
      JSON.stringify({
        count: count + 1,
        time: new Date().toISOString(),
        path: window.location.pathname,
        navType: nav?.type ?? null,
        persisted: (nav as any)?.persisted ?? null,
      })
    );
  } catch {
    // Ignore storage failures.
  }
  console.warn("[SELRS] boot", { count: count + 1 });
  window.addEventListener("pagehide", (event) => {
    try {
      window.localStorage.setItem(
        "selrs:last-pagehide",
        JSON.stringify({
          time: new Date().toISOString(),
          path: window.location.pathname,
          persisted: Boolean((event as PageTransitionEvent).persisted),
        })
      );
    } catch {
      // Ignore.
    }
  });
})();


const RUNTIME_ISSUE_STORAGE_KEY = "selrs:last-runtime-issue";
const RELOAD_TRACE_STORAGE_KEY = "selrs:last-reload";
const NAV_TRACE_STORAGE_KEY = "selrs:last-navigation";
const RECENT_ERROR_TTL_MS = 10_000;
const recentApiErrors = new Map<string, number>();
const safePreview = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 200);
const browserFetch = globalThis.fetch.bind(globalThis);

const isLikelyJsonPayload = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
};

const expectsJsonResponse = (requestUrl: string) => {
  try {
    const url = new URL(requestUrl, typeof window !== "undefined" ? window.location.origin : undefined);
    return (
      url.pathname === "/healthz" ||
      url.pathname.startsWith("/api/trpc") ||
      url.pathname.startsWith("/api/auth/") ||
      url.pathname.startsWith("/api/medical/")
    );
  } catch {
    return (
      requestUrl.includes("/healthz") ||
      requestUrl.includes("/api/trpc") ||
      requestUrl.includes("/api/auth/") ||
      requestUrl.includes("/api/medical/")
    );
  }
};

const sanitizeTrpcUrl = (value: string) => {
  try {
    const base =
      typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const parsed = new URL(value, base);
    if (!parsed.pathname.endsWith(".")) {
      return value;
    }
    parsed.pathname = parsed.pathname.slice(0, -1);
    const sanitized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return parsed.toString();
    }
    return sanitized;
  } catch {
    if (!value.includes("?")) {
      return value.endsWith(".") ? value.slice(0, -1) : value;
    }
    const [path, rest] = value.split("?", 2);
    const sanitizedPath = path.endsWith(".") ? path.slice(0, -1) : path;
    return `${sanitizedPath}?${rest}`;
  }
};

const headersToObject = (headers: Headers) => {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
};

const MAX_NATIVE_FETCH_ATTEMPTS = 2;
const NATIVE_HTTP_TIMEOUT_MS = 600_000; // 10 minutes for long-running operations like patient sync

const attemptNativeFetch = async (requestUrl: string, options: { method: string; headers: Headers; init?: Omit<RequestInit, "headers"> }) => {
  const { method, headers, init } = options;
  const body =
    typeof init?.body === "string"
      ? init.body
      : init?.body instanceof URLSearchParams
        ? init.body.toString()
        : undefined;

  const response = await CapacitorHttp.request({
    url: requestUrl,
    method,
    headers: headersToObject(headers),
    data: body,
    connectTimeout: NATIVE_HTTP_TIMEOUT_MS,
    readTimeout: NATIVE_HTTP_TIMEOUT_MS,
    responseType: "text",
  });
  return response;
};

const nativeAwareFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!Capacitor.isNativePlatform()) {
    return browserFetch(input, init);
  }

  const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
  const method = String(init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? undefined);

  const errors: string[] = [];
  for (let attempt = 1; attempt <= MAX_NATIVE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      console.warn(`[native-fetch] ${method} ${requestUrl} attempt ${attempt}/${MAX_NATIVE_FETCH_ATTEMPTS}`);
      const response = await attemptNativeFetch(requestUrl, { method, headers, init });
      const rawStatus = Number(response.status ?? 0);
      const responseText =
        typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? "");
      if (!Number.isFinite(rawStatus) || rawStatus <= 0) {
        throw new Error(
          `Native HTTP request failed.\nURL: ${requestUrl}\nStatus: ${rawStatus || 0}\nPreview: ${safePreview(responseText)}`
        );
      }

      const responseHeaders = new Headers();
      Object.entries(response.headers ?? {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          responseHeaders.set(key, value.join(", "));
          return;
        }
        responseHeaders.set(key, String(value));
      });

      return new Response(responseText, {
        status: rawStatus,
        headers: responseHeaders,
      });
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : String(error);
      errors.push(message);
      if (attempt === MAX_NATIVE_FETCH_ATTEMPTS) {
        throw new Error(`Native HTTP request failed after ${MAX_NATIVE_FETCH_ATTEMPTS} attempts.\n${errors.join("\n")}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  throw new Error("Native HTTP request failed unexpectedly.");
};

if (Capacitor.isNativePlatform()) {
  globalThis.fetch = nativeAwareFetch as typeof globalThis.fetch;
}

const hideBootSplash = () => {
  const splash = document.getElementById("boot-splash");
  if (!splash || splash.classList.contains("is-hidden")) return;
  splash.classList.add("is-hidden");
  window.setTimeout(() => splash.remove(), 260);
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("user");
  window.localStorage.removeItem("token");
  window.sessionStorage.removeItem("user");
  window.sessionStorage.removeItem("token");
};

const spaNavigate = (path: string) => {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const reportRuntimeIssue = (
  source: "error" | "unhandledrejection",
  payload: { message: string; stack?: string }
) => {
  if (typeof window === "undefined") return;
  const issue = {
    source,
    message: payload.message,
    stack: payload.stack ?? "",
    time: new Date().toISOString(),
    path: window.location.pathname + window.location.search + window.location.hash,
  };
  try {
    window.localStorage.setItem(RUNTIME_ISSUE_STORAGE_KEY, JSON.stringify(issue));
  } catch {
    // Ignore storage failures.
  }
  window.dispatchEvent(new CustomEvent("selrs-runtime-issue", { detail: issue }));
};

try {
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  const nav = navEntries?.[0];
  if (nav) {
    const payload = {
      type: nav.type,
      redirectCount: nav.redirectCount,
      time: new Date().toISOString(),
      path: window.location.pathname + window.location.search + window.location.hash,
    };
    window.localStorage.setItem(NAV_TRACE_STORAGE_KEY, JSON.stringify(payload));
    console.warn("[SELRS] Navigation trace", payload);
  }
} catch {
  // Ignore navigation trace failures.
}
try {
  const rawReload = window.localStorage.getItem(RELOAD_TRACE_STORAGE_KEY);
  if (rawReload) {
    const parsed = JSON.parse(rawReload);
    console.warn("[SELRS] Last reload trace", parsed);
  }
} catch {
  // Ignore invalid reload trace payloads.
}
window.addEventListener("error", (event) => {
  const error = event.error instanceof Error ? event.error : null;
  reportRuntimeIssue("error", {
    message: error?.message || event.message || "Unknown runtime error",
    stack: error?.stack,
  });
});

window.addEventListener("selrs-shell-ready", hideBootSplash, { once: true });
document.addEventListener("DOMContentLoaded", hideBootSplash, { once: true });
window.addEventListener("load", hideBootSplash, { once: true });
window.setTimeout(hideBootSplash, 6000);
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (reason instanceof TRPCClientError) return;
  if (reason instanceof Error) {
    reportRuntimeIssue("unhandledrejection", { message: reason.message, stack: reason.stack });
    return;
  }
  reportRuntimeIssue("unhandledrejection", {
    message: typeof reason === "string" ? reason : JSON.stringify(reason),
  });
});

const getTrpcErrorMeta = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return null;
  const code = error.data?.code ?? "UNKNOWN";
  const status = error.data?.httpStatus ?? 0;
  const path = error.data?.path ?? "unknown";
  return { code, status, path, message: error.message };
};

const shouldSuppressApiErrorLog = (error: unknown) => {
  const meta = getTrpcErrorMeta(error);
  if (!meta) return false;

  // Auth-related failures are handled by redirect logic and can be noisy.
  if (meta.code === "UNAUTHORIZED" || meta.status === 401) return true;

  // De-duplicate repeated errors for the same path/code/status.
  const key = `${meta.path}|${meta.code}|${meta.status}|${meta.message}`;
  const now = Date.now();
  const seenAt = recentApiErrors.get(key);
  recentApiErrors.set(key, now);

  for (const [k, t] of recentApiErrors.entries()) {
    if (now - t > RECENT_ERROR_TTL_MS) recentApiErrors.delete(k);
  }

  return typeof seenAt === "number" && now - seenAt < RECENT_ERROR_TTL_MS;
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized =
    error.message === UNAUTHED_ERR_MSG ||
    error.data?.code === "UNAUTHORIZED" ||
    error.data?.httpStatus === 401;

  if (!isUnauthorized) return;

  // Only treat auth endpoints as "log the user out". Other 401s can be transient
  // (e.g., race during reconnect) and clearing the whole query cache looks like a refresh.
  const meta = getTrpcErrorMeta(error);
  if (meta?.path && !meta.path.startsWith("auth.")) return;
  if (!meta?.path) return;

  clearStoredSession();
  void queryClient.cancelQueries();

  if (window.location.pathname === getLoginUrl()) return;
  spaNavigate(getLoginUrl());
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    dispatchApiIssue(error);
    if (shouldSuppressApiErrorLog(error)) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    dispatchApiIssue(error);
    if (shouldSuppressApiErrorLog(error)) return;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl("/api/trpc"),
      transformer: superjson,
      async fetch(input, init) {
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
        const sanitizedRequestUrl = sanitizeTrpcUrl(requestUrl);
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("token") ?? window.sessionStorage.getItem("token")
            : null;
        const patientToken =
          typeof window !== "undefined"
            ? window.localStorage.getItem("patient_portal_token")
            : null;
        const headers = new Headers(init?.headers ?? undefined);
        if (token && !headers.has("authorization")) {
          headers.set("authorization", `Bearer ${token}`);
        }
        if (patientToken && !headers.has("x-patient-token")) {
          headers.set("x-patient-token", patientToken);
        }
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort("timeout"), NATIVE_HTTP_TIMEOUT_MS);
        const callerSignal = init?.signal;

        if (callerSignal) {
          if (callerSignal.aborted) {
            controller.abort(callerSignal.reason);
          } else {
            callerSignal.addEventListener("abort", () => controller.abort(callerSignal.reason), { once: true });
          }
        }

        let response: Response;
        try {
          response = await nativeAwareFetch(sanitizedRequestUrl, {
            ...(init ?? {}),
            credentials: "include",
            headers,
            signal: controller.signal,
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            console.warn(`[trpc] request aborted (timeout) ${sanitizedRequestUrl}`);
            throw new Error(`Request timeout while contacting the SELRS server.\nURL: ${sanitizedRequestUrl}`);
          }
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            console.warn(`[trpc] offline request aborted ${sanitizedRequestUrl}`);
            throw new Error(`No internet connection.\nURL: ${sanitizedRequestUrl}`);
          }
          throw error;
        } finally {
          window.clearTimeout(timeoutId);
        }
        const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
        const bodyText = await response.clone().text().catch(() => "");
        const shouldValidateJson =
          response.status < 400 &&
          (contentType.includes("application/json") || expectsJsonResponse(sanitizedRequestUrl));

        if (shouldValidateJson) {
          const trimmedBody = bodyText.trim();
          if (!trimmedBody) {
            throw new Error(
              `API returned an empty JSON response.\nURL: ${sanitizedRequestUrl}\nStatus: ${response.status}\nContent-Type: ${contentType || "unknown"}`
            );
          }
          if (!isLikelyJsonPayload(trimmedBody)) {
            throw new Error(
              `API returned invalid JSON.\nURL: ${sanitizedRequestUrl}\nStatus: ${response.status}\nContent-Type: ${contentType || "unknown"}\nPreview: ${safePreview(trimmedBody)}`
            );
          }
          try {
            JSON.parse(trimmedBody);
          } catch {
            throw new Error(
              `API returned invalid JSON.\nURL: ${sanitizedRequestUrl}\nStatus: ${response.status}\nContent-Type: ${contentType || "unknown"}\nPreview: ${safePreview(trimmedBody)}`
            );
          }
        }
        if (contentType.includes("text/html")) {
          const preview = safePreview(bodyText);
          throw new Error(
            `API returned HTML instead of JSON.\nURL: ${sanitizedRequestUrl}\nStatus: ${response.status}\nPreview: ${preview}`
          );
        }
        return response;
      },
    }),
  ],
});

hydrateOfflineQueryCache();
installOfflineQueryCachePersistence();

const isDesktopShell =
  typeof navigator !== "undefined" &&
  (navigator.userAgent.includes("SELRSDesktop/1") || navigator.userAgent.includes("SELRS/1"));
if (!Capacitor.isNativePlatform() && !isDesktopShell) {
  installBeforeUnloadGuard();
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<AppShellSkeleton />}>
        <App />
      </Suspense>
    </QueryClientProvider>
  </trpc.Provider>
);
