import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  RefreshCw,
  Smartphone,
  Users,
  Wifi,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";

interface AttendanceLayoutProps {
  children: ReactNode;
}

const sections = [
  {
    href: "/attendance",
    label: "اللوحة",
    description: "ملخص سريع",
    icon: LayoutDashboard,
  },
  {
    href: "/attendance/live",
    label: "المباشر",
    description: "مراقبة الحضور الآن",
    icon: Activity,
  },
  {
    href: "/attendance/employees",
    label: "الموظفون",
    description: "المتابعة والتعديل",
    icon: Users,
  },
  {
    href: "/attendance/reports",
    label: "التقارير",
    description: "الطباعة والمراجعة",
    icon: BarChart3,
  },
  {
    href: "/attendance/settings",
    label: "الجهاز والإعدادات",
    description: "الورديات والمزامنة",
    icon: Smartphone,
  },
];

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/attendance/live")) {
    return {
      title: "اللوحة المباشرة",
      description:
        "مراقبة فورية لحركة الدخول والخروج مع حالة الاتصال والمزامنة في مكان واحد.",
    };
  }

  if (pathname.startsWith("/attendance/employees")) {
    return {
      title: "الموظفون",
      description:
        "عرض مركّز لإدارة الموظفين والإجازات والأذونات دون التنقل بين شاشات متباعدة.",
    };
  }

  if (pathname.startsWith("/attendance/reports")) {
    return {
      title: "التقارير",
      description:
        "مساحة عمل جاهزة للفلترة، المراجعة، والطباعة السريعة للتقارير اليومية والتفصيلية.",
    };
  }

  if (pathname.startsWith("/attendance/settings")) {
    return {
      title: "الجهاز والإعدادات",
      description:
        "إعداد الجهاز والورديات والمزامنة ضمن نفس القشرة التشغيلية حتى يبقى السياق ثابتًا.",
    };
  }

  return {
    title: "الحضور والانصراف",
    description:
      "مساحة إدارية مركزة لمراقبة الموظفين، جلب البيانات، وطباعة التقارير من شاشة واحدة.",
  };
}

export default function AttendanceLayout({ children }: AttendanceLayoutProps) {
  const [location] = useLocation();
  const summaryQuery = (trpc as any).attendance.dashboardSummary.useQuery(
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

  const summary = summaryQuery.data as any;
  const device = deviceQuery.data as any;
  const title = resolveTitle(location);

  const metrics = [
    {
      label: "حاضر اليوم",
      value: summary?.presentToday ?? 0,
      tone: "text-emerald-700",
      accent: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "متأخر اليوم",
      value: summary?.lateToday ?? 0,
      tone: "text-amber-700",
      accent: "bg-amber-50 border-amber-200",
    },
    {
      label: "داخل الآن",
      value: summary?.insideNow ?? 0,
      tone: "text-blue-700",
      accent: "bg-blue-50 border-blue-200",
    },
    {
      label: "الجهاز",
      value:
        device?.status === "online" || device?.connected === true
          ? "متصل"
          : device?.status === "connecting"
            ? "جارٍ الاتصال"
            : "غير متصل",
      tone: "text-orange-700",
      accent: "bg-orange-50 border-orange-200",
    },
  ];

  const activeClass = "border-orange-300 bg-orange-50 text-orange-900";
  const idleClass =
    "border-border bg-card text-muted-foreground hover:text-foreground hover:border-orange-200";

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="border-b border-orange-200/70 bg-gradient-to-b from-orange-50/70 via-background to-background">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                إدارة الحضور
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {title.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {title.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {sections.map(({ href, label, description, icon: Icon }) => {
                  const active =
                    href === "/attendance"
                      ? location === href
                      : location === href || location.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active ? activeClass : idleClass
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{label}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[34rem] xl:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-2xl border p-4 shadow-none ${metric.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {metric.label}
                      </div>
                      <div className={`mt-1 text-2xl font-bold ${metric.tone}`}>
                        {metric.value}
                      </div>
                    </div>
                    <Wifi className="mt-1 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-orange-800/80">
                  آخر مزامنة
                </div>
                <div className="mt-1 text-sm font-semibold text-orange-950">
                  {summary?.lastSync?.status === "ok"
                    ? "ناجحة"
                    : summary?.lastSync?.status === "failed"
                      ? "فشلت"
                      : summary?.lastSync?.status === "running"
                        ? "جارٍ التنفيذ"
                        : "لم تتم"}
                </div>
              </div>
              <div className="rounded-full bg-orange-100 p-2 text-orange-700">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-blue-800/80">الجهاز</div>
                <div className="mt-1 text-sm font-semibold text-blue-950">
                  {device?.status === "online" || device?.connected === true
                    ? "متصل وجاهز"
                    : device?.status === "connecting"
                      ? "جاري الاتصال"
                      : "يحتاج مراجعة"}
                </div>
              </div>
              <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                <Smartphone className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-emerald-800/80">
                  حالة العرض
                </div>
                <div className="mt-1 text-sm font-semibold text-emerald-950">
                  {location.startsWith("/attendance/reports")
                    ? "جاهز للطباعة"
                    : location.startsWith("/attendance/live")
                      ? "مراقبة مباشرة"
                      : location.startsWith("/attendance/employees")
                        ? "متابعة الموظفين"
                        : "إعداد وتشغيل"}
                </div>
              </div>
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <Activity className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
