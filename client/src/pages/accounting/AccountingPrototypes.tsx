import { trpc } from "@/lib/trpc";
import AccountingShell from "./AccountingShell";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowUpRight,
  Banknote,
  Activity,
  ClipboardList,
  ReceiptText,
  Users,
  UserRound,
  Stethoscope,
  Wallet,
  Sparkles,
  Table2,
  PanelRight,
  LayoutGrid,
} from "lucide-react";
import { formatCountAr, formatMoneyAr } from "./accountingFormat";

const reports = [
  { label: "الإيراد اليومي", href: "/accounting/daily-revenue", icon: Banknote, desc: "مراجعة الإيرادات حسب اليوم" },
  { label: "إيراد الخدمات", href: "/accounting/service-revenue", icon: Activity, desc: "إجماليات الطبيب والخدمة" },
  { label: "استعلام الإيصالات", href: "/accounting/receipts", icon: ReceiptText, desc: "البحث عن رؤوس الإيصالات" },
  { label: "الخدمات", href: "/accounting/services", icon: ClipboardList, desc: "حركة خدمات الليزك" },
  { label: "استعلام المرضى", href: "/accounting/patients", icon: Users, desc: "بحث المرضى والإيصالات" },
  { label: "حساب مريض", href: "/accounting/patient", icon: UserRound, desc: "بحث حساب مريض" },
  { label: "حساب طبيب", href: "/accounting/doctor", icon: Stethoscope, desc: "بحث حساب طبيب" },
  { label: "الخزنة", href: "/accounting/cashbook", icon: Wallet, desc: "حركات الخزنة" },
];

function formatTime(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "م" : "ص";
  return `${String(h % 12 || 12).padStart(2, "0")}:${m} ${period}`;
}

function ProtoBadge({ tone, children }: { tone: "blue" | "emerald" | "amber"; children: ReactNode }) {
  const classes = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  }[tone];
  return <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold", classes)}>{children}</span>;
}

