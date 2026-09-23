import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  RefreshCw,
  Loader2,
  Pencil,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmt, fmtDate } from "./accountingFormat";
import { AccountingPage } from "./AccountingPagePrimitives"
import AccEntryDrawer, { type AccEntryRow } from "./AccEntryDrawer";
import {
  useAccountingTabMetrics,
  useAccountingTabCenter,
} from "./accountingTabMetrics";

const PAGE_SIZE = 50;

const YEARS = ["الكل", "2026", "2025", "2024"] as const;
type Year = (typeof YEARS)[number];
type TxType = "all" | "income" | "expense";

export default function AccountingCashbook() {
  const utils = trpc.useUtils();

  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [editing, setEditing] = useState<AccEntryRow | null>(null);
  const [year, setYear] = useState<Year>("الكل");
  const [type, setType] = useState<TxType>("all");
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [syncTarget, setSyncTarget] = useState<"all" | "insta" | "البيت" | "غرابه" | "سلف">("all");

  const dateFrom = year !== "الكل" ? `${year}-01-01` : undefined;
  const dateTo = year !== "الكل" ? `${year}-12-31` : undefined;

  const filters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      type,
      notes: notes.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
      sortDir,
    }),
    [dateFrom, dateTo, type, notes, page, sortDir],
  );

  const summaryQ = trpc.accounting.accLedgerSummary.useQuery(
    { dateFrom, dateTo },
    { refetchOnWindowFocus: false },
  );
  const ledgerQ = trpc.accounting.accLedger.useQuery(filters, {
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const deleteMut = trpc.accounting.deleteAccEntry.useMutation({
    onSuccess: () => {
      utils.accounting.accLedger.invalidate();
      utils.accounting.accLedgerSummary.invalidate();
      toast.success("تم حذف القيد");
    },
    onError: () => toast.error("تعذر حذف القيد"),
  });

  const recalcMut = trpc.accounting.recalcAccLedgerBalances.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.accounting.accLedger.invalidate(),
        utils.accounting.accLedgerSummary.invalidate(),
      ]);
      toast.success("تم تحديث الأرصدة");
    },
    onError: () => toast.error("تعذر تحديث الأرصدة"),
  });
  const syncMirrorsMut = trpc.accounting.syncAccMirrors.useMutation({
    onSuccess: async (result) => {
      await Promise.all([utils.accounting.accLedger.invalidate(), utils.accounting.accLedgerSummary.invalidate()]);
      toast.success(`تم ترحيل ${result.inserted} وربط ${result.linked} قيد`);
    },
    onError: () => toast.error("تعذر ترحيل القيود تلقائياً"),
  });

  const summary = summaryQ.data;
  const tabMetricItems = [
    {
      label: "إجمالي الإيراد",
      value: summaryQ.isLoading ? "…" : fmt(summary?.totalIncome),
      icon: TrendingUp,
    },
    {
      label: "إجمالي المصروف",
      value: summaryQ.isLoading ? "…" : fmt(summary?.totalExpense),
      icon: TrendingDown,
    },
    {
      label: "رصيد الخزنة",
      value: summaryQ.isLoading ? "…" : fmt(summary?.currentBalance),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics(tabMetricItems);
  const tabCenter = useMemo(
    () => (
      <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-bold"
        disabled={recalcMut.isPending}
        onClick={() => recalcMut.mutate()}
      >
        {recalcMut.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        تحديث الرصيد
      </Button>
      <select value={syncTarget} onChange={(event) => setSyncTarget(event.target.value as typeof syncTarget)} className="h-9 rounded-xl border border-border bg-background px-2 text-xs font-bold">
        <option value="all">الكل</option><option value="insta">انستاباي</option><option value="البيت">البيت</option><option value="غرابه">د. السعدني</option><option value="سلف">السلف</option>
      </select>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-bold" disabled={syncMirrorsMut.isPending} onClick={() => syncMirrorsMut.mutate(syncTarget === "all" ? {} : { entity: syncTarget })}>
        {syncMirrorsMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
        ترحيل تلقائي
      </Button>
      </div>
    ),
    [recalcMut.isPending, syncMirrorsMut.isPending, syncTarget],
  );
  useAccountingTabCenter(tabCenter);


  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = () => setPage(1);

  return (
    <AccountingPage>
      <div className="space-y-3 sm:space-y-3.5" dir="rtl">
        <AccEntryDrawer open={editing !== null} mode="edit" initial={editing ?? undefined} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); utils.accounting.accLedger.invalidate(); utils.accounting.accLedgerSummary.invalidate(); }} />
        <div className="flex flex-wrap items-center justify-end gap-2 print:hidden"><span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {total.toLocaleString("ar-EG")} حركة
          </span></div>
<section className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-3">

            <div className="flex flex-wrap items-center gap-2">
              <fieldset className="flex overflow-hidden rounded-lg border border-border bg-background">
                <legend className="sr-only">تصفية السنة</legend>
                {YEARS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setYear(y);
                      resetPage();
                    }}
                    className={cn(
                      "px-2 py-1.5 text-xs font-medium transition-colors",
                      year === y
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    )}
                  >
                    {y}
                  </button>
                ))}
              </fieldset>

              <div className="flex h-10 flex-1 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Search
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <label htmlFor="cb-notes" className="sr-only">
                  بحث في الملاحظات
                </label>
                <input
                  id="cb-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    resetPage();
                  }}
                  placeholder="بحث في الملاحظات والبيان…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {notes && (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => {
                      setNotes("");
                      resetPage();
                    }}
                    className="p-1 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(["all", "income", "expense"] as TxType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      resetPage();
                    }}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                      type === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t === "all" ? "الكل" : t === "income" ? "إيراد" : "مصروف"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-[28px] border border-border bg-background shadow-sm">
          {!ledgerQ.isLoading && rows.length > 0 && (
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">
                  سجل الحركات
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  اضغط على التاريخ لتبديل الترتيب.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                  setPage(1);
                }}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                {sortDir === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
              </button>
            </div>
          )}

          {!ledgerQ.isLoading && rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              لا توجد حركات
            </div>
          ) : null}

          <div className="sm:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                التاريخ{" "}
                <span className="text-muted-foreground">
                  {sortDir === "desc" ? "↓" : "↑"}
                </span>
              </button>
              <span className="text-xs text-muted-foreground">
                {totalPages.toLocaleString("ar-EG")} صفحة
              </span>
            </div>

            <div className="grid gap-3 px-4 py-3">
              {ledgerQ.isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  جاري التحميل...
                </div>
              )}

              {!ledgerQ.isLoading && rows.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  لا توجد حركات
                </div>
              )}

              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors",
                    delConfirm === row.id && "bg-muted ring-1 ring-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDate(row.txDate)}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                        {row.notes ?? "—"}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                        (row.balance ?? 0) < 0
                          ? "bg-destructive text-destructive-foreground ring-destructive/20"
                          : "bg-success/10 text-success ring-success/20",
                      )}
                    >
                      {fmt(row.balance)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-success/10 px-3 py-2">
                      <div className="text-[10px] text-success">إيراد</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.income ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {row.income ? fmt(row.income) : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-destructive/10 px-3 py-2">
                      <div className="text-[10px] text-destructive">مصروف</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.expense
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.expense ? fmt(row.expense) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      الإجمالي:{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {fmt(row.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                    <button type="button" aria-label="تعديل القيد" className="inline-flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setEditing(row)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف القيد"
                      disabled={deleteMut.isPending}
                      className="inline-flex h-9 w-9 items-center justify-center rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDelConfirm(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                  </div>

                  {delConfirm === row.id ? (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        aria-label="تأكيد الحذف"
                        className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/80"
                        onClick={() => {
                          deleteMut.mutate({ id: row.id });
                          setDelConfirm(null);
                        }}
                      >
                        تأكيد
                      </button>
                      <button
                        type="button"
                        aria-label="إلغاء الحذف"
                        className="rounded-lg bg-muted text-muted-foreground hover:bg-border"
                        onClick={() => setDelConfirm(null)}
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                  <th
                    scope="col"
                    aria-sort={sortDir === "desc" ? "descending" : "ascending"}
                    className="w-[10%] px-2 py-2 text-right font-medium sm:px-4 sm:py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                        setPage(1);
                      }}
                      aria-label={`ترتيب حسب التاريخ ${sortDir === "desc" ? "تصاعدياً" : "تنازلياً"}`}
                      className="flex cursor-pointer select-none items-center gap-1 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      التاريخ{" "}
                      <span
                        className="text-muted-foreground"
                        aria-hidden="true"
                      >
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="w-[28%] px-2 py-2 text-right font-medium sm:px-4 sm:py-2.5"
                  >
                    البيان
                  </th>
                  <th scope="col" className="hidden w-[15%] px-2 py-2 text-right font-medium lg:table-cell lg:px-4 lg:py-2.5">ملاحظات</th>
                  <th
                    scope="col"
                    className="w-[10%] px-2 py-2 text-left font-medium tabular-nums text-success sm:px-4 sm:py-2.5"
                  >
                    إيراد
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-2 py-2 text-left font-medium tabular-nums text-destructive sm:px-4 sm:py-2.5"
                  >
                    مصروف
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[11%] px-4 py-2.5 text-left font-medium tabular-nums sm:table-cell"
                  >
                    الرصيد
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[11%] px-4 py-2.5 text-left font-medium tabular-nums sm:table-cell"
                  >
                    الإجمالي
                  </th>
                  <th scope="col" className="w-24 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerQ.isLoading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      لا توجد حركات
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-primary/50"
                  >
                    <td className="whitespace-nowrap px-2 py-2 text-[11px] text-muted-foreground sm:px-4 sm:py-2.5 sm:text-xs">
                      {fmtDate(row.txDate)}
                    </td>
                    <td className="whitespace-normal break-words px-2 py-2 text-sm leading-6 text-foreground sm:px-4 sm:py-2.5">
                      {row.notes ?? "—"}
                    </td>
                    <td className="hidden whitespace-normal break-words px-2 py-2 text-sm leading-6 text-muted-foreground lg:table-cell lg:px-4 lg:py-2.5">{row.remarks ?? "—"}</td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.income
                          ? "font-medium text-success"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.income ? fmt(row.income) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.expense
                          ? "font-medium text-destructive"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.expense ? fmt(row.expense) : "—"}
                    </td>
                    <td
                      className={cn(
                        "hidden px-4 py-2.5 text-left tabular-nums text-xs sm:table-cell",
                        (row.balance ?? 0) < 0
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {fmt(row.balance)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-left tabular-nums text-xs text-foreground sm:table-cell">
                      {fmt(row.total)}
                    </td>
                    <td className="w-24 px-2 py-2 text-center">
                      {delConfirm === row.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="تأكيد الحذف"
                            className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                            onClick={() => {
                              deleteMut.mutate({ id: row.id });
                              setDelConfirm(null);
                            }}
                          >
                            تأكيد
                          </button>
                          <button
                            type="button"
                            aria-label="إلغاء الحذف"
                            className="rounded bg-muted text-muted-foreground hover:bg-border"
                            onClick={() => setDelConfirm(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1"><button type="button" aria-label="تعديل القيد" className="inline-flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setEditing(row)}><Pencil className="h-3.5 w-3.5" /></button><button type="button" aria-label="حذف القيد" disabled={deleteMut.isPending} className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50" onClick={() => setDelConfirm(row.id)}><Trash2 className="h-3.5 w-3.5" /></button></div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {total.toLocaleString("ar-EG")} حركة · صفحة{" "}
                {page.toLocaleString("ar-EG")} من{" "}
                {totalPages.toLocaleString("ar-EG")}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  aria-label="الصفحة السابقة"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  aria-label="الصفحة التالية"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountingPage>
  );
}
