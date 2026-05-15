import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  BookOpen,
  Check,
  CreditCard,
  FileText,
  Home,
  Loader,
  Loader2,
  ReceiptText,
  RefreshCw,
  Scissors,
  Smartphone,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import AccountingShell from "./AccountingShell";
import { cn } from "@/lib/utils";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";

const quickLinkGroups = [
  [
    { label: "الخزنة — قيود", href: "/accounting/ledger",          icon: BookOpen,    desc: "إضافة وتعديل قيود الخزنة" },
    { label: "الخزنة — رصيد", href: "/accounting/cashbook",        icon: Wallet,      desc: "حركة الخزنة والرصيد الحالي" },
    { label: "كشف السلف",     href: "/accounting/advances",        icon: CreditCard,  desc: "سلف الموظفين وحركات السداد" },
    { label: "القروض",         href: "/accounting/loans",           icon: FileText,    desc: "متابعة القروض والسداد" },
  ],
  [
    { label: "الإيراد اليومي", href: "/accounting/daily-revenue",  icon: Banknote,    desc: "مراجعة الإيراد حسب اليوم" },
    { label: "إيراد الخدمات", href: "/accounting/service-revenue", icon: TrendingUp,  desc: "تقرير إيراد الخدمات" },
    { label: "بحث الإيصالات", href: "/accounting/receipts",        icon: ReceiptText, desc: "البحث بالرقم أو الكود" },
    { label: "الخدمات",        href: "/accounting/services",        icon: Scissors,    desc: "قائمة الخدمات" },
  ],
  [
    { label: "بحث المرضى",    href: "/accounting/patients",        icon: Users,       desc: "البحث عن المريض والإيصالات" },
    { label: "حساب مريض",     href: "/accounting/patient",         icon: UserRound,   desc: "فتح حساب مريض مباشرة" },
    { label: "حساب طبيب",     href: "/accounting/doctor",          icon: Stethoscope, desc: "فتح حساب طبيب مباشرة" },
  ],
  [
    { label: "رصيد البيت",    href: "/accounting/home-fund",       icon: Home,        desc: "متابعة حساب البيت" },
    { label: "رصيد انستاباي", href: "/accounting/instapay",        icon: Smartphone,  desc: "متابعة حساب انستاباي" },
  ],
];

function formatTime(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "م" : "ص";
  return `${String(h % 12 || 12).padStart(2, "0")}:${m} ${period}`;
}


