import AccountingEntrySection from "./AccountingEntrySection";
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
  Save,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function AccountingDrSaadany() {
  const utils = trpc.useUtils();
  const formRef = useRef<HTMLDivElement>(null);
  const operationInFlight = useRef(false);

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
  const [validationError, setValidationError] = useState("");

  const reportsQ = trpc.accounting.accReports.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const ledgerQ = trpc.accounting.accSaadanyLedger.useQuery(
    { page, pageSize: PAGE_SIZE, search: search.trim() || undefined, sortDir },
    { refetchOnWindowFocus: false, placeholderData: (prev) => prev },
  );
  const addMut = trpc.accounting.addAccSaadany.useMutation({ retry: false });
  const updateMut = trpc.accounting.updateAccSaadany.useMutation({
    retry: false,
  });
  const deleteMut = trpc.accounting.deleteAccSaadany.useMutation({
    retry: false,
  });

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
    setValidationError("");
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
    setWithdrawals(row.withdrawals != null ? String(row.withdrawals) : "");
    setRepayment(row.repayment != null ? String(row.repayment) : "");
    setNotes(row.notes ?? "");
    setDelConfirm(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleSubmit() {
    if (busy || operationInFlight.current) return;
    const withdrawalsValue = Number(withdrawals);
    const repaymentValue = Number(repayment);
    if (
      !Number.isFinite(withdrawalsValue) ||
      !Number.isFinite(repaymentValue) ||
      withdrawalsValue < 0 ||
      repaymentValue < 0 ||
      (withdrawalsValue <= 0 && repaymentValue <= 0)
    ) {
      setValidationError("أدخل المسحوبات أو السداد بقيمة صحيحة أكبر من صفر.");
      return;
    }
    setValidationError("");
    const payload = {
      txDate,
      withdrawals: withdrawalsValue,
      repayment: repaymentValue,
      notes: notes.trim(),
    };
    operationInFlight.current = true;
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
    } finally {
      operationInFlight.current = false;
    }
  }

  async function handleDelete() {
    if (busy || operationInFlight.current) return;
    if (!delConfirm) {
      setDelConfirm(true);
      return;
    }
    operationInFlight.current = true;
    try {
      await deleteMut.mutateAsync({ id: editingId! });
      toast.success("تم حذف القيد");
      resetForm();
      invalidate();
    } catch {
      toast.error("تعذر حذف القيد");
    } finally {
      operationInFlight.current = false;
    }
  }

  const saadany = reportsQ.data?.saadany;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabMetricItems = [
    {
      label: "مسحوبات",
      value: accountingMetricValue(reportsQ, saadany?.totalWithdrawals),
      icon: TrendingDown,
    },
    {
      label: "سداد",
      value: accountingMetricValue(reportsQ, saadany?.totalRepaid),
      icon: TrendingUp,
    },
    {
      label: "الرصيد",
      value: accountingMetricValue(reportsQ, saadany?.remaining),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics(tabMetricItems);

  return (
    <AccountingPage
      title="حساب د. السعدني"
      className="accounting-register accounting-transfer accounting-saadany"
    >
      <div className="space-y-3 sm:space-y-3.5" dir="rtl">
        <AccountingEntrySection label="إضافة حركة د. السعدني" editing={editingId !== null} className="accounting-entry w-fit max-w-full rounded-xl border border-border/60 bg-card p-2.5 sm:p-3">
          <div ref={formRef}>
            <fieldset disabled={busy} className="min-w-0 border-0 p-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {editingId ? "تعديل قيد" : "إضافة حركة"}
                </h2>
                {editingId && (
                  <Button variant="bare"
                    type="button"
                    onClick={resetForm}
                    className="rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                  >
                    إلغاء
                  </Button>
                )}
              </div>
              {validationError ? (
                <p
                  id="saadany-validation-error"
                  role="alert"
                  className="mb-2 text-sm text-destructive"
                >
                  {validationError}
                </p>
              ) : null}
              <div
                className="flex w-fit max-w-full flex-wrap items-end gap-2"
                dir="rtl"
              >
                <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                  <label
                    htmlFor="saadany-repayment"
                    className="text-base font-bold text-success"
                  >
                    سداد
                  </label>
                  <Input bare
                    id="saadany-repayment"
                    type="number"
                    min="0"
                    value={repayment}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "saadany-validation-error" : undefined
                    }
                    onChange={(e) => setRepayment(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-success placeholder:text-muted-foreground outline-none focus:border-success focus:ring-2 focus:ring-success/30"
                  />
                </div>
                <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                  <label
                    htmlFor="saadany-withdrawals"
                    className="text-base font-bold text-destructive"
                  >
                    مسحوبات
                  </label>
                  <Input bare
                    id="saadany-withdrawals"
                    type="number"
                    min="0"
                    value={withdrawals}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "saadany-validation-error" : undefined
                    }
                    onChange={(e) => setWithdrawals(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-destructive placeholder:text-muted-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
                  />
                </div>
                <div className="flex w-[11.5rem] shrink-0 flex-col gap-1">
                  <label
                    htmlFor="saadany-date"
                    className="text-base font-bold text-foreground"
                  >
                    التاريخ
                  </label>
                  <DateInput
                    id="saadany-date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
                  <label
                    htmlFor="saadany-notes"
                    className="text-base font-bold text-foreground"
                  >
                    البيان
                  </label>
                  <div className="flex gap-1.5">
                    <Input bare
                      id="saadany-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="البيان…"
                      className="h-11 shrink-0 flex-1 rounded-lg border border-border bg-background px-2 text-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                    <Button variant="bare"
                      type="button"
                      aria-label={
                        editingId
                          ? "حفظ تعديل حركة د. السعدني"
                          : "إضافة حركة د. السعدني"
                      }
                      disabled={busy || !txDate}
                      onClick={() => void handleSubmit()}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-primary-foreground transition-colors font-medium",
                        "bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        </AccountingEntrySection>
        <AccountingQueryBoundary query={ledgerQ} label="حركات د. السعدني">
          <div
            data-register-history
            className="accounting-history overflow-hidden rounded-lg border border-border bg-background"
          >
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  حركات د. السعدني
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex h-10 w-full flex-1 items-center rounded-lg border border-border bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 sm:flex-none sm:w-auto">
                  <Search className="absolute end-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <label htmlFor="saadany-search" className="sr-only">
                    بحث في البيان
                  </label>
                  <Input bare
                    id="saadany-search"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="بحث في البيان…"
                    className="w-full bg-transparent py-1.5 pe-8 ps-3 text-sm placeholder:text-muted-foreground sm:w-52"
                  />
                  {search && (
                    <Button variant="bare"
                      type="button"
                      aria-label="مسح البحث"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute start-2 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
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
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectRow(row);
                    }
                  }}
                  className={cn(
                    "rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/60",
                    editingId === row.id && "bg-muted ring-1 ring-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] text-muted-foreground">
                        {fmtDate(row.txDate)}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-foreground">
                        {row.notes ?? "غير متاح"}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1",
                        (row.runningTotal ?? 0) > 0
                          ? "bg-destructive/10 text-destructive ring-destructive/20"
                          : "bg-success/10 text-success ring-success/20",
                      )}
                    >
                      <>
                        <span className="sr-only">الرصيد الجاري: </span>
                        {fmt(row.runningTotal)}
                      </>
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-destructive/10 px-3 py-2">
                      <div className="text-[13px] text-destructive">
                        مسحوبات
                      </div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.withdrawals
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.withdrawals == null
                          ? "غير متاح"
                          : fmt(row.withdrawals)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-success/10 px-3 py-2">
                      <div className="text-[13px] text-success">سداد</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.repayment
                            ? "text-success"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.repayment == null
                          ? "غير متاح"
                          : fmt(row.repayment)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              role="region"
              aria-label="جدول حركات د. السعدني"
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
                      className="w-[24%] px-2 py-2 text-start font-medium sm:w-auto sm:px-4 sm:py-2.5"
                    >
                      <Button variant="bare"
                        type="button"
                        className="flex min-h-11 w-full items-center gap-1 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        onClick={() => {
                          setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                          setPage(1);
                        }}
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
                      className="px-2 py-2 text-start font-medium sm:px-4 sm:py-2.5"
                    >
                      البيان
                    </th>
                    <th
                      scope="col"
                      className="w-[18%] px-2 py-2 text-end font-medium tabular-nums text-destructive sm:px-4 sm:py-2.5"
                    >
                      مسحوبات
                    </th>
                    <th
                      scope="col"
                      className="w-[18%] px-2 py-2 text-end font-medium tabular-nums text-success sm:px-4 sm:py-2.5"
                    >
                      سداد
                    </th>
                    <th
                      scope="col"
                      className="hidden w-[18%] px-4 py-2.5 text-end font-medium tabular-nums sm:table-cell"
                    >
                      الاجمالي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledgerQ.isLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        جاري التحميل...
                      </td>
                    </tr>
                  )}
                  {!ledgerQ.isLoading && rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
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
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectRow(row);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/60",
                        editingId === row.id && "bg-muted ring-1 ring-border",
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2 text-[13px] text-muted-foreground sm:px-4 sm:py-2.5 sm:text-xs">
                        {fmtDate(row.txDate)}
                      </td>
                      <td className="truncate px-2 py-2 text-sm text-foreground sm:px-4 sm:py-2.5">
                        {row.notes ?? "غير متاح"}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2 text-end tabular-nums text-sm sm:px-4 sm:py-2.5",
                          row.withdrawals
                            ? "font-medium text-destructive"
                            : "text-muted-foreground/30",
                        )}
                      >
                        {row.withdrawals == null
                          ? "غير متاح"
                          : fmt(row.withdrawals)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2 text-end tabular-nums text-sm sm:px-4 sm:py-2.5",
                          row.repayment
                            ? "font-medium text-success"
                            : "text-muted-foreground/30",
                        )}
                      >
                        {row.repayment == null
                          ? "غير متاح"
                          : fmt(row.repayment)}
                      </td>
                      <td
                        className={cn(
                          "hidden px-4 py-2.5 text-end tabular-nums text-xs sm:table-cell",
                          (row.runningTotal ?? 0) > 0
                            ? "text-destructive"
                            : "text-success",
                        )}
                      >
                        <>
                          <span className="sr-only">الرصيد الجاري: </span>
                          {fmt(row.runningTotal)}
                        </>
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
        </AccountingQueryBoundary>
      </div>
    </AccountingPage>
  );
}
