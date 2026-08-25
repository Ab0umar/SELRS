import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Wallet, Trash2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { fmt, fmtDate, todayIso } from "../accounting/accountingFormat";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

const PAGE_SIZE = 50;

export default function KfLedger() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [filterNotes, setFilterNotes] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const [txDate, setTxDate] = useState(todayIso());
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [notes, setNotes] = useState("");
  const [entrySaved, setEntrySaved] = useState(false);

  const utils = trpc.useUtils();

  const summaryQ = trpc.kf.getLedgerSummary.useQuery({}, { refetchOnWindowFocus: false });
  const ledgerQ = trpc.kf.getLedger.useQuery(
    { page, pageSize: PAGE_SIZE, notes: filterNotes.trim() || undefined, sortDir },
    { refetchOnWindowFocus: false, placeholderData: (prev: any) => prev }
  );
  const addMut = trpc.kf.addLedgerEntry.useMutation();
  const deleteMut = trpc.kf.deleteLedgerEntry.useMutation({
    onSuccess: () => {
      utils.kf.getLedger.invalidate();
      utils.kf.getLedgerSummary.invalidate();
      toast.success("تم حذف القيد");
      setDelConfirm(null);
    },
    onError: () => toast.error("تعذر حذف القيد"),
  });

  const { rows = [], total = 0 } = (ledgerQ.data ?? {}) as any;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const s = summaryQ.data as any;
  const busy = addMut.isPending;

  async function handleSave() {
    await addMut.mutateAsync({
      entryDate: txDate,
      income: parseFloat(income) || 0,
      expense: parseFloat(expense) || 0,
      notes: notes.trim() || undefined,
    });
    utils.kf.getLedger.invalidate();
    utils.kf.getLedgerSummary.invalidate();
    setIncome(""); setExpense(""); setNotes(""); setPage(1);
    setEntrySaved(true);
    setTimeout(() => setEntrySaved(false), 2000);
  }

  return (
    <div className="space-y-4 lg:space-y-5" dir="rtl">
      {/* Summary */}
      <section className="rounded-[24px] border border-border bg-background p-2.5 lg:p-4">
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {(
            [
              { label: "إجمالي الإيراد", val: s?.totalIncome, cls: "text-success", bg: "bg-success/10", icon: TrendingUp },
              { label: "إجمالي المصروف", val: s?.totalExpense, cls: "text-destructive", bg: "bg-destructive/10", icon: TrendingDown },
              { label: "رصيد الخزنة", val: s?.currentBalance, cls: (s?.currentBalance ?? 0) >= 0 ? "text-primary" : "text-destructive", bg: (s?.currentBalance ?? 0) >= 0 ? "bg-primary/5" : "bg-destructive/10", icon: Wallet },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className={cn("flex min-w-0 items-center gap-2 rounded-2xl border px-2 py-2 lg:gap-3 lg:px-4 lg:py-3", m.bg)}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background lg:h-10 lg:w-10", m.cls)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-medium text-muted-foreground lg:text-xs">{m.label}</div>
                  <div className={cn("mt-0.5 truncate text-sm font-bold tabular-nums leading-none lg:text-lg", m.cls)}>
                    {summaryQ.isLoading ? "..." : fmt(m.val)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add entry */}
      <section className="rounded-lg border border-border bg-background p-4 lg:p-5">
        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-semibold text-foreground">إضافة قيد جديد</legend>
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="txDate" className="text-xs font-medium">التاريخ</label>
              <DateInput id="txDate" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="income" className="text-xs font-medium text-success">إيراد</label>
              <input id="income" type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="0"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-success placeholder:text-muted-foreground outline-none focus:border-success focus:ring-2 focus:ring-success/30" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense" className="text-xs font-medium text-destructive">مصروف</label>
              <input id="expense" type="number" min="0" value={expense} onChange={(e) => setExpense(e.target.value)} placeholder="0"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-destructive placeholder:text-muted-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-xs font-medium">البيان</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="وصف القيد..."
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
              <Button onClick={() => void handleSave()} disabled={busy || (!income && !expense)} className="shrink-0 gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {entrySaved ? "✓ تم الحفظ" : "إضافة قيد"}
              </Button>
            </div>
          </div>
        </fieldset>
      </section>

      {/* Filter + table */}
      <section className="rounded-lg border border-border bg-background">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="بحث في البيان..." value={filterNotes} onChange={(e) => { setFilterNotes(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-md border border-border bg-background pr-8 pl-3 text-sm outline-none focus:border-ring" />
          </div>
          {filterNotes && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterNotes(""); setPage(1); }} className="h-8 px-2">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")} className="h-8 text-xs">
            {sortDir === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
          </Button>
        </div>

        {ledgerQ.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground text-sm">لا توجد قيود.</p>
        ) : isMobile ? (
          <div className="space-y-2 p-3">
            {(rows as any[]).map((row: any) => (
              <div key={row.kfLedgerId} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(row.entryDate instanceof Date ? row.entryDate.toISOString().split("T")[0] : String(row.entryDate).slice(0, 10))}
                  </span>
                  {delConfirm === row.kfLedgerId ? (
                    <div className="flex gap-1">
                      <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={() => deleteMut.mutate({ kfLedgerId: row.kfLedgerId })} disabled={deleteMut.isPending}>
                        {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDelConfirm(null)}>لا</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelConfirm(row.kfLedgerId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-center text-xs">
                  <div>
                    <div className="text-success">إيراد</div>
                    <div className="mt-0.5 font-semibold tabular-nums text-success">{row.income > 0 ? fmt(row.income) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-destructive">مصروف</div>
                    <div className="mt-0.5 font-semibold tabular-nums text-destructive">{row.expense > 0 ? fmt(row.expense) : "—"}</div>
                  </div>
                </div>
                {row.notes && <div className="mt-2 text-xs text-muted-foreground">{row.notes}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                  <th className="px-3 py-2 text-right font-medium">التاريخ</th>
                  <th className="px-3 py-2 text-right font-medium text-success">إيراد</th>
                  <th className="px-3 py-2 text-right font-medium text-destructive">مصروف</th>
                  <th className="px-3 py-2 text-right font-medium">البيان</th>
                  <th className="px-3 py-2 text-right font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {(rows as any[]).map((row: any) => (
                  <tr key={row.kfLedgerId} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmtDate(row.entryDate instanceof Date ? row.entryDate.toISOString().split("T")[0] : String(row.entryDate).slice(0, 10))}</td>
                    <td className="px-3 py-2.5 tabular-nums text-success font-medium">{row.income > 0 ? fmt(row.income) : "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-destructive font-medium">{row.expense > 0 ? fmt(row.expense) : "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.notes || "—"}</td>
                    <td className="px-3 py-2.5">
                      {delConfirm === row.kfLedgerId ? (
                        <div className="flex gap-1">
                          <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => deleteMut.mutate({ kfLedgerId: row.kfLedgerId })} disabled={deleteMut.isPending}>
                            {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDelConfirm(null)}>لا</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDelConfirm(row.kfLedgerId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-2">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 px-2">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
