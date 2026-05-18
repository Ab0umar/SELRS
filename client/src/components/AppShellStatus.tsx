import { Button } from "@/components/ui/button";
import type { ApiIssue } from "@/lib/appRuntime";
import { AlertTriangle, CloudOff, RefreshCcw, Rocket, ShieldAlert, WifiOff } from "lucide-react";

export type RuntimeIssue = {
  message: string;
  stack?: string;
  source: "error" | "unhandledrejection";
  time: string;
};

type BuildInfo = {
  version: string;
  buildTime: string;
  commit: string;
};

type Props = {
  booting: boolean;
  online: boolean;
  serverReachable: boolean | null;
  buildInfo: BuildInfo | null;
  updateAvailable: BuildInfo | null;
  apiIssue: ApiIssue | null;
  offlineCacheCount: number;
  offlineCacheTimeLabel: string | null;
  runtimeIssue: RuntimeIssue | null;
  onRetry: () => void;
  onReload: () => void;
  onRetrySync: () => void;
  onDismissRuntimeIssue: () => void;
  onCopyRuntimeIssue: () => void;
};

export function AppShellStatus({
  booting,
  online,
  serverReachable,
  buildInfo,
  updateAvailable,
  apiIssue,
  offlineCacheCount,
  offlineCacheTimeLabel,
  runtimeIssue,
  onRetry,
  onReload,
  onRetrySync,
  onDismissRuntimeIssue,
  onCopyRuntimeIssue,
}: Props) {
  const showConnectivityBanner = !booting && (!online || serverReachable === false);
  const connectivityTitle = !online ? "No internet connection" : "Cannot reach the server";
  const connectivityBody = !online
    ? "Reconnect to continue syncing live data."
    : "The app shell is open, but live server requests are currently failing.";
  const cardClassName =
    "rounded-[1.4rem] border bg-background/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur";

  return (
    <>
      {booting ? (
        <div className="fixed inset-x-0 top-0 z-[1200] flex justify-center p-3 print:hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/92 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
            <RefreshCcw className="h-4 w-4 animate-spin text-primary" />
            Preparing secure mobile session...
          </div>
        </div>
      ) : null}

      {showConnectivityBanner ? (
        <div className="fixed inset-x-0 top-0 z-[1200] border-b border-amber-300 bg-[linear-gradient(90deg,rgba(255,251,235,0.96),rgba(255,247,237,0.96))] backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
                {!online ? <WifiOff className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
              </div>
              <div>
              <div className="font-semibold">{connectivityTitle}</div>
              <div className="text-amber-800">{connectivityBody}</div>
              {offlineCacheCount > 0 ? (
                <div className="mt-1 text-xs text-amber-700">
                  Cached setup data available{offlineCacheTimeLabel ? ` from ${offlineCacheTimeLabel}` : ""}.
                </div>
              ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onReload}>
                تحديث
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {apiIssue ? (
        <div className={`fixed bottom-3 left-3 z-[1100] w-[min(92vw,28rem)] border-primary/25 ${cardClassName} print:hidden`}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Sync issue</div>
          <div className="mt-1 text-sm text-foreground break-words">{apiIssue.message}</div>
          {apiIssue.path ? (
            <div className="mt-1 text-xs text-slate-500">Path: {apiIssue.path}</div>
          ) : null}
          {typeof apiIssue.status === "number" ? (
            <div className="mt-1 text-xs text-slate-500">Status: {apiIssue.status}</div>
          ) : null}
          {offlineCacheCount > 0 ? (
            <div className="mt-1 text-xs text-slate-500">
              Safe reference data is cached locally{offlineCacheTimeLabel ? ` (${offlineCacheTimeLabel})` : ""}.
            </div>
          ) : null}
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRetrySync}>
              Retry sync
            </Button>
            <Button type="button" size="sm" onClick={onReload}>
              تحديث
            </Button>
          </div>
        </div>
      ) : null}

      {updateAvailable ? (
        <div className={`fixed bottom-3 left-1/2 z-[1100] w-[min(92vw,28rem)] -translate-x-1/2 border-secondary/40 ${cardClassName} print:hidden`}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-secondary/15 p-2 text-secondary">
              <Rocket className="h-4 w-4" />
            </div>
            <div>
          <div className="text-sm font-semibold text-foreground">A newer app build is available</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Current: {buildInfo?.version ?? "unknown"} / {buildInfo?.buildTime ?? "unknown"}
          </div>
          <div className="text-xs text-muted-foreground">
            New: {updateAvailable.version} / {updateAvailable.buildTime}
          </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Recheck
            </Button>
            <Button type="button" size="sm" onClick={onReload}>
              تحديث
            </Button>
          </div>
        </div>
      ) : null}

      {runtimeIssue ? (
        <div className={`fixed bottom-3 right-3 z-[1100] w-[min(92vw,30rem)] border-rose-300 ${cardClassName} print:hidden`}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-rose-100 p-2 text-rose-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-rose-700">Runtime issue detected</div>
          <div className="mt-1 text-sm text-foreground break-words">{runtimeIssue.message}</div>
          <div className="mt-1 text-xs text-slate-500">
            {runtimeIssue.source} at {new Date(runtimeIssue.time).toLocaleString()}
          </div>
            </div>
          </div>
          {runtimeIssue.stack ? (
            <pre className="mt-3 max-h-28 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
              {runtimeIssue.stack}
            </pre>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onDismissRuntimeIssue}>
              Dismiss
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCopyRuntimeIssue}>
              Copy details
            </Button>
            <Button type="button" size="sm" onClick={onReload}>
              تحديث
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
