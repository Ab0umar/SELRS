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
import { Activity, CheckCircle2, Database, HardDrive, RefreshCw, Server, Timer, XCircle, Settings } from "lucide-react";
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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-right" dir="rtl">
      <PageHeader
        title="حالة النظام"
        subtitle="مراقبة الاتصال، زمن الاستجابة، وصحة الخدمات الحيوية."
        icon={<Activity className="h-5 w-5 text-primary" />}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 h-9 border-border/60 hover:bg-background shadow-sm font-bold"
            onClick={() => requestAppReload("admin-status")}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث البيانات
          </Button>
        }
      />

      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4")}>
        <StatCard
          title="خادم التطبيق"
          value={opsHealthQuery.isLoading ? "…" : serverOk ? "متصل" : "غير متصل"}
          icon={Server}
          iconColor={serverOk ? "bg-success/10 text-success shadow-sm shadow-success/15" : "bg-destructive text-destructive-foreground"}
          description={health?.env ? `البيئة: ${health.env}` : "جاري التحقق…"}
        />
        <StatCard
          title="سرعة الاستجابة"
          value={healthLatencyMs != null ? `${healthLatencyMs} ms` : "—"}
          icon={Timer}
          iconColor="bg-primary/10 text-primary shadow-sm shadow-primary/10"
          description="زمن جولة المتصفح"
        />
        <StatCard
          title="قاعدة البيانات"
          value={opsHealthQuery.isLoading ? "…" : dbOk ? "مستقرة" : "خطأ اتصال"}
          icon={Database}
          iconColor={dbOk ? "bg-success/10 text-success shadow-sm shadow-success/15" : "bg-destructive text-destructive-foreground"}
          description={health?.patientsCount != null ? `السجلات: ${health.patientsCount}` : "لا توجد بيانات"}
        />
        <StatCard
          title="النسخ الاحتياطي"
          value={backupOk ? "مفعل" : "معطل"}
          icon={HardDrive}
          iconColor={backupOk ? "bg-warning/10 text-warning/90 shadow-sm shadow-warning/15" : "bg-muted text-muted-foreground"}
          description={health?.latestBackupAt ? "تتوفر نسخ حديثة" : "يتطلب فحص يدوي"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Service Health Checklist */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/5 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                فحص تكامل الخدمات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { 
                  id: "api", 
                  label: "خادم API", 
                  ok: apiLineOk, 
                  desc: serverOk ? "الخدمة تستجيب بشكل سليم للطلبات الخارجية." : "تعذر الحصول على استجابة من الخادم.",
                  latency: healthLatencyMs,
                  variant: apiLineOk ? "secondary" : "destructive" as const
                },
                { 
                  id: "db", 
                  label: "قاعدة البيانات (Local)", 
                  ok: dbOk, 
                  desc: dbOk ? "اتصال Drizzle/MySQL نشط ومستقر حالياً." : "فشل الاتصال بقاعدة البيانات المحلية.",
                  error: health?.dbError,
                  variant: dbOk ? "secondary" : "destructive" as const
                },
                { 
                  id: "backup", 
                  label: "نظام الأرشفة والنسخ", 
                  ok: backupOk, 
                  desc: backupOk ? "تقارير النسخ الاحتياطي تشير إلى توفر ملفات الأرشفة." : "لا تتوفر تقارير حديثة عن النسخ الاحتياطي.",
                  tunnel: tunnelOk,
                  variant: backupOk ? "secondary" : "outline" as const
                }
              ].map((s) => (
                <div key={s.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg bg-background shadow-sm border", s.ok ? "text-success border-success/20" : "text-destructive border-destructive/20")}>
                      {s.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground/90">{s.label}</div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground max-w-md">
                        {s.desc} {s.latency && `زمن الاستجابة: ${s.latency} ms.`}
                        {s.error && <span className="block mt-1 font-mono text-destructive/80">{s.error}</span>}
                        {s.id === "backup" && <span className="block mt-1">نفق المزامنة: {s.tunnel ? "متصل" : "غير متصل"}</span>}
                      </p>
                    </div>
                  </div>
                  <Badge variant={s.variant as any} className="shrink-0 font-bold px-3 py-0.5 text-[10px]">
                    {s.ok ? "مستقر" : "تنبيه"}
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
              <Table dir="rtl" className="text-right">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent h-10">
                    <TableHead className="text-right font-bold text-primary text-xs">التوقيت</TableHead>
                    <TableHead className="text-right font-bold text-primary text-xs">الحدث</TableHead>
                    <TableHead className="text-center font-bold text-primary text-xs w-24">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityRows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-primary/[0.02]">
                      <TableCell className="max-w-[140px] text-[10px] text-muted-foreground tabular-nums">{row.at}</TableCell>
                      <TableCell className="text-xs font-medium">{row.label}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={row.ok ? "secondary" : "destructive"} className="h-5 text-[9px] px-2">
                          {row.ok ? "نجاح" : "فشل"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                   { label: "الإصدار", value: buildInfo.version, mono: true },
                   { label: "الجلسة", value: formatSessionDuration(sessionMs) },
                   { label: "الترحيلات", value: migrationCount },
                   { label: "البيئة", value: health?.env ?? "—" }
                 ].map((i) => (
                   <div key={i.label} className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                     <div className="text-[10px] text-muted-foreground font-bold mb-0.5">{i.label}</div>
                     <div className={cn("text-xs font-bold truncate", i.mono && "font-mono")}>{i.value}</div>
                   </div>
                 ))}
               </div>
               <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                 <div className="text-[10px] text-muted-foreground font-bold mb-0.5">وقت البناء</div>
                 <div className="text-xs font-mono break-all">{buildInfo.buildTime}</div>
               </div>
               <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                 <div className="text-[10px] text-muted-foreground font-bold mb-0.5">المنشأ / API</div>
                 <div className="text-[10px] font-mono break-all" dir="ltr">{buildInfo.origin}</div>
               </div>
               <div className="pt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] font-bold" onClick={() => void runApiProbe()}>فحص API يدوياً</Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] font-bold" onClick={() => void copyBuildInfo()}>نسخ التقرير</Button>
               </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm h-fit">
            <CardHeader className="border-b bg-muted/5 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                تحكم الأدوات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold">وضع فحص الموبايل</div>
                  <div className="text-[10px] text-muted-foreground">تمييز التجاوزات في النماذج.</div>
                </div>
                <Switch checked={qaEnabled} onCheckedChange={toggleQa} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs font-bold border-dashed text-warning border-warning/50 bg-warning/10 hover:bg-warning/20"
                onClick={() => void resetAppCache()}
              >
                إعادة ضبط ذاكرة الكاش
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
