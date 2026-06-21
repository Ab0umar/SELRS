import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Home,
  BookOpen,
  Wallet,
  CreditCard,
  Landmark,
  Smartphone,
  UserRound,
  Banknote,
  TrendingUp,
  ReceiptText,
  Users,
  Stethoscope,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";

interface AccountingShellProps {
  children: ReactNode;
}

// Navigation structure
const navigationSections = [
  {
    id: "cash-ledger",
    label: "الخزنة واليومية",
    items: [
      {
        href: "/accounting",
        label: "الرئيسية",
        icon: Home,
        activeFor: ["/accounting"],
      },
      {
        href: "/accounting/ledger",
        label: "قيود اليومية",
        icon: BookOpen,
        activeFor: ["/accounting/ledger"],
      },
      {
        href: "/accounting/cashbook",
        label: "حركة الخزنة",
        icon: Wallet,
        activeFor: ["/accounting/cashbook"],
      },
    ],
  },
  {
    id: "financial-tracking",
    label: "المتابعة المالية",
    items: [
      {
        href: "/accounting/advances",
        label: "سلف الموظفين",
        icon: CreditCard,
        activeFor: ["/accounting/advances"],
      },
      {
        href: "/accounting/loans",
        label: "القروض والسداد",
        icon: Landmark,
        activeFor: ["/accounting/loans"],
      },
      {
        href: "/accounting/home-fund",
        label: "صندوق البيت",
        icon: Home,
        activeFor: ["/accounting/home-fund"],
      },
      {
        href: "/accounting/instapay",
        label: "حركات انستاباي",
        icon: Smartphone,
        activeFor: ["/accounting/instapay"],
      },
      {
        href: "/accounting/dr-saadany",
        label: "مسحوبات د. السعدني",
        icon: UserRound,
        activeFor: ["/accounting/dr-saadany"],
      },
    ],
  },
  {
    id: "revenue-reports",
    label: "الإيرادات والتقارير",
    items: [
      {
        href: "/accounting/daily-revenue",
        label: "تقرير الإيراد اليومي",
        icon: Banknote,
        activeFor: ["/accounting/daily-revenue"],
      },
      {
        href: "/accounting/service-revenue",
        label: "تقرير إيراد الخدمات",
        icon: TrendingUp,
        activeFor: ["/accounting/service-revenue"],
      },
    ],
  },
  {
    id: "inquiries-accounts",
    label: "الاستعلامات والحسابات",
    items: [
      {
        href: "/accounting/receipts",
        label: "بحث ومراجعة الإيصالات",
        icon: ReceiptText,
        activeFor: ["/accounting/receipts"],
      },
      {
        href: "/accounting/patients-inquiry",
        label: "استعلام وحساب مريض",
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
        label: "متابعة حساب طبيب",
        icon: Stethoscope,
        activeFor: ["/accounting/doctor-account", "/accounting/doctor"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/accounting"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

const mobileNavItems = [
  { href: "/accounting", label: "الرئيسية", icon: Home, activeFor: ["/accounting"] },
  { href: "/accounting/ledger", label: "القيود", icon: BookOpen, activeFor: ["/accounting/ledger"] },
  { href: "/accounting/cashbook", label: "الخزنة", icon: Wallet, activeFor: ["/accounting/cashbook"] },
  { href: "/accounting/advances", label: "السلف", icon: CreditCard, activeFor: ["/accounting/advances"] },
  { href: "/accounting/loans", label: "القروض", icon: Landmark, activeFor: ["/accounting/loans"] },
  { href: "/accounting/daily-revenue", label: "اليومي", icon: Banknote, activeFor: ["/accounting/daily-revenue"] },
  { href: "/accounting/service-revenue", label: "الخدمات", icon: TrendingUp, activeFor: ["/accounting/service-revenue"] },
  { href: "/accounting/receipts", label: "الإيصالات", icon: ReceiptText, activeFor: ["/accounting/receipts"] },
  { href: "/accounting/patients-inquiry", label: "المرضى", icon: Users, activeFor: ["/accounting/patients-inquiry", "/accounting/patients", "/accounting/patient", "/accounting/patient-account"] },
  { href: "/accounting/doctor-account", label: "الأطباء", icon: Stethoscope, activeFor: ["/accounting/doctor-account", "/accounting/doctor"] },
  { href: "/accounting/home-fund", label: "البيت", icon: Home, activeFor: ["/accounting/home-fund"] },
  { href: "/accounting/instapay", label: "انستاباي", icon: Smartphone, activeFor: ["/accounting/instapay"] },
  { href: "/accounting/dr-saadany", label: "السعدني", icon: UserRound, activeFor: ["/accounting/dr-saadany"] },
];

export default function AccountingShell({ children }: AccountingShellProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { canAccess } = usePermissions();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const summaryQ = (trpc as any).accounting.dashboardSummary.useQuery(
    { sectionCode: 15, date: today },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const cashbookSummaryQ = (trpc as any).accounting.accLedgerSummary.useQuery(
    {},
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const s = summaryQ.data;
  const cashbook = cashbookSummaryQ.data;

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      {/* Header */}
      <div className="print:hidden border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent backdrop-blur-sm">
        <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            {/* Title section */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    <Banknote className="h-3.5 w-3.5 animate-pulse" />
                    إدارة الحسابات
                  </div>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  النظام المالي والحسابات
                </h1>
                <p className="max-w-xl text-xs text-muted-foreground">
                  إدارة القيود اليومية، الخزنة، السلف، القروض، والتقارير المالية للعيادة
                </p>
              </div>

              {/* Compact Metrics Pill Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 bg-muted/40 px-3.5 py-2 rounded-xl border border-border/40 w-fit self-start sm:self-center shadow-xs">
                <span className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-primary shrink-0" /> 
                  إيراد اليوم: <strong className="text-foreground">{summaryQ.isLoading ? "—" : formatMoneyAr(s?.totalRevenueToday ?? 0)} ج.م</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <ReceiptText className="h-3.5 w-3.5 text-success shrink-0" /> 
                  إيصالات اليوم: <strong className="text-foreground">{summaryQ.isLoading ? "—" : formatCountAr(s?.totalReceiptsToday ?? 0)}</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-success shrink-0" /> 
                  رصيد الخزنة: <strong className="text-foreground">{cashbookSummaryQ.isLoading ? "—" : formatMoneyAr(cashbook?.currentBalance ?? 0)} ج.م</strong>
                </span>
              </div>
            </div>

            {/* Mobile Horizontal Pill Navigation Bar (Inline top navigation) */}
            <div className="lg:hidden mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap border-t border-border/40 pt-3">
              {mobileNavItems.filter((item) => canAccess(item.href)).map((item) => {
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
          className="print:hidden hidden lg:flex lg:flex-col border-b border-border/60 bg-card/20 lg:border-b-0 lg:border-r border-border/60 min-h-[calc(100vh-115px)] transition-all duration-200 shrink-0 overflow-hidden"
        >
          <div className="flex items-center justify-end border-b border-border/40 px-2 py-2">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={collapsed ? "توسيع" : "تصغير"}
            >
              {collapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
          <nav className={`flex-1 ${collapsed ? "p-1 space-y-1 pt-2" : "space-y-4 p-4"} sticky top-4`}>
            {navigationSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccess(item.href));
              if (!visibleItems.length) return null;
              return (
              <div key={section.id} className="space-y-1">
                {!collapsed && (
                <div className="px-3 py-1">
                  <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                    {section.label}
                  </h3>
                </div>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
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
                        {!collapsed && <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-all opacity-0 ${itemActive ? "opacity-100 text-primary" : "group-hover:opacity-100 group-hover:-translate-x-0.5"}`} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );})}
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
