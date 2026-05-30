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
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  Clock3,
  Cpu,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const attendanceQuickLinks = [
  {
    icon: CalendarCheck,
    label: "متابعة اليوم",
    description: "الحالة اليومية، الحضور الآن، والمزامنة السريعة",
    href: "/attendance",
    links: [
      { label: "الحضور الآن", href: "/attendance/live" },
      { label: "طباعة اليوم", href: "/attendance/reports" },
    ],
  },
  {
    icon: Users,
    label: "الموظفون والطلبات",
    description: "الموظفون، الإجازات، الأذونات، وتوزيع الورديات",
    href: "/attendance/employees",
    links: [
      { label: "قائمة الموظفين", href: "/attendance/employees" },
      { label: "الروستر الشهري", href: "/attendance/shift-schedule" },
    ],
  },
  {
    icon: BarChart3,
    label: "التقارير",
    description: "تقارير يومية، تفصيلية، أذونات، وأرصدة إجازات",
    href: "/attendance/reports",
    links: [
      { label: "التقرير اليومي", href: "/attendance/reports" },
      { label: "السجلات الخام", href: "/attendance/reports" },
    ],
  },
  {
    icon: Smartphone,
    label: "الإعدادات والمزامنة",
    description: "الجهاز، تزامن البصمات، العطلات، وقواعد الحضور",
    href: "/attendance/settings",
    links: [
      { label: "إعداد الجهاز", href: "/attendance/admin/device" },
      { label: "حالة المزامنة", href: "/attendance/admin/sync" },
    ],
  },
  {
    icon: ShieldCheck,
    label: "ملفي الشخصي",
    description: "رصيد إجازاتي وإحصائياتي وطلب إذن أو إجازة",
    href: "/attendance/my",
    links: [{ label: "فتح الملف", href: "/attendance/my" }],
  },
];

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

  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(undefined, {
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

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

  const recomputeMutation = (trpc as any).attendance.materializeDaily.useMutation({
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
      accent: "bg-success/10 border-success/20",
      icon: CalendarCheck,
    },
    {
      label: "متأخر اليوم",
      value: data?.lateToday ?? 0,
      tone: "text-warning",
      accent: "bg-warning/10 border-warning/20",
      icon: Clock3,
    },
    {
      label: "داخل الآن",
      value: data?.insideNow ?? 0,
      tone: "text-info",
      accent: "bg-info/10 border-info/20",
      icon: ShieldCheck,
    },
    {
      label: "لم يسجل الخروج",
      value: data?.missingCheckoutYesterday ?? 0,
      tone: "text-secondary",
      accent: "bg-secondary/10 border-secondary/20",
      icon: Cpu,
    },
  ];

  const deviceState =
    device?.status === "online" || device?.connected === true
      ? "متصل"
      : device?.status === "connecting"
        ? "جارٍ الاتصال"
        : "غير متصل";

  const visibleWorkLanes = useMemo(() => {
    if (isAdmin) return attendanceQuickLinks;
    if (!permissionsQuery.isSuccess) return [];
    return attendanceQuickLinks
      .map((lane) => ({
        ...lane,
        links: lane.links.filter((link) =>
          pathGrantedByRoots(normalizeNavPath(link.href), allowedRoots),
        ),
      }))
      .filter(
        (lane) =>
          pathGrantedByRoots(normalizeNavPath(lane.href), allowedRoots) ||
          lane.links.length > 0,
      );
  }, [allowedRoots, isAdmin, permissionsQuery.isSuccess]);

  const canUseOperationalShortcuts =
    isAdmin ||
    pathGrantedByRoots(normalizeNavPath("/attendance/settings"), allowedRoots) ||
    pathGrantedByRoots(normalizeNavPath("/attendance/admin/device"), allowedRoots) ||
    pathGrantedByRoots(normalizeNavPath("/attendance/admin/sync"), allowedRoots);
  const canSeeLiveShortcut =
    isAdmin || pathGrantedByRoots(normalizeNavPath("/attendance/live"), allowedRoots);
  const canSeeReportsShortcut =
    isAdmin || pathGrantedByRoots(normalizeNavPath("/attendance/reports"), allowedRoots);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          : statCards.map(({ label, value, tone, accent, icon: Icon }) => (
              <div key={label} className={`rounded-xl border p-4 ${accent}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-foreground/70">
                      {label}
                    </div>
                    <div className={`mt-1 text-2xl font-bold ${tone}`}>
                      {value}
                    </div>
                  </div>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                </div>
              </div>
            ))}
      </div>

      {/* Two-column: quick actions + navigation */}
      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        {/* Quick actions */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              متابعة اليوم
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              أهم إجراءات الحضور اليومي بدون الدخول في صفحات الإعداد.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {canUseOperationalShortcuts && (
              <Button
                variant="outline"
                className="h-11 justify-between"
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {syncMutation.isPending ? "جارٍ المزامنة…" : "مزامنة الآن"}
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {canUseOperationalShortcuts && (
              <Button
                variant="outline"
                className="h-11 justify-between"
                onClick={handleRecompute}
                disabled={recomputeMutation.isPending}
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {recomputeMutation.isPending ? "جارٍ الاحتساب…" : "إعادة احتساب"}
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {canSeeReportsShortcut && (
              <Button asChild variant="secondary" className="h-11 justify-between">
                <Link href="/attendance/reports">
                  <span className="inline-flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    فتح التقارير
                  </span>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {canSeeLiveShortcut && (
              <Button asChild variant="secondary" className="h-11 justify-between">
                <Link href="/attendance/live">
                  <span className="inline-flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    الحضور الآن
                  </span>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {/* Status strip */}
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                آخر مزامنة
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : data?.lastSync?.status === "ok" ? (
                  "ناجحة"
                ) : data?.lastSync?.status === "failed" ? (
                  "فشلت"
                ) : data?.lastSync?.status === "running" ? (
                  "جارٍ التنفيذ"
                ) : (
                  "لم تتم بعد"
                )}
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                نطاق اليوم
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isLoading ? (
                  <Skeleton className="h-4 w-28" />
                ) : (
                  `${data?.presentToday ?? 0} حاضر، ${data?.lateToday ?? 0} متأخر`
                )}
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                الجهاز
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {deviceState}
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Section navigation */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              مسارات العمل
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              اختر المسار حسب نوع المهمة، وليس حسب اسم الصفحة.
            </p>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {visibleWorkLanes.map(({ icon: Icon, label, description, href, links }) => (
              <div key={href} className="px-4 py-3.5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {label}
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                    <div className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {description}
                    </div>
                    {links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {links.map((link) => (
                          <Button
                            key={`${href}-${link.href}-${link.label}`}
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Link href={link.href}>{link.label}</Link>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {(syncMsg || recomputeMsg) && (
        <div className="grid gap-3 md:grid-cols-2">
          {syncMsg && (
            <div className="rounded-xl border border-secondary/20 bg-secondary/10 p-4 text-sm text-foreground">
              <span className="font-semibold">المزامنة:</span> {syncMsg}
            </div>
          )}
          {recomputeMsg && (
            <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-foreground">
              <span className="font-semibold">إعادة الاحتساب:</span>{" "}
              {recomputeMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
