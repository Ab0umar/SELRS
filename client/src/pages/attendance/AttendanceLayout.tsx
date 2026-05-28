import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Smartphone,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AttendanceLayoutProps {
  children: ReactNode;
}

const sections = [
  { href: "/attendance",                label: "اللوحة",            icon: LayoutDashboard },
  { href: "/attendance/live",           label: "المباشر",           icon: Activity },
  { href: "/attendance/employees",      label: "الموظفون",          icon: Users },
  { href: "/attendance/reports",        label: "التقارير",          icon: BarChart3 },
  { href: "/attendance/shift-schedule", label: "الروستر الشهري",   icon: CalendarDays },
  { href: "/attendance/settings",       label: "الجهاز والإعدادات", icon: Smartphone },
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
  if (pathname.startsWith("/attendance/shift-schedule")) {
    return {
      title: "الروستر الشهري",
      description: "جدول الورديات الشهري للأطباء والفنيين وتسجيل الحضور.",
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
    { refetchInterval: 30_000, refetchIntervalInBackground: false },
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
      tone: "text-success",
      accent: "bg-success/10 border-success/20",
    },
    {
      label: "متأخر اليوم",
      value: summary?.lateToday ?? 0,
      tone: "text-warning",
      accent: "bg-warning/10 border-warning/20",
    },
    {
      label: "داخل الآن",
      value: summary?.insideNow ?? 0,
      tone: "text-info",
      accent: "bg-info/10 border-info/20",
    },
    {
      label: "الجهاز",
      value:
        device?.status === "online" || device?.connected === true
          ? "متصل"
          : device?.status === "connecting"
            ? "جارٍ"
            : "غير متصل",
      tone: "text-secondary",
      accent: "bg-secondary/10 border-secondary/20",
    },
  ];

  return (
    <div className="page-layout min-h-screen bg-background text-foreground" dir="rtl">
      <div className="border-b border-secondary/15 bg-gradient-to-b from-secondary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                إدارة الحضور
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {title.description}
                </p>
              </div>

              <nav className="flex flex-wrap gap-1.5">
                {sections.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/attendance"
                      ? location === href
                      : location === href || location.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 ${
                        active
                          ? "border-secondary/30 bg-secondary/10 font-medium text-secondary"
                          : "border-border bg-card text-muted-foreground hover:border-secondary/20 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[30rem]">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-xl border p-3 ${metric.accent}`}
                >
                  <div className="text-xs font-semibold text-foreground/70">
                    {metric.label}
                  </div>
                  <div className={`mt-1 text-xl font-bold ${metric.tone}`}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-3 py-5 sm:px-4 lg:px-5">
        {children}
      </div>
    </div>
  );
}
