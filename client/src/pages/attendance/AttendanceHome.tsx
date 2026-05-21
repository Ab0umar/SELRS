import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const quickLinks = [
  {
    icon: Activity,
    label: "اللوحة المباشرة",
    description: "مراقبة الحضور الآن مع حالة الدخول والخروج",
    href: "/attendance/live",
    tone: "border-orange-200 bg-orange-50 text-orange-900",
    iconTone: "text-orange-700",
  },
  {
    icon: Users,
    label: "الموظفون",
    description: "سجل الموظفين والإجازات والأذونات",
    href: "/attendance/employees",
    tone: "border-blue-200 bg-blue-50 text-blue-900",
    iconTone: "text-blue-700",
  },
  {
    icon: BarChart3,
    label: "التقارير",
    description: "التقارير اليومية والتفصيلية والطباعة",
    href: "/attendance/reports",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconTone: "text-emerald-700",
  },
  {
    icon: Smartphone,
    label: "الجهاز والإعدادات",
    description: "الورديات والعطل والجهاز والمزامنة",
    href: "/attendance/settings",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    iconTone: "text-amber-700",
  },
  {
    icon: ShieldCheck,
    label: "ملفي الشخصي",
    description: "رصيد إجازاتي وإحصائياتي وطلب إذن أو إجازة",
    href: "/attendance/my",
    tone: "border-purple-200 bg-purple-50 text-purple-900",
    iconTone: "text-purple-700",
  },
];

export default function AttendanceHome() {
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(
    undefined,
    {
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
    },
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
      setRecomputeMsg(
        `تمت إعادة احتساب ${res.rowsWritten ?? 0} يوم بنجاح`,
      );
      dashboardQuery.refetch();
    },
    onError: (err: any) => setRecomputeMsg(`فشلت إعادة الاحتساب: ${err.message}`),
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
      tone: "text-emerald-700",
      accent: "bg-emerald-50 border-emerald-200",
      icon: CalendarCheck,
    },
    {
      label: "متأخر اليوم",
      value: data?.lateToday ?? 0,
      tone: "text-amber-700",
      accent: "bg-amber-50 border-amber-200",
      icon: Clock3,
    },
    {
      label: "داخل الآن",
      value: data?.insideNow ?? 0,
      tone: "text-blue-700",
      accent: "bg-blue-50 border-blue-200",
      icon: ShieldCheck,
    },
    {
      label: "لم يسجل الخروج",
      value: data?.missingCheckoutYesterday ?? 0,
      tone: "text-orange-700",
      accent: "bg-orange-50 border-orange-200",
      icon: Cpu,
    },
  ];

  const deviceState =
    device?.status === "online" || device?.connected === true
      ? "متصل"
      : device?.status === "connecting"
        ? "جارٍ الاتصال"
        : "غير متصل";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-orange-200/80 bg-orange-50/60 p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-medium text-orange-800">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              إدارة الحضور
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-orange-950 sm:text-3xl">
                غرفة التحكم اليومية
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-orange-950/70">
                مساحة تشغيلية واحدة لمراقبة الموظفين، جلب البيانات من الجهاز،
                ومراجعة التقارير قبل الطباعة.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[40rem] xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))
              : statCards.map(({ label, value, tone, accent, icon: Icon }) => (
                  <div
                    key={label}
                    className={`rounded-2xl border p-4 shadow-none ${accent}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">
                          {label}
                        </div>
                        <div className={`mt-1 text-2xl font-bold ${tone}`}>
                          {value}
                        </div>
                      </div>
                      <Icon className={`mt-1 h-4 w-4 ${tone}`} />
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-blue-200/80 bg-blue-50/60 p-5 shadow-sm">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-950">
              الإجراءات السريعة
            </h3>
            <p className="text-sm leading-6 text-blue-950/70">
              اختصارات مباشرة للعمليات التي يستخدمها المدير أكثر من غيرها.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-11 justify-between border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {syncMutation.isPending ? "جارٍ المزامنة…" : "مزامنة الآن"}
              </span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-between border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
              onClick={handleRecompute}
              disabled={recomputeMutation.isPending}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                {recomputeMutation.isPending ? "جارٍ الاحتساب…" : "إعادة احتساب"}
              </span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button asChild variant="secondary" className="h-11 justify-between">
              <Link href="/attendance/reports">
                <span className="inline-flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  طباعة التقارير
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 justify-between">
              <Link href="/attendance/live">
                <span className="inline-flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  المراقبة المباشرة
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground">
              حالة الجهاز
            </div>
            <div className="mt-1 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-foreground">
                {deviceState}
              </div>
              <Smartphone className="h-4 w-4 text-orange-600" />
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              {device?.lastSeenAt
                ? `آخر تواصل: ${new Date(device.lastSeenAt).toLocaleString("ar-EG")}`
                : "الجهاز لم يرسل حالة حديثة بعد."}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background/80 p-5 shadow-sm">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">أقسام العمل الأساسية</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              مسارات مباشرة إلى المناطق التي يستخدمها المدير بشكل متكرر.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ icon: Icon, label, description, href, tone, iconTone }) => (
              <Link key={href} href={href} className="block">
                <Card
                  className={`group h-full border shadow-none transition-colors hover:border-orange-300 ${tone}`}
                >
                  <CardContent className="flex h-full flex-col items-end gap-3 p-4">
                    <Icon className={`h-6 w-6 ${iconTone}`} />
                    <div className="text-right">
                      <div className="font-semibold">{label}</div>
                      <div className="mt-1 text-xs leading-5 opacity-80">
                        {description}
                      </div>
                    </div>
                    <div className="mt-auto inline-flex items-center gap-2 text-xs font-medium">
                      فتح القسم
                      <ArrowLeft className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(syncMsg || recomputeMsg) && (
        <section className="grid gap-3 md:grid-cols-2">
          {syncMsg && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 text-sm text-orange-950">
              <span className="font-semibold">المزامنة:</span> {syncMsg}
            </div>
          )}
          {recomputeMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
              <span className="font-semibold">إعادة الاحتساب:</span>{" "}
              {recomputeMsg}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">مؤشرات سريعة</CardTitle>
            <CardDescription>
              ملخص يربط بين الحالة التشغيلية والبيانات اليومية.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  آخر مزامنة
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {isLoading ? (
                    <Skeleton className="h-4 w-28" />
                  ) : data?.lastSync?.status === "ok" ? (
                    "ناجحة"
                  ) : data?.lastSync?.status === "failed" ? (
                    "فشلت"
                  ) : data?.lastSync?.status === "running" ? (
                    "جارٍ التنفيذ"
                  ) : (
                    "لم تتم بعد"
                  )}
                </div>
              </div>
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  نطاق اليوم
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {isLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    `${data?.presentToday ?? 0} حاضر، ${data?.lateToday ?? 0} متأخر`
                  )}
                </div>
              </div>
              <FileText className="h-4 w-4 text-blue-600" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  الجهاز
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {deviceState}
                </div>
              </div>
              <Smartphone className="h-4 w-4 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/60 p-5 shadow-sm">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-emerald-950">
              مسارات الطباعة والمراجعة
            </h3>
            <p className="text-sm leading-6 text-emerald-950/70">
              هذه القناة موجهة للطباعة السريعة ومراجعة التغييرات قبل الخروج من
              النظام.
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            <Button asChild className="h-11 justify-between bg-emerald-700 text-white hover:bg-emerald-800">
              <Link href="/attendance/reports">
                <span className="inline-flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  فتح التقارير الجاهزة للطباعة
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 justify-between border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50">
              <Link href="/attendance/employees">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  مراجعة الموظفين
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
