import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  Smartphone,
  Users,
  ChevronRight,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AttendanceLayoutProps {
  children: ReactNode;
}

// Simplified and reorganized navigation structure
const navigationSections = [
  {
    id: "monitoring",
    label: "المراقبة اليومية",
    description: "متابعة الحضور والانصراف",
    icon: Activity,
    items: [
      {
        href: "/attendance",
        label: "لوحة التحكم",
        description: "ملخص الحضور والإحصائيات",
        activeFor: ["/attendance"],
      },
      {
        href: "/attendance/live",
        label: "الحضور الآن",
        description: "مراقبة فورية لحركة الدخول والخروج",
        activeFor: ["/attendance/live"],
      },
    ],
  },
  {
    id: "employees",
    label: "الموظفون والطلبات",
    description: "إدارة الموظفين والإجازات",
    icon: Users,
    items: [
      {
        href: "/attendance/employees",
        label: "قائمة الموظفين",
        description: "إدارة بيانات الموظفين",
        activeFor: ["/attendance/employees"],
      },
      {
        href: "/attendance/shift-schedule",
        label: "الروستر الشهري",
        description: "جدول الورديات والحضور",
        activeFor: ["/attendance/shift-schedule"],
      },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    description: "تقارير الحضور والإجازات",
    icon: BarChart3,
    items: [
      {
        href: "/attendance/reports",
        label: "التقارير",
        description: "تقارير يومية وتفصيلية",
        activeFor: ["/attendance/reports"],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات والمزامنة",
    description: "ضبط الأجهزة والمزامنة",
    icon: Smartphone,
    items: [
      {
        href: "/attendance/settings",
        label: "الإعدادات",
        description: "إعداد الأجهزة والقواعد",
        activeFor: ["/attendance/settings"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/attendance"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isSectionActive(pathname: string, items: any[]) {
  return items.some((item) => isItemActive(pathname, item.activeFor));
}

export default function AttendanceLayout({
  children,
}: AttendanceLayoutProps) {
  const [location] = useLocation();

  const summaryQuery = (trpc as any).attendance.dashboardSummary.useQuery(
    undefined,
    { refetchInterval: 30_000, refetchIntervalInBackground: false }
  );
  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(
    undefined,
    {
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
    }
  );

  const summary = summaryQuery.data as any;
  const device = deviceQuery.data as any;

  // Key metrics for the dashboard
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
      {/* Header with metrics */}
      <div className="border-b border-secondary/15 bg-gradient-to-b from-secondary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Title section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  نظام الحضور والانصراف
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                إدارة الحضور والانصراف
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                مراقبة شاملة لحضور الموظفين والإجازات والأذونات مع تقارير دقيقة
              </p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-lg border p-3 ${metric.accent}`}
                >
                  <div className="text-xs font-semibold text-foreground/70">
                    {metric.label}
                  </div>
                  <div className={`mt-1.5 text-lg font-bold ${metric.tone}`}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full border-b border-border bg-card/50 lg:w-64 lg:border-b-0 lg:border-r">
          <nav className="space-y-1 p-3 sm:p-4">
            {navigationSections.map((section) => {
              const active = isSectionActive(location, section.items);
              return (
                <div key={section.id} className="space-y-1">
                  {/* Section header */}
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {section.label}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section items */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const itemActive = isItemActive(location, item.activeFor);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 ${
                            itemActive
                              ? "bg-secondary/10 text-secondary font-medium shadow-sm"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Divider between sections */}
                  {section.id !== "settings" && (
                    <div className="my-2 border-t border-border" />
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 px-3 py-5 sm:px-4 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
