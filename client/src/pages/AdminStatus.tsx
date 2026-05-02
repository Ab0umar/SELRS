import { useEffect, useMemo, useState } from "react";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { getMobileQaEnabled, setMobileQaEnabled } from "@/lib/mobileQa";
import { getApiOrigin, getApiUrl } from "@/const";
import { Activity, CheckCircle2, Database, HardDrive, RefreshCw, Server, Timer, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { requestAppReload } from "@/lib/appRuntime";
import { cn } from "@/lib/utils";

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

const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined"
    ? __APP_VERSION__
    : (import.meta as any)?.env?.VITE_APP_VERSION ?? "unknown";

const BUILD_TIME =
  typeof __BUILD_TIME__ !== "undefined"
    ? __BUILD_TIME__
    : (import.meta as any)?.env?.VITE_BUILD_TIME ?? "unknown";

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
  const [, setLocation] = useLocation();
  const [qaEnabled, setQaEnabled] = useState(false);
  const [probeResult, setProbeResult] = useState<string>("-");
  const [nativeProbeResult, setNativeProbeResult] = useState<string>("-");
  const [healthLatencyMs, setHealthLatencyMs] = useState<number | null>(null);
  const [sessionMs, setSessionMs] = useState(0);

  const migrationsQuery = trpc.system.listMigrations.useQuery(undefined, { refetchOnWindowFocus: false });
  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, { refetchOnWindowFocus: false });
  const health = (opsHealthQuery.data ?? null) as HealthState | null;

  const buildInfo = useMemo(() => {
    const cssAsset =
      typeof document !== "undefined" ? document.querySelector('link[rel="stylesheet"]')?.getAttribute("href") ?? "-" : "-";
    return {
      version: APP_VERSION,
      buildTime: BUILD_TIME,
      origin: typeof window !== "undefined" ? window.location.origin : "-",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "-",
      viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "-",
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t0 = performance.now();
      try {
        const r = await fetch(getApiUrl("/healthz"), {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const t1 = performance.now();
        if (!cancelled) setHealthLatencyMs(r.ok ? Math.max(0, Math.round(t1 - t0)) : null);
      } catch {
        if (!cancelled) setHealthLatencyMs(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opsHealthQuery.dataUpdatedAt]);

  const runApiProbe = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort("timeout"), 8000);
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
      setProbeResult(`HTTP ${response.status} ${response.statusText} | ${body.slice(0, 180)}`);
    } catch (error: any) {
      const name = String(error?.name ?? "Error");
      const message = String(error?.message ?? error ?? "Unknown fetch error");
      setProbeResult(`${name}: ${message}`);
    }

    if (!Capacitor.isNativePlatform()) {
      setNativeProbeResult("web-only");
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
      const body = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      setNativeProbeResult(`HTTP ${response.status} | ${body.slice(0, 180)}`);
    } catch (error: any) {
      const name = String(error?.name ?? "Error");
      const message = String(error?.message ?? error ?? "Unknown native HTTP error");
      setNativeProbeResult(`${name}: ${message}`);
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

  const serverOk = Boolean(health?.ok);
  const dbOk = Boolean(health?.dbConnected);
  const backupOk = Boolean(health?.latestBackupAt || health?.latestBackupFile);
  const apiLineOk = serverOk && healthLatencyMs != null;

  const activityRows: { at: string; label: string; ok: boolean }[] = [];
  if (health?.latestBackupAt) {
    activityRows.push({
      at: String(health.latestBackupAt),
      label: health.latestBackupFile ? `نسخ احتياطي: ${health.latestBackupFile}` : "تم تسجيل نسخة احتياطية",
      ok: true,
    });
  }
  activityRows.push({
    at: new Date().toLocaleString("ar"),
    label: `فحص صحة الخادم (${serverOk ? "نجاح" : "فشل أو غير مكتمل"})`,
    ok: serverOk,
  });
  activityRows.push({
    at: migrationsQuery.isLoading ? "…" : new Date().toLocaleString("ar"),
    label: `ترحيلات قاعدة البيانات المسجّلة: ${migrationCount}`,
    ok: !migrationsQuery.isError,
  });

  const tunnelOk = Boolean(health?.tunnelConnected);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-right" dir="rtl">
      <PageHeader
        title="حالة النظام"
        subtitle="مراقبة الاتصال بالخادم وقاعدة البيانات وزمن الاستجابة والنسخ الاحتياطي"
        icon={<Activity className="h-5 w-5" />}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-primary/25 bg-primary/5"
            onClick={() => requestAppReload("admin-status")}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث الصفحة
          </Button>
        }
      />

      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4")}>
        <StatCard
          title="حالة الخادم"
          value={opsHealthQuery.isLoading ? "…" : serverOk ? "متصل" : "غير متصل"}
          icon={Server}
          iconColor={serverOk ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}
          description={health?.env ? `بيئة: ${health.env}` : undefined}
        />
        <StatCard
          title="استجابة API"
          value={healthLatencyMs != null ? `${healthLatencyMs} ms` : "—"}
          icon={Timer}
          iconColor="bg-primary/10 text-primary"
          description="قياس من المتصفح إلى /healthz"
        />
        <StatCard
          title="قاعدة البيانات"
          value={opsHealthQuery.isLoading ? "…" : dbOk ? "متصلة" : "غير متصلة"}
          icon={Database}
          iconColor={dbOk ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}
          description={health?.patientsCount != null ? `مرضى (عيّنة): ${health.patientsCount}` : undefined}
        />
        <StatCard
          title="النسخ الاحتياطي"
          value={backupOk ? "متوفر" : "—"}
          icon={HardDrive}
          iconColor={backupOk ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" : "bg-muted text-muted-foreground"}
          description={health?.latestBackupAt ? String(health.latestBackupAt).slice(0, 40) : "لا يعرض الخادم تفاصيل مساحة القرص حالياً"}
        />
      </div>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">فحص صحة الخدمات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {apiLineOk ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />}
              <div>
                <div className="font-semibold">خادم API</div>
                <p className="text-sm text-muted-foreground">
                  {serverOk ? "الخدمة تردّ وفق تقرير الخادم." : "التقرير غير سليم أو بانتظار الاتصال."}{" "}
                  {healthLatencyMs != null ? `زمن جولة المتصفح: ${healthLatencyMs} ms.` : ""}
                </p>
              </div>
            </div>
            <Badge variant={apiLineOk ? "secondary" : "destructive"} className="shrink-0 w-fit">
              {apiLineOk ? "طبيعي" : "يتطلب انتباهاً"}
            </Badge>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {dbOk ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />}
              <div>
                <div className="font-semibold">قاعدة البيانات</div>
                <p className="text-sm text-muted-foreground">
                  {dbOk ? "الاتصال متاح حسب تقرير الخادم." : "غير متصلة أو بلا تقرير."}
                  {health?.dbError ? ` — ${health.dbError}` : ""}
                </p>
              </div>
            </div>
            <Badge variant={dbOk ? "secondary" : "destructive"} className="shrink-0 w-fit">
              {dbOk ? "مستقر" : "خطأ"}
            </Badge>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {backupOk ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />}
              <div>
                <div className="font-semibold">التخزين / النسخ الاحتياطي</div>
                <p className="text-sm text-muted-foreground">
                  {backupOk
                    ? "تتوفر معلومات آخر نسخة من الخادم (لا يشمل نسبة امتلاء القرص)."
                    : "لا توجد بيانات نسخ احتياطي من التقرير الحالي."}
                  {health?.tunnelInfo ? ` — ${health.tunnelInfo}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tunnel: {tunnelOk ? "متصل" : "غير متصل"}
                </p>
              </div>
            </div>
            <Badge variant={backupOk ? "secondary" : "outline"} className="shrink-0 w-fit">
              {backupOk ? "متوفر" : "غير مُبلَّغ"}
            </Badge>
          </div>

          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
            Web / منفذ dev (4000 أو 5173)، ومسار API المنفصل (3000)، يظهران في تقرير الخادم تحت الحقول web4000 / api3000 عند تشغيل بيئة التطوير المزدوجة.
            <div className="mt-1">
              Web: {health?.web4000 ? "نعم" : "لا"} · API مستقل: {health?.api3000 ? "نعم" : "لا"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">معلومات النظام</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground">الإصدار</div>
              <div className="font-semibold dir-ltr text-right">{buildInfo.version}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground">وقت البناء</div>
              <div className="font-semibold break-all">{buildInfo.buildTime}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground">مدة الجلسة (المتصفح)</div>
              <div className="font-semibold">{formatSessionDuration(sessionMs)}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground">آخر نسخ احتياطي (تقرير)</div>
              <div className="font-semibold break-all">{health?.latestBackupAt || "—"}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">المنشأ / API</div>
              <div className="break-all dir-ltr text-right text-xs">{buildInfo.origin} · {getApiOrigin()}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">سجل مختصر (من بيانات هذه الشاشة)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-bold">التوقيت / المصدر</TableHead>
                    <TableHead className="text-right font-bold">الحدث</TableHead>
                    <TableHead className="text-center font-bold w-24">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[140px] text-xs text-muted-foreground break-all">{row.at}</TableCell>
                      <TableCell className="text-sm">{row.label}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={row.ok ? "secondary" : "destructive"}>{row.ok ? "نجاح" : "تنبيه"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/80 bg-card shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">ترحيلات قاعدة البيانات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">العدد: {migrationCount}</div>
            <div className="text-sm text-muted-foreground">
              {migrationsQuery.isLoading ? "جارٍ التحميل…" : migrationsQuery.isError ? "تعذّر الجلب" : "جاهز"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">تفاصيل البناء والفحص</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs break-all text-muted-foreground space-y-1">
              <div>Health URL: {getApiUrl("/healthz")}</div>
              <div>Viewport: {buildInfo.viewport}</div>
              <div>CSS: {buildInfo.cssAsset}</div>
              <div>UA: {buildInfo.userAgent}</div>
              <div>API Probe: {probeResult}</div>
              <div>Native Probe: {nativeProbeResult}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/25 bg-primary/5 text-primary"
                onClick={() => void runApiProbe()}
              >
                فحص API يدوياً
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-200 bg-amber-50 text-amber-800 dark:text-amber-950"
                onClick={() => void copyBuildInfo()}
              >
                نسخ معلومات البناء
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">ضبط الجودة (موبايل)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">إبراز التجاوز الأفقي في صفحات الشيتات</div>
            <Switch checked={qaEnabled} onCheckedChange={toggleQa} />
          </div>
          <div className="text-xs text-muted-foreground">
            عند التفعيل يُعلَّم تجاوز العرض بإطار أحمر منقط أثناء تصفّح الشيتات.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-200 bg-amber-50 text-amber-800 dark:text-amber-950"
            onClick={() => void resetAppCache()}
          >
            إعادة ضبط كاش التطبيق
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
