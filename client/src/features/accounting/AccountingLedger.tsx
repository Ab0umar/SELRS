import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PenLine,
  TrendingUp,
  TrendingDown,
  Wallet,
  Check,
  Trash2,
  Search,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AccEntryDrawer, { type AccEntryRow } from "./AccEntryDrawer";
import { fmt, fmtDate, todayIso } from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";
import { AccountingPage } from "./AccountingPagePrimitives"
import {
  useAccountingTabMetrics,
  useAccountingTabCenter,
} from "./accountingTabMetrics";

const PAGE_SIZE = 50;

const YEARS = ["الكل", "2026", "2025", "2024"] as const;
type Year = (typeof YEARS)[number];

export default function AccountingLedger() {
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [year, setYear] = useState<Year>("الكل");
  const [drawer, setDrawer] = useState<{
    open: boolean;
    mode: "add" | "edit";
    row?: AccEntryRow;
  }>({ open: false, mode: "add" });
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [filterNotes, setFilterNotes] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [txDate, setTxDate] = useState(todayIso());
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [notes, setNotes] = useState("");
  const [notesFocused, setNotesFocused] = useState(false);
  const [entrySaved, setEntrySaved] = useState(false);

  const utils = trpc.useUtils();
  const categoriesQ = trpc.accounting.accCategories.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const addMut = trpc.accounting.addAccEntry.useMutation();
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

  const dateFrom = year !== "الكل" ? `${year}-01-01` : undefined;
  const dateTo = year !== "الكل" ? `${year}-12-31` : undefined;

  const summaryQ = trpc.accounting.accLedgerSummary.useQuery(
    { dateFrom, dateTo },
    { refetchOnWindowFocus: false },
  );
  const ledgerQ = trpc.accounting.accLedger.useQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      dateFrom,
      dateTo,
      notes: filterNotes.trim() || undefined,
      sortDir,
    },
    { refetchOnWindowFocus: false, placeholderData: (prev) => prev },
  );

  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const s = summaryQ.data;
  const tabMetricItems = [
    {
      label: "إجمالي الإيراد",
      value: summaryQ.isLoading ? "…" : fmt(s?.totalIncome),
      icon: TrendingUp,
    },
    {
      label: "إجمالي المصروف",
      value: summaryQ.isLoading ? "…" : fmt(s?.totalExpense),
      icon: TrendingDown,
    },
    {
      label: "رصيد الخزنة",
      value: summaryQ.isLoading ? "…" : fmt(s?.currentBalance),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics(tabMetricItems);
  const tabCenter = useMemo(
    () => (
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
    ),
    [recalcMut.isPending],
  );
  useAccountingTabCenter(tabCenter);


  const cats = categoriesQ.data ?? [];
  const busy = addMut.isPending;
  const addErr = addMut.error?.message;

  function openEdit(row: (typeof rows)[0]) {
    setDrawer({
      open: true,
      mode: "edit",
      row: {
        id: row.id,
        txDate: row.txDate,
        income: row.income,
        expense: row.expense,
        notes: row.notes,
      },
    });
  }

  function closeDrawer() {
    setDrawer((d) => ({ ...d, open: false }));
  }

  function onSaved() {
    closeDrawer();
    setPage(1);
  }

  async function handleSave() {
    await addMut.mutateAsync({
      txDate,
      income: parseFloat(income) || 0,
      expense: parseFloat(expense) || 0,
      notes: notes.trim(),
    });
    utils.accounting.accLedger.invalidate();
    utils.accounting.accLedgerSummary.invalidate();
    utils.accounting.accReports.invalidate();
    utils.accounting.accAdvancesLedger.invalidate();
    utils.accounting.accHomeLedger.invalidate();
    utils.accounting.accInstapayLedger.invalidate();
    utils.accounting.accSaadanyLedger.invalidate();
    setIncome("");
    setExpense("");
    setNotes("");
    setPage(1);
    setEntrySaved(true);
    setTimeout(() => setEntrySaved(false), 2000);
  }

  return (
    <AccountingPage>
      <div className="space-y-3 sm:space-y-3.5" dir="rtl">
        <section
          className="w-fit max-w-full rounded-xl border border-border/60 bg-card p-2.5 sm:p-3"
          dir="rtl"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-bold text-foreground">
              إضافة قيد جديد
            </legend>

            <div className="flex w-fit max-w-full flex-wrap items-end gap-2" dir="rtl">
              <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                <label
                  htmlFor="income"
                  className="text-base font-bold text-success"
                >
                  إيراد
                </label>
                <input
                  id="income"
                  type="number"
                  min="0"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-success placeholder:text-muted-foreground outline-none focus:border-success focus:ring-2 focus:ring-success/30"
                />
              </div>
              <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                <label
                  htmlFor="expense"
                  className="text-base font-bold text-destructive"
                >
                  مصروف
                </label>
                <input
                  id="expense"
                  type="number"
                  min="0"
                  value={expense}
                  onChange={(e) => setExpense(e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-destructive placeholder:text-muted-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
                />
              </div>
              <div className="flex w-[11.5rem] shrink-0 flex-col gap-1">
                <label
                  htmlFor="txDate"
                  className="text-base font-bold text-foreground"
                >
                  التاريخ
                </label>
                <DateInput
                  id="txDate"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
                <label
                  htmlFor="notes"
                  className="text-base font-bold text-foreground"
                >
                  البيان
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                    placeholder="ملاحظات…"
                    className="h-11 shrink-0 flex-1 rounded-lg border border-border bg-background px-2 text-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    disabled={busy || !txDate}
                    onClick={() => void handleSave()}
                    aria-label={entrySaved ? "تم الحفظ" : "إضافة قيد"}
                    className={cn(
                      "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-card-foreground transition-colors font-medium",
                      entrySaved
                        ? "bg-success hover:bg-success/80"
                        : "bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : entrySaved ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-xl font-bold">+</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {addErr && (
              <p
                role="alert"
                className="rounded-lg bg-destructive text-destructive-foreground"
              >
                {addErr}
              </p>
            )}
          </fieldset>
        </section>

        {cats.length > 0 && notesFocused && (
          <div className="grid grid-cols-1 gap-4" dir="rtl">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                التصنيف
              </p>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={notes.trim() === c.name}
                    onClick={() =>
                      setNotes(notes.trim() === c.name ? "" : c.name)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      notes.trim() === c.name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-card-foreground hover:border-ring hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <h2 className="text-sm font-bold text-foreground">حركات الخزنة</h2>
            <button
              type="button"
              onClick={() => setTableCollapsed((c) => !c)}
              aria-expanded={!tableCollapsed}
              aria-label={tableCollapsed ? "إظهار الجدول" : "إخفاء الجدول"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                className={cn(
                  "transition-transform duration-200 ease-out",
                  tableCollapsed && "rotate-180",
                )}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <fieldset className="flex overflow-hidden rounded-lg border border-border bg-background">
              <legend className="sr-only">تصفية السنة</legend>
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setYear(y);
                    setPage(1);
                  }}
                  className={cn(
                    "px-2 py-1.5 text-xs font-medium transition-colors",
                    year === y
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  )}
                >
                  {y}
                </button>
              ))}
            </fieldset>
            <div className="flex h-10 w-full flex-1 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 sm:w-auto">
              <Search
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="ledger-search" className="sr-only">
                بحث في البيان
              </label>
              <input
                id="ledger-search"
                type="text"
                value={filterNotes}
                onChange={(e) => {
                  setFilterNotes(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث في البيان…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {filterNotes ? (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => {
                    setFilterNotes("");
                    setPage(1);
                  }}
                  className="p-1 text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="rounded-full bg-muted text-muted-foreground">
              {total.toLocaleString("ar-EG")} قيد
            </div>
          </div>

          {!tableCollapsed && (
            <>
              <div className="grid gap-3 px-4 py-3 sm:hidden">
                {ledgerQ.isLoading && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    جاري التحميل...
                  </div>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد قيود — أضف قيداً من الأعلى.
                  </div>
                )}
                {rows.map((row) => (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEdit(row);
                      }
                    }}
                    className={cn(
                      "rounded-2xl border border-border bg-background p-3.5 shadow-sm transition-colors hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      delConfirm === row.id && "bg-muted ring-1 ring-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(row.txDate)}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-foreground">
                          {row.notes ?? "—"}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                          (row.balance ?? 0) < 0
                            ? "bg-destructive text-destructive-foreground ring-destructive/20"
                            : "bg-success/10 text-success ring-success/20",
                        )}
                      >
                        {fmt(row.balance)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-border pt-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-muted-foreground">
                          إيراد
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            row.income
                              ? "text-success"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.income ? fmt(row.income) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-muted-foreground">
                          مصروف
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            row.expense
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.expense ? fmt(row.expense) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                      <th
                        scope="col"
                        aria-sort={
                          sortDir === "desc" ? "descending" : "ascending"
                        }
                        className="px-4 py-2.5 text-right font-medium"
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
                        className="px-4 py-2.5 text-right font-medium"
                      >
                        البيان
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-left font-medium tabular-nums text-success"
                      >
                        إيراد
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-left font-medium tabular-nums text-destructive"
                      >
                        مصروف
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-left font-medium tabular-nums"
                      >
                        الرصيد
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-2.5 text-left font-medium tabular-nums sm:table-cell"
                      >
                        الاجمالي
                      </th>
                      <th
                        scope="col"
                        className="hidden w-8 px-2 sm:table-cell"
                      />
                      <th scope="col" className="w-8 px-2" />
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
                          لا توجد قيود — أضف قيداً من الأعلى.
                        </td>
                      </tr>
                    )}
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => openEdit(row)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openEdit(row);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="group cursor-pointer transition-colors hover:bg-primary/5 focus:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          {fmtDate(row.txDate)}
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-2.5 text-foreground">
                          {row.notes ?? "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-left tabular-nums text-xs",
                            row.income
                              ? "font-medium text-success"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.income ? fmt(row.income) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-left tabular-nums text-xs",
                            row.expense
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.expense ? fmt(row.expense) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-left tabular-nums text-xs font-medium",
                            (row.balance ?? 0) < 0
                              ? "text-destructive"
                              : "text-success",
                          )}
                        >
                          {fmt(row.balance)}
                        </td>
                        <td className="hidden px-4 py-2.5 text-left tabular-nums text-xs font-medium text-foreground sm:table-cell">
                          {fmt(row.total)}
                        </td>
                        <td className="hidden px-2 py-2.5 sm:table-cell">
                          <PenLine className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        </td>
                        <td
                          className="w-12 px-2 py-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                            <button
                              type="button"
                              aria-label="حذف القيد"
                              disabled={deleteMut.isPending}
                              className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              onClick={() => setDelConfirm(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {total.toLocaleString("ar-EG")} قيد · صفحة{" "}
                    {page.toLocaleString("ar-EG")} من{" "}
                    {totalPages.toLocaleString("ar-EG")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 min-h-11 min-w-11"
                      aria-label="الصفحة السابقة"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 min-h-11 min-w-11"
                      aria-label="الصفحة التالية"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
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
    </AccountingPage>
  );
}
