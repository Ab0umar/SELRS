import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";
import AccEntryDrawer, { type AccEntryRow } from "./AccEntryDrawer";
import { fmt, fmtDate, todayIso } from "./accountingFormat";

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
    <AccountingShell>
      <div className="space-y-4 lg:space-y-5" dir="rtl">
        <section className="variant-inline-rail rounded-[24px] border border-border bg-background p-2.5 lg:p-4">
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            {(
              [
                {
                  label: "إجمالي الإيراد",
                  val: s?.totalIncome,
                  cls: "text-emerald-700",
                  bg: "bg-emerald-50",
                  icon: TrendingUp,
                },
                {
                  label: "إجمالي المصروف",
                  val: s?.totalExpense,
                  cls: "text-red-700",
                  bg: "bg-rose-50",
                  icon: TrendingDown,
                },
                {
                  label: "رصيد الخزنة",
                  val: s?.currentBalance,
                  cls:
                    (s?.currentBalance ?? 0) >= 0
                      ? "text-blue-700"
                      : "text-red-700",
                  bg:
                    (s?.currentBalance ?? 0) >= 0 ? "bg-blue-50" : "bg-rose-50",
                  icon: Wallet,
                },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={cn(
                    "summary-item flex min-w-0 items-center gap-2 rounded-2xl border px-2 py-2 lg:gap-3 lg:px-4 lg:py-3",
                    m.bg,
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background lg:h-10 lg:w-10",
                      m.cls,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-medium text-slate-500 lg:text-xs">
                      {m.label}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 truncate text-sm font-bold tabular-nums leading-none lg:text-lg",
                        m.cls,
                      )}
                    >
                      {summaryQ.isLoading ? "..." : fmt(m.val)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-lg border border-border bg-background p-4 lg:p-5"
          dir="rtl"
        >
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold text-foreground">
              إضافة قيد جديد
            </legend>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="txDate"
                    className="text-xs font-medium text-foreground"
                  >
                    التاريخ
                  </label>
                  <input
                    id="txDate"
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="income"
                    className="text-xs font-medium text-emerald-700"
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
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-emerald-700 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="expense"
                    className="text-xs font-medium text-red-700"
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
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-red-700 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="notes"
                  className="text-xs font-medium text-foreground"
                >
                  البيان
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                    placeholder="ملاحظات..."
                    className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    disabled={busy || !txDate}
                    onClick={() => void handleSave()}
                    aria-label={entrySaved ? "تم الحفظ" : "إضافة قيد"}
                    className={cn(
                      "flex h-11 w-full flex-shrink-0 items-center justify-center rounded-lg text-white transition-colors font-medium sm:w-11 sm:min-h-11 sm:min-w-11",
                      entrySaved
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : entrySaved ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-lg font-bold">+</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {addErr && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
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
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-border bg-background text-blue-800 hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                      ? "bg-blue-600 text-white"
                      : "bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                  )}
                >
                  {y}
                </button>
              ))}
            </fieldset>
            <div className="flex h-10 w-full flex-1 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 sm:w-auto">
              <Search
                className="h-4 w-4 shrink-0 text-slate-400"
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
                placeholder="بحث في البيان..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-slate-400"
              />
              {filterNotes ? (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => {
                    setFilterNotes("");
                    setPage(1);
                  }}
                  className="p-1 text-slate-400 hover:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              {total.toLocaleString("ar-EG")} قيد
            </div>
          </div>

          {!tableCollapsed && (
            <>
              <div className="grid gap-3 px-4 py-3 sm:hidden">
                {ledgerQ.isLoading && (
                  <div className="py-6 text-center text-sm text-slate-500">
                    جاري التحميل...
                  </div>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-500">
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
                      "rounded-2xl border border-border bg-background p-3.5 shadow-sm transition-colors hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                      delConfirm === row.id &&
                        "bg-muted ring-1 ring-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">
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
                            ? "bg-red-50 text-red-700 ring-red-100"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                        )}
                      >
                        {fmt(row.balance)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-border pt-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-500">
                          إيراد
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            row.income ? "text-emerald-700" : "text-slate-300",
                          )}
                        >
                          {row.income ? fmt(row.income) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-500">
                          مصروف
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            row.expense ? "text-red-700" : "text-slate-300",
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
                    <tr className="border-b border-border bg-muted text-xs text-slate-500">
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
                          className="flex cursor-pointer select-none items-center gap-1 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          التاريخ{" "}
                          <span className="text-slate-400" aria-hidden="true">
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
                        className="px-4 py-2.5 text-left font-medium tabular-nums text-emerald-700"
                      >
                        إيراد
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-left font-medium tabular-nums text-red-700"
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
                  <tbody className="divide-y divide-slate-100">
                    {ledgerQ.isLoading && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          جاري التحميل...
                        </td>
                      </tr>
                    )}
                    {!ledgerQ.isLoading && rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-slate-500"
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
                        className="group cursor-pointer transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
                              ? "font-medium text-emerald-700"
                              : "text-slate-400",
                          )}
                        >
                          {row.income ? fmt(row.income) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-left tabular-nums text-xs",
                            row.expense
                              ? "font-medium text-red-700"
                              : "text-slate-400",
                          )}
                        >
                          {row.expense ? fmt(row.expense) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-left tabular-nums text-xs font-medium",
                            (row.balance ?? 0) < 0
                              ? "text-red-700"
                              : "text-emerald-700",
                          )}
                        >
                          {fmt(row.balance)}
                        </td>
                        <td className="hidden px-4 py-2.5 text-left tabular-nums text-xs font-medium text-foreground sm:table-cell">
                          {fmt(row.total)}
                        </td>
                        <td className="hidden px-2 py-2.5 sm:table-cell">
                          <PenLine className="h-4 w-4 text-slate-500 transition-colors group-hover:text-blue-600" />
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
                                className="rounded bg-destructive px-1.5 py-0.5 text-xs font-medium text-white hover:bg-destructive/80"
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
                                className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-border"
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
                              className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-colors"
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
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="الصفحة السابقة"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 min-h-11 min-w-11"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="الصفحة التالية"
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
    </AccountingShell>
  );
}
