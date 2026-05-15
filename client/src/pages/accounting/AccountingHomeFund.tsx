import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Check, Loader2, Search, X } from "lucide-react";
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

export default function AccountingHomeFund() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [entryDate,  setEntryDate]  = useState(today);
  const [entryIn,    setEntryIn]    = useState("");
  const [entryOut,   setEntryOut]   = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entrySaved, setEntrySaved] = useState(false);

  const filters = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: search.trim() || undefined }), [page, search]);

  const reportsQ = trpc.accounting.accReports.useQuery(undefined, { refetchOnWindowFocus: false });
  const ledgerQ  = trpc.accounting.accHomeLedger.useQuery(filters, { refetchOnWindowFocus: false, placeholderData: (prev) => prev });
  const addMut = trpc.accounting.addAccHome.useMutation({
    onSuccess: () => {
      utils.accounting.accReports.invalidate();
      utils.accounting.accHomeLedger.invalidate();
      setEntryIn(""); setEntryOut(""); setEntryNotes("");
      setEntryDate(new Date().toISOString().split("T")[0]);
      setEntrySaved(true);
      setTimeout(() => setEntrySaved(false), 2000);
    },
  });

  const home = reportsQ.data?.home;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const net = home?.net ?? 0;

  return (
    <AccountingShell>
      <div className="space-y-5" dir="rtl">

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex gap-4">

            {/* Left: الإجماليات + إضافة قيد stacked — fills remaining space */}
            <div className="flex flex-1 flex-col gap-3 min-w-0">
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-0.5">الإجماليات</div>
                <div className="flex gap-2">
                  {([
                    { label: "معاه (إيراد)", val: home?.totalIn,  cls: "text-emerald-700", icon: TrendingUp   },
                    { label: "منه (مصروف)", val: home?.totalOut, cls: "text-rose-700",    icon: TrendingDown },
                    { label: "المتبقي",      val: net,            cls: net >= 0 ? "text-blue-700" : "text-rose-700", icon: Wallet },
                  ] as const).map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="flex flex-1 flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-slate-500">{m.label}</span>
                          <Icon className={cn("h-3 w-3 shrink-0", m.cls)} />
                        </div>
                        <span className={cn("text-[1.05rem] font-bold tabular-nums leading-none", m.cls)}>
                          {reportsQ.isLoading ? "..." : fmt(m.val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2" dir="rtl">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">إضافة قيد</div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-slate-400">التاريخ</label>
                    <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-300 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-emerald-600">معاه</label>
                    <input type="number" min="0" value={entryIn} onChange={(e) => setEntryIn(e.target.value)} placeholder="0"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-emerald-700 placeholder:text-slate-300 focus:outline-none focus:border-emerald-300 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-rose-600">منه</label>
                    <input type="number" min="0" value={entryOut} onChange={(e) => setEntryOut(e.target.value)} placeholder="0"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-rose-700 placeholder:text-slate-300 focus:outline-none focus:border-rose-300 w-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="البيان..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-300" />
                  <button type="button" disabled={addMut.isPending || (!entryIn && !entryOut)}
                    onClick={() => addMut.mutate({ txDate: entryDate, inAmount: parseFloat(entryIn) || 0, outAmount: parseFloat(entryOut) || 0, notes: entryNotes.trim() })}
                    className={cn("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-white transition-colors",
                      entrySaved ? "bg-emerald-500" : "bg-blue-600 hover:bg-blue-700 disabled:opacity-40")}>
                    {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : entrySaved ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">+</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-slate-100" />

            {/* Right: search — fit to content */}
            <div className="flex w-fit flex-col gap-2" dir="rtl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-0.5">البحث</div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="بحث في البيان..." className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
                {search && <button type="button" onClick={() => { setSearch(""); setPage(1); }} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">حركات البيت</h2>
              <p className="mt-1 text-xs text-slate-500">كل الحركات المالية الخاصة بالبيت.</p>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{total.toLocaleString("ar-EG")} حركة</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-2.5 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-2.5 text-right font-medium">البيان</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums text-emerald-700">معاه</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums text-rose-700">منه</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums">الرصيد</th>
                  <th className="px-4 py-2.5 text-left font-medium tabular-nums">الاجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerQ.isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">جاري التحميل...</td></tr>}
                {!ledgerQ.isLoading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">لا توجد حركات</td></tr>}
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-blue-50/70">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(row.txDate)}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.notes ?? "—"}</td>
                    <td className={cn("px-4 py-2.5 text-left tabular-nums", row.inAmount ? "font-medium text-emerald-700" : "text-muted-foreground/30")}>
                      {row.inAmount ? fmt(row.inAmount) : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-left tabular-nums", row.outAmount ? "font-medium text-rose-700" : "text-muted-foreground/30")}>
                      {row.outAmount ? fmt(row.outAmount) : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-left tabular-nums text-xs", (row.balance ?? 0) < 0 ? "text-rose-600" : "text-emerald-700")}>{fmt(row.balance)}</td>
                    <td className="px-4 py-2.5 text-left tabular-nums text-xs text-foreground">{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">{total.toLocaleString("ar-EG")} حركة · صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountingShell>
  );
}
