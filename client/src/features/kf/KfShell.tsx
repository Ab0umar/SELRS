import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import {
  Users,
  ClipboardList,
  CalendarRange,
  CalendarDays,
  BarChart3,
  ReceiptText,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Banknote,
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
      tone: "text-primary",
      accent: "bg-primary/10 border-primary/20",
    },
    {
      label: "زيارات اليوم",
      value: receiptsQ.isLoading ? "—" : fmtCount(receipts?.length ?? 0),
      tone: "text-foreground",
      accent: "bg-muted border-border/60",
    },
    {
      label: "خزنة الفرع",
      value: ledgerSummaryQ.isLoading ? "—" : fmtMoney(ledgerSummary?.currentBalance ?? 0),
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
            KF
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none">إدارة عمليات فرع كفر الشيخ</h1>
            <span className="text-[10px] text-muted-foreground block mt-1 font-medium">تسجيل المرضى، العمليات، المتابعات، وحسابات الفرع اليومية</span>
          </div>
        </div>

        {/* Top metrics grids */}
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:w-auto md:min-w-[500px]">
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
            section.items
              .filter((item) => canAccess(item.href))
              .map((item) => {
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
