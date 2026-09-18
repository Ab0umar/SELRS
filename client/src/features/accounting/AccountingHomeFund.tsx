import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  X,
  Loader2,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmt, fmtDate, todayIso } from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";
import { AccountingPage } from "./AccountingPagePrimitives";
import { useAccountingTabMetrics } from "./accountingTabMetrics";
import { AccEntityImportDialog } from "./AccEntityImportDialog";

const PAGE_SIZE = 50;

export default function AccountingHomeFund() {
  const utils = trpc.useUtils();
  const formRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [txDate, setTxDate] = useState(todayIso());
  const [inAmount, setInAmount] = useState("");
  const [outAmount, setOutAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const filters = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      sortDir,
    }),
    [page, search, sortDir],
  );

  const reportsQ = trpc.accounting.accReports.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const ledgerQ = trpc.accounting.accHomeLedger.useQuery(filters, {
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const addMut = trpc.accounting.addAccHome.useMutation();
  const updateMut = trpc.accounting.updateAccHome.useMutation();
  const deleteMut = trpc.accounting.deleteAccHome.useMutation();

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accHomeLedger.invalidate();
    utils.accounting.accReports.invalidate();
  };

  function resetForm() {
    setEditingId(null);
    setTxDate(todayIso());
    setInAmount("");
    setOutAmount("");
    setNotes("");
    setDelConfirm(false);
  }

  function selectRow(row: {
    id: number;
    txDate: string;
    inAmount: number | null;
    outAmount: number | null;
    notes: string | null;
  }) {
    setEditingId(row.id);
    setTxDate(row.txDate.slice(0, 10));
    setInAmount(row.inAmount ? String(row.inAmount) : "");
    setOutAmount(row.outAmount ? String(row.outAmount) : "");
    setNotes(row.notes ?? "");
    setDelConfirm(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleSubmit() {
    const payload = {
      txDate,
      inAmount: parseFloat(inAmount) || 0,
      outAmount: parseFloat(outAmount) || 0,
      notes: notes.trim(),
    };
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, ...payload });
        toast.success("تم تحديث القيد");
        resetForm();
      } else {
        await addMut.mutateAsync(payload);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setTxDate(todayIso());
        setInAmount("");
        setOutAmount("");
        setNotes("");
      }
      invalidate();
    } catch {
      toast.error("تعذر حفظ القيد");
    }
  }

  async function handleDelete() {
    if (!delConfirm) {
      setDelConfirm(true);
      return;
    }
    try {
      await deleteMut.mutateAsync({ id: editingId! });
      toast.success("تم حذف القيد");
      resetForm();
      invalidate();
    } catch {
      toast.error("تعذر حذف القيد");
    }
  }

  const home = reportsQ.data?.home;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const net = home?.net ?? 0;

  const tabMetricItems = [
    { label: "معاه (إيراد)", value: fmt(home?.totalIn), icon: TrendingUp },
    { label: "منه (مصروف)", value: fmt(home?.totalOut), icon: TrendingDown },
    { label: "المتبقي", value: fmt(net), icon: Wallet },
  ];
  useAccountingTabMetrics(tabMetricItems);

  return (
    <AccountingPage>
      <div className="space-y-3 sm:space-y-3.5" dir="rtl">
        <section className="w-fit max-w-full rounded-xl border border-border/60 bg-card p-2.5 sm:p-3">
          <div ref={formRef}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {editingId ? "تعديل قيد" : "إضافة حركة"}
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                >
                  إلغاء
                </button>
              )}
            </div>
            <div className="flex w-fit max-w-full flex-wrap items-end gap-2" dir="rtl">
                <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                  <label htmlFor="home-in" className="text-base font-bold text-success">
                    معاه (إيراد)
                  </label>
                  <input
                    id="home-in"
                    type="number"
                    min="0"
                    value={inAmount}
                    onChange={(e) => setInAmount(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-success placeholder:text-muted-foreground outline-none focus:border-success focus:ring-2 focus:ring-success/30"
                  />
                </div>
                <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                  <label htmlFor="home-out" className="text-base font-bold text-destructive">
                    منه (مصروف)
                  </label>
                  <input
                    id="home-out"
                    type="number"
                    min="0"
                    value={outAmount}
                    onChange={(e) => setOutAmount(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-destructive placeholder:text-muted-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
                  />
                </div>
                <div className="flex w-[11.5rem] shrink-0 flex-col gap-1">
                  <label htmlFor="home-date" className="text-base font-bold text-foreground">
                    التاريخ
                  </label>
                  <DateInput
                    id="home-date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
                  <label htmlFor="homefund-notes" className="text-base font-bold text-foreground">
                    البيان
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="homefund-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="البيان…"
                      className="h-11 shrink-0 flex-1 rounded-lg border border-border bg-background px-2 text-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                    <button
                      type="button"
                      disabled={busy || !txDate}
                      onClick={() => void handleSubmit()}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-card-foreground transition-colors font-medium",
                        "bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <span className="text-xl font-bold">+</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </section>

        {/* Ledger */}
        <div className="overflow-hidden rounded-[28px] border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">حركات البيت</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                اضغط على أي صف للتعديل.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AccEntityImportDialog entity="home" onDone={invalidate} />
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Search
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <label htmlFor="homefund-search" className="sr-only">
                  بحث في البيان
                </label>
                <input
                  id="homefund-search"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="بحث في البيان…"
                  className="w-44 min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="p-1 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                {total.toLocaleString("ar-EG")} حركة
              </div>
            </div>
          </div>
          <div className="grid gap-3 px-4 py-3 sm:hidden">
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
                role="button"
                tabIndex={0}
                onClick={() => selectRow(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectRow(row);
                }}
                className={cn(
                  "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  editingId === row.id && "ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">
                      {fmtDate(row.txDate)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {row.notes ?? "—"}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    {fmt(row.total)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-success/10 px-3 py-2">
                    <div className="text-[10px] text-success">معاه</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        row.inAmount ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {row.inAmount ? fmt(row.inAmount) : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-destructive/10 px-3 py-2">
                    <div className="text-[10px] text-destructive">منه</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        row.outAmount
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.outAmount ? fmt(row.outAmount) : "—"}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-xl bg-muted px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">
                      الرصيد
                    </div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        (row.balance ?? 0) < 0
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {fmt(row.balance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                  <th
                    scope="col"
                    aria-sort={sortDir === "desc" ? "descending" : "ascending"}
                    className="w-[24%] px-2 py-2 text-right font-medium sm:w-auto sm:px-4 sm:py-2.5"
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
                    className="px-2 py-2 text-right font-medium sm:px-4 sm:py-2.5"
                  >
                    البيان
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-success sm:px-4 sm:py-2.5"
                  >
                    معاه
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-destructive sm:px-4 sm:py-2.5"
                  >
                    منه
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
                    الاجمالي
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerQ.isLoading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      لا توجد حركات
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") selectRow(row);
                    }}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                      editingId === row.id &&
                        "bg-primary/5 ring-1 ring-primary/20",
                    )}
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
                        row.inAmount
                          ? "font-medium text-success"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.inAmount ? fmt(row.inAmount) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.outAmount
                          ? "font-medium text-destructive"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.outAmount ? fmt(row.outAmount) : "—"}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
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
