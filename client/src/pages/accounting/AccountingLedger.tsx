import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, PenLine, TrendingUp, TrendingDown, Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";
import AccEntryDrawer, { type AccEntryRow } from "./AccEntryDrawer";

const PAGE_SIZE = 50;

const YEARS = ["الكل", "2026", "2025", "2024"] as const;
type Year = typeof YEARS[number];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}
function todayIso() { return new Date().toISOString().split("T")[0]; }

export default function AccountingLedger() {
  const [page, setPage]   = useState(1);
  const [year, setYear]   = useState<Year>("الكل");
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; row?: AccEntryRow }>({ open: false, mode: "add" });
  const [tableCollapsed, setTableCollapsed] = useState(false);

  // Inline entry form state
  const [txDate,  setTxDate]  = useState(todayIso());
  const [income,  setIncome]  = useState("");
  const [expense, setExpense] = useState("");
  const [notes,   setNotes]   = useState("");

  const [entrySaved, setEntrySaved] = useState(false);

  const utils = trpc.useUtils();
  const categoriesQ = trpc.accounting.accCategories.useQuery(undefined, { refetchOnWindowFocus: false });
  const addMut = trpc.accounting.addAccEntry.useMutation();

  const dateFrom = year !== "الكل" ? `${year}-01-01` : undefined;
  const dateTo   = year !== "الكل" ? `${year}-12-31` : undefined;

  const summaryQ = trpc.accounting.accLedgerSummary.useQuery({ dateFrom, dateTo }, { refetchOnWindowFocus: false });
  const ledgerQ  = trpc.accounting.accLedger.useQuery(
    { page, pageSize: PAGE_SIZE, dateFrom, dateTo },
    { refetchOnWindowFocus: false, placeholderData: (prev) => prev }
  );

  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const s = summaryQ.data;
  const cats = categoriesQ.data ?? [];
  const busy = addMut.isPending;
  const addErr = addMut.error?.message;

  function openEdit(row: typeof rows[0]) {
    setDrawer({
      open: true,
      mode: "edit",
      row: { id: row.id, txDate: row.txDate, income: row.income, expense: row.expense, notes: row.notes },
    });
  }
  function closeDrawer() { setDrawer(d => ({ ...d, open: false })); }
  function onSaved() { closeDrawer(); setPage(1); }

  async function handleSave() {
    await addMut.mutateAsync({
      txDate,
      income:  parseFloat(income)  || 0,
      expense: parseFloat(expense) || 0,
      notes:   notes.trim(),
    });
    utils.accounting.accLedger.invalidate();
    utils.accounting.accLedgerSummary.invalidate();
    utils.accounting.accReports.invalidate();
    utils.accounting.accAdvancesLedger.invalidate();
    utils.accounting.accHomeLedger.invalidate();
    utils.accounting.accInstagramLedger.invalidate();
    utils.accounting.accSaadanyLedger.invalidate();
    setIncome(""); setExpense(""); setNotes("");
    setPage(1);
    setEntrySaved(true);
    setTimeout(() => setEntrySaved(false), 2000);
  }

  return (
    <AccountingShell>
      <div className="space-y-5" dir="rtl">

        {/* Top section */}
        <section className="rounded-lg border border-slate-300 bg-white p-4 lg:p-5">
          <div className="flex gap-4">

            {/* Left: الإجماليات + إضافة قيد stacked — fills remaining space */}
            <div className="flex flex-1 flex-col gap-4 min-w-0">

              {/* الإجماليات */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">الإجماليات</h3>
                <div className="flex gap-2">
                  {([
                    { label: "إجمالي الإيراد", val: s?.totalIncome,    cls: "text-emerald-700", icon: TrendingUp   },
                    { label: "إجمالي المصروف", val: s?.totalExpense,   cls: "text-red-700",    icon: TrendingDown },
                    { label: "رصيد الخزنة",    val: s?.currentBalance, cls: (s?.currentBalance ?? 0) >= 0 ? "text-blue-700" : "text-red-700", icon: Wallet },
                  ] as const).map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="flex flex-1 flex-col gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-700">{m.label}</span>
                          <Icon className={cn("h-4 w-4 shrink-0", m.cls)} />
                        </div>
                        <span className={cn("text-lg font-bold tabular-nums leading-none", m.cls)}>
                          {summaryQ.isLoading ? "..." : fmt(m.val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* إضافة قيد */}
              <fieldset className="flex flex-col gap-2" dir="rtl">
                <legend className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">إضافة قيد</legend>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <label htmlFor="txDate" className="text-xs font-medium text-slate-700">التاريخ</label>
                    <input id="txDate" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label htmlFor="income" className="text-xs font-medium text-emerald-700">إيراد</label>
                    <input id="income" type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="0"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm tabular-nums text-emerald-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label htmlFor="expense" className="text-xs font-medium text-red-700">مصروف</label>
                    <input id="expense" type="number" min="0" value={expense} onChange={(e) => setExpense(e.target.value)} placeholder="0"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm tabular-nums text-red-700 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 w-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="البيان..."
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                  <button type="button" disabled={busy || !txDate} onClick={() => void handleSave()}
                    aria-label={entrySaved ? "تم الحفظ" : "إضافة قيد"}
                    className={cn("flex h-11 min-h-11 min-w-11 w-11 shrink-0 items-center justify-center rounded-lg text-white transition-colors font-medium",
                      entrySaved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed")}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : entrySaved ? <Check className="h-5 w-5" /> : <span className="text-base font-bold leading-none">+</span>}
                  </button>
                </div>
                {addErr && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addErr}</p>}
              </fieldset>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-slate-100" />

            {/* Right: Year filter + categories — fit to content */}
            <div className="flex w-fit flex-col gap-2" dir="rtl">
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-700">السنة</legend>
              <fieldset className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
                {YEARS.map(y => (
                  <button key={y} type="button" onClick={() => { setYear(y); setPage(1); }}
                    className={cn("px-4 py-2.5 text-sm font-medium transition-colors min-h-10",
                      year === y ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset")}>
                    {y}
                  </button>
                ))}
              </fieldset>
              {cats.length > 0 && (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">التصنيف</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cats.map(c => (
                      <button key={c.id} type="button" onClick={() => setNotes(notes.trim() === c.name ? "" : c.name)}
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          notes.trim() === c.name ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2")}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Ledger table */}
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <button
            type="button"
            onClick={() => setTableCollapsed(c => !c)}
            aria-expanded={!tableCollapsed}
            className="w-full flex cursor-pointer select-none items-center justify-between border-b border-slate-200 px-4 py-3 transition-colors duration-100 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          >
            <div className="text-left">
              <h2 className="text-base font-bold text-slate-900">حركات الخزنة</h2>
              <p className="mt-1 text-xs text-slate-600">انقر على أي سطر للتعديل.</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                {total.toLocaleString("ar-EG")} قيد
              </div>
              <svg
                className={cn("flex-shrink-0 text-slate-500 transition-transform duration-200 ease-out", tableCollapsed && "rotate-180")}
                width="20" height="20" viewBox="0 0 16 16" fill="none"
                aria-hidden="true"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {!tableCollapsed && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <th className="px-4 py-2.5 text-right font-medium">التاريخ</th>
                      <th className="px-4 py-2.5 text-right font-medium">البيان</th>
                      <th className="px-4 py-2.5 text-left font-medium tabular-nums text-emerald-700">إيراد</th>
                      <th className="px-4 py-2.5 text-left font-medium tabular-nums text-rose-700">مصروف</th>
                      <th className="px-4 py-2.5 text-left font-medium tabular-nums">الرصيد</th>
                      <th className="px-4 py-2.5 text-left font-medium tabular-nums">الاجمالي</th>
                      <th className="w-8 px-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerQ.isLoading && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">جاري التحميل...</td></tr>
                    )}
                    {!ledgerQ.isLoading && rows.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">لا توجد قيود — أضف قيداً من الأعلى.</td></tr>
                    )}
                    {rows.map(row => (
                      <tr
                        key={row.id}
                        onClick={() => openEdit(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openEdit(row);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="group cursor-pointer transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">{fmtDate(row.txDate)}</td>
                        <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-900">{row.notes ?? "—"}</td>
                        <td className={cn("px-4 py-2.5 text-left tabular-nums text-xs", row.income ? "font-medium text-emerald-700" : "text-slate-400")}>
                          {row.income ? fmt(row.income) : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-left tabular-nums text-xs", row.expense ? "font-medium text-red-700" : "text-slate-400")}>
                          {row.expense ? fmt(row.expense) : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-left tabular-nums text-xs font-medium", (row.balance ?? 0) < 0 ? "text-red-700" : "text-emerald-700")}>
                          {fmt(row.balance)}
                        </td>
                        <td className="px-4 py-2.5 text-left tabular-nums text-xs text-slate-700 font-medium">
                          {fmt(row.total)}
                        </td>
                        <td className="px-2 py-2.5">
                          <PenLine className="h-4 w-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <span className="text-sm text-slate-600">
                    {total.toLocaleString("ar-EG")} قيد · صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-11 w-11 min-h-11 min-w-11" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      aria-label="الصفحة السابقة">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-11 w-11 min-h-11 min-w-11" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      aria-label="الصفحة التالية">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AccEntryDrawer
        open={drawer.open}
        mode={drawer.mode}
        initial={drawer.row}
        onClose={closeDrawer}
        onSaved={onSaved}
      />
    </AccountingShell>
  );
}
