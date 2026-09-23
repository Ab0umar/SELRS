import { type ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Home,
  BookOpen,
  Wallet,
  Receipt,
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
import OperationalModuleShell from "@/components/layout/OperationalModuleShell";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";
import {
  AccountingTabMetricsProvider,
  useAccountingTabMetricsState,
  useAccountingTabCenterState,
} from "./accountingTabMetrics";

interface AccountingShellProps {
  children: ReactNode;
}

// Top navigation (horizontal bar, single row, all breakpoints)
const topbarNavItems = [
  {
    href: "/accounting",
    label: "القيود",
    icon: BookOpen,
    activeFor: ["/accounting", "/accounting/ledger"],
  },
  {
    href: "/accounting/cashbook",
    label: "الخزنة",
    icon: Wallet,
    activeFor: ["/accounting/cashbook"],
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
    href: "/accounting/lasik-cost",
    label: "تكلفة الليزك",
    icon: Calculator,
    activeFor: ["/accounting/lasik-cost"],
  },
  {
    href: "/accounting/advances",
    label: "الحسابات الفرعية",
    icon: Wallet,
    activeFor: [],
    children: [
      { href: "/accounting/advances", label: "السلف", icon: CreditCard, activeFor: ["/accounting/advances"] },
      { href: "/accounting/loans", label: "القروض", icon: Landmark, activeFor: ["/accounting/loans"] },
      { href: "/accounting/instapay", label: "InstaPay", icon: Smartphone, activeFor: ["/accounting/instapay"] },
      { href: "/accounting/home-fund", label: "البيت", icon: Home, activeFor: ["/accounting/home-fund"] },
      { href: "/accounting/dr-saadany", label: "د. السعدني", icon: UserRound, activeFor: ["/accounting/dr-saadany"] },
      { href: "/accounting/expenses", label: "المصروفات", icon: Receipt, activeFor: ["/accounting/expenses"] },
    ],
  },
];

function AccountingShellInner({ children }: AccountingShellProps) {
  const { canAccess } = usePermissions();
  const isLedgerPage = ["/accounting", "/accounting/ledger"].includes(window.location.pathname);

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

  const visibleNavItems = topbarNavItems.filter(
    (item) => item.children?.length || canAccess(item.href),
  );
  const tabMetrics = useAccountingTabMetricsState();
  const tabCenter = useAccountingTabCenterState();

  return (
    <OperationalModuleShell
      moduleName="accounting"
      title="النظام المالي والحسابات"
      description="قيود اليومية، الخزنة، السلف، القروض، والتقارير المالية"
      mark="ACC"
      metrics={isLedgerPage ? [] : shellMetrics}
      metricsCenter={tabCenter}
      endMetrics={tabMetrics}
      navigation={visibleNavItems}
    >
      {children}
    </OperationalModuleShell>
  );
}

export default function AccountingShell({ children }: AccountingShellProps) {
  return (
    <AccountingTabMetricsProvider>
      <AccountingShellInner>{children}</AccountingShellInner>
    </AccountingTabMetricsProvider>
  );
}
