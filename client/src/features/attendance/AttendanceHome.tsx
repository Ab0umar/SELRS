import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { ROUTES } from "../../../../shared/routes";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  CalendarCheck,
  Clock3,
  Cpu,
  FileText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceHome() {
  const { user } = useAuth();
  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedRoots = useMemo(
    () => permissionsToAllowedRoots((permissionsQuery.data ?? []) as string[]),
    [permissionsQuery.data],
  );

  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(
    undefined,
    { refetchInterval: 30_000, refetchIntervalInBackground: false },
  );

  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(
    undefined,
    {
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
    },
  );

  const syncMutation = (trpc as any).attendance.syncNow.useMutation({
    onSuccess: (res: any) => {
      setSyncMsg(
        res.success
          ? `تمت المزامنة بنجاح، وتمت إضافة ${res.rowsInserted ?? 0} سجل`
          : `فشلت المزامنة: ${res.error ?? "خطأ غير معروف"}`,
      );
      dashboardQuery.refetch();
      deviceQuery.refetch();
    },
    onError: (err: any) => setSyncMsg(`فشلت المزامنة: ${err.message}`),
  });

  const recomputeMutation = (
    trpc as any
  ).attendance.materializeDaily.useMutation({
    onSuccess: (res: any) => {
      setRecomputeMsg(`تمت إعادة احتساب ${res.rowsWritten ?? 0} يوم بنجاح`);
      dashboardQuery.refetch();
    },
    onError: (err: any) =>
      setRecomputeMsg(`فشلت إعادة الاحتساب: ${err.message}`),
  });

  const handleSync = () => {
    setSyncMsg(null);
    syncMutation.mutate({});
  };

  const handleRecompute = () => {
    setRecomputeMsg(null);
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 90);
    recomputeMutation.mutate({
      fromDate: from.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10),
    });
  };

  const data = dashboardQuery.data as any;
  const device = deviceQuery.data as any;
  const isLoading = dashboardQuery.isLoading;

  const deviceState =
    device?.status === "online" || device?.connected === true
      ? "متصل"
      : device?.status === "connecting"
        ? "جارٍ الاتصال"
        : "غير متصل";

  const canUseOperationalShortcuts =
    isAdmin ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceSettings),
      allowedRoots,
    ) ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceAdminDevice),
      allowedRoots,
    ) ||
    pathGrantedByRoots(
      normalizeNavPath(ROUTES.attendanceAdminSync),
      allowedRoots,
    );
  const canSeeLiveShortcut =
    isAdmin ||
    pathGrantedByRoots(normalizeNavPath(ROUTES.attendanceLive), allowedRoots);

  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const morningStart = 10 * 60;
  const morningEnd = 16 * 60;
  const morningProgress = Math.max(0, Math.min(100, ((currentMinutes - morningStart) / (morningEnd - morningStart)) * 100));

  const getMorningBadge = () => {
    if (currentMinutes < morningStart) return "تبدأ لاحقاً";
    if (currentMinutes > morningEnd) return "انتهت الوردية";
    return `${dashboardQuery.data?.presentMorning ?? 0} موظف حاضر حالياً`;
  };

  const getMorningBadgeClass = () => {
    if (currentMinutes < morningStart) return "bg-muted/40 text-muted-foreground border-border/60";
    if (currentMinutes > morningEnd) return "bg-muted text-muted-foreground border-border/60 opacity-80";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

  const eveningStart = 13 * 60;
  const eveningEnd = 19 * 60;
  const eveningProgress = Math.max(0, Math.min(100, ((currentMinutes - eveningStart) / (eveningEnd - eveningStart)) * 100));

  const getEveningBadge = () => {
    if (currentMinutes < eveningStart) return "تبدأ لاحقاً";
    if (currentMinutes > eveningEnd) return "انتهت الوردية";
    return `${dashboardQuery.data?.presentEvening ?? 0} موظف حاضر حالياً`;
  };

  const getEveningBadgeClass = () => {
    if (currentMinutes < eveningStart) return "bg-muted/40 text-muted-foreground border-border/60";
    if (currentMinutes > eveningEnd) return "bg-muted text-muted-foreground border-border/60 opacity-80";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

  return (
    <div className="w-full space-y-8" dir="rtl">


      {/* ── Main Redesigned Layout Structure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left 8/12: Coverage Timelines & Circular Gauges */}
        <div className="lg:col-span-8 space-y-8">

          {/* Section A: Visual Shift Coverage Timelines */}
          <div className="space-y-4">

            <div className="space-y-4">
              {/* Morning Shift Timeline */}
              <div className="p-5 bg-card border border-border/60 rounded-3xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-mono">10:00 ص - 04:00 م</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${getMorningBadgeClass()}`}>
                    {getMorningBadge()}
                  </span>
                </div>

                {/* Horizontal Timeline Bar Representing Roster Coverage */}
                <div className="w-full bg-muted rounded-full h-4 relative overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${morningProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                  <span>بداية الوردية</span>
                  <span>منتصف النوبة</span>
                  <span>نهاية الوردية</span>
                </div>
              </div>

              {/* Evening Shift Timeline */}
              <div className="p-5 bg-card border border-border/60 rounded-3xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-mono">01:00 م - 07:00 م</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${getEveningBadgeClass()}`}>
                    {getEveningBadge()}
                  </span>
                </div>

                <div className="w-full bg-muted rounded-full h-4 relative overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${eveningProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                  <span>بداية الوردية</span>
                  <span>منتصف النوبة</span>
                  <span>نهاية الوردية</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Circular Stats Indicators */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">مؤشرات الالتزام وحساب المخالفات</h3>
            <div className="grid grid-cols-3 gap-6">

              {/* Lateness Gauge */}
              <div className="p-5 bg-card border border-border/60 rounded-3xl text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full border-4 border-amber-100 border-t-amber-500 flex items-center justify-center font-bold text-sm mx-auto font-mono text-foreground">
                  {data?.lateToday ?? 0}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground block">حالات المتأخرين اليوم</span>
              </div>

              {/* Missing Checkouts */}
              <div className="p-5 bg-card border border-border/60 rounded-3xl text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full border-4 border-rose-100 border-t-rose-500 flex items-center justify-center font-bold text-sm mx-auto font-mono text-foreground">
                  {data?.missingCheckoutYesterday ?? 0}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground block">معلقين بالأمس</span>
              </div>

              {/* Active Inside */}
              <div className="p-5 bg-card border border-border/60 rounded-3xl text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-full border-4 border-sky-100 border-t-sky-500 flex items-center justify-center font-bold text-sm mx-auto font-mono text-foreground">
                  {data?.insideNow ?? 0}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground block">متواجدين حالياً</span>
              </div>

            </div>
          </div>

        </div>

        {/* Right 4/12: Control Badges & Device Status Radar */}
        <div className="lg:col-span-4 space-y-8">

          {/* Section C: Oval Command Badges */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">أزرار الإجراءات والتحكم</h3>
            <div className="flex flex-col gap-3">

              {canUseOperationalShortcuts && (
                <button
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                  className="w-full flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-foreground rounded-2xl transition-all duration-200 text-right text-xs font-bold"
                >
                  <span className="flex items-center gap-2.5">
                    <Zap className={`h-4.5 w-4.5 text-primary ${syncMutation.isPending ? "animate-bounce" : ""}`} />
                    <span>مزامنة سجلات البصمة</span>
                  </span>
                  <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
                    {syncMutation.isPending ? "جاري…" : "سحب"}
                  </span>
                </button>
              )}

              {canUseOperationalShortcuts && (
                <button
                  onClick={handleRecompute}
                  disabled={recomputeMutation.isPending}
                  className="w-full flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-foreground rounded-2xl transition-all duration-200 text-right text-xs font-bold"
                >
                  <span className="flex items-center gap-2.5">
                    <RefreshCw className={`h-4.5 w-4.5 text-primary ${recomputeMutation.isPending ? "animate-spin" : ""}`} />
                    <span>تطبيق قواعد الاحتساب</span>
                  </span>
                  <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
                    {recomputeMutation.isPending ? "جاري…" : "تطبيق"}
                  </span>
                </button>
              )}

              {canSeeLiveShortcut && (
                <Link
                  href={ROUTES.attendanceLive}
                  className="w-full flex items-center justify-between p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all duration-200 text-right text-xs font-bold"
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="h-4.5 w-4.5 text-primary" />
                    <span>البث الفوري للبوابات</span>
                  </span>
                  <ArrowLeft className="w-4 h-4 text-primary" />
                </Link>
              )}

              <Link
                href={ROUTES.attendanceMy}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/40 border border-border/60 text-foreground rounded-2xl transition-all duration-200 text-right text-xs font-bold"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>ملفي الشخصي وحركاتي</span>
                </span>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Link>

            </div>
          </div>

          {/* Section D: Device Status Radar */}
          <div className="p-6 bg-card text-foreground rounded-3xl space-y-4 relative overflow-hidden shadow-xl">
            <h3 className="text-xs font-bold text-muted-foreground border-b border-border/60 pb-2.5">
              📡 حالة الأجهزة (Live Radar)
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative shrink-0">
                <span className="absolute w-10 h-10 rounded-full border border-emerald-500/20 animate-ping"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">حالة الاتصال</span>
                <span className="mt-0.5 block font-bold text-foreground">{deviceState}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Feedback Alert Sheets */}
      {(syncMsg || recomputeMsg) && (
        <div className="grid gap-4 md:grid-cols-2 pt-2">
          {syncMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground shadow-sm animate-in fade-in duration-300">
              <Zap className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground">المزامنة:</span> {syncMsg}
              </div>
            </div>
          )}
          {recomputeMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground shadow-sm animate-in fade-in duration-300">
              <RefreshCw className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5 animate-spin" />
              <div>
                <span className="font-bold text-foreground">احتساب القواعد:</span> {recomputeMsg}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
