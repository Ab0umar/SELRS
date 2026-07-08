import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import {
  Users,
  ClipboardList,
  CalendarRange,
  CalendarDays,
  CalendarPlus,
  BarChart3,
  ReceiptText,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Sparkles,
  Pill,
  FlaskConical,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface KfShellProps {
  children: ReactNode;
}

// Navigation structure
const navigationSections = [
  {
    id: "dashboard",
    label: "الرئيسية",
    items: [
      {
        href: "/kf",
        label: "لوحة التحكم",
        icon: BarChart3,
        activeFor: ["/kf"],
      },
    ],
  },
  {
    id: "patients-monitoring",
    label: "المرضى والزيارات",
    items: [
      {
        href: "/kf/patients",
        label: "قائمة المرضى",
        icon: Users,
        activeFor: ["/kf/patients"],
      },
      {
        href: "/kf/operations",
        label: "العمليات",
        icon: ClipboardList,
        activeFor: ["/kf/operations"],
      },
      {
        href: "/kf/followups",
        label: "المتابعات",
        icon: CalendarRange,
        activeFor: ["/kf/followups"],
      },
      {
        href: "/kf/bookings",
        label: "حجز",
        icon: CalendarPlus,
        activeFor: ["/kf/bookings"],
      },
      {
        href: "/kf/prescription",
        label: "الروشتة",
        icon: Pill,
        activeFor: ["/kf/prescription"],
      },
      {
        href: "/kf/request-tests",
        label: "طلب فحوصات",
        icon: FlaskConical,
        activeFor: ["/kf/request-tests"],
      },
    ],
  },
  {
    id: "accounting-ledger",
    label: "الحسابات والتقارير",
    items: [
      {
        href: "/kf/accounting/daily-revenue",
        label: "الإيراد اليومي",
        icon: CalendarDays,
        activeFor: ["/kf/accounting/daily-revenue", "/kf/accounting"],
      },
      {
        href: "/kf/accounting/service-revenue",
        label: "إيراد الخدمات",
        icon: BarChart3,
        activeFor: ["/kf/accounting/service-revenue"],
      },
      {
        href: "/kf/accounting/receipts",
        label: "بحث الإيصالات",
        icon: ReceiptText,
        activeFor: ["/kf/accounting/receipts"],
      },
      {
        href: "/kf/accounting/ledger",
        label: "خزنة الفرع",
        icon: Wallet,
        activeFor: ["/kf/accounting/ledger"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/kf"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

function fmtMoney(value: number | undefined | null) {
  if (value == null) return "—";
  return value.toLocaleString("ar-EG") + " ج";
}

function fmtCount(value: number | undefined | null) {
  if (value == null) return "٠";
  return value.toLocaleString("ar-EG");
}

export default function KfShell({ children }: KfShellProps) {
  const [location] = useLocation();
  const { canAccess } = usePermissions();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const revenueQ = (trpc as any).kf.getRevenue.useQuery(
    { date: today },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const receiptsQ = (trpc as any).kf.listReceipts.useQuery(
    { fromDate: today, toDate: today },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const ledgerSummaryQ = (trpc as any).kf.getLedgerSummary.useQuery(
    {},
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const revenue = revenueQ.data;
  const receipts = receiptsQ.data || [];
  const ledgerSummary = ledgerSummaryQ.data;

  // Key metrics for the header
  const metrics = [
    {
      label: "إيراد اليوم",
      value: revenueQ.isLoading ? "—" : fmtMoney(revenue?.total ?? 0),
      tone: "text-emerald-600 dark:text-emerald-400",
      accent: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50",
    },
    {
      label: "زيارات اليوم",
      value: receiptsQ.isLoading ? "—" : fmtCount(receipts?.length ?? 0),
      tone: "text-blue-600 dark:text-blue-400",
      accent: "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50",
    },
    {
      label: "خزنة الفرع",
      value: ledgerSummaryQ.isLoading ? "—" : fmtMoney(ledgerSummary?.currentBalance ?? 0),
      tone: "text-purple-600 dark:text-purple-400",
      accent: "bg-purple-50 border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 transition-colors duration-300" dir="rtl">
      
      {/* ── 1. Header ── */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-mono font-black text-lg">
            KF
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              إدارة عمليات فرع كفر الشيخ
            </h1>
            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-2 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              تسجيل المرضى، العمليات، المتابعات، وحسابات الفرع اليومية
            </span>
          </div>
        </div>

        {/* Top metrics grids */}
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:w-auto md:min-w-[550px]">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col justify-center"
            >
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {metric.label}
              </span>
              <span className={`text-xl font-black font-mono leading-none ${metric.tone}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── 2. Open Console Layout ── */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-10">
        {/* Horizontal Top Navigation Bar */}
        <nav className="w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-4 border-b border-slate-200 dark:border-slate-800 scrollbar-none print:hidden">
          {navigationSections.flatMap((section) =>
            section.items
              .filter((item) => canAccess(item.href))
              .map((item) => {
                const isActive = isItemActive(location, item.activeFor);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shrink-0 transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              }),
          )}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">
          <div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
