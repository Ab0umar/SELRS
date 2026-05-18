import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
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

export default function AccountingDrSaadany() {
  const utils = trpc.useUtils();
  const formRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [txDate, setTxDate] = useState(todayIso());
  const [withdrawals, setWithdrawals] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const reportsQ = trpc.accounting.accReports.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const ledgerQ = trpc.accounting.accSaadanyLedger.useQuery(
    { page, pageSize: PAGE_SIZE, search: search.trim() || undefined, sortDir },
    { refetchOnWindowFocus: false, placeholderData: (prev) => prev },
  );
  const addMut = trpc.accounting.addAccSaadany.useMutation();
  const updateMut = trpc.accounting.updateAccSaadany.useMutation();
  const deleteMut = trpc.accounting.deleteAccSaadany.useMutation();

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accSaadanyLedger.invalidate();
    utils.accounting.accReports.invalidate();
  };

  function resetForm() {
    setEditingId(null);
    setTxDate(todayIso());
    setWithdrawals("");
    setRepayment("");
    setNotes("");
    setDelConfirm(false);
  }

  function selectRow(row: {
    id: number;
    txDate: string;
    withdrawals: number | null;
    repayment: number | null;
    notes: string | null;
  }) {
    setEditingId(row.id);
    setTxDate(row.txDate.slice(0, 10));
    setWithdrawals(row.withdrawals ? String(row.withdrawals) : "");
    setRepayment(row.repayment ? String(row.repayment) : "");
    setNotes(row.notes ?? "");
    setDelConfirm(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleSubmit() {
    const payload = {
      txDate,
      withdrawals: parseFloat(withdrawals) || 0,
      repayment: parseFloat(repayment) || 0,
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
        setWithdrawals("");
        setRepayment("");
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

  const saadany = reportsQ.data?.saadany;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const remaining = saadany?.remaining ?? 0;

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
                    label: "مسحوبات",
                    val: saadany?.totalWithdrawals,
                    cls: "text-rose-700",
                    icon: TrendingDown,
                  },
                  {
                    label: "سداد",
                    val: saadany?.totalRepaid,
                    cls: "text-emerald-700",
                    icon: TrendingUp,
                  },
                  {
                    label: "الرصيد",
                    val: remaining,
                    cls: remaining <= 0 ? "text-emerald-700" : "text-rose-700",
                    icon: Wallet,
                  },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-border px-4 py-3",
                      m.cls.includes("emerald")
                        ? "bg-emerald-50"
                        : m.cls.includes("rose")
                          ? "bg-rose-50"
                          : "bg-muted",
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
                    htmlFor="saadany-date"
                    className="text-xs text-slate-400"
                  >
                    التاريخ
                  </label>
                  <input
                    id="saadany-date"
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-3 sm:contents">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="saadany-withdrawals"
                      className="text-xs text-rose-600"
                    >
                      مسحوبات
                    </label>
                    <input
                      id="saadany-withdrawals"
                      type="number"
                      min="0"
                      value={withdrawals}
                      onChange={(e) => setWithdrawals(e.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm tabular-nums text-rose-700 placeholder:text-slate-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="saadany-repayment"
                      className="text-xs text-emerald-600"
                    >
                      سداد
                    </label>
                    <input
                      id="saadany-repayment"
                      type="number"
                      min="0"
                      value={repayment}
                      onChange={(e) => setRepayment(e.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm tabular-nums text-emerald-700 placeholder:text-slate-300 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label htmlFor="saadany-notes" className="sr-only">
                  البيان
                </label>
                <input
                  id="saadany-notes"
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
                          className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40 sm:w-auto"
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
                          className="flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm text-slate-500 hover:bg-muted sm:w-auto"
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
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 sm:w-auto"
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
                        : "bg-slate-700 hover:bg-slate-800 disabled:opacity-40",
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
                حركات د. السعدني
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                اضغط على أي صف للتعديل.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex h-10 w-full flex-1 items-center rounded-lg border border-border bg-background px-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 sm:flex-none sm:w-auto">
                <Search className="absolute end-2.5 h-3.5 w-3.5 text-slate-400" />
                <label htmlFor="saadany-search" className="sr-only">
                  بحث في البيان
                </label>
                <input
                  id="saadany-search"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="بحث في البيان..."
                  className="w-full bg-transparent py-1.5 pe-8 ps-3 text-sm outline-none placeholder:text-slate-400 sm:w-52"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute start-2 text-slate-400 hover:text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
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
                  "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-muted/60",
                  editingId === row.id && "bg-muted ring-1 ring-slate-300",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500">
                      {fmtDate(row.txDate)}
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">
                      {row.notes ?? "—"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                      (row.runningTotal ?? 0) > 0
                        ? "bg-rose-50 text-rose-700 ring-rose-100"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                    )}
                  >
                    {fmt(row.runningTotal)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-rose-50 px-3 py-2">
                    <div className="text-[10px] text-rose-700">مسحوبات</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        row.withdrawals ? "text-rose-700" : "text-slate-300",
                      )}
                    >
                      {row.withdrawals ? fmt(row.withdrawals) : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2">
                    <div className="text-[10px] text-emerald-700">سداد</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold tabular-nums",
                        row.repayment ? "text-emerald-700" : "text-slate-300",
                      )}
                    >
                      {row.repayment ? fmt(row.repayment) : "—"}
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
                    className="w-[24%] cursor-pointer select-none px-2 py-2 text-right font-medium sm:w-auto sm:px-4 sm:py-2.5"
                    onClick={() => {
                      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                      setPage(1);
                    }}
                  >
                    <span className="flex items-center gap-1">
                      التاريخ{" "}
                      <span className="text-slate-400">
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-2 text-right font-medium sm:px-4 sm:py-2.5"
                  >
                    البيان
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-rose-700 sm:px-4 sm:py-2.5"
                  >
                    مسحوبات
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-2 py-2 text-left font-medium tabular-nums text-emerald-700 sm:px-4 sm:py-2.5"
                  >
                    سداد
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
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!ledgerQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
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
                      "cursor-pointer transition-colors hover:bg-muted/60",
                      editingId === row.id &&
                        "bg-muted ring-1 ring-slate-300",
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
                        row.withdrawals
                          ? "font-medium text-rose-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.withdrawals ? fmt(row.withdrawals) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                        row.repayment
                          ? "font-medium text-emerald-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      {row.repayment ? fmt(row.repayment) : "—"}
                    </td>
                    <td
                      className={cn(
                        "hidden px-4 py-2.5 text-left tabular-nums text-xs sm:table-cell",
                        (row.runningTotal ?? 0) > 0
                          ? "text-rose-600"
                          : "text-emerald-700",
                      )}
                    >
                      {fmt(row.runningTotal)}
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
