import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign,
  BarChart3,
  Users,
  Percent,
  UserRound,
  SlidersHorizontal,
  WalletCards,
  ChevronRight,
} from "lucide-react";

interface SalaryLayoutProps {
  children: ReactNode;
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
        href: "/salary/funds",
        label: "الصندوق والعيدية",
        description: "صندوق العمليات وعيديات الموظفين",
        activeFor: ["/salary/funds"],
        icon: WalletCards,
      },
      {
        href: "/salary/penalties",
        label: "الخصومات والسلف",
        description: "جزاءات الشهر والسلف والتأمينات",
        activeFor: ["/salary/penalties"],
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
        label: "الشفتات",
        description: "طاقم الشفتات وكشف المستحقات",
        activeFor: ["/salary/shift-staff", "/salary/shift-payroll"],
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

  return (
    <div
      className="salary-table-redesign min-h-screen bg-background text-foreground p-4 sm:p-6"
      dir="rtl"
    >
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
