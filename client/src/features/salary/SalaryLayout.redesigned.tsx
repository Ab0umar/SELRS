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
    id: "dashboard",
    label: "الرئيسية",
    description: "نظرة عامة على الرواتب والعمولات",
    icon: BarChart3,
    items: [
      {
        href: "/salary",
        label: "لوحة التحكم",
        description: "مؤشرات وأداء الرواتب والعمولات",
        activeFor: ["/salary"],
        icon: BarChart3,
      },
    ],
  },
  {
    id: "preparation",
    label: "التحضير",
    description: "إعداد بيانات الرواتب الأساسية",
    icon: Users,
    items: [
      {
        href: "/salary/basics",
        label: "الرواتب الأساسية",
        description: "تحضير الرواتب والبدلات",
        activeFor: ["/salary/basics"],
        icon: Users,
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
        label: "العمولات الشهرية",
        description: "تسجيل عمولات الكشف والبنتاكام",
        activeFor: ["/salary/pools"],
        icon: Percent,
      },
      {
        href: "/salary/penalties",
        label: "الخصومات والسلف",
        description: "جزاءات الشهر والسلف والتأمينات",
        activeFor: ["/salary/penalties"],
        icon: Percent,
      },
      {
        href: "/salary/absent-report",
        label: "تقرير الغياب",
        description: "أيام الغياب والتصاريح",
        activeFor: ["/salary/absent-report"],
        icon: Percent,
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
        icon: BarChart3,
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
        icon: UserRound,
      },
      {
        href: "/salary/shift-payroll",
        label: "كشف الشفتات",
        description: "مستحقات الشفتات الشهرية",
        activeFor: ["/salary/shift-payroll"],
        icon: UserRound,
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
        description: "نسب الحضور والقواعد المستخدمة",
        activeFor: ["/salary/settings"],
        icon: SlidersHorizontal,
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

export default function SalaryLayout({ children }: SalaryLayoutProps) {
  const [location] = useLocation();

  const now = new Date();
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );
  const summary = summaryQ.data as any;

  // Key metrics for the dashboard header
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
      accent: "bg-muted border-border/60",
    },
    {
      label: "الخصومات والجزاءات",
      value: summary ? fmt(summary.totalPenalties) : "—",
      tone: "text-destructive",
      accent: "bg-destructive/10 border-destructive/20",
    },
    {
      label: "إجمالي العمولات",
      value: summary ? fmt(summary.totalCommissions) : "—",
      tone: "text-success",
      accent: "bg-success/10 border-success/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6" dir="rtl">
      
      {/* ── 1. Floating Bento Top Header Capsule ── */}
      <header className="max-w-[1600px] mx-auto mb-6 bg-card border border-border/60 rounded-3xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-mono font-black text-sm">
            SR
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none">إدارة عمليات الرواتب والعمولات</h1>
            <span className="text-[10px] text-muted-foreground block mt-1 font-medium">سجل الرواتب والمستحقات والعمولات والخصومات الشهرية</span>
          </div>
        </div>

        {/* Top metrics grids */}
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:w-auto md:min-w-[620px]">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border p-2.5 px-3 flex flex-col justify-center ${metric.accent}`}
            >
              <span className="text-[9px] font-bold text-muted-foreground block leading-none">
                {metric.label}
              </span>
              <span className={`mt-1 text-xs font-black font-mono leading-none ${metric.tone}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── 2. Floating Console Layout ── */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        {/* Horizontal Top Navigation Bar (all breakpoints) */}
        <nav className="w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none print:hidden">
          {navigationSections.flatMap((section) =>
            section.items.map((item) => {
              const isActive = isItemActive(location, item.activeFor);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-primary dark:text-primary-foreground dark:shadow-primary/10"
                      : "bg-card border border-border/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            }),
          )}
        </nav>

        {/* Main Content Floating Bento Container */}
        <main className="flex-1 w-full min-w-0 bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
          {children}
        </main>

      </div>
    </div>
  );
}
