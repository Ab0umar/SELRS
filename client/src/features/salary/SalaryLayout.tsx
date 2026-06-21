import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign,
  BarChart3,
  Users,
  Percent,
  UserRound,
  ChevronRight,
  Clock,
  Settings,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SalaryLayoutProps {
  children: ReactNode;
}

function fmt(n: number) {
  return Number(n).toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Navigation structure
const navigationSections = [
  {
    id: "preparation",
    label: "التحضير",
    items: [
      {
        href: "/salary",
        label: "بيانات الرواتب الأساسية",
        icon: Users,
        activeFor: ["/salary"],
      },
      {
        href: "/salary/current-data",
        label: "بيانات الرواتب الحالية",
        icon: FileSpreadsheet,
        activeFor: ["/salary/current-data"],
      },
    ],
  },
  {
    id: "variables",
    label: "المتغيرات الشهرية",
    items: [
      {
        href: "/salary/pools",
        label: "النسب الشهرية",
        icon: Percent,
        activeFor: ["/salary/pools"],
      },
      {
        href: "/salary/penalties",
        label: "الخصومات والسلف",
        icon: AlertCircle,
        activeFor: ["/salary/penalties"],
      },
      {
        href: "/salary/absent-report",
        label: "تقرير الغياب والعمل",
        icon: Clock,
        activeFor: ["/salary/absent-report"],
      },
    ],
  },
  {
    id: "payroll",
    label: "كشف الشهر",
    items: [
      {
        href: "/salary/payroll",
        label: "كشف الشهر والتسوية",
        icon: BarChart3,
        activeFor: ["/salary/payroll"],
      },
    ],
  },
  {
    id: "shifts",
    label: "الشفتات",
    items: [
      {
        href: "/salary/shift-staff",
        label: "طاقم الشفتات والأطباء",
        icon: UserRound,
        activeFor: ["/salary/shift-staff"],
      },
      {
        href: "/salary/shift-payroll",
        label: "كشف الشفتات",
        icon: BadgeDollarSign,
        activeFor: ["/salary/shift-payroll"],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    items: [
      {
        href: "/salary/settings",
        label: "إعدادات وقواعد الرواتب",
        icon: Settings,
        activeFor: ["/salary/settings"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/salary"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

const mobileNavItems = [
  { href: "/salary", label: "الأساسي", icon: Users, activeFor: ["/salary"] },
  { href: "/salary/current-data", label: "الحالي", icon: FileSpreadsheet, activeFor: ["/salary/current-data"] },
  { href: "/salary/pools", label: "النسب", icon: Percent, activeFor: ["/salary/pools"] },
  { href: "/salary/penalties", label: "الخصومات", icon: AlertCircle, activeFor: ["/salary/penalties"] },
  { href: "/salary/absent-report", label: "الغياب", icon: Clock, activeFor: ["/salary/absent-report"] },
  { href: "/salary/payroll", label: "كشف الشهر", icon: BarChart3, activeFor: ["/salary/payroll"] },
  { href: "/salary/shift-staff", label: "الطاقم", icon: UserRound, activeFor: ["/salary/shift-staff"] },
  { href: "/salary/shift-payroll", label: "كشف الشفتات", icon: BadgeDollarSign, activeFor: ["/salary/shift-payroll"] },
  { href: "/salary/settings", label: "الإعدادات", icon: Settings, activeFor: ["/salary/settings"] },
];

export default function SalaryLayout({ children }: SalaryLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  const now = new Date();
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );
  const summary = summaryQ.data as any;

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent backdrop-blur-sm">
        <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            {/* Title section */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    <BadgeDollarSign className="h-3.5 w-3.5 animate-pulse" />
                    إدارة الرواتب
                  </div>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  نظام الرواتب والعمولات
                </h1>
                <p className="max-w-xl text-xs text-muted-foreground">
                  إدارة رواتب الموظفين، العمولات، الجزاءات، والشفتات الطبية
                </p>
              </div>

              {/* Compact Metrics Pill Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 bg-muted/40 px-3.5 py-2 rounded-xl border border-border/40 w-fit self-start sm:self-center shadow-xs">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary shrink-0" /> 
                  الموظفون: <strong className="text-foreground">{summary?.staffCount ?? "—"}</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <BadgeDollarSign className="h-3.5 w-3.5 text-success shrink-0" /> 
                  الرواتب: <strong className="text-foreground">{summary ? fmt(summary.totalPay) : "—"} ج.م</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" /> 
                  الخصومات: <strong className="text-foreground">{summary ? fmt(summary.totalPenalties) : "—"} ج.م</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-success shrink-0" /> 
                  العمولات: <strong className="text-foreground">{summary ? fmt(summary.totalCommissions) : "—"} ج.م</strong>
                </span>
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
                        ? "bg-primary text-primary-foreground shadow-sm"
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
      <div className="flex flex-col lg:flex-row mx-auto w-full max-w-[1600px]">
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
                        className={`group flex items-center rounded-lg text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-3 py-2"} ${
                          itemActive
                            ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/10"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${itemActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        {!collapsed && <span className="flex-1 min-w-0 truncate">{item.label}</span>}
                        {!collapsed && (
                          <ChevronLeft
                            className={`h-3.5 w-3.5 shrink-0 transition-all opacity-0 ${
                              itemActive
                                ? "opacity-100 text-primary translate-x-0"
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
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
