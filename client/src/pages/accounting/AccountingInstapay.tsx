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
import AccountingShell from "./AccountingShell";
import { toast } from "sonner";
import { fmt, fmtDate, todayIso } from "./accountingFormat";

const PAGE_SIZE = 50;

export default function AccountingInstapay() {
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
  const ledgerQ = trpc.accounting.accInstapayLedger.useQuery(filters, {
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const addMut = trpc.accounting.addAccInstapay.useMutation();
  const updateMut = trpc.accounting.updateAccInstapay.useMutation();
  const deleteMut = trpc.accounting.deleteAccInstapay.useMutation();

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accInstapayLedger.invalidate();
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

  const instapay = reportsQ.data?.instapay;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const net = instapay?.net ?? 0;

  return (
    <AccountingShell>
      <div className="space-y-4 lg:space-y-5" dir="rtl">
        <section className="overflow-hidden rounded-[24px] border border-border bg-background">
          {/* Metrics */}
          <div className="p-4 lg:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    label: "معاه (وارد)",
                    val: instapay?.totalIn,
                    cls: "text-emerald-700",
                    icon: TrendingUp,
                  },
                  {
                    label: "منه (صادر)",
                    val: instapay?.totalOut,
                    cls: "text-rose-700",
                    icon: TrendingDown,
                  },
                  {
                    label: "الرصيد",
                    val: net,
                    cls: net >= 0 ? "text-pink-700" : "text-rose-700",
                    icon: Wallet,
                  },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
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
                        {reportsQ.isLoading ? "..." : fmt(m.val)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inline form */}
          <div
            ref={formRef}
            className="border-t border-border px-4 pb-4 pt-3 lg:px-5"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {editingId ? "تعديل قيد" : "إضافة حركة"}
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-2 py-1.5 text-[10px] text-slate-400 hover:bg-muted hover:text-muted-foreground"
                >
                  إلغاء
                </button>
              )}
            </div>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="instapay-date"
                    className="text-xs text-slate-400"
                  >
                    التاريخ
                  </label>
                  <input
                    id="instapay-date"
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="instapay-in"
                    className="text-xs text-emerald-600"
                  >
                    معاه (وارد)
                  </label>
                  <input
                    id="instapay-in"
                    type="number"
                    min="0"
                    value={inAmount}
                    onChange={(e) => setInAmount(e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-lg border border-border bg-muted px-3 text-sm tabular-nums text-emerald-700 placeholder:text-slate-300 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="instapay-out"
                    className="text-xs text-rose-600"
                  >
                    منه (صادر)
                  </label>
                  <input
                    id="instapay-out"
                    type="number"
                    min="0"
                    value={outAmount}
                    onChange={(e) => setOutAmount(e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-lg border border-border bg-muted px-3 text-sm tabular-nums text-rose-700 placeholder:text-slate-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label htmlFor="instapay-notes" className="sr-only">البيان</label>
                <input
                  id="instapay-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="البيان..."
                  className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground placeholder:text-slate-300 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                {editingId ? (
                  <div className="flex gap-1.5 sm:justify-end">
                    {delConfirm ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={busy}
                          className="flex h-10 items-center gap-1 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "تأكيد"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDelConfirm(false)}
                          className="flex h-10 items-center rounded-lg border border-border px-4 text-sm text-slate-500 hover:bg-muted"
                        >
                          إلغاء
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        aria-label="حذف القيد"
                        onClick={() => setDelConfirm(true)}
                        disabled={busy}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-rose-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={busy || !txDate}
                      className="flex h-10 items-center gap-1.5 rounded-lg bg-pink-600 px-4 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "تحديث"
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="إضافة حركة"
                    disabled={busy || !txDate}
                    onClick={handleSubmit}
                    className={cn(
                      "flex h-10 w-full items-center justify-center rounded-lg text-white transition-colors sm:w-auto sm:px-4",
                      saved
                        ? "bg-emerald-500"
                        : "bg-pink-600 hover:bg-pink-700 disabled:opacity-40",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-bold">+</span>
                    )}
                    <span className="mr-1 text-sm font-semibold">إضافة</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Ledger */}
        <div className="overflow-hidden rounded-[28px] border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                حركات انستاباي
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                اضغط على أي صف للتعديل.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <label htmlFor="instapay-search" className="sr-only">بحث في البيان</label>
                <input
                  id="instapay-search"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="بحث في البيان..."
                  className="w-44 min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-slate-400"
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="p-1 text-slate-400 hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                {total.toLocaleString("ar-EG")} حركة
              </div>
            </div>
          </div>
          <div className="grid gap-3 px-4 py-3 sm:hidden">
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
                role="button"
                tabIndex={0}
                onClick={() => selectRow(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectRow(row);
                }}
                className={cn(
                  "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-pink-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300",
                  editingId === row.id && "ring-1 ring-pink-200",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500">
                      {fmtDate(row.txDate)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {row.notes ?? "—"}
                    </div>
                  </div>
                  <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-700">
                    {fmt(row.total)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2">
                    <div className="text-[10px] text-emerald-700">معاه</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        row.inAmount ? "text-emerald-700" : "text-slate-300",
                      )}
                    >
                      {row.inAmount ? fmt(row.inAmount) : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-rose-50 px-3 py-2">
                    <div className="text-[10px] text-rose-700">منه</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        row.outAmount ? "text-rose-700" : "text-slate-300",
                      )}
                    >
                      {row.outAmount ? fmt(row.outAmount) : "—"}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-xl bg-muted px-3 py-2">
                    <div className="text-[10px] text-slate-500">الرصيد</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        (row.balance ?? 0) < 0
                          ? "text-rose-600"
                          : "text-emerald-700",
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
                <tr className="border-b border-border bg-muted text-xs text-slate-500">
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
                      className="flex cursor-pointer select-none items-center gap-1 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
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
                    معاه
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-rose-700 sm:px-4 sm:py-2.5"
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
              <tbody className="divide-y divide-slate-100">
                {ledgerQ.isLoading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
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
                      "cursor-pointer transition-colors hover:bg-pink-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300",
                      editingId === row.id && "bg-pink-50 ring-1 ring-pink-200",
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
                          ? "font-medium text-emerald-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.inAmount ? fmt(row.inAmount) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.outAmount
                          ? "font-medium text-rose-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.outAmount ? fmt(row.outAmount) : "—"}
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
