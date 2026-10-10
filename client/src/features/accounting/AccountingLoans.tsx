import AccountingEntrySection from "./AccountingEntrySection";
import { useRef, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
import AccLoanDrawer, { type AccLoanRow } from "./AccLoanDrawer";
import { toast } from "sonner";
import { fmt, fmtDate, todayIso } from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingPage,
  AccountingQueryBoundary,
} from "./AccountingPagePrimitives";
import { accountingMetricValue } from "./accountingQueryState";
import { useAccountingTabMetrics } from "./accountingTabMetrics";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 50;

function remainingTone(value: number | null | undefined) {
  if ((value ?? 0) > 0)
    return "text-destructive bg-destructive/10 ring-destructive/20";
  if ((value ?? 0) < 0) return "text-warning-text bg-warning/10 ring-warning/15";
  return "text-success bg-success/10 ring-success/20";
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
  const [validationError, setValidationError] = useState("");

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
    retry: false,
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
    retry: false,
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
  const tabMetricItems = [
    {
      label: "إجمالي القرض",
      value: accountingMetricValue(
        reportsQ,
        reportsQ.data ? totalLoan : undefined,
      ),
      icon: TrendingDown,
    },
    {
      label: "إجمالي السداد",
      value: accountingMetricValue(
        reportsQ,
        reportsQ.data ? totalPaid : undefined,
      ),
      icon: TrendingUp,
    },
    {
      label: "المتبقي",
      value: accountingMetricValue(
        reportsQ,
        reportsQ.data ? totalRemaining : undefined,
      ),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics(tabMetricItems);

  const addBusy = addMut.isPending;
  const addErr = addMut.error?.message;

  async function handleAddLoan() {
    if (addBusy) return;
    const amountValue = Number(amount);
    const repaymentValue = Number(repayment);
    if (!txDate || !name.trim()) {
      setValidationError("اختر الموظف وأدخل تاريخ القرض.");
      return;
    }
    if (
      !Number.isFinite(amountValue) ||
      !Number.isFinite(repaymentValue) ||
      amountValue < 0 ||
      repaymentValue < 0 ||
      (amountValue <= 0 && repaymentValue <= 0)
    ) {
      setValidationError("أدخل مبلغ القرض أو المسدد بقيمة صحيحة أكبر من صفر.");
      return;
    }
    setValidationError("");
    try {
      await addMut.mutateAsync({
        txDate,
        name: name.trim(),
        amount: amountValue,
        repayment: repaymentValue,
        notes: notes.trim(),
      });
    } catch {
      toast.error("تعذر حفظ القرض. راجع حالة القرض قبل إعادة المحاولة.");
    }
  }

  return (
    <AccountingPage
      title="القروض"
      className="accounting-register accounting-loans"
    >
      <div className="space-y-3 sm:space-y-3.5" dir="rtl">
        <div className="flex flex-wrap items-center gap-2"></div>

        <AccountingEntrySection label="إضافة قرض" className="accounting-entry rounded-xl border border-border/60 bg-card p-3 sm:p-4">
          <div ref={addFormRef} dir="rtl">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              إضافة قرض
            </h2>
            {validationError || addErr ? (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {validationError ||
                  "تعذر حفظ القرض. راجع البيانات ثم أعد المحاولة."}
              </p>
            ) : null}
            <div
              className="flex w-fit max-w-full flex-wrap items-end gap-2"
              dir="rtl"
            >
              <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                <label
                  htmlFor="loan-amount"
                  className="text-base font-bold text-primary"
                >
                  المبلغ
                </label>
                <Input bare
                  id="loan-amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-primary placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                <label
                  htmlFor="loan-repayment"
                  className="text-base font-bold text-success"
                >
                  السداد
                </label>
                <Input bare
                  id="loan-repayment"
                  type="number"
                  min="0"
                  value={repayment}
                  onChange={(e) => setRepayment(e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-success placeholder:text-muted-foreground outline-none focus:border-success focus:ring-2 focus:ring-success/30"
                />
              </div>
              <div className="flex w-[11.5rem] shrink-0 flex-col gap-1">
                <label
                  htmlFor="loan-date"
                  className="text-base font-bold text-foreground"
                >
                  التاريخ
                </label>
                <DateInput
                  id="loan-date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="flex min-w-[10rem] max-w-xs flex-1 flex-col gap-1">
                <label
                  htmlFor="loan-name"
                  className="text-base font-bold text-foreground"
                >
                  الاسم
                </label>
                <div className="flex gap-1.5">
                  <Input bare
                    id="loan-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم المقترض"
                    className="h-11 shrink-0 flex-1 rounded-lg border border-border bg-background px-2 text-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <Button variant="bare"
                    type="button"
                    aria-label="إضافة قرض"
                    disabled={addBusy || !txDate || !name.trim()}
                    onClick={() => void handleAddLoan()}
                    className={cn(
                      "flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-primary-foreground transition-colors font-medium",
                      entrySaved
                        ? "bg-success/100"
                        : "bg-primary hover:bg-primary/90 disabled:opacity-40",
                    )}
                  >
                    {addBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : entrySaved ? (
                      <>
                        <Check className="me-1 h-4 w-4" />
                        تم الحفظ
                      </>
                    ) : (
                      <>
                        <span className="me-1 text-base leading-none">+</span>
                        إضافة
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
                <label
                  htmlFor="loan-notes"
                  className="text-base font-bold text-foreground"
                >
                  ملاحظات
                </label>
                <Input bare
                  id="loan-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات القرض"
                  className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-2 lg:px-5">
            <h2 className="text-xs font-semibold text-foreground">
              القروض النشطة
            </h2>
            <div className="rounded-full bg-primary text-primary-foreground">
              {byPerson.length.toLocaleString("ar-EG")} اسم
            </div>
          </div>
          <AccountingQueryBoundary query={reportsQ} label="أرصدة القروض">
            {reportsQ.isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                جاري التحميل...
              </div>
            ) : byPerson.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-4 text-xs text-muted-foreground">
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
                          <div className="mt-1 text-[13px] text-muted-foreground">
                            {row.remaining > 0 ? "مفتوح" : "مغلق"}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1",
                            row.remaining > 0
                              ? "bg-destructive/10 text-destructive ring-destructive/20"
                              : "bg-success/10 text-success ring-success/20",
                          )}
                        >
                          {fmt(row.remaining)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl bg-primary/5 px-3 py-2">
                          <div className="text-[13px] text-primary">القرض</div>
                          <div className="mt-1 font-semibold tabular-nums text-primary">
                            {fmt(row.totalLoan)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-success/10 px-3 py-2">
                          <div className="text-[13px] text-success">المسدد</div>
                          <div className="mt-1 font-semibold tabular-nums text-success">
                            {fmt(row.totalPaid)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-destructive/10 px-3 py-2">
                          <div className="text-[13px] text-destructive">
                            المتبقي
                          </div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.remaining > 0
                                ? "text-destructive"
                                : "text-success",
                            )}
                          >
                            {fmt(row.remaining)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div role="region" aria-label="جدول بيانات" tabIndex={0} className="hidden overflow-x-auto sm:block">
                  <table className="w-full table-fixed text-xs">
                    <thead>
                      <tr className="border-b border-border bg-background text-muted-foreground">
                        <th
                          scope="col"
                          className="px-3 py-2 text-start font-medium sm:px-4 lg:px-5"
                        >
                          الاسم
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-end font-medium tabular-nums text-primary sm:px-4 lg:px-5"
                        >
                          القرض
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-end font-medium tabular-nums text-success sm:px-4 lg:px-5"
                        >
                          المسدد
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-end font-medium tabular-nums text-destructive sm:px-4 lg:px-5"
                        >
                          المتبقي
                        </th>
                        <th
                          scope="col"
                          className="hidden px-3 py-2 text-start font-medium sm:table-cell sm:px-4 lg:px-5"
                        >
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {byPerson.map((row) => (
                        <tr key={row.name} className="hover:bg-muted">
                          <td className="truncate px-3 py-2 font-medium text-foreground sm:px-4 lg:px-5">
                            {row.name}
                          </td>
                          <td className="px-3 py-2 text-end tabular-nums text-primary sm:px-4 lg:px-5">
                            {fmt(row.totalLoan)}
                          </td>
                          <td className="px-3 py-2 text-end tabular-nums text-success sm:px-4 lg:px-5">
                            {fmt(row.totalPaid)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 text-end tabular-nums font-semibold sm:px-4 lg:px-5",
                              row.remaining > 0
                                ? "text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {fmt(row.remaining)}
                          </td>
                          <td className="hidden px-3 py-2 sm:table-cell sm:px-4 lg:px-5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-1.5 py-0.5 text-[13px] font-semibold ring-1",
                                row.remaining > 0
                                  ? "bg-destructive/10 text-destructive ring-destructive/20"
                                  : "bg-success/10 text-success ring-success/20",
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
          </AccountingQueryBoundary>
        </AccountingEntrySection>

        <AccountingQueryBoundary query={ledgerQ} label="حركات القروض">
          <section
            data-register-history
            className="accounting-history overflow-hidden rounded-lg border border-border bg-background"
          >

            {!tableCollapsed && (
              <div className="border-b border-border px-4 py-3" dir="rtl">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted px-3 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                  <Search
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <label htmlFor="loans-search" className="sr-only">
                    بحث في القروض
                  </label>
                  <Input bare
                    id="loans-search"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="بحث بالاسم أو الملاحظات…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  {search && (
                    <Button variant="bare"
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="min-h-11 min-w-11 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                      aria-label="مسح البحث"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!tableCollapsed && (
              <>
                <div className="grid gap-3 px-4 py-3 sm:hidden">
                  {ledgerQ.isLoading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      جاري تحميل الحركات...
                    </div>
                  )}
                  {!ledgerQ.isLoading && rows.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      {search.trim()
                        ? "لا توجد نتائج مطابقة للبحث."
                        : "لا توجد حركات مسجلة."}
                    </div>
                  )}
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className={cn(
                        "rounded-2xl border border-border bg-background p-4 shadow-sm",
                        delConfirm === row.id && "ring-1 ring-destructive/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] text-muted-foreground">
                            {fmtDate(row.txDate)}
                          </div>
                          <Button variant="bare"
                            type="button"
                            className="mt-1 min-h-11 max-w-full truncate text-start text-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                          >
                            {row.name ?? "غير متاح"}
                          </Button>
                          {row.notes ? (
                            <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                              {row.notes}
                            </div>
                          ) : null}
                        </div>
                        <Button variant="bare"
                          type="button"
                          disabled={deleteMut.isPending}
                          aria-label="حذف القيد"
                          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          onClick={() => {
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
                        </Button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-primary/5 px-3 py-2">
                          <div className="text-[13px] text-primary">المبلغ</div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.amount
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.amount ? fmt(row.amount) : "غير متاح"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-success/10 px-3 py-2">
                          <div className="text-[13px] text-success">السداد</div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.repayment
                                ? "text-success"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.repayment ? fmt(row.repayment) : "غير متاح"}
                          </div>
                        </div>
                        <div className="col-span-2 rounded-xl bg-destructive/10 px-3 py-2">
                          <div className="text-[13px] text-destructive">
                            المتبقي
                          </div>
                          <div className="mt-1">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1",
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

                <div
                  role="region"
                  aria-label="جدول حركات القروض"
                  tabIndex={0}
                  className="hidden overflow-x-auto sm:block"
                >
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                        <th
                          scope="col"
                          aria-sort={
                            sortDir === "desc" ? "descending" : "ascending"
                          }
                          className="w-[18%] px-2 py-2 text-start font-medium sm:w-auto sm:px-4 sm:py-2.5"
                        >
                          <Button variant="bare"
                            type="button"
                            onClick={() => {
                              setSortDir((d) =>
                                d === "desc" ? "asc" : "desc",
                              );
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
                          </Button>
                        </th>
                        <th
                          scope="col"
                          className="w-[20%] px-2 py-2 text-start font-medium sm:px-4 sm:py-2.5"
                        >
                          الاسم
                        </th>
                        <th
                          scope="col"
                          className="w-[14%] px-2 py-2 text-end font-medium tabular-nums text-primary sm:px-4 sm:py-2.5"
                        >
                          المبلغ
                        </th>
                        <th
                          scope="col"
                          className="w-[14%] px-2 py-2 text-end font-medium tabular-nums text-success sm:px-4 sm:py-2.5"
                        >
                          السداد
                        </th>
                        <th
                          scope="col"
                          className="w-[16%] px-2 py-2 text-end font-medium tabular-nums text-destructive sm:px-4 sm:py-2.5"
                        >
                          المتبقي
                        </th>
                        <th
                          scope="col"
                          className="hidden px-4 py-2.5 text-end font-medium tabular-nums sm:table-cell"
                        >
                          الاجمالي
                        </th>
                        <th
                          scope="col"
                          className="hidden px-4 py-2.5 text-start font-medium sm:table-cell"
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
                    <tbody className="divide-y divide-border">
                      {ledgerQ.isLoading && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            جاري تحميل الحركات...
                          </td>
                        </tr>
                      )}
                      {!ledgerQ.isLoading && rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            {search.trim()
                              ? "لا توجد نتائج مطابقة للبحث."
                              : "لا توجد حركات مسجلة."}
                          </td>
                        </tr>
                      )}
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className="transition-colors hover:bg-primary/5"
                        >
                          <td className="whitespace-nowrap px-2 py-2 text-[13px] text-muted-foreground sm:px-4 sm:py-2.5 sm:text-xs">
                            {fmtDate(row.txDate)}
                          </td>
                          <td className="truncate px-2 py-2 text-start font-medium text-foreground sm:px-4 sm:py-2.5">
                            <Button variant="bare"
                              type="button"
                              className="min-h-11 max-w-full truncate text-start underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                            >
                              {row.name ?? "غير متاح"}
                            </Button>
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2 text-end tabular-nums text-sm sm:px-4 sm:py-2.5",
                              row.amount
                                ? "font-medium text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.amount ? fmt(row.amount) : "غير متاح"}
                          </td>
                          <td
                            className={cn(
                              "px-2 py-2 text-end tabular-nums text-sm sm:px-4 sm:py-2.5",
                              row.repayment
                                ? "font-medium text-success"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.repayment ? fmt(row.repayment) : "غير متاح"}
                          </td>
                          <td className="px-2 py-2 text-end tabular-nums sm:px-4 sm:py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1",
                                remainingTone(row.remaining),
                              )}
                            >
                              {fmt(row.remaining)}
                            </span>
                          </td>
                          <td className="hidden px-4 py-2.5 text-end tabular-nums text-xs text-foreground sm:table-cell">
                            {fmt(row.total)}
                          </td>
                          <td className="hidden px-4 py-2.5 text-xs leading-5 text-muted-foreground sm:table-cell">
                            {row.notes ?? "غير متاح"}
                          </td>
                          <td
                            className="w-8 px-2 py-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {delConfirm === row.id ? (
                              <div className="flex items-center gap-1">
                                <Button variant="bare"
                                  type="button"
                                  disabled={deleteMut.isPending}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-40 rounded-md"
                                  onClick={() => {
                                    deleteMut.mutate({ id: row.id });
                                    setDelConfirm(null);
                                  }}
                                >
                                  تأكيد
                                </Button>
                                <Button variant="bare"
                                  type="button"
                                  onClick={() => setDelConfirm(null)}
                                  className="inline-flex h-7 items-center rounded-md border border-border px-1.5 text-[13px] text-muted-foreground hover:bg-muted"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Button variant="bare"
                                type="button"
                                disabled={deleteMut.isPending}
                                aria-label="حذف القيد"
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                onClick={() => setDelConfirm(row.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
              </>
            )}
          </section>
        </AccountingQueryBoundary>
      </div>

      <AccLoanDrawer
        open={drawer.open}
        mode={drawer.mode}
        initial={drawer.row}
        onClose={closeDrawer}
        onSaved={onSaved}
      />
    </AccountingPage>
  );
}
