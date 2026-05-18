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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";
import { toast } from "sonner";
import { fmt, fmtDate } from "./accountingFormat";

const PAGE_SIZE = 50;

type TxType = "all" | "income" | "expense";

export default function AccountingCashbook() {
  const utils = trpc.useUtils();

  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<TxType>("all");
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const summary = summaryQ.data;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = () => setPage(1);

  return (
    <AccountingShell>
      <div className="space-y-4 lg:space-y-5" dir="rtl">
        <section className="rounded-[24px] border border-border bg-background p-4 lg:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  label: "إجمالي الإيراد",
                  val: summary?.totalIncome,
                  icon: TrendingUp,
                  cls: "text-emerald-700",
                  bg: "bg-emerald-50",
                },
                {
                  label: "إجمالي المصروف",
                  val: summary?.totalExpense,
                  icon: TrendingDown,
                  cls: "text-rose-700",
                  bg: "bg-rose-50",
                },
                {
                  label: "رصيد الخزنة",
                  val: summary?.currentBalance,
                  icon: Wallet,
                  cls:
                    (summary?.currentBalance ?? 0) >= 0
                      ? "text-blue-700"
                      : "text-rose-700",
                  bg:
                    (summary?.currentBalance ?? 0) >= 0
                      ? "bg-blue-50"
                      : "bg-rose-50",
                },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-border px-4 py-3",
                    m.bg,
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background",
                      m.cls,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500">
                      {m.label}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-lg font-bold tabular-nums leading-none",
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

        <section className="rounded-[24px] border border-border bg-background p-4 lg:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  حركات الخزنة
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  حرّك بين القيود حسب التاريخ والبيان ونوع الحركة.
                </p>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {total.toLocaleString("ar-EG")} حركة
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.4fr)]">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                  <label
                    htmlFor="cb-date-from"
                    className="text-xs text-slate-400"
                  >
                    من
                  </label>
                  <input
                    id="cb-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      resetPage();
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                  <label
                    htmlFor="cb-date-to"
                    className="text-xs text-slate-400"
                  >
                    إلى
                  </label>
                  <input
                    id="cb-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      resetPage();
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                  <Search
                    className="h-4 w-4 shrink-0 text-slate-400"
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
                    placeholder="بحث في الملاحظات والبيان..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-slate-400"
                  />
                  {notes ? (
                    <button
                      type="button"
                      aria-label="مسح البحث"
                      onClick={() => {
                        setNotes("");
                        resetPage();
                      }}
                      className="p-1 text-slate-400 hover:text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
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
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted",
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
                <p className="mt-1 text-xs text-slate-500">
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
            <div className="px-4 py-10 text-center text-sm text-slate-500">
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
                <span className="text-slate-400">
                  {sortDir === "desc" ? "↓" : "↑"}
                </span>
              </button>
              <span className="text-xs text-slate-500">
                {totalPages.toLocaleString("ar-EG")} صفحة
              </span>
            </div>

            <div className="grid gap-3 px-4 py-3">
              {ledgerQ.isLoading && (
                <div className="py-6 text-center text-sm text-slate-500">
                  جاري التحميل...
                </div>
              )}

              {!ledgerQ.isLoading && rows.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-500">
                  لا توجد حركات
                </div>
              )}

              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors",
                    delConfirm === row.id &&
                      "bg-muted ring-1 ring-slate-300",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500">
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
                          ? "bg-red-50 text-red-700 ring-red-100"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                      )}
                    >
                      {fmt(row.balance)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                      <div className="text-[10px] text-emerald-700">إيراد</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.income ? "text-emerald-700" : "text-slate-300",
                        )}
                      >
                        {row.income ? fmt(row.income) : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-rose-50 px-3 py-2">
                      <div className="text-[10px] text-rose-700">مصروف</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.expense ? "text-rose-700" : "text-slate-300",
                        )}
                      >
                        {row.expense ? fmt(row.expense) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="text-xs text-slate-500">
                      الإجمالي:{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {fmt(row.total)}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="حذف القيد"
                      disabled={deleteMut.isPending}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                      onClick={() => setDelConfirm(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {delConfirm === row.id ? (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        aria-label="تأكيد الحذف"
                        className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/80"
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
                        className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border"
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
                <tr className="border-b border-border bg-muted text-xs text-slate-500">
                  <th
                    scope="col"
                    aria-sort={sortDir === "desc" ? "descending" : "ascending"}
                    className="px-2 py-2 text-right font-medium sm:w-auto sm:px-4 sm:py-2.5"
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
                    className="px-2 py-2 text-right font-medium sm:px-4 sm:py-2.5"
                  >
                    البيان
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-emerald-700 sm:px-4 sm:py-2.5"
                  >
                    إيراد
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-rose-700 sm:px-4 sm:py-2.5"
                  >
                    مصروف
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[18%] px-4 py-2.5 text-left font-medium tabular-nums sm:table-cell"
                  >
                    الرصيد
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[18%] px-4 py-2.5 text-left font-medium tabular-nums sm:table-cell"
                  >
                    الإجمالي
                  </th>
                  <th scope="col" className="w-8 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerQ.isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      لا توجد حركات
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-blue-50/70"
                  >
                    <td className="whitespace-nowrap px-2 py-2 text-[11px] text-muted-foreground sm:px-4 sm:py-2.5 sm:text-xs">
                      {fmtDate(row.txDate)}
                    </td>
                    <td className="truncate px-2 py-2 text-sm text-foreground sm:px-4 sm:py-2.5">
                      {row.notes ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.income
                          ? "font-medium text-emerald-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.income ? fmt(row.income) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.expense
                          ? "font-medium text-rose-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.expense ? fmt(row.expense) : "—"}
                    </td>
                    <td
                      className={cn(
                        "hidden px-4 py-2.5 text-left tabular-nums text-xs sm:table-cell",
                        (row.balance ?? 0) < 0
                          ? "text-rose-600"
                          : "text-emerald-700",
                      )}
                    >
                      {fmt(row.balance)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-left tabular-nums text-xs text-foreground sm:table-cell">
                      {fmt(row.total)}
                    </td>
                    <td className="w-12 px-2 py-2 text-center">
                      {delConfirm === row.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="تأكيد الحذف"
                            className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-destructive/80"
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
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-border"
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive opacity-40 transition-colors hover:bg-destructive/10 hover:opacity-100"
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
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
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
    </AccountingShell>
  );
}
