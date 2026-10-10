import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { getMobileQaEnabled, setMobileQaEnabled } from "@/lib/mobileQa";
import { getApiUrl } from "@/const";
import {
  Activity,
  CheckCircle2,
  RefreshCw,
  Timer,
  XCircle,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { requestAppReload } from "@/lib/appRuntime";
import { cn } from "@/lib/utils";
import AdminSettings from "./AdminSettings";

type HealthState = {
  ok: boolean;
  env?: string;
  dbConnected?: boolean;
  patientsCount?: number;
  dbError?: string;
  web4000?: boolean;
  api3000?: boolean;
  tunnelConnected?: boolean;
  tunnelInfo?: string;
  latestBackupFile?: string;
  latestBackupAt?: string;
};

type HealthSignal = "ok" | "error" | "loading" | "unknown";

type ActivityRow = {
  at: string;
  label: string;
  signal: HealthSignal;
};

const HEALTH_SIGNAL_LABELS: Record<HealthSignal, string> = {
  ok: "يعمل",
  error: "تعذر التحقق",
  loading: "جارٍ التحقق",
  unknown: "غير متاح",
};

const HEALTH_SIGNAL_BADGES: Record<
  HealthSignal,
  "success" | "destructive" | "secondary" | "outline"
> = {
  ok: "success",
  error: "destructive",
  loading: "secondary",
  unknown: "outline",
};

function healthSignalClass(signal: HealthSignal) {
  if (signal === "ok") return "bg-success";
  if (signal === "error") return "bg-destructive";
  if (signal === "loading") return "bg-muted-foreground";
  return "bg-muted-foreground/60";
}

const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined"
    ? __APP_VERSION__
    : ((import.meta as any)?.env?.VITE_APP_VERSION ?? "unknown");

const BUILD_TIME =
  typeof __BUILD_TIME__ !== "undefined"
    ? __BUILD_TIME__
    : ((import.meta as any)?.env?.VITE_BUILD_TIME ?? "unknown");

function formatSessionDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h} س ${m % 60} د`;
  if (m > 0) return `${m} د ${s % 60} ث`;
  return `${s} ث`;
}

export default function AdminStatus() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const isSettingsRoute = location.replace(/\/$/, "") === "/admin-hub/settings";
  const [qaEnabled, setQaEnabled] = useState(false);
  const [probeResult, setProbeResult] = useState<string>("-");
  const [nativeProbeResult, setNativeProbeResult] = useState<string>("-");
  const [healthLatencyMs, setHealthLatencyMs] = useState<number | null>(null);
  const [isHealthLatencyLoading, setIsHealthLatencyLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [sessionMs, setSessionMs] = useState(0);

  const migrationsQuery = trpc.system.listMigrations.useQuery(undefined, {
    enabled: !isSettingsRoute,
    refetchOnWindowFocus: false,
  });
  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    enabled: !isSettingsRoute,
    refetchOnWindowFocus: false,
  });
  const serverBuildQuery = trpc.medical.getBuildInfo.useQuery(undefined, {
    enabled: !isSettingsRoute,
    refetchOnWindowFocus: false,
  });
  const health = (opsHealthQuery.data ?? null) as HealthState | null;
  const serverBuild = serverBuildQuery.data;

  const buildInfo = useMemo(() => {
    const cssAsset =
      typeof document !== "undefined"
        ? (document
            .querySelector('link[rel="stylesheet"]')
            ?.getAttribute("href") ?? "-")
        : "-";
    return {
      version: APP_VERSION,
      buildTime: BUILD_TIME,
      origin: typeof window !== "undefined" ? window.location.origin : "-",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "-",
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : "-",
      cssAsset,
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    setQaEnabled(getMobileQaEnabled());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setSessionMs(performance.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const measureHealthLatency = useCallback(async () => {
    if (isSettingsRoute) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    setIsHealthLatencyLoading(true);
    try {
      const t0 = performance.now();
      const response = await fetch(getApiUrl("/healthz"), {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const t1 = performance.now();
      setHealthLatencyMs(response.ok ? Math.max(0, Math.round(t1 - t0)) : null);
    } catch {
      setHealthLatencyMs(null);
    } finally {
      window.clearTimeout(timeoutId);
      setIsHealthLatencyLoading(false);
    }
  }, [isSettingsRoute]);

  useEffect(() => {
    void measureHealthLatency();
  }, [measureHealthLatency, opsHealthQuery.dataUpdatedAt]);

  const runApiProbe = async () => {
    setIsProbing(true);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort("timeout"),
        8000,
      );
      const response = await fetch(getApiUrl("/healthz"), {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });
      window.clearTimeout(timeoutId);
      const body = await response.text();
      setProbeResult(
        `HTTP ${response.status} ${response.statusText} | ${body.slice(0, 180)}`,
      );
    } catch (error: unknown) {
      const name = error instanceof Error ? error.name : "Error";
      const message = String(
        error instanceof Error
          ? error.message
          : (error ?? "Unknown fetch error"),
      );
      setProbeResult(`${name}: ${message}`);
    }

    if (!Capacitor.isNativePlatform()) {
      setNativeProbeResult("web-only");
      setIsProbing(false);
      return;
    }

    try {
      const response = await CapacitorHttp.get({
        url: getApiUrl("/healthz"),
        headers: {
          Accept: "application/json",
        },
        connectTimeout: 8000,
        readTimeout: 8000,
      });
      const body =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);
      setNativeProbeResult(`HTTP ${response.status} | ${body.slice(0, 180)}`);
    } catch (error: unknown) {
      const name = error instanceof Error ? error.name : "Error";
      const message = String(
        error instanceof Error
          ? error.message
          : (error ?? "Unknown native HTTP error"),
      );
      setNativeProbeResult(`${name}: ${message}`);
    } finally {
      setIsProbing(false);
    }
  };

  if (!isAuthenticated || user?.role !== "admin") return null;

  const migrationCount = (migrationsQuery.data?.migrations ?? []).length;

  const toggleQa = (enabled: boolean) => {
    setQaEnabled(enabled);
    setMobileQaEnabled(enabled);
    window.dispatchEvent(new Event("mobile-qa-toggle"));
  };

  const copyBuildInfo = async () => {
    const payload = [
      `version=${buildInfo.version}`,
      `buildTime=${buildInfo.buildTime}`,
      `origin=${buildInfo.origin}`,
      `viewport=${buildInfo.viewport}`,
      `cssAsset=${buildInfo.cssAsset}`,
      `userAgent=${buildInfo.userAgent}`,
      `mobileQa=${qaEnabled ? "on" : "off"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // no-op
    }
  };

  const resetAppCache = async () => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();

      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
    } finally {
      requestAppReload("admin-status-cache-reset");
    }
  };

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        migrationsQuery.refetch(),
        opsHealthQuery.refetch(),
        serverBuildQuery.refetch(),
        measureHealthLatency(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const healthQuerySignal: HealthSignal = opsHealthQuery.isLoading
    ? "loading"
    : opsHealthQuery.isError
      ? "error"
      : health
        ? "ok"
        : "unknown";
  const serverSignal: HealthSignal =
    healthQuerySignal === "ok"
      ? health?.ok
        ? "ok"
        : "error"
      : healthQuerySignal;
  const dbSignal: HealthSignal =
    healthQuerySignal === "ok"
      ? health?.dbConnected
        ? "ok"
        : "error"
      : healthQuerySignal;
  const backupOk = Boolean(health?.latestBackupAt || health?.latestBackupFile);
  const backupSignal: HealthSignal =
    healthQuerySignal === "ok"
      ? backupOk
        ? "ok"
        : "error"
      : healthQuerySignal;
  const latencySignal: HealthSignal = isHealthLatencyLoading
    ? "loading"
    : healthLatencyMs != null
      ? "ok"
      : "unknown";
  const apiLineSignal: HealthSignal =
    serverSignal === "error"
      ? "error"
      : serverSignal === "loading" || latencySignal === "loading"
        ? "loading"
        : serverSignal === "ok" && latencySignal === "ok"
          ? "ok"
          : "unknown";
  const migrationSignal: HealthSignal = migrationsQuery.isLoading
    ? "loading"
    : migrationsQuery.isError
      ? "error"
      : "ok";
  const tunnelSignal: HealthSignal =
    healthQuerySignal === "ok"
      ? health?.tunnelConnected
        ? "ok"
        : "error"
      : healthQuerySignal;

  const activityRows: ActivityRow[] = [];
  if (health?.latestBackupAt) {
    activityRows.push({
      at: String(health.latestBackupAt),
      label: health.latestBackupFile
        ? `نسخ احتياطي: ${health.latestBackupFile}`
        : "تم تسجيل نسخة احتياطية",
      signal: "ok",
    });
  }
  activityRows.push({
    at: new Date().toLocaleString("ar"),
    label: `فحص صحة الخادم: ${HEALTH_SIGNAL_LABELS[serverSignal]}`,
    signal: serverSignal,
  });
  activityRows.push({
    at: migrationsQuery.isLoading ? "—" : new Date().toLocaleString("ar"),
    label:
      migrationSignal === "loading"
        ? "جارٍ تحميل ترحيلات قاعدة البيانات"
        : `ترحيلات قاعدة البيانات المسجّلة: ${migrationCount}`,
    signal: migrationSignal,
  });

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-start"
      dir="rtl"
    >
      <PageHeader
        title={isSettingsRoute ? "إعدادات المركز" : "حالة النظام"}
        subtitle={
          isSettingsRoute
            ? "إعدادات الاتصال ووضع النماذج التي تحفظها هذه الواجهة."
            : "مراقبة الاتصال، زمن الاستجابة، وصحة الخدمات الحيوية."
        }
        icon={
          isSettingsRoute ? (
            <Settings className="h-5 w-5 text-primary" />
          ) : (
            <Activity className="h-5 w-5 text-primary" />
          )
        }
        action={
          !isSettingsRoute ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-border/60 bg-background font-bold shadow-sm"
              onClick={() => void refreshStatus()}
              disabled={isRefreshing}
              aria-busy={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                aria-hidden="true"
              />
              {isRefreshing ? "جارٍ تحديث البيانات" : "تحديث البيانات"}
            </Button>
          ) : undefined
        }
      />

      {isSettingsRoute ? (
        <section aria-labelledby="admin-settings-title">
          <h2 id="admin-settings-title" className="sr-only">
            إعدادات المركز
          </h2>
          <AdminSettings />
        </section>
      ) : (
        <>
          <div
            className="grid overflow-hidden rounded-lg border border-border bg-background sm:grid-cols-2 lg:grid-cols-4"
            role="status"
            aria-live="polite"
            aria-label="ملخص حالة الخدمات"
          >
            {[
              {
                label: "خادم التطبيق",
                value: HEALTH_SIGNAL_LABELS[serverSignal],
                signal: serverSignal,
              },
              {
                label: "زمن الاستجابة",
                value:
                  latencySignal === "ok"
                    ? `${healthLatencyMs} ms`
                    : latencySignal === "loading"
                      ? "جارٍ القياس"
                      : "لم يُقَس",
                signal: latencySignal,
              },
              {
                label: "قاعدة البيانات",
                value:
                  dbSignal === "ok"
                    ? "متصلة"
                    : dbSignal === "error"
                      ? "خطأ اتصال"
                      : HEALTH_SIGNAL_LABELS[dbSignal],
                signal: dbSignal,
              },
              {
                label: "النسخ الاحتياطي",
                value:
                  backupSignal === "ok"
                    ? "تتوفر نسخة حديثة"
                    : backupSignal === "error"
                      ? "لا توجد نسخة حديثة"
                      : HEALTH_SIGNAL_LABELS[backupSignal],
                signal: backupSignal,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:border-e lg:border-b-0"
              >
                <div>
                  <p className="text-[13px] font-bold text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-black">{item.value}</p>
                </div>
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    healthSignalClass(item.signal),
                  )}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Service Health Checklist */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="overflow-hidden rounded-lg border-border/60 bg-card shadow-none">
                <CardHeader className="border-b bg-muted/5 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    فحص تكامل الخدمات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4" aria-live="polite">
                  {[
                    {
                      id: "api",
                      label: "خادم API",
                      signal: apiLineSignal,
                      desc:
                        apiLineSignal === "ok"
                          ? "الخدمة تستجيب بشكل سليم للطلبات الخارجية."
                          : apiLineSignal === "loading"
                            ? "جارٍ فحص استجابة الخادم وزمنها."
                            : "تعذر الحصول على استجابة مؤكدة من الخادم.",
                      latency: healthLatencyMs,
                      tunnel: "unknown" as HealthSignal,
                    },
                    {
                      id: "db",
                      label: "قاعدة البيانات المحلية",
                      signal: dbSignal,
                      desc:
                        dbSignal === "ok"
                          ? "اتصال Drizzle/MySQL نشط ومستقر حالياً."
                          : dbSignal === "loading"
                            ? "جارٍ التحقق من اتصال قاعدة البيانات."
                            : "تعذر تأكيد الاتصال بقاعدة البيانات المحلية.",
                      error: health?.dbError,
                      tunnel: "unknown" as HealthSignal,
                    },
                    {
                      id: "backup",
                      label: "نظام الأرشفة والنسخ",
                      signal: backupSignal,
                      desc:
                        backupSignal === "ok"
                          ? "تتوفر بيانات عن نسخة احتياطية حديثة."
                          : backupSignal === "loading"
                            ? "جارٍ التحقق من سجل النسخ الاحتياطي."
                            : "لا تتوفر بيانات مؤكدة عن نسخة احتياطية حديثة.",
                      tunnel: tunnelSignal,
                    },
                  ].map((s) => (
                    <div
                      key={s.id}
                      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "shrink-0 rounded-lg border bg-background p-2 shadow-sm",
                            s.signal === "ok"
                              ? "border-success/20 text-success"
                              : s.signal === "loading" || s.signal === "unknown"
                                ? "border-border text-muted-foreground"
                                : "border-destructive/20 text-destructive",
                          )}
                        >
                          {s.signal === "ok" ? (
                            <CheckCircle2
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            <XCircle className="h-5 w-5" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground/90">
                            {s.label}
                          </div>
                          <p className="max-w-md break-words text-[13px] leading-relaxed text-muted-foreground">
                            {s.desc}{" "}
                            {s.latency != null &&
                              `زمن الاستجابة: ${s.latency} ms.`}
                            {s.error && (
                              <span className="mt-1 block break-all font-mono text-destructive/80">
                                {s.error}
                              </span>
                            )}
                            {s.id === "backup" && (
                              <span className="block mt-1">
                                نفق المزامنة: {HEALTH_SIGNAL_LABELS[s.tunnel]}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={HEALTH_SIGNAL_BADGES[s.signal]}
                        className="shrink-0 px-3 py-0.5 text-[13px] font-bold"
                      >
                        {HEALTH_SIGNAL_LABELS[s.signal]}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/5 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    سجل مختصر للأحداث
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div
                    className="space-y-2 p-3 sm:hidden"
                    aria-label="سجل الأحداث"
                  >
                    {activityRows.map((row) => (
                      <div
                        key={`${row.at}-${row.label}`}
                        className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-[13px] text-muted-foreground tabular-nums">
                            {row.at}
                          </p>
                          <p className="mt-1 break-words text-xs font-medium">
                            {row.label}
                          </p>
                        </div>
                        <Badge
                          variant={HEALTH_SIGNAL_BADGES[row.signal]}
                          className="shrink-0 text-[13px]"
                        >
                          {HEALTH_SIGNAL_LABELS[row.signal]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <Table
                      dir="rtl"
                      className="text-start"
                      aria-label="سجل الأحداث"
                    >
                      <TableHeader className="bg-primary/5">
                        <TableRow className="h-10 hover:bg-transparent">
                          <TableHead className="text-start text-xs font-bold text-primary">
                            التوقيت
                          </TableHead>
                          <TableHead className="text-start text-xs font-bold text-primary">
                            الحدث
                          </TableHead>
                          <TableHead className="w-24 text-center text-xs font-bold text-primary">
                            الحالة
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityRows.map((row) => (
                          <TableRow
                            key={`${row.at}-${row.label}`}
                            className="hover:bg-primary/[0.02]"
                          >
                            <TableCell className="max-w-[140px] text-[13px] text-muted-foreground tabular-nums">
                              {row.at}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {row.label}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={HEALTH_SIGNAL_BADGES[row.signal]}
                                className="px-2 text-[13px]"
                              >
                                {HEALTH_SIGNAL_LABELS[row.signal]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-border/60 bg-card shadow-sm h-fit">
                <CardHeader className="border-b bg-muted/5 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    بيانات البناء
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "إصدار الواجهة",
                        value: buildInfo.version,
                        mono: true,
                      },
                      {
                        label: "إصدار السيرفر",
                        value: serverBuild?.version ?? "—",
                        mono: true,
                      },
                      {
                        label: "الجلسة",
                        value: formatSessionDuration(sessionMs),
                      },
                      { label: "الترحيلات", value: migrationCount },
                      { label: "البيئة", value: health?.env ?? "—" },
                    ].map((i) => (
                      <div
                        key={i.label}
                        className="bg-muted/20 p-2.5 rounded-lg border border-border/40"
                      >
                        <div className="text-[13px] text-muted-foreground font-bold mb-0.5">
                          {i.label}
                        </div>
                        <div
                          className={cn(
                            "text-xs font-bold truncate",
                            i.mono && "font-mono",
                          )}
                        >
                          {i.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    <div className="text-[13px] text-muted-foreground font-bold mb-0.5">
                      وقت البناء
                    </div>
                    <div className="text-xs font-mono break-all">
                      {serverBuild?.buildTime ?? buildInfo.buildTime}
                    </div>
                  </div>
                  <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    <div className="text-[13px] text-muted-foreground font-bold mb-0.5">
                      Commit
                    </div>
                    <div className="text-xs font-mono break-all">
                      {serverBuild?.commit ?? "—"}
                    </div>
                  </div>
                  <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    <div className="text-[13px] text-muted-foreground font-bold mb-0.5">
                      المنشأ / API
                    </div>
                    <div className="text-[13px] font-mono break-all" dir="ltr">
                      {buildInfo.origin}
                    </div>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 flex-1 text-[13px] font-bold"
                      onClick={() => void runApiProbe()}
                      disabled={isProbing}
                      aria-busy={isProbing}
                    >
                      {isProbing ? "جارٍ فحص API" : "فحص API يدوياً"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 text-[13px] font-bold"
                      onClick={() => void copyBuildInfo()}
                    >
                      نسخ التقرير
                    </Button>
                  </div>
                  {probeResult !== "-" || nativeProbeResult !== "-" ? (
                    <div
                      className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-2 text-[13px]"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="break-all" dir="ltr">
                        نتيجة فحص الويب: {probeResult}
                      </p>
                      <p className="break-all" dir="ltr">
                        نتيجة فحص التطبيق: {nativeProbeResult}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-sm h-fit">
                <CardHeader className="border-b bg-muted/5 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    تحكم الأدوات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold">وضع فحص الموبايل</div>
                      <div className="text-[13px] text-muted-foreground">
                        تمييز التجاوزات في النماذج.
                      </div>
                    </div>
                    <Switch
                      checked={qaEnabled}
                      onCheckedChange={toggleQa}
                      aria-label="تشغيل وضع فحص الموبايل"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full border-dashed border-warning/50 bg-warning/10 text-xs font-bold text-warning-text hover:bg-warning/20"
                    onClick={() => void resetAppCache()}
                  >
                    إعادة ضبط ذاكرة التخزين المؤقت
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
