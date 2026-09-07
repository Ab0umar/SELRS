import { type ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import OperationalModuleShell from "@/components/layout/OperationalModuleShell";
import {
  Users,
  ClipboardList,
  CalendarRange,
  CalendarDays,
  CalendarPlus,
  BarChart3,
  ReceiptText,
  Wallet,
  Banknote,
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

function fmtMoney(value: number | undefined | null) {
  if (value == null) return "—";
  return value.toLocaleString("ar-EG") + " ج";
}

function fmtCount(value: number | undefined | null) {
  if (value == null) return "٠";
  return value.toLocaleString("ar-EG");
}

export default function KfShell({ children }: KfShellProps) {
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
      icon: Banknote,
    },
    {
      label: "زيارات اليوم",
      value: receiptsQ.isLoading ? "—" : fmtCount(receipts?.length ?? 0),
      icon: ReceiptText,
    },
    {
      label: "خزنة الفرع",
      value: ledgerSummaryQ.isLoading ? "—" : fmtMoney(ledgerSummary?.currentBalance ?? 0),
      icon: Wallet,
    },
  ];

  return (
    <OperationalModuleShell
      moduleName="kf"
      title="إدارة عمليات فرع كفر الشيخ"
      description="تسجيل المرضى، العمليات، المتابعات، وحسابات الفرع اليومية"
      mark="KF"
      metrics={metrics}
      navigation={navigationSections.flatMap((section) =>
        section.items.filter((item) => canAccess(item.href)),
      )}
    >
      {children}
    </OperationalModuleShell>
  );
}