function SideRail({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-[28px] border border-slate-200 bg-white shadow-sm", compact ? "p-4" : "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{subtitle}</div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300" />
      </div>
      <div className="mt-4 space-y-2">
        {reports.slice(0, 3).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition-colors hover:bg-blue-50/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{item.label}</div>
                <div className="truncate text-xs text-slate-500">{item.desc}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MetricsRow({
  summary,
  cashbook,
}: {
  summary?: {
    totalRevenueToday?: number;
    totalReceiptsToday?: number;
    totalRevenueThisMonth?: number;
    totalReceiptsThisMonth?: number;
  };
  cashbook?: {
    totalIncome?: number;
    totalExpense?: number;
    currentBalance?: number;
  };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-blue-700/80">إيراد اليوم</div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatMoneyAr(summary?.totalRevenueToday ?? 0)}</div>
        <div className="mt-1 text-xs text-slate-500">مؤشر سريع</div>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700/80">إيصالات اليوم</div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatCountAr(summary?.totalReceiptsToday ?? 0)}</div>
        <div className="mt-1 text-xs text-slate-500">نشاط اليوم</div>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700/80">إجمالي الإيراد</div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatMoneyAr(cashbook?.totalIncome ?? 0)}</div>
        <div className="mt-1 text-xs text-slate-500">من الخزنة</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">رصيد الخزنة</div>
        <div className={cn("mt-2 text-2xl font-bold tabular-nums", (cashbook?.currentBalance ?? 0) >= 0 ? "text-blue-700" : "text-rose-700")}>
          {formatMoneyAr(cashbook?.currentBalance ?? 0)}
        </div>
        <div className="mt-1 text-xs text-slate-500">آخر إجمالي متاح</div>
      </div>
    </div>
  );
}

function ActivityTable({ rows }: { rows: Array<{ transactionDate: string; trNo: string; patientName?: string | null; patientCode?: string | null; total: number; discount: number; paidValue: number; sectionCode: number; trTy: number }> }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">حركات اليوم</h3>
          <p className="mt-1 text-xs text-slate-500">صفوف فعلية، بدون حشو بصري.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{formatCountAr(rows.length)} حركة</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <th scope="col" className="w-20 px-4 py-3 text-right">الوقت</th>
              <th scope="col" className="w-24 px-4 py-3 text-right">الإيصال</th>
              <th scope="col" className="px-4 py-3 text-right">المريض</th>
              <th scope="col" className="w-20 px-4 py-3 text-right">الكود</th>
              <th scope="col" className="w-28 px-4 py-3 text-left" dir="ltr">المبلغ</th>
              <th scope="col" className="w-28 px-4 py-3 text-left" dir="ltr">المدفوع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const remaining = r.total - r.discount - r.paidValue;
              return (
                <tr key={`${r.trTy}-${r.trNo}`} className="hover:bg-blue-50/70">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-500" dir="ltr">{formatTime(r.transactionDate)}</td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums text-slate-900" dir="ltr">{r.trNo}</td>
                  <td className="px-4 py-2.5 truncate text-slate-700">{r.patientName || "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-500" dir="ltr">{r.patientCode || "—"}</td>
                  <td className={cn("px-4 py-2.5 tabular-nums", remaining > 0 && "font-semibold text-slate-900")} dir="ltr">{formatMoneyAr(r.total - r.discount)}</td>
                  <td className={cn("px-4 py-2.5 tabular-nums font-medium", remaining <= 0 ? "text-emerald-700" : "text-amber-700")} dir="ltr">{formatMoneyAr(r.paidValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrototypePanel({
  title,
  subtitle,
  tone,
  icon: Icon,
  summary,
  cashbook,
  rows,
  variant,
}: {
  title: string;
  subtitle: string;
  tone: "blue" | "emerald" | "amber";
  icon: ComponentType<{ className?: string }>;
  summary?: {
    totalRevenueToday?: number;
    totalReceiptsToday?: number;
    totalRevenueThisMonth?: number;
    totalReceiptsThisMonth?: number;
  };
  cashbook?: {
    totalIncome?: number;
    totalExpense?: number;
    currentBalance?: number;
  };
  rows: Array<{ transactionDate: string; trNo: string; patientName?: string | null; patientCode?: string | null; total: number; discount: number; paidValue: number; sectionCode: number; trTy: number }>;
  variant: "command" | "workspace" | "mixed";
}) {
  const toneClasses = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
  }[tone];

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ProtoBadge tone={tone}>Prototype</ProtoBadge>
            <ProtoBadge tone={tone}>{variant === "command" ? "Command Center" : variant === "workspace" ? "Workspace First" : "Balanced Mixed"}</ProtoBadge>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", toneClasses)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
            </div>
          </div>
        </div>
        <Link href="/accounting" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          فتح الصفحة
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {variant === "workspace" ? null : <MetricsRow summary={summary} cashbook={cashbook} />}

        <div className={cn("grid gap-4", variant === "command" ? "lg:grid-cols-[minmax(0,1fr)_320px]" : variant === "workspace" ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-[minmax(0,1fr)_300px]")}>
          <div className="space-y-4">
            {variant === "workspace" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-[11px] font-medium text-slate-500">إيراد الشهر</div>
                  <div className="mt-2 text-xl font-bold tabular-nums text-slate-900">{formatMoneyAr(summary?.totalRevenueThisMonth ?? 0)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-[11px] font-medium text-slate-500">إيصالات الشهر</div>
                  <div className="mt-2 text-xl font-bold tabular-nums text-slate-900">{formatCountAr(summary?.totalReceiptsThisMonth ?? 0)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-[11px] font-medium text-slate-500">المصروف</div>
                  <div className="mt-2 text-xl font-bold tabular-nums text-slate-900">{formatMoneyAr(cashbook?.totalExpense ?? 0)}</div>
                </div>
              </div>
            ) : null}
            <ActivityTable rows={rows} />
          </div>

          <div className={cn("space-y-4", variant === "command" ? "lg:pt-0" : "")}>
            {variant === "command" ? (
              <>
                <SideRail title="التقارير" subtitle="مسارات سريعة" compact />
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">الملخص</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <div className="text-[11px] text-slate-500">اليوم</div>
                      <div className="mt-2 text-lg font-bold tabular-nums text-slate-900">{formatCountAr(summary?.totalReceiptsToday ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <div className="text-[11px] text-slate-500">الرصيد</div>
                      <div className="mt-2 text-lg font-bold tabular-nums text-slate-900">{formatMoneyAr(cashbook?.currentBalance ?? 0)}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : variant === "workspace" ? (
              <>
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <PanelRight className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">الخلاصة</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">بطاقات صغيرة، مساحة أكبر للجدول</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="text-[11px] text-slate-500">الخزنة</div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatMoneyAr(cashbook?.currentBalance ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="text-[11px] text-slate-500">إيراد اليوم</div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatMoneyAr(summary?.totalRevenueToday ?? 0)}</div>
                    </div>
                  </div>
                </div>
                <SideRail title="التقارير" subtitle="مسارات سريعة" compact />
              </>
            ) : (
              <>
                <SideRail title="التقارير" subtitle="مسارات سريعة" compact />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AccountingPrototypes() {
  const summaryQuery = trpc.accounting.dashboardSummary.useQuery({ sectionCode: 15 }, { refetchOnWindowFocus: true });
  const cashbookQuery = trpc.accounting.accLedgerSummary.useQuery({}, { refetchOnWindowFocus: true });
  const activityQuery = trpc.accounting.transactions.useQuery({ sectionCode: 15, limit: 8 }, { refetchOnWindowFocus: true });

  const summary = summaryQuery.data;
  const cashbook = cashbookQuery.data;
  const rows = activityQuery.data ?? [];

  return (
    <AccountingShell>
      <div dir="rtl" className="space-y-5">
        <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white/85 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">النسخ المقارنة</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">بيانات حية</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">تصميم الحسابات</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  ثلاث اتجاهات على نفس البيانات: Command Center, Workspace First, Balanced Mixed. الهدف أن ترى الفرق قبل ما نثبت اتجاهًا واحدًا.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/accounting" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                العودة للحسابات
              </Link>
              <Link href="/accounting/cashbook" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                فتح الخزنة
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-3">
          <PrototypePanel
            title="Command Center"
            subtitle="أعلى كثافة بصرية، ملخصات أكثر في الأعلى، ومسار سريع للتقارير."
            tone="blue"
            icon={Table2}
            summary={summary}
            cashbook={cashbook}
            rows={rows}
            variant="command"
          />
          <PrototypePanel
            title="Workspace First"
            subtitle="الجدول هو البطل، والبطاقات أصغر حتى يبقى التركيز على الحركة نفسها."
            tone="emerald"
            icon={PanelRight}
            summary={summary}
            cashbook={cashbook}
            rows={rows}
            variant="workspace"
          />
          <PrototypePanel
            title="Balanced Mixed"
            subtitle="وسط بين الاثنين، واجهة واضحة من الأعلى مع عمل فعلي مضبوط تحتها."
            tone="amber"
            icon={LayoutGrid}
            summary={summary}
            cashbook={cashbook}
            rows={rows}
            variant="mixed"
          />
        </div>
      </div>
    </AccountingShell>
  );
}
