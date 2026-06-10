import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  ArrowLeft,
  CalendarCheck,
  Clock3,
  Cpu,
  FileText,
  Printer,
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

  const statCards = [
    {
      label: "حاضر اليوم",
      value: data?.presentToday ?? 0,
      tone: "text-success",
      accent: "border-success/20 bg-success/5 dark:bg-success/10",
      icon: CalendarCheck,
    },
    {
      label: "متأخر اليوم",
      value: data?.lateToday ?? 0,
      tone: "text-warning",
      accent: "border-warning/20 bg-warning/5 dark:bg-warning/10",
      icon: Clock3,
    },
    {
      label: "داخل الآن",
      value: data?.insideNow ?? 0,
      tone: "text-info",
      accent: "border-info/20 bg-info/5 dark:bg-info/10",
      icon: ShieldCheck,
    },
    {
      label: "لم يسجل الخروج بالأمس",
      value: data?.missingCheckoutYesterday ?? 0,
      tone: "text-destructive",
      accent: "border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
      icon: Cpu,
    },
  ];

  const deviceState =
    device?.status === "online" || device?.connected === true
      ? "متصل"
      : device?.status === "connecting"
        ? "جارٍ الاتصال"
        : "غير متصل";

  const canUseOperationalShortcuts =
    isAdmin ||
    pathGrantedByRoots(
      normalizeNavPath("/attendance/settings"),
      allowedRoots,
    ) ||
    pathGrantedByRoots(
      normalizeNavPath("/attendance/admin/device"),
      allowedRoots,
    ) ||
    pathGrantedByRoots(
      normalizeNavPath("/attendance/admin/sync"),
      allowedRoots,
    );
  const canSeeLiveShortcut =
    isAdmin ||
    pathGrantedByRoots(normalizeNavPath("/attendance/live"), allowedRoots);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl animate-pulse" />
            ))
          : statCards.map(({ label, value, tone, accent, icon: Icon }) => (
              <div
                key={label}
                className={`group relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${accent}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground/90">
                      {label}
                    </span>
                    <h2 className={`text-2xl font-bold tracking-tight ${tone}`}>
                      {value}
                    </h2>
                  </div>
                  <div className={`rounded-lg p-2 ${accent} border-none`}>
                    <Icon className={`h-4.5 w-4.5 ${tone}`} />
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Operations Panel */}
      <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-secondary" />
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                لوحة التحكم والعمليات اليومية
              </CardTitle>
              <CardDescription className="text-[11px]">
                مزامنة البصمات، إدارة قواعد الاحتساب، واختصارات الوصول السريع للملفات والتقارير
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Action Buttons Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {canUseOperationalShortcuts && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-3 bg-muted/10 hover:bg-muted/20 transition-all">
                <Button
                  variant="outline"
                  className="h-10 justify-between border-border/60 hover:bg-secondary/5 hover:text-secondary group transition-all duration-200"
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                >
                  <span className="inline-flex items-center gap-2 font-medium text-xs">
                    <Zap className={`h-4 w-4 text-secondary ${syncMutation.isPending ? "animate-bounce" : "group-hover:scale-110"}`} />
                    {syncMutation.isPending ? "جارٍ المزامنة…" : "مزامنة البصمات"}
                  </span>
                  <ArrowLeft className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <span className="text-[10px] text-muted-foreground/80 pr-1 leading-normal">
                  سحب سجلات الحضور والانصراف الجديدة من جهاز البصمة الفعلي.
                </span>
              </div>
            )}

            {canUseOperationalShortcuts && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-3 bg-muted/10 hover:bg-muted/20 transition-all">
                <Button
                  variant="outline"
                  className="h-10 justify-between border-border/60 hover:bg-primary/5 hover:text-primary group transition-all duration-200"
                  onClick={handleRecompute}
                  disabled={recomputeMutation.isPending}
                >
                  <span className="inline-flex items-center gap-2 font-medium text-xs">
                    <RefreshCw className={`h-4 w-4 text-primary ${recomputeMutation.isPending ? "animate-spin" : "group-hover:rotate-45"}`} />
                    {recomputeMutation.isPending ? "جارٍ الاحتساب…" : "إعادة احتساب البيانات"}
                  </span>
                  <ArrowLeft className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <span className="text-[10px] text-muted-foreground/80 pr-1 leading-normal">
                  تحديث وتطبيق القواعد واحتساب ساعات التأخير والعمل لآخر 90 يوماً.
                </span>
              </div>
            )}

            {canSeeLiveShortcut && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-3 bg-muted/10 hover:bg-muted/20 transition-all">
                <Button
                  asChild
                  variant="secondary"
                  className="h-10 justify-between group transition-all duration-200"
                >
                  <Link href="/attendance/live">
                    <span className="inline-flex items-center gap-2 font-medium text-xs">
                      <Activity className="h-4 w-4 group-hover:scale-110 text-secondary" />
                      الحضور الآن (مباشر)
                    </span>
                    <ArrowLeft className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
                <span className="text-[10px] text-muted-foreground/80 pr-1 leading-normal">
                  عرض مباشر للحضور والانصراف وحركات الموظفين لحظة بلحظة.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-3 bg-muted/10 hover:bg-muted/20 transition-all">
              <Button
                asChild
                variant="secondary"
                className="h-10 justify-between group transition-all duration-200"
              >
                <Link href="/attendance/my">
                  <span className="inline-flex items-center gap-2 font-medium text-xs">
                    <ShieldCheck className="h-4 w-4 group-hover:scale-110 text-primary" />
                    ملفي الشخصي
                  </span>
                  <ArrowLeft className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <span className="text-[10px] text-muted-foreground/80 pr-1 leading-normal">
                عرض كشف الحضور الشخصي، طلبات الأذونات، الإجازات وتغيير المواعيد.
              </span>
            </div>
          </div>

          {/* Status Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-5">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">حالة آخر مزامنة</div>
                <div className="text-xs font-semibold text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : data?.lastSync?.status === "ok" ? (
                    <span className="text-success">مكتملة بنجاح</span>
                  ) : data?.lastSync?.status === "failed" ? (
                    <span className="text-destructive">فشلت المزامنة</span>
                  ) : data?.lastSync?.status === "running" ? (
                    <span className="text-warning">جارٍ التنفيذ</span>
                  ) : (
                    <span className="text-muted-foreground">لا يوجد</span>
                  )}
                </div>
              </div>
              <RefreshCw className="h-4 w-4 text-muted-foreground/40" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">نطاق عمل اليوم</div>
                <div className="text-xs font-semibold text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <span>{data?.presentToday ?? 0} حاضر / {data?.lateToday ?? 0} متأخر</span>
                  )}
                </div>
              </div>
              <FileText className="h-4 w-4 text-muted-foreground/40" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">حالة اتصال البصمة</div>
                <div className="text-xs font-semibold text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span>{deviceState}</span>
                  )}
                </div>
              </div>
              <Smartphone className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Messages */}
      {(syncMsg || recomputeMsg) && (
        <div className="grid gap-3 md:grid-cols-2">
          {syncMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-secondary/20 bg-secondary/5 dark:bg-secondary/15 p-4 text-xs text-foreground shadow-sm animate-in fade-in duration-300">
              <Zap className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">المزامنة اليومية:</span> {syncMsg}
              </div>
            </div>
          )}
          {recomputeMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/5 dark:bg-success/15 p-4 text-xs text-foreground shadow-sm animate-in fade-in duration-300">
              <RefreshCw className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">إعادة الاحتساب:</span> {recomputeMsg}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
