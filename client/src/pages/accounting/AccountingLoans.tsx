import { useRef, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, PenLine, Loader2, TrendingUp, TrendingDown, Wallet, Check, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";
import AccLoanDrawer, { type AccLoanRow } from "./AccLoanDrawer";

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

function remainingTone(value: number | null | undefined) {
  if ((value ?? 0) > 0) return "text-rose-700 bg-rose-50 ring-rose-100";
  if ((value ?? 0) < 0) return "text-amber-700 bg-amber-50 ring-amber-100";
  return "text-emerald-700 bg-emerald-50 ring-emerald-100";
}

function todayIso() { return new Date().toISOString().split("T")[0]; }

export default function AccountingLoans() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const addFormRef = useRef<HTMLDivElement | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; row?: AccLoanRow }>({ open: false, mode: "add" });
  const [txDate, setTxDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [entrySaved, setEntrySaved] = useState(false);

  function openEdit(row: AccLoanRow) { setDrawer({ open: true, mode: "edit", row }); }
  function closeDrawer() { setDrawer((d) => ({ ...d, open: false })); }
  function onSaved() { closeDrawer(); setPage(1); }

  const filters = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: search.trim() || undefined }), [page, search]);

  const reportsQ = trpc.accounting.accReports.useQuery(undefined, { refetchOnWindowFocus: false });
  const addMut = trpc.accounting.addAccLoan.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.accounting.accLoansLedger.invalidate(), utils.accounting.accReports.invalidate()]);
      setTxDate(todayIso()); setName(""); setAmount(""); setRepayment(""); setNotes(""); setPage(1);
      setEntrySaved(true);
      setTimeout(() => setEntrySaved(false), 2000);
    },
  });
  const ledgerQ = trpc.accounting.accLoansLedger.useQuery(filters, { refetchOnWindowFocus: false, placeholderData: (prev) => prev });

  const byPerson = reportsQ.data?.loans ?? [];
  const totalLoan = byPerson.reduce((s, r) => s + r.totalLoan, 0);
  const totalPaid = byPerson.reduce((s, r) => s + r.totalPaid, 0);
  const totalRemaining = totalLoan - totalPaid;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const addBusy = addMut.isPending;
  const addErr = addMut.error?.message;

  async function handleAddLoan() {
    await addMut.mutateAsync({ txDate, name: name.trim(), amount: parseFloat(amount) || 0, repayment: parseFloat(repayment) || 0, notes: notes.trim() });
  }

  return (
    <>
      <AccountingShell>
        <div className="space-y-5" dir="rtl">

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 lg:p-5">
            <div className="flex gap-4">

              {/* Col 1: الإجماليات + إضافة قرض stacked — fills remaining space */}
              <div ref={addFormRef} className="flex flex-1 flex-col gap-3 min-w-0">

                {/* الإجماليات */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-0.5">الإجماليات</div>
                  <div className="flex gap-2">
                    {([
                      { label: "إجمالي القروض", val: totalLoan,      cls: "text-blue-700",    icon: TrendingDown },
                      { label: "إجمالي السداد", val: totalPaid,      cls: "text-emerald-700", icon: TrendingUp   },
                      { label: "المتبقي",        val: totalRemaining, cls: totalRemaining > 0 ? "text-rose-700" : "text-blue-700", icon: Wallet },
                    ] as const).map((m) => {
                      const Icon = m.icon;
                      return (
                        <div key={m.label} className="flex flex-1 flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-1">
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

                {/* إضافة قرض */}
                <div className="flex flex-col gap-2" dir="rtl">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">إضافة قرض</div>
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs text-slate-400">التاريخ</label>
                      <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-300 w-full" />
                    </div>
                    <div className="flex flex-col gap-1 flex-[2]">
                      <label className="text-xs text-slate-400">الاسم</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المقترض"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-300 w-full" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs text-blue-600">المبلغ</label>
                      <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-blue-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-300 w-full" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs text-emerald-600">السداد</label>
                      <input type="number" min="0" value={repayment} onChange={(e) => setRepayment(e.target.value)} placeholder="0"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-emerald-700 placeholder:text-slate-300 focus:outline-none focus:border-emerald-300 w-full" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات..."
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-300" />
                    <button type="button" disabled={addBusy || !txDate || !name.trim()} onClick={() => void handleAddLoan()}
                      className={cn("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-white transition-colors",
                        entrySaved ? "bg-emerald-500" : "bg-blue-600 hover:bg-blue-700 disabled:opacity-40")}>
                      {addBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : entrySaved ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">+</span>}
                    </button>
                  </div>
                  {addErr && <p className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{addErr}</p>}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px self-stretch bg-slate-100" />

              {/* Col 2: النشطة — fit to content */}
              <div className="flex flex-col w-fit">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">النشطة</div>
                  <div className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {byPerson.length.toLocaleString("ar-EG")} اسم
                  </div>
                </div>
                {reportsQ.isLoading ? (
                  <div className="flex flex-1 items-center justify-center text-xs text-slate-400">جاري التحميل...</div>
                ) : byPerson.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                    لا توجد قروض مفتوحة
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-400">
                          <th className="px-2 py-1.5 text-right font-medium">الاسم</th>
                          <th className="px-2 py-1.5 text-left font-medium tabular-nums text-blue-600">القرض</th>
                          <th className="px-2 py-1.5 text-left font-medium tabular-nums text-emerald-600">المسدد</th>
                          <th className="px-2 py-1.5 text-left font-medium tabular-nums text-rose-600">المتبقي</th>
                          <th className="px-2 py-1.5 text-right font-medium">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {byPerson.map((row) => (
                          <tr key={row.name} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 font-medium text-slate-800">{row.name}</td>
                            <td className="px-2 py-1.5 text-left tabular-nums text-blue-700">{fmt(row.totalLoan)}</td>
                            <td className="px-2 py-1.5 text-left tabular-nums text-emerald-700">{fmt(row.totalPaid)}</td>
                            <td className={cn("px-2 py-1.5 text-left tabular-nums font-semibold", row.remaining > 0 ? "text-rose-700" : "text-slate-400")}>
                              {fmt(row.remaining)}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
                                row.remaining > 0 ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100")}>
                                {row.remaining > 0 ? "مفتوح" : "مغلق"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* حركات القروض */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => setTableCollapsed((v) => !v)}
              className="flex w-full items-center justify-between border-b border-slate-200 px-5 py-[10px] text-right transition-colors hover:bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">حركات القروض</h2>
                <p className="mt-1 text-xs text-slate-500">سجل تفصيلي لكل قرض وسداد.</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{total.toLocaleString("ar-EG")} حركة</div>
                <svg className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out", !tableCollapsed && "rotate-180")} viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>

            {/* Search */}
            {!tableCollapsed && (
              <div className="border-b border-slate-100 px-4 py-2" dir="rtl">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="بحث بالاسم أو الملاحظات..." className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
                  {search && <button type="button" onClick={() => { setSearch(""); setPage(1); }} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            )}

            {!tableCollapsed && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                        <th className="px-4 py-2.5 text-right font-medium">التاريخ</th>
                        <th className="px-4 py-2.5 text-right font-medium">الاسم</th>
                        <th className="px-4 py-2.5 text-left font-medium tabular-nums text-blue-700">المبلغ</th>
                        <th className="px-4 py-2.5 text-left font-medium tabular-nums text-emerald-700">السداد</th>
                        <th className="px-4 py-2.5 text-left font-medium tabular-nums text-rose-700">المتبقي</th>
                        <th className="px-4 py-2.5 text-right font-medium">ملاحظات</th>
                        <th className="w-8 px-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerQ.isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">جاري تحميل الحركات...</td></tr>}
                      {!ledgerQ.isLoading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">لا توجد حركات مسجلة</td></tr>}
                      {rows.map((row) => (
                        <tr key={row.id} onClick={() => openEdit({ id: row.id, txDate: row.txDate, name: row.name, amount: row.amount, repayment: row.repayment, notes: row.notes })}
                          className="group cursor-pointer transition-colors hover:bg-blue-50/60">
                          <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmtDate(row.txDate)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-900">{row.name ?? "—"}</td>
                          <td className={cn("px-4 py-2.5 text-left tabular-nums", row.amount ? "font-medium text-blue-700" : "text-slate-300")}>
                            {row.amount ? fmt(row.amount) : "—"}
                          </td>
                          <td className={cn("px-4 py-2.5 text-left tabular-nums", row.repayment ? "font-medium text-emerald-700" : "text-slate-300")}>
                            {row.repayment ? fmt(row.repayment) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-left tabular-nums">
                            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", remainingTone(row.remaining))}>
                              {fmt(row.remaining)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs leading-5 text-slate-500">{row.notes ?? "—"}</td>
                          <td className="px-2 py-2.5">
                            <PenLine className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
                    <span className="text-xs text-slate-500">{total.toLocaleString("ar-EG")} حركة · صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </AccountingShell>

      <AccLoanDrawer open={drawer.open} mode={drawer.mode} initial={drawer.row} onClose={closeDrawer} onSaved={onSaved} />
    </>
  );
}
