import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  Smartphone,
  Users,
  ChevronLeft,
  Activity,
  Clock,
  Settings,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AttendanceLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

// Navigation structure
const navigationSections = [
  {
    id: "monitoring",
    label: "المراقبة اليومية",
    items: [
      {
        href: "/attendance",
        label: "لوحة التحكم",
        icon: LayoutDashboard,
        activeFor: ["/attendance"],
      },
      {
        href: "/attendance/live",
        label: "الحضور الآن",
        icon: Activity,
        activeFor: ["/attendance/live"],
      },
    ],
  },
  {
    id: "employees",
    label: "الموظفون والطلبات",
    items: [
      {
        href: "/attendance/employees",
        label: "قائمة الموظفين",
        icon: Users,
        activeFor: ["/attendance/employees"],
      },
      {
        href: "/attendance/shift-schedule",
        label: "الروستر الشهري",
        icon: Clock,
        activeFor: ["/attendance/shift-schedule"],
      },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    items: [
      {
        href: "/attendance/reports",
        label: "التقارير",
        icon: BarChart3,
        activeFor: ["/attendance/reports"],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات والمزامنة",
    items: [
      {
        href: "/attendance/settings",
        label: "الإعدادات",
        icon: Settings,
        activeFor: ["/attendance/settings"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/attendance"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

const mobileNavItems = [
  { href: "/attendance", label: "الرئيسية", icon: LayoutDashboard, activeFor: ["/attendance"] },
  { href: "/attendance/live", label: "المباشر", icon: Activity, activeFor: ["/attendance/live"] },
  { href: "/attendance/employees", label: "الموظفون", icon: Users, activeFor: ["/attendance/employees"] },
  { href: "/attendance/shift-schedule", label: "الروستر", icon: Clock, activeFor: ["/attendance/shift-schedule"] },
  { href: "/attendance/reports", label: "التقارير", icon: BarChart3, activeFor: ["/attendance/reports"] },
  { href: "/attendance/settings", label: "الإعدادات", icon: Settings, activeFor: ["/attendance/settings"] },
];

export default function AttendanceLayout({ children, fullWidth }: AttendanceLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(
    undefined,
    {
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
    },
  );

  const device = deviceQuery.data as any;
  const isDeviceOnline = device?.status === "online" || device?.connected === true;
  const isDeviceConnecting = device?.status === "connecting";

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-b from-secondary/5 to-transparent backdrop-blur-sm">
        <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            {/* Title section */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/15 px-2.5 py-0.5 text-[11px] font-medium text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                    نظام الحضور والانصراف
                  </div>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  إدارة الحضور والانصراف
                </h1>
                <p className="max-w-xl text-xs text-muted-foreground">
                  مراقبة حضور الموظفين، الورديات، والطلبات
                </p>
              </div>

              {/* Device Status Badge */}
              <div className="self-start sm:self-center">
                {deviceQuery.isLoading ? (
                  <div className="h-7 w-32 animate-pulse rounded-full bg-muted" />
                ) : (
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all ${
                      isDeviceOnline
                        ? "border-success/20 bg-success/10 text-success"
                        : isDeviceConnecting
                          ? "border-warning/20 bg-warning/10 text-warning"
                          : "border-muted bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isDeviceOnline
                          ? "bg-success animate-ping"
                          : isDeviceConnecting
                            ? "bg-warning animate-pulse"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <span>
                      {isDeviceOnline
                        ? "جهاز البصمة: متصل"
                        : isDeviceConnecting
                          ? "جهاز البصمة: جارٍ الاتصال"
                          : "جهاز البصمة: غير متصل"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Horizontal Pill Navigation Bar (Inline top navigation) */}
            <div className="lg:hidden mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap border-t border-border/40 pt-3">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const itemActive = isItemActive(location, item.activeFor);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                      itemActive
                        ? "bg-secondary text-secondary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className={`flex flex-col lg:flex-row mx-auto w-full ${fullWidth ? "" : "max-w-[1600px]"}`}>
        {/* Sidebar Navigation (Desktop only) */}
        <aside
          style={{ width: collapsed ? 56 : 256 }}
          className="hidden lg:flex lg:flex-col border-b border-border/60 bg-card/20 lg:border-b-0 lg:border-r border-border/60 min-h-[calc(100vh-115px)] transition-all duration-200 shrink-0 overflow-hidden"
        >
          {/* Toggle button row */}
          <div className="flex items-center justify-end border-b border-border/40 px-2 py-2">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={collapsed ? "توسيع" : "تصغير"}
            >
              {collapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
          <nav className={`flex-1 ${collapsed ? "p-1 space-y-1 pt-2" : "space-y-4 p-4"}`}>

            {navigationSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {/* Section header — hidden when collapsed */}
                {!collapsed && (
                  <div className="px-3 py-1">
                    <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                      {section.label}
                    </h3>
                  </div>
                )}

                {/* Section items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const itemActive = isItemActive(location, item.activeFor);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`group flex items-center rounded-lg text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 ${collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-3 py-2"} ${
                          itemActive
                            ? "bg-secondary/10 text-secondary font-medium shadow-sm border border-secondary/10"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${itemActive ? "text-secondary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        {!collapsed && <span className="flex-1 min-w-0 truncate">{item.label}</span>}
                        {!collapsed && (
                          <ChevronLeft
                            className={`h-3.5 w-3.5 shrink-0 transition-all opacity-0 ${
                              itemActive
                                ? "opacity-100 text-secondary translate-x-0"
                                : "group-hover:opacity-100 group-hover:-translate-x-0.5"
                            }`}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main className={`flex-1 min-w-0 py-6 ${fullWidth ? "px-2 sm:px-3" : "px-4 sm:px-6 lg:px-8"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
