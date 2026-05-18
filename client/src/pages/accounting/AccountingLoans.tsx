import { useRef, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PenLine,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Check,
  Search,
  X,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";
import AccLoanDrawer, { type AccLoanRow } from "./AccLoanDrawer";
import { toast } from "sonner";
import { fmt, fmtDate, todayIso } from "./accountingFormat";

const PAGE_SIZE = 50;

function remainingTone(value: number | null | undefined) {
  if ((value ?? 0) > 0) return "text-rose-700 bg-rose-50 ring-rose-100";
  if ((value ?? 0) < 0) return "text-amber-700 bg-amber-50 ring-amber-100";
  return "text-emerald-700 bg-emerald-50 ring-emerald-100";
}

function normalizePersonName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export default function AccountingLoans() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const addFormRef = useRef<HTMLDivElement | null>(null);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    mode: "add" | "edit";
    row?: AccLoanRow;
  }>({ open: false, mode: "add" });
  const [txDate, setTxDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [entrySaved, setEntrySaved] = useState(false);

  function openEdit(row: AccLoanRow) {
    setDrawer({ open: true, mode: "edit", row });
  }
  function closeDrawer() {
    setDrawer((d) => ({ ...d, open: false }));
  }
  function onSaved() {
    closeDrawer();
    setPage(1);
  }

  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
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
  const addMut = trpc.accounting.addAccLoan.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.accounting.accLoansLedger.invalidate(),
        utils.accounting.accReports.invalidate(),
      ]);
      setTxDate(todayIso());
      setName("");
      setAmount("");
      setRepayment("");
      setNotes("");
      setPage(1);
      setEntrySaved(true);
      setTimeout(() => setEntrySaved(false), 2000);
    },
  });
  const ledgerQ = trpc.accounting.accLoansLedger.useQuery(filters, {
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const deleteMut = trpc.accounting.deleteAccLoan.useMutation({
    onSuccess: () => {
      utils.accounting.accLoansLedger.invalidate();
      utils.accounting.accReports.invalidate();
      toast.success("تم حذف القيد");
    },
    onError: () => toast.error("تعذر حذف القيد"),
  });

  const byPerson = useMemo(() => {
    const merged = new Map<
      string,
      { name: string; totalLoan: number; totalPaid: number; remaining: number }
    >();

    for (const row of reportsQ.data?.loans ?? []) {
      const name = normalizePersonName(row.name || "غير محدد");
      const existing = merged.get(name);
      if (existing) {
        existing.totalLoan += row.totalLoan;
        existing.totalPaid += row.totalPaid;
        existing.remaining += row.remaining;
      } else {
        merged.set(name, {
          name,
          totalLoan: row.totalLoan,
          totalPaid: row.totalPaid,
          remaining: row.remaining,
        });
      }
    }

    return [...merged.values()].sort(
      (a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name, "ar"),
    );
  }, [reportsQ.data?.loans]);
  const totalLoan = byPerson.reduce((s, r) => s + r.totalLoan, 0);
  const totalPaid = byPerson.reduce((s, r) => s + r.totalPaid, 0);
  const totalRemaining = totalLoan - totalPaid;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const addBusy = addMut.isPending;
  const addErr = addMut.error?.message;

  async function handleAddLoan() {
    await addMut.mutateAsync({
      txDate,
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      repayment: parseFloat(repayment) || 0,
      notes: notes.trim(),
    });
  }

  return (
    <>
      <AccountingShell>
        <div className="space-y-5" dir="rtl">
          <section className="overflow-hidden rounded-[24px] border border-border bg-background">
            <div className="p-4 lg:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      label: "إجمالي القروض",
                      val: totalLoan,
                      cls: "text-blue-700",
                      icon: TrendingDown,
                      bg: "bg-blue-50",
                    },
                    {
                      label: "إجمالي السداد",
                      val: totalPaid,
                      cls: "text-emerald-700",
                      icon: TrendingUp,
                      bg: "bg-emerald-50",
                    },
                    {
                      label: "المتبقي",
                      val: totalRemaining,
                      cls:
                        totalRemaining > 0 ? "text-rose-700" : "text-blue-700",
                      icon: Wallet,
                      bg: totalRemaining > 0 ? "bg-rose-50" : "bg-blue-50",
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
                          {reportsQ.isLoading ? "..." : fmt(m.val)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              ref={addFormRef}
              className="border-t border-border px-4 pb-4 pt-3 lg:px-5"
              dir="rtl"
            >
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                إضافة قرض
              </div>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="loan-date"
                      className="text-xs text-slate-400"
                    >
                      التاريخ
                    </label>
                    <input
                      id="loan-date"
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="loan-name"
                      className="text-xs text-slate-400"
                    >
                      الاسم
                    </label>
                    <input
                      id="loan-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسم المقترض"
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground placeholder:text-slate-300 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="loan-amount"
                      className="text-xs text-blue-600"
                    >
                      المبلغ
                    </label>
                    <input
                      id="loan-amount"
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm tabular-nums text-blue-700 placeholder:text-slate-300 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="loan-repayment"
                      className="text-xs text-emerald-600"
                    >
                      السداد
                    </label>
                    <input
                      id="loan-repayment"
                      type="number"
                      min="0"
                      value={repayment}
                      onChange={(e) => setRepayment(e.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm tabular-nums text-emerald-700 placeholder:text-slate-300 outline-none transition-colors focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="loan-notes"
                      className="text-xs text-slate-400"
                    >
                      ملاحظات
                    </label>
                    <input
                      id="loan-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ملاحظات..."
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground placeholder:text-slate-300 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="إضافة قرض"
                    disabled={addBusy || !txDate || !name.trim()}
                    onClick={() => void handleAddLoan()}
                    className={cn(
                      "inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-colors sm:w-[160px]",
                      entrySaved
                        ? "bg-emerald-500"
                        : "bg-blue-600 hover:bg-blue-700 disabled:opacity-40",
                    )}
                  >
                    {addBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : entrySaved ? (
                      <>
                        <Check className="ml-1 h-4 w-4" />
                        تم الحفظ
                      </>
                    ) : (
                      <>
                        <span className="ml-1 text-base leading-none">+</span>
                        إضافة
                      </>
                    )}
                  </button>
                </div>

                {addErr && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                    {addErr}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-2 lg:px-5">
              <h2 className="text-xs font-semibold text-foreground">
                القروض النشطة
              </h2>
              <div className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {byPerson.length.toLocaleString("ar-EG")} اسم
              </div>
            </div>
            {reportsQ.isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                جاري التحميل...
              </div>
            ) : byPerson.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-4 text-xs text-slate-400">
                لا توجد قروض مفتوحة
              </div>
            ) : (
              <>
                <div className="grid gap-3 px-4 py-3 sm:hidden">
                  {byPerson.map((row) => (
                    <div
                      key={row.name}
                      className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground">
                            {row.name}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {row.remaining > 0 ? "مفتوح" : "مغلق"}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                            row.remaining > 0
                              ? "bg-rose-50 text-rose-700 ring-rose-100"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                          )}
                        >
                          {fmt(row.remaining)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl bg-blue-50 px-3 py-2">
                          <div className="text-[10px] text-blue-700">القرض</div>
                          <div className="mt-1 font-semibold tabular-nums text-blue-700">
                            {fmt(row.totalLoan)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <div className="text-[10px] text-emerald-700">
                            المسدد
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-emerald-700">
                            {fmt(row.totalPaid)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-rose-50 px-3 py-2">
                          <div className="text-[10px] text-rose-700">
                            المتبقي
                          </div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.remaining > 0
                                ? "text-rose-700"
                                : "text-emerald-700",
                            )}
                          >
                            {fmt(row.remaining)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full table-fixed text-xs">
                    <thead>
                      <tr className="border-b border-border bg-background text-slate-400">
                        <th
                          scope="col"
                          className="px-3 py-2 text-right font-medium sm:px-4 lg:px-5"
                        >
                          الاسم
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left font-medium tabular-nums text-blue-600 sm:px-4 lg:px-5"
                        >
                          القرض
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left font-medium tabular-nums text-emerald-600 sm:px-4 lg:px-5"
                        >
                          المسدد
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left font-medium tabular-nums text-rose-600 sm:px-4 lg:px-5"
                        >
                          المتبقي
                        </th>
                        <th
                          scope="col"
                          className="hidden px-3 py-2 text-right font-medium sm:table-cell sm:px-4 lg:px-5"
                        >
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {byPerson.map((row) => (
                        <tr key={row.name} className="hover:bg-muted">
                          <td className="truncate px-3 py-2 font-medium text-slate-800 sm:px-4 lg:px-5">
                            {row.name}
                          </td>
                          <td className="px-3 py-2 text-left tabular-nums text-blue-700 sm:px-4 lg:px-5">
                            {fmt(row.totalLoan)}
                          </td>
                          <td className="px-3 py-2 text-left tabular-nums text-emerald-700 sm:px-4 lg:px-5">
                            {fmt(row.totalPaid)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 text-left tabular-nums font-semibold sm:px-4 lg:px-5",
                              row.remaining > 0
                                ? "text-rose-700"
                                : "text-slate-400",
                            )}
                          >
                            {fmt(row.remaining)}
                          </td>
                          <td className="hidden px-3 py-2 sm:table-cell sm:px-4 lg:px-5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
                                row.remaining > 0
                                  ? "bg-rose-50 text-rose-700 ring-rose-100"
                                  : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                              )}
                            >
                              {row.remaining > 0 ? "مفتوح" : "مغلق"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="overflow-hidden rounded-[28px] border border-border bg-background shadow-sm">
            <button
              type="button"
              onClick={() => setTableCollapsed((v) => !v)}
              aria-expanded={!tableCollapsed}
              className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-right transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 lg:px-5"
            >
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  حركات القروض
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  سجل تفصيلي لكل قرض وسداد.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  {total.toLocaleString("ar-EG")} حركة
                </div>
                <svg
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out",
                    !tableCollapsed && "rotate-180",
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {!tableCollapsed && (
              <div className="border-b border-border px-4 py-3" dir="rtl">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted px-3 transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <label htmlFor="loans-search" className="sr-only">بحث في القروض</label>
                  <input
                    id="loans-search"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="بحث بالاسم أو الملاحظات..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-slate-400 focus:outline-none"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="rounded-full p-1 text-slate-400 hover:bg-muted hover:text-muted-foreground"
                      aria-label="مسح البحث"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {!tableCollapsed && (
              <>
                <div className="grid gap-3 px-4 py-3 sm:hidden">
                  {ledgerQ.isLoading && (
                    <div className="py-6 text-center text-sm text-slate-500">
                      جاري تحميل الحركات...
                    </div>
                  )}
                  {!ledgerQ.isLoading && rows.length === 0 && (
                    <div className="py-6 text-center text-sm text-slate-500">
                      لا توجد حركات مسجلة
                    </div>
                  )}
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        openEdit({
                          id: row.id,
                          txDate: row.txDate,
                          name: row.name,
                          amount: row.amount,
                          repayment: row.repayment,
                          notes: row.notes,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          openEdit({
                            id: row.id,
                            txDate: row.txDate,
                            name: row.name,
                            amount: row.amount,
                            repayment: row.repayment,
                            notes: row.notes,
                          });
                      }}
                      className={cn(
                        "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                        delConfirm === row.id && "ring-1 ring-rose-200",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] text-slate-500">
                            {fmtDate(row.txDate)}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-foreground">
                            {row.name ?? "—"}
                          </div>
                          {row.notes ? (
                            <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                              {row.notes}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={deleteMut.isPending}
                          aria-label="حذف القيد"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (delConfirm === row.id) {
                              deleteMut.mutate({ id: row.id });
                              setDelConfirm(null);
                              return;
                            }
                            setDelConfirm(row.id);
                          }}
                        >
                          {delConfirm === row.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-blue-50 px-3 py-2">
                          <div className="text-[10px] text-blue-700">
                            المبلغ
                          </div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.amount ? "text-blue-700" : "text-slate-300",
                            )}
                          >
                            {row.amount ? fmt(row.amount) : "—"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <div className="text-[10px] text-emerald-700">
                            السداد
                          </div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.repayment
                                ? "text-emerald-700"
                                : "text-slate-300",
                            )}
                          >
                            {row.repayment ? fmt(row.repayment) : "—"}
                          </div>
                        </div>
                        <div className="col-span-2 rounded-xl bg-rose-50 px-3 py-2">
                          <div className="text-[10px] text-rose-700">
                            المتبقي
                          </div>
                          <div className="mt-1">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                                remainingTone(row.remaining),
                              )}
                            >
                              {fmt(row.remaining)}
                            </span>
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
                          className="w-[18%] px-2 py-2 text-right font-medium sm:w-auto sm:px-4 sm:py-2.5"
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
                          className="w-[20%] px-2 py-2 text-right font-medium sm:px-4 sm:py-2.5"
                        >
                          الاسم
                        </th>
                        <th
                          scope="col"
                          className="w-[14%] px-2 py-2 text-left font-medium tabular-nums text-blue-700 sm:px-4 sm:py-2.5"
                        >
                          المبلغ
                        </th>
                        <th
                          scope="col"
                          className="w-[14%] px-2 py-2 text-left font-medium tabular-nums text-emerald-700 sm:px-4 sm:py-2.5"
                        >
                          السداد
                        </th>
                        <th
                          scope="col"
                          className="w-[16%] px-2 py-2 text-left font-medium tabular-nums text-rose-700 sm:px-4 sm:py-2.5"
                        >
                          المتبقي
                        </th>
                        <th
                          scope="col"
                          className="hidden px-4 py-2.5 text-left font-medium tabular-nums sm:table-cell"
                        >
                          الاجمالي
                        </th>
                        <th
                          scope="col"
                          className="hidden px-4 py-2.5 text-right font-medium sm:table-cell"
                        >
                          ملاحظات
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
                            colSpan={9}
                            className="px-4 py-8 text-center text-sm text-slate-500"
                          >
                            جاري تحميل الحركات...
                          </td>
                        </tr>
                      )}
                      {!ledgerQ.isLoading && rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-8 text-center text-sm text-slate-500"
                          >
                            لا توجد حركات مسجلة
                          </td>
                        </tr>
                      )}
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            openEdit({
                              id: row.id,
                              txDate: row.txDate,
                              name: row.name,
                              amount: row.amount,
                              repayment: row.repayment,
                              notes: row.notes,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              openEdit({
                                id: row.id,
                                txDate: row.txDate,
                                name: row.name,
                                amount: row.amount,
                                repayment: row.repayment,
                                notes: row.notes,
                              });
                          }}
                          className="group cursor-pointer transition-colors hover:bg-blue-50/60"
                        >
                          <td className="whitespace-nowrap px-2 py-2 text-[11px] text-slate-500 sm:px-4 sm:py-2.5 sm:text-xs">
                            {fmtDate(row.txDate)}
                          </td>
                          <td className="truncate px-2 py-2 text-right font-medium text-foreground sm:px-4 sm:py-2.5">
                            {row.name ?? "—"}
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                              row.amount
                                ? "font-medium text-blue-700"
                                : "text-slate-300",
                            )}
                          >
                            {row.amount ? fmt(row.amount) : "—"}
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2 text-left tabular-nums text-sm sm:px-4 sm:py-2.5",
                              row.repayment
                                ? "font-medium text-emerald-700"
                                : "text-slate-300",
                            )}
                          >
                            {row.repayment ? fmt(row.repayment) : "—"}
                          </td>
                          <td className="px-2 py-2 text-left tabular-nums sm:px-4 sm:py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                                remainingTone(row.remaining),
                              )}
                            >
                              {fmt(row.remaining)}
                            </span>
                          </td>
                          <td className="hidden px-4 py-2.5 text-left tabular-nums text-xs text-foreground sm:table-cell">
                            {fmt(row.total)}
                          </td>
                          <td className="hidden px-4 py-2.5 text-xs leading-5 text-slate-500 sm:table-cell">
                            {row.notes ?? "—"}
                          </td>
                          <td className="hidden px-2 py-2.5 sm:table-cell">
                            <PenLine className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </td>
                          <td
                            className="w-8 px-2 py-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {delConfirm === row.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deleteMut.isPending}
                                  className="inline-flex h-7 items-center rounded-md bg-destructive px-2 text-[10px] font-semibold text-destructive-foreground hover:bg-destructive/80 disabled:opacity-40"
                                  onClick={() => {
                                    deleteMut.mutate({ id: row.id });
                                    setDelConfirm(null);
                                  }}
                                >
                                  تأكيد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDelConfirm(null)}
                                  className="inline-flex h-7 items-center rounded-md border border-border px-1.5 text-[10px] text-slate-500 hover:bg-muted"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={deleteMut.isPending}
                                aria-label="حذف القيد"
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
                  <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                    <span className="text-xs text-slate-500">
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
              </>
            )}
          </section>
        </div>
      </AccountingShell>

      <AccLoanDrawer
        open={drawer.open}
        mode={drawer.mode}
        initial={drawer.row}
        onClose={closeDrawer}
        onSaved={onSaved}
      />
    </>
  );
}
