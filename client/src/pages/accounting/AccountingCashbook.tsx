import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Search, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";

const PAGE_SIZE = 50;

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

type TxType = "all" | "income" | "expense";

export default function AccountingCashbook() {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  const today = new Date().toISOString().split("T")[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo,   setDateTo]   = useState(today);
  const [type,     setType]     = useState<TxType>("all");
  const [notes,    setNotes]    = useState("");
  const [page,     setPage]     = useState(1);

  // Add entry form state
  const [entryDate,    setEntryDate]    = useState(today);
  const [entryIncome,  setEntryIncome]  = useState("");
  const [entryExpense, setEntryExpense] = useState("");
  const [entryNotes,   setEntryNotes]   = useState("");
  const [entrySaved,   setEntrySaved]   = useState(false);

  const filters = useMemo(() => ({ dateFrom, dateTo, type, notes: notes.trim() || undefined, page, pageSize: PAGE_SIZE }), [dateFrom, dateTo, type, notes, page]);

  const summaryQ = trpc.accounting.accLedgerSummary.useQuery({ dateFrom, dateTo }, { refetchOnWindowFocus: false });
  const ledgerQ  = trpc.accounting.accLedger.useQuery(filters, { refetchOnWindowFocus: false, placeholderData: (prev) => prev });
  const syncMut  = trpc.accounting.triggerAccSync.useMutation({
    onSuccess: () => { summaryQ.refetch(); ledgerQ.refetch(); },
  });
  const addMut = trpc.accounting.addAccEntry.useMutation({
    onSuccess: () => {
      summaryQ.refetch();
      ledgerQ.refetch();
      setEntryIncome("");
      setEntryExpense("");
      setEntryNotes("");
      setEntryDate(new Date().toISOString().split("T")[0]);
      setEntrySaved(true);
      setTimeout(() => setEntrySaved(false), 2000);
    },
  });

  const summary = summaryQ.data;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = () => setPage(1);

  return (
    <AccountingShell>
      <div className="space-y-5" dir="rtl">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex gap-4">

            {/* Left: الإجماليات + إضافة قيد stacked — fills remaining space */}
            <div className="flex flex-1 flex-col gap-3 min-w-0">

              {/* الإجماليات */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-0.5">الإجماليات</div>
                <div className="flex gap-2">
                  {([
                    { label: "إجمالي الإيراد", val: summary?.totalIncome,    icon: TrendingUp,   cls: "text-emerald-700" },
                    { label: "إجمالي المصروف", val: summary?.totalExpense,   icon: TrendingDown, cls: "text-rose-700" },
                    { label: "رصيد الخزنة",    val: summary?.currentBalance, icon: Wallet,       cls: (summary?.currentBalance ?? 0) >= 0 ? "text-blue-700" : "text-rose-700" },
                  ] as const).map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="flex flex-1 flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-slate-500">{m.label}</span>
                          <Icon className={cn("h-3 w-3 shrink-0", m.cls)} />
                        </div>
                        <span className={cn("text-[1.05rem] font-bold tabular-nums leading-none", m.cls)}>
                          {summaryQ.isLoading ? "..." : fmt(m.val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* إضافة قيد */}
              <div className="flex flex-col gap-2" dir="rtl">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">إضافة قيد</div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-slate-400">التاريخ</label>
                    <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-300 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-emerald-600">إيراد</label>
                    <input type="number" min="0" value={entryIncome} onChange={(e) => setEntryIncome(e.target.value)} placeholder="0"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-emerald-700 placeholder:text-slate-300 focus:outline-none focus:border-emerald-300 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-rose-600">مصروف</label>
                    <input type="number" min="0" value={entryExpense} onChange={(e) => setEntryExpense(e.target.value)} placeholder="0"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-rose-700 placeholder:text-slate-300 focus:outline-none focus:border-rose-300 w-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="البيان..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-300" />
                  <button type="button" disabled={addMut.isPending || (!entryIncome && !entryExpense)}
                    onClick={() => addMut.mutate({ txDate: entryDate, income: parseFloat(entryIncome) || 0, expense: parseFloat(entryExpense) || 0, notes: entryNotes.trim() })}
                    className={cn("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-white transition-colors",
                      entrySaved ? "bg-emerald-500" : "bg-blue-600 hover:bg-blue-700 disabled:opacity-40")}>
                    {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : entrySaved ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">+</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-slate-100" />

            {/* Right: Filters + search — fit to content */}
            <div className="flex w-fit flex-col gap-2.5" dir="rtl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-0.5">البحث والفلترة</div>

              {/* Date row */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <span className="text-xs text-slate-400">من</span>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none" />
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <span className="text-xs text-slate-400">إلى</span>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none" />
                </div>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {(["all", "income", "expense"] as TxType[]).map((t) => (
                    <button key={t} type="button" onClick={() => { setType(t); resetPage(); }}
                      className={cn("px-3 py-1.5 text-xs transition-colors",
                        type === t ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                      {t === "all" ? "الكل" : t === "income" ? "إيراد" : "مصروف"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes search */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); resetPage(); }}
                  placeholder="بحث في الملاحظات والبيان..."
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                {notes && (
                  <button type="button" onClick={() => { setNotes(""); resetPage(); }} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">حركات الخزنة</h2>
              <p className="mt-1 text-xs text-slate-500">الصفحة الحالية من الحركات مع رصيد متجدد.</p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {total.toLocaleString("ar-EG")} حركة
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-2.5 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-2.5 text-right font-medium">البيان</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums text-emerald-700">إيراد</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums text-rose-700">مصروف</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums">الرصيد</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerQ.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">جاري التحميل...</td>
                  </tr>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">لا توجد حركات</td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-blue-50/70">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                      {fmtDate(row.txDate)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{row.notes ?? "—"}</td>
                    <td className={cn("px-4 py-2.5 text-left tabular-nums", row.income ? "font-medium text-emerald-700" : "text-muted-foreground/30")}>
                      {row.income ? fmt(row.income) : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-left tabular-nums", row.expense ? "font-medium text-rose-700" : "text-muted-foreground/30")}>
                      {row.expense ? fmt(row.expense) : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-left tabular-nums text-xs", (row.balance ?? 0) < 0 ? "text-rose-600" : "text-emerald-700")}>
                      {fmt(row.balance)}
                    </td>
                    <td className="px-4 py-2.5 text-left tabular-nums text-xs text-foreground">
                      {fmt(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">
                {total.toLocaleString("ar-EG")} حركة · صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountingShell>
  );
}

