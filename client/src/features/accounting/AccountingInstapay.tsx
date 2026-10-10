import AccountingEntrySection from "./AccountingEntrySection";
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
import { AccEntityImportDialog } from "./AccEntityImportDialog";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 50;

export default function AccountingInstapay() {
  const utils = trpc.useUtils();
  const formRef = useRef<HTMLDivElement>(null);
  const operationInFlight = useRef(false);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [txDate, setTxDate] = useState(todayIso());
  const [inAmount, setInAmount] = useState("");
  const [outAmount, setOutAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState("");
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
  const addMut = trpc.accounting.addAccInstapay.useMutation({ retry: false });
  const updateMut = trpc.accounting.updateAccInstapay.useMutation({
    retry: false,
  });
  const deleteMut = trpc.accounting.deleteAccInstapay.useMutation({
    retry: false,
  });

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
    setValidationError("");
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
    if (busy || operationInFlight.current) return;
    const inValue = Number(inAmount);
    const outValue = Number(outAmount);
    const hasIn = inAmount.trim() !== "" && inValue > 0;
    const hasOut = outAmount.trim() !== "" && outValue > 0;
    if (!txDate) {
      setValidationError("أدخل تاريخ الحركة.");
      return;
    }
    if (
      !Number.isFinite(inValue) ||
      !Number.isFinite(outValue) ||
      inValue < 0 ||
      outValue < 0
    ) {
      setValidationError("أدخل مبالغ صحيحة غير سالبة.");
      return;
    }
    if (hasIn === hasOut) {
      setValidationError(
        "أدخل إيراداً أو مصروفاً واحداً فقط بقيمة أكبر من صفر.",
      );
      return;
    }
    setValidationError("");
    const payload = {
      txDate,
      inAmount: inValue,
      outAmount: outValue,
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
        setInAmount("");
        setOutAmount("");
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

  const instapay = reportsQ.data?.instapay;
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabMetricItems = [
    {
      label: "منه (إيراد)",
      value: accountingMetricValue(reportsQ, instapay?.totalIn),
      icon: TrendingUp,
    },
    {
      label: "معاه (مصروف)",
      value: accountingMetricValue(reportsQ, instapay?.totalOut),
      icon: TrendingDown,
    },
    {
      label: "الرصيد",
      value: accountingMetricValue(reportsQ, instapay?.net),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics(tabMetricItems);

  return (
    <AccountingPage
      title="حساب انستاباي"
      className="accounting-register accounting-transfer"
    >
      <div className="space-y-3 sm:space-y-3.5" dir="rtl">
        <AccountingEntrySection label="إضافة حركة انستاباي" editing={editingId !== null} className="accounting-entry w-fit max-w-full rounded-xl border border-border/60 bg-card p-2.5 sm:p-3">
          <div ref={formRef}>
            <fieldset disabled={busy} className="min-w-0 border-0 p-0">
              {validationError ? (
                <p
                  id="instapay-validation-error"
                  role="alert"
                  className="mb-2 text-sm text-destructive"
                >
                  {validationError}
                </p>
              ) : null}
              {saved ? (
                <p role="status" className="mb-2 text-sm text-success">
                  تمت إضافة الحركة بنجاح.
                </p>
              ) : null}
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
              <div
                className="flex w-fit max-w-full flex-wrap items-end gap-2"
                dir="rtl"
              >
                <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                  <label
                    htmlFor="instapay-in"
                    className="text-base font-bold text-success"
                  >
                    منه (إيراد)
                  </label>
                  <Input bare
                    id="instapay-in"
                    type="number"
                    min="0"
                    value={inAmount}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "instapay-validation-error" : undefined
                    }
                    onChange={(e) => setInAmount(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-success placeholder:text-muted-foreground outline-none focus:border-success focus:ring-2 focus:ring-success/30"
                  />
                </div>
                <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                  <label
                    htmlFor="instapay-out"
                    className="text-base font-bold text-destructive"
                  >
                    معاه (مصروف)
                  </label>
                  <Input bare
                    id="instapay-out"
                    type="number"
                    min="0"
                    value={outAmount}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "instapay-validation-error" : undefined
                    }
                    onChange={(e) => setOutAmount(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-destructive placeholder:text-muted-foreground outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
                  />
                </div>
                <div className="flex w-[11.5rem] shrink-0 flex-col gap-1">
                  <label
                    htmlFor="instapay-date"
                    className="text-base font-bold text-foreground"
                  >
                    التاريخ
                  </label>
                  <DateInput
                    id="instapay-date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
                  <label
                    htmlFor="instapay-notes"
                    className="text-base font-bold text-foreground"
                  >
                    البيان
                  </label>
                  <div className="flex gap-1.5">
                    <Input bare
                      id="instapay-notes"
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
                          ? "حفظ تعديل حركة انستاباي"
                          : "إضافة حركة انستاباي"
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
                    {editingId ? (
                      <Button variant="bare"
                        type="button"
                        aria-label={
                          delConfirm
                            ? "تأكيد حذف حركة انستاباي"
                            : "حذف حركة انستاباي"
                        }
                        disabled={busy}
                        onClick={() => void handleDelete()}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-destructive/40 px-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {delConfirm ? (
                          "تأكيد الحذف"
                        ) : (
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        </AccountingEntrySection>
        <AccountingQueryBoundary query={ledgerQ} label="حركات انستاباي">
          <div
            data-register-history
            className="accounting-history overflow-hidden rounded-lg border border-border bg-background"
          >
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <AccEntityImportDialog entity="insta" onDone={invalidate} />
                <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                  <Search
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <label htmlFor="instapay-search" className="sr-only">
                    بحث في البيان
                  </label>
                  <Input bare
                    id="instapay-search"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="بحث في البيان…"
                    className="w-44 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  {search ? (
                    <Button variant="bare"
                      type="button"
                      aria-label="مسح البحث"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="min-h-11 min-w-11 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="rounded-full bg-secondary/5 px-3 py-1 text-xs font-semibold text-primary">
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
                    "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30",
                    editingId === row.id && "ring-1 ring-secondary/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] text-muted-foreground">
                        {fmtDate(row.txDate)}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {row.notes ?? "غير متاح"}
                      </div>
                    </div>
                    <span className="rounded-full bg-secondary/5 px-2.5 py-1 text-[13px] font-semibold text-primary">
                      {fmt(row.total)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-success/10 px-3 py-2">
                      <div className="text-[13px] text-success">منه</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.inAmount
                            ? "text-success"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.inAmount ? fmt(row.inAmount) : "غير متاح"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-destructive/10 px-3 py-2">
                      <div className="text-[13px] text-destructive">معاه</div>
                      <div
                        className={cn(
                          "mt-1 font-semibold tabular-nums",
                          row.outAmount
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.outAmount ? fmt(row.outAmount) : "غير متاح"}
                      </div>
                    </div>
                    <div className="col-span-2 rounded-xl bg-muted px-3 py-2">
                      <div className="text-[13px] text-muted-foreground">
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
            <div
              role="region"
              aria-label="جدول حركات انستاباي"
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
                      className="w-[18%] px-2 py-2 text-end font-medium tabular-nums text-success sm:px-4 sm:py-2.5"
                    >
                      منه
                    </th>
                    <th
                      scope="col"
                      className="w-[18%] px-2 py-2 text-end font-medium tabular-nums text-destructive sm:px-4 sm:py-2.5"
                    >
                      معاه
                    </th>
                    <th
                      scope="col"
                      className="hidden w-[18%] px-4 py-2.5 text-end font-medium tabular-nums sm:table-cell"
                    >
                      الرصيد
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
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectRow(row);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/30",
                        editingId === row.id &&
                          "bg-secondary/5 ring-1 ring-secondary/20",
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
                          row.inAmount
                            ? "font-medium text-success"
                            : "text-muted-foreground/30",
                        )}
                      >
                        {row.inAmount ? fmt(row.inAmount) : "غير متاح"}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2 text-end tabular-nums text-sm sm:px-4 sm:py-2.5",
                          row.outAmount
                            ? "font-medium text-destructive"
                            : "text-muted-foreground/30",
                        )}
                      >
                        {row.outAmount ? fmt(row.outAmount) : "غير متاح"}
                      </td>
                      <td
                        className={cn(
                          "hidden px-4 py-2.5 text-end tabular-nums text-xs sm:table-cell",
                          (row.balance ?? 0) < 0
                            ? "text-destructive"
                            : "text-success",
                        )}
                      >
                        {fmt(row.balance)}
                      </td>
                      <td className="hidden px-4 py-2.5 text-end tabular-nums text-xs text-foreground sm:table-cell">
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
        </AccountingQueryBoundary>
      </div>
    </AccountingPage>
  );
}
