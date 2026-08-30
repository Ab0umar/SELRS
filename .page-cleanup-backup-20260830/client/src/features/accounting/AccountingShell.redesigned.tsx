import { ReactNode } from "react";
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
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";

interface AccountingShellProps {
  children?: ReactNode;
}

const navigationSections = [
  {
    id: "cash-ledger",
    label: "الخزنة واليومية",
    description: "إدارة القيود والخزنة اليومية للمركز",
    icon: Wallet,
    items: [
      {
        href: "/accounting",
        label: "الرئيسية",
        description: "لوحة التحكم المالية والملخص اليومي",
        activeFor: ["/accounting"],
      },
      {
        href: "/accounting/ledger",
        label: "قيود اليومية",
        description: "تسجيل ومراجعة قيود اليومية والوارد والمنصرف",
        activeFor: ["/accounting/ledger"],
      },
      {
        href: "/accounting/cashbook",
        label: "حركة الخزنة",
        description: "متابعة أرصدة وإيداعات الخزنة الفرعية والرئيسية",
        activeFor: ["/accounting/cashbook"],
      },
    ],
  },
  {
    id: "financial-tracking",
    label: "المتابعة المالية",
    description: "التزامات وسلف وحسابات إدارية",
    icon: Landmark,
    items: [
      {
        href: "/accounting/advances",
        label: "سلف الموظفين",
        description: "سجل السلف الشهرية واستقطاعاتها",
        activeFor: ["/accounting/advances"],
      },
      {
        href: "/accounting/loans",
        label: "القروض والسداد",
        description: "سجل القروض الطويلة وسداد الدفعات",
        activeFor: ["/accounting/loans"],
      },
      {
        href: "/accounting/home-fund",
        label: "صندوق البيت",
        description: "حسابات ومصروفات صندوق البيت الخاصة",
        activeFor: ["/accounting/home-fund"],
      },
      {
        href: "/accounting/instapay",
        label: "حركات انستاباي",
        description: "حركات الإيداع والتحويل الإلكتروني",
        activeFor: ["/accounting/instapay"],
      },
      {
        href: "/accounting/dr-saadany",
        label: "مسحوبات د. السعدني",
        description: "مسحوبات الحساب الجاري للشريك الرئيسي",
        activeFor: ["/accounting/dr-saadany"],
      },
    ],
  },
  {
    id: "revenue-reports",
    label: "الإيرادات والتقارير",
    description: "تحليل الدخل وخدمات المركز",
    icon: Banknote,
    items: [
      {
        href: "/accounting/daily-revenue",
        label: "تقرير الإيراد اليومي",
        description: "ملخص مالي يومي لإيرادات الكشوفات والعمليات",
        activeFor: ["/accounting/daily-revenue"],
      },
      {
        href: "/accounting/service-revenue",
        label: "تقرير إيراد الخدمات",
        description: "تقسيم الإيرادات حسب نوع الخدمة المقدمة",
        activeFor: ["/accounting/service-revenue"],
      },
    ],
  },
  {
    id: "inquiries-accounts",
    label: "الاستعلامات والحسابات",
    description: "استعلام فواتير المرضى والأطباء",
    icon: Users,
    items: [
      {
        href: "/accounting/receipts",
        label: "بحث ومراجعة الإيصالات",
        description: "استعلام أرقام وتواريخ إيصالات الاستلام والتحصيل",
        activeFor: ["/accounting/receipts"],
      },
      {
        href: "/accounting/patients-inquiry",
        label: "استعلام وحساب مريض",
        description: "فواتير ومستحقات المرضى وحالات العمليات",
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
        description: "نسب الأطباء والعمولات المستحقة عن العمليات",
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

export default function AccountingShell({ children }: AccountingShellProps) {
  const [location] = useLocation();
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

  const metrics = [
    {
      label: "إيراد اليوم",
      value: summaryQ.isLoading ? "—" : `${formatMoneyAr(s?.totalRevenueToday ?? 0)} ج.م`,
      tone: "text-slate-800",
      accent: "bg-slate-50 border-slate-200",
    },
    {
      label: "إيصالات اليوم",
      value: summaryQ.isLoading ? "—" : formatCountAr(s?.totalReceiptsToday ?? 0),
      tone: "text-slate-800",
      accent: "bg-slate-50 border-slate-200",
    },
    {
      label: "رصيد الخزنة",
      value: cashbookSummaryQ.isLoading ? "—" : `${formatMoneyAr(cashbook?.currentBalance ?? 0)} ج.م`,
      tone: "text-emerald-700 font-black",
      accent: "bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <div
      className="page-layout min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Header with metrics */}
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Title section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  <Banknote className="h-3.5 w-3.5" />
                  إدارة الحسابات
                </div>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                النظام المالي والحسابات
              </h1>
              <p className="max-w-2xl text-[11px] font-semibold text-slate-400 mt-1 leading-snug">
                إدارة القيود اليومية، الخزنة، السلف، القروض، والتقارير المالية للعيادة.
              </p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-2xl border p-3.5 shadow-sm bg-white flex flex-col justify-between`}
                >
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {metric.label}
                  </div>
                  <div className={`mt-2 text-xl font-black font-mono leading-none tracking-tight ${metric.tone}`}>
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
        {/* Sidebar Navigation */}
        <aside className="w-full border-b border-slate-200 bg-white/50 lg:w-64 lg:border-b-0 lg:border-r">
          <nav className="space-y-1 p-3 sm:p-4 sticky top-4">
            {navigationSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccess(item.href));
              if (!visibleItems.length) return null;
              return (
                <div key={section.id} className="space-y-1">
                  {/* Section header */}
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider leading-none">
                          {section.label}
                        </h3>
                        <p className="text-[10px] text-slate-455 font-semibold mt-1 leading-normal">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section items */}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const itemActive = isItemActive(location, item.activeFor);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 ${
                            itemActive
                              ? "bg-slate-900 text-white font-bold shadow-sm"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <ChevronRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 rotate-180 transition-transform group-hover:-translate-x-0.5", itemActive ? "text-white" : "text-slate-450 group-hover:text-slate-900")} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold">{item.label}</div>
                            <div className={`text-[10px] mt-0.5 ${itemActive ? "text-slate-200" : "text-slate-400 group-hover:text-slate-500"} font-semibold`}>
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {section.id !== "inquiries-accounts" && (
                    <div className="my-2 border-t border-slate-100" />
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
