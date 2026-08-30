import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Home,
  BookOpen,
  Wallet,
  CreditCard,
  Landmark,
  Smartphone,
  Banknote,
  TrendingUp,
  ReceiptText,
  Users,
  Stethoscope,
  Scissors,
  UserRound,
  Calculator,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";

interface AccountingShellProps {
  children: ReactNode;
}

// Top navigation (horizontal bar, single row, all breakpoints)
const topbarNavItems = [
  {
    href: "/accounting/ledger",
    label: "القيود",
    icon: BookOpen,
    activeFor: ["/accounting/ledger"],
  },
  {
    href: "/accounting/cashbook",
    label: "الخزنة",
    icon: Wallet,
    activeFor: ["/accounting/cashbook"],
  },
  {
    href: "/accounting/advances",
    label: "السلف",
    icon: CreditCard,
    activeFor: ["/accounting/advances"],
  },
  {
    href: "/accounting/loans",
    label: "القروض",
    icon: Landmark,
    activeFor: ["/accounting/loans"],
  },
  {
    href: "/accounting/home-fund",
    label: "البيت",
    icon: Home,
    activeFor: ["/accounting/home-fund"],
  },
  {
    href: "/accounting/instapay",
    label: "انستاباي",
    icon: Smartphone,
    activeFor: ["/accounting/instapay"],
  },
  {
    href: "/accounting/daily-revenue",
    label: "الإيراد اليومي",
    icon: Banknote,
    activeFor: ["/accounting/daily-revenue"],
  },
  {
    href: "/accounting/service-revenue",
    label: "إيراد الخدمات",
    icon: TrendingUp,
    activeFor: ["/accounting/service-revenue"],
  },
  {
    href: "/accounting/lasik-cost",
    label: "تكلفة الليزك",
    icon: Calculator,
    activeFor: ["/accounting/lasik-cost"],
  },
  {
    href: "/accounting/services",
    label: "الخدمات",
    icon: Scissors,
    activeFor: ["/accounting/services"],
  },
  {
    href: "/accounting/receipts",
    label: "الإيصالات",
    icon: ReceiptText,
    activeFor: ["/accounting/receipts"],
  },
  {
    href: "/accounting/patients-inquiry",
    label: "حساب مريض",
    icon: Users,
    activeFor: [
      "/accounting/patients-inquiry",
      "/accounting/patients",
      "/accounting/patient",
      "/accounting/patient-account",
    ],
  },
  {
    href: "/accounting/doctor-account",
    label: "حساب طبيب",
    icon: Stethoscope,
    activeFor: ["/accounting/doctor-account", "/accounting/doctor"],
  },
  {
    href: "/accounting/dr-saadany",
    label: "د. السعدني",
    icon: UserRound,
    activeFor: ["/accounting/dr-saadany"],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/accounting"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function AccountingShell({ children }: AccountingShellProps) {
  const [location] = useLocation();
  const { canAccess } = usePermissions();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const summaryQ = (trpc as any).accounting.dashboardSummary.useQuery(
    { sectionCode: 15, date: today },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  // The balance is cashbook data — only surface it to users who can open both
  // الخزنة and القيود.
  const canSeeCashbookBalance =
    canAccess("/accounting/cashbook") && canAccess("/accounting/ledger");

  const cashbookSummaryQ = (trpc as any).accounting.accLedgerSummary.useQuery(
    {},
    {
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
      enabled: canSeeCashbookBalance,
    },
  );

  const s = summaryQ.data;
  const cashbook = cashbookSummaryQ.data;
  const shellMetrics = [
    {
      label: "إيراد اليوم",
      value: summaryQ.isLoading
        ? "—"
        : `${formatMoneyAr(s?.totalRevenueToday ?? 0)} ج.م`,
      icon: Banknote,
    },
    {
      label: "إيصالات اليوم",
      value: summaryQ.isLoading
        ? "—"
        : formatCountAr(s?.totalReceiptsToday ?? 0),
      icon: ReceiptText,
    },
    ...(canSeeCashbookBalance
      ? [
          {
            label: "رصيد الخزنة",
            value: cashbookSummaryQ.isLoading
              ? "—"
              : `${formatMoneyAr(cashbook?.currentBalance ?? 0)} ج.م`,
            icon: Wallet,
          },
        ]
      : []),
  ];

  const visibleNavItems = topbarNavItems.filter((item) => canAccess(item.href));

  return (
    <div
      data-accounting-shell
      className="page-layout min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6"
      dir="rtl"
    >
      <header className="mx-auto mb-6 flex max-w-[1600px] flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-md shadow-slate-900/10">
            ACC
          </div>
          <div>
            <h1 className="text-sm font-black leading-none text-slate-900">
              النظام المالي والحسابات
            </h1>
            <span className="mt-1 block text-[10px] font-medium text-slate-400">
              قيود اليومية، الخزنة، السلف، القروض، والتقارير المالية
            </span>
          </div>
        </div>

        <div
          className={cn(
            "grid w-full grid-cols-1 gap-2 md:w-auto",
            canSeeCashbookBalance
              ? "sm:grid-cols-3 md:min-w-[520px]"
              : "sm:grid-cols-2 md:min-w-[350px]",
          )}
        >
          {shellMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  {metric.label}
                </div>
                <div className="mt-1 truncate text-sm font-black tabular-nums text-slate-900">
                  {metric.value}
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-3xl border border-slate-200 bg-white p-2 shadow-sm print:hidden scrollbar-none sm:p-3">
          {visibleNavItems.map((item) => {
            const itemActive = isItemActive(location, item.activeFor);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  itemActive
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <main
          data-accounting-module
          className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