export default function AccountingHome() {
  const summaryQuery = trpc.accounting.dashboardSummary.useQuery(
    { sectionCode: 15 },
    { refetchOnWindowFocus: true },
  );
  const cashbookSummaryQuery = trpc.accounting.accLedgerSummary.useQuery(
    {},
    { refetchOnWindowFocus: true },
  );

  const activityQuery = trpc.accounting.transactions.useQuery(
    { sectionCode: 15, limit: 20 },
    { refetchInterval: 60_000, refetchOnWindowFocus: true },
  );

  const categoriesQ = trpc.accounting.accCategories.useQuery(undefined, { refetchOnWindowFocus: false });
  const addMut = trpc.accounting.addAccEntry.useMutation();
  const utils = trpc.useUtils();

  const [txDate,  setTxDate]  = useState(() => new Date().toISOString().split("T")[0]);
  const [income,  setIncome]  = useState("");
  const [expense, setExpense] = useState("");
  const [notes,   setNotes]   = useState("");
  const [saved,   setSaved]   = useState(false);

  async function handleQuickAdd() {
    if ((!income && !expense) || !txDate) return;
    await addMut.mutateAsync({
      txDate,
      income:  parseFloat(income)  || 0,
      expense: parseFloat(expense) || 0,
      notes:   notes.trim(),
    });
    utils.accounting.accLedger.invalidate();
    utils.accounting.accLedgerSummary.invalidate();
    utils.accounting.accHomeLedger.invalidate();
    void cashbookSummaryQuery.refetch();
    setIncome(""); setExpense(""); setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const s = summaryQuery.data;
  const cashbook = cashbookSummaryQuery.data;
  const receipts = activityQuery.data ?? [];
  const cats = categoriesQ.data ?? [];
  const hasSummaryError = summaryQuery.isError || cashbookSummaryQuery.isError;
  const refreshSummary = () => {
    void summaryQuery.refetch();
    void cashbookSummaryQuery.refetch();
  };

  return (
    <AccountingShell>
      <div dir="rtl" className="space-y-4">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex gap-4">

            {/* Metrics column */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">مؤشرات اليوم</div>
              {([
                { href: "/accounting/daily-revenue", label: "إيراد اليوم",   val: summaryQuery.isLoading ? "..." : formatMoneyAr(s?.totalRevenueToday ?? 0) },
                { href: "/accounting/receipts",      label: "إيصالات اليوم", val: summaryQuery.isLoading ? "..." : formatCountAr(s?.totalReceiptsToday ?? 0) },
                { href: "/accounting/cashbook",      label: "إجمالي الإيراد", val: cashbookSummaryQuery.isLoading ? "..." : formatMoneyAr(cashbook?.totalIncome ?? 0) },
                { href: "/accounting/cashbook",      label: "رصيد الخزنة",   val: cashbookSummaryQuery.isLoading ? "..." : formatMoneyAr(cashbook?.currentBalance ?? 0) },
              ] as const).map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  className="group flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 no-underline transition-colors duration-100 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.13em] text-slate-500">{m.label}</span>
                    <svg className="h-3 w-3 shrink-0 text-slate-300 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4h8v8M4 12 12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="text-[1.05rem] font-bold tabular-nums leading-none text-slate-900">{m.val}</div>
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-slate-100" />

            {/* Quick-add cashbook entry */}
            <div className="flex flex-1 flex-col gap-2.5" dir="rtl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">قيد خزنة سريع</div>

              {/* Row 1: التاريخ | الإيراد | المصروف */}
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">التاريخ</span>
                  <input
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-emerald-700">الإيراد</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={income}
                    onChange={e => setIncome(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-rose-700">المصروف</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={expense}
                    onChange={e => setExpense(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-100"
                  />
                </div>
              </div>

              {/* Row 2: البيان */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">البيان</span>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="اسم الموظف أو البيان..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                {cats.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {cats.map(c => (
                      <button
                        key={c.id} type="button"
                        onClick={() => setNotes(c.name)}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                          notes.trim() === c.name
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >{c.name}</button>
                    ))}
                  </div>
                )}
              </div>

              {addMut.error && (
                <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{addMut.error.message}</p>
              )}

              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={addMut.isPending || (!income && !expense) || !txDate}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  saved
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40"
                )}
              >
                {addMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
                {saved ? "تم الحفظ" : "حفظ القيد"}
              </button>
            </div>

          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">التقارير</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">مسارات سريعة</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <div className="mt-3 flex gap-2">
            {quickLinkGroups.map((group, gi) => (
              <div key={gi} className="flex flex-1 flex-col gap-1">
                {group.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{item.label}</div>
                        <div className="truncate text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">حركات اليوم</h2>
              <p className="mt-1 text-xs text-slate-500">آخر الإيصالات والدفعيات المنفذة في القسم 15.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {activityQuery.isFetching && !activityQuery.isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                {activityQuery.isLoading ? "..." : formatCountAr(receipts.length)}
              </span>
            </div>
          </div>

          {activityQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader className="h-4 w-4 animate-spin" />
              جاري التحميل...
            </div>
          ) : activityQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-slate-500">
              <span>تعذر تحميل الحركات</span>
              <button type="button" className="text-blue-700 hover:underline" onClick={() => activityQuery.refetch()}>
                إعادة المحاولة
              </button>
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500">
              <FileText className="h-6 w-6 text-slate-300" />
              <span>لا توجد حركات مسجلة اليوم</span>
              <span className="text-xs text-slate-400">ستظهر الإيصالات هنا تلقائيًا عندما يبدأ القسم بالحركة</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th scope="col" className="w-20 px-3 py-2.5 text-right">الوقت</th>
                    <th scope="col" className="w-24 px-3 py-2.5 text-right">الإيصال</th>
                    <th scope="col" className="px-3 py-2.5 text-right">المريض</th>
                    <th scope="col" className="w-20 px-3 py-2.5 text-right">الكود</th>
                    <th scope="col" className="w-28 px-3 py-2.5 text-left" dir="ltr">
                      المبلغ
                    </th>
                    <th scope="col" className="w-28 px-3 py-2.5 text-left" dir="ltr">
                      المدفوع
                    </th>
                    <th scope="col" className="w-20 px-3 py-2.5 text-center">فتح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((r) => {
                    const remaining = r.total - r.discount - r.paidValue;
                    const href = `/accounting/receipts/${r.sectionCode}/${r.trTy}/${r.trNo}`;
                    return (
                      <tr key={`${r.trTy}-${r.trNo}`} className="transition-colors hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500" dir="ltr">
                          {formatTime(r.transactionDate)}
                        </td>
                        <td className="px-3 py-2 font-semibold tabular-nums text-slate-900" dir="ltr">
                          {r.trNo}
                        </td>
                        <td className="truncate px-3 py-2 text-slate-700">{r.patientName || "—"}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-500" dir="ltr">
                          {r.patientCode || "—"}
                        </td>
                        <td className={cn("px-3 py-2 tabular-nums", remaining > 0 && "font-semibold text-slate-900")} dir="ltr">
                          {formatMoneyAr(r.total - r.discount)}
                        </td>
                        <td className={cn("px-3 py-2 tabular-nums font-medium", remaining <= 0 ? "text-emerald-700" : "text-amber-700")} dir="ltr">
                          {formatMoneyAr(r.paidValue)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Link
                            href={href}
                            aria-label={`فتح الإيصال ${r.trNo}`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            عرض
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/80">
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold text-slate-500">
                      {formatCountAr(receipts.length)} إيصال
                    </td>
                    <td className="px-3 py-2.5 text-left tabular-nums font-bold text-slate-900" dir="ltr">
                      {formatMoneyAr(receipts.reduce((a, r) => a + (r.total - r.discount), 0))}
                    </td>
                    <td className="px-3 py-2.5 text-left tabular-nums font-bold text-emerald-700" dir="ltr">
                      {formatMoneyAr(receipts.reduce((a, r) => a + r.paidValue, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </AccountingShell>
  );
}
