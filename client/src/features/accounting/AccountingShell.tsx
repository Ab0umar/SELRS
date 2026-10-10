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
import OperationalModuleShell from "@/components/layout/OperationalModuleShell";
import { accountingNavigationForPermissions } from "./accountingNavigation";
import "./accounting-web.css";
import "./accounting-design.css";
import {
  AccountingTabMetricsProvider,
  useAccountingTabCenterState,
} from "./accountingTabMetrics";

interface AccountingShellProps {
  children: ReactNode;
}

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
        href: "/accounting/instapay",
        label: "InstaPay",
        icon: Smartphone,
        activeFor: ["/accounting/instapay"],
      },
      {
        href: "/accounting/home-fund",
        label: "البيت",
        icon: Home,
        activeFor: ["/accounting/home-fund"],
      },
      {
        href: "/accounting/dr-saadany",
        label: "د. السعدني",
        icon: UserRound,
        activeFor: ["/accounting/dr-saadany"],
      },
      {
        href: "/accounting/expenses",
        label: "المصروفات",
        icon: Receipt,
        activeFor: ["/accounting/expenses"],
      },
    ],
  },
];

function AccountingShellInner({ children }: AccountingShellProps) {
  const { canAccess } = usePermissions();

  const visibleNavItems = accountingNavigationForPermissions(
    topbarNavItems,
    canAccess,
  );
  const tabCenter = useAccountingTabCenterState();

  return (
    <OperationalModuleShell
      moduleName="accounting"
      title="الحسابات"
      ledger
      fullWidth
      description=""
      mark="ACC"
      metrics={[]}
      metricsCenter={tabCenter}
      endMetrics={[]}
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
