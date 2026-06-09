import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign,
  BarChart3,
  Users,
  Percent,
  UserRound,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  Settings,
  AlertCircle,
  FileSpreadsheet,
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

// Reorganized navigation structure - cleaner hierarchy
const navigationSections = [
  {
    id: "preparation",
    label: "التحضير",
    description: "إعداد بيانات الرواتب الأساسية",
    icon: Users,
    items: [
      {
        href: "/salary",
        label: "بيانات الرواتب الأساسية",
        description: "إدخال وتعديل الرواتب والشفتات",
        activeFor: ["/salary"],
      },
      {
        href: "/salary/current-data",
        label: "بيانات الرواتب الحالية",
        description: "عرض وطباعة الرواتب والشفتات",
        activeFor: ["/salary/current-data"],
      },
    ],
  },
  {
    id: "variables",
    label: "المتغيرات الشهرية",
    description: "إدخال البيانات المتغيرة كل شهر",
    icon: Percent,
    items: [
      {
        href: "/salary/pools",
        label: "النسب الشهرية",
        description: "تسجيل عمولات الكشف والبنتاكام",
        activeFor: ["/salary/pools"],
      },
      {
        href: "/salary/penalties",
        label: "الخصومات والسلف",
        description: "جزاءات الشهر والسلف والتأمينات",
        activeFor: ["/salary/penalties"],
      },
      {
        href: "/salary/absent-report",
        label: "تقرير الغياب",
        description: "أيام الغياب والتصاريح",
        activeFor: ["/salary/absent-report"],
      },
    ],
  },
  {
    id: "payroll",
    label: "كشف الشهر",
    description: "توليد واعتماد كشف الرواتب",
    icon: BarChart3,
    items: [
      {
        href: "/salary/payroll",
        label: "كشف الشهر",
        description: "احتساب ومراجعة وطباعة الرواتب",
        activeFor: ["/salary/payroll"],
      },
    ],
  },
  {
    id: "shifts",
    label: "الشفتات",
    description: "إدارة شفتات الأطباء والفنيين",
    icon: UserRound,
    items: [
      {
        href: "/salary/shift-staff",
        label: "طاقم الشفتات",
        description: "تعريف الأطباء والفنيين وأسعارهم",
        activeFor: ["/salary/shift-staff"],
      },
      {
        href: "/salary/shift-payroll",
        label: "كشف الشفتات",
        description: "مستحقات الشفتات الشهرية",
        activeFor: ["/salary/shift-payroll"],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    description: "ضبط قواعد الرواتب",
    icon: SlidersHorizontal,
    items: [
      {
        href: "/salary/settings",
        label: "إعدادات الرواتب",
        description: "نسب الحضور والقواعس المستخدمة",
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

function isSectionActive(pathname: string, items: any[]) {
  return items.some((item) => isItemActive(pathname, item.activeFor));
}

const mobileNavItems = [
  { href: "/salary", label: "الأساسي", icon: Users, activeFor: ["/salary"] },
  { href: "/salary/current-data", label: "الحالي", icon: FileSpreadsheet, activeFor: ["/salary/current-data"] },
  { href: "/salary/pools", label: "النسب", icon: Percent, activeFor: ["/salary/pools"] },
  { href: "/salary/penalties", label: "الخصومات", icon: AlertCircle, activeFor: ["/salary/penalties"] },
  { href: "/salary/absent-report", label: "الغياب", icon: Clock, activeFor: ["/salary/absent-report"] },
  { href: "/salary/payroll", label: "كشف الشهر", icon: BarChart3, activeFor: ["/salary/payroll"] },
  { href: "/salary/shift-staff", label: "طاقم الشفتات", icon: UserRound, activeFor: ["/salary/shift-staff"] },
  { href: "/salary/shift-payroll", label: "كشف الشفتات", icon: BadgeDollarSign, activeFor: ["/salary/shift-payroll"] },
  { href: "/salary/settings", label: "الإعدادات", icon: Settings, activeFor: ["/salary/settings"] },
];

export default function SalaryLayout({ children }: SalaryLayoutProps) {
  const [location] = useLocation();

  const now = new Date();
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );
  const summary = summaryQ.data as any;

  // Key metrics for the dashboard
  const metrics = [
    {
      label: "إجمالي الرواتب",
      value: summary ? fmt(summary.totalPay) : "—",
      tone: "text-primary",
      accent: "bg-primary/10 border-primary/20",
    },
    {
      label: "عدد الموظفين",
      value: summary ? String(summary.staffCount) : "—",
      tone: "text-foreground",
      accent: "bg-muted border-border",
    },
    {
      label: "الجزاءات",
      value: summary ? fmt(summary.totalPenalties) : "—",
      tone: "text-destructive",
      accent: "bg-destructive/10 border-destructive/20",
    },
    {
      label: "العمولات",
      value: summary ? fmt(summary.totalCommissions) : "—",
      tone: "text-success",
      accent: "bg-success/10 border-success/20",
    },
  ];

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      {/* Header with metrics */}
      <div className="border-b border-primary/15 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Title section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <BadgeDollarSign className="h-3.5 w-3.5" />
                  إدارة الرواتب
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                نظام الرواتب والعمولات
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                إدارة شاملة لرواتب الموظفين والعمولات والشفتات مع تقارير دقيقة
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
                  <div
                    className={`mt-1.5 text-lg font-bold tabular-nums ${metric.tone}`}
                  >
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
        {/* Sidebar Navigation (Desktop only) */}
        <aside className="hidden lg:block w-full border-b border-border bg-card/50 lg:w-64 lg:border-b-0 lg:border-r">
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
                          className={`group flex items-start gap-3 rounded-l-lg rounded-r-none border-r-2 px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            itemActive
                              ? "border-blue-600 bg-blue-50/70 text-blue-600 font-bold"
                              : "border-transparent text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                          }`}
                        >
                          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{item.label}</div>
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

        {/* Mobile Horizontal Pill Navigation Bar (2nd Bottom Bar) */}
        <div className="lg:hidden fixed bottom-14 left-0 right-0 h-14 bg-card border-t border-border flex items-center gap-2 px-4 overflow-x-auto z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] scrollbar-none whitespace-nowrap">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const itemActive = isItemActive(location, item.activeFor);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  itemActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/85"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Main content area */}
        <main className="flex-1 px-3 py-5 pb-32 sm:px-4 sm:pb-32 lg:px-5 lg:pb-5">{children}</main>
      </div>
    </div>
  );
}
