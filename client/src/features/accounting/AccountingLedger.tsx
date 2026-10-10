import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { fmt, todayIso } from "./accountingFormat";
import {
  AccountingPage,
  AccountingQueryBoundary,
} from "./AccountingPagePrimitives";
import { accountingMetricValue } from "./accountingQueryState";
import { accountingRevenuePeriodsForDate } from "./accountingRevenuePeriods";
import { Plus, Save, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./accounting-web.css";
import { Input } from "@/components/ui/input";
const toDisplayDate = (iso: string) => iso.split("-").reverse().join("/");
const toIsoDate = (value: string) => {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

export default function AccountingLedger() {
  const utils = trpc.useUtils();
  const [dateText, setDateText] = useState(toDisplayDate(todayIso()));
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [notes, setNotes] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const summaryQ = trpc.accounting.accLedgerSummary.useQuery(
    {},
    { refetchOnWindowFocus: false },
  );
  const revenuePeriods = accountingRevenuePeriodsForDate(toIsoDate(dateText));
  const dailyRevenueQ = trpc.accounting.accLedgerSummary.useQuery(
    revenuePeriods?.day ?? {},
    {
      refetchOnWindowFocus: false,
      enabled: revenuePeriods !== null,
    },
  );
  const monthlyRevenueQ = trpc.accounting.accLedgerSummary.useQuery(
    revenuePeriods?.month ?? {},
    {
      refetchOnWindowFocus: false,
      enabled: revenuePeriods !== null,
    },
  );
  const navigatorQ = trpc.accounting.accLedgerNavigator.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const employeesQ = trpc.accounting.accEmployeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const addMut = trpc.accounting.addAccEntry.useMutation({ retry: false });
  const updateMut = trpc.accounting.updateAccEntry.useMutation({
    retry: false,
  });
  const deleteMut = trpc.accounting.deleteAccEntry.useMutation({
    retry: false,
  });
  const recalcMut = trpc.accounting.recalcAccLedgerBalances.useMutation({
    onSuccess: () => utils.accounting.accLedgerSummary.invalidate(),
  });
  const rows = navigatorQ.data ?? [];
  const selectedIndex =
    selectedId === null ? -1 : rows.findIndex((row) => row.id === selectedId);
  useEffect(() => {
    setReceiptNumber(selectedId === null ? "" : String(selectedId));
    setReceiptError("");
  }, [selectedId]);
  const openReceipt = () => {
    const value = receiptNumber
      .trim()
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    if (!value) {
      setReceiptNumber(selectedId === null ? "" : String(selectedId));
      setReceiptError("");
      return;
    }
    const row = /^\d+$/.test(value)
      ? rows.find((item) => item.id === Number(value))
      : undefined;
    if (!row) {
      setReceiptError("رقم الإيصال غير موجود.");
      return;
    }
    if (
      row.id !== selectedId &&
      (income || expense || notes || extraNotes) &&
      !window.confirm("فتح الإيصال الآخر واستبدال البيانات المعروضة؟")
    ) {
      setReceiptNumber(selectedId === null ? "" : String(selectedId));
      return;
    }
    setReceiptError("");
    setReceiptNumber(String(row.id));
    setSelectedId(row.id);
  };
  useEffect(() => {
    if (selectedIndex < 0) return;
    const row = rows[selectedIndex];
    setDateText(toDisplayDate(row.txDate));
    setIncome(row.income ? String(row.income) : "");
    setExpense(row.expense ? String(row.expense) : "");
    setNotes(row.notes);
    setExtraNotes(row.remarks ?? "");
    setSaved(false);
  }, [rows, selectedIndex]);
  const reset = () => {
    setSelectedId(null);
    setReceiptNumber("");
    setReceiptError("");
    setDateText(toDisplayDate(todayIso()));
    setIncome("");
    setExpense("");
    setNotes("");
    setExtraNotes("");
    setSaved(false);
    setOperationError("");
  };
  const invalidate = async () => {
    await Promise.all([
      utils.accounting.accLedger.invalidate(),
      utils.accounting.accLedgerNavigator.invalidate(),
      utils.accounting.accLedgerSummary.invalidate(),
      utils.accounting.accInstapayLedger.invalidate(),
      utils.accounting.accAdvancesLedger.invalidate(),
      utils.accounting.accHomeLedger.invalidate(),
      utils.accounting.accSaadanyLedger.invalidate(),
    ]);
  };
  const showExtraNotes = (employeesQ.data ?? []).some(
    (item) => item.name && notes.includes(item.name),
  );
  const save = async () => {
    if (operationInFlight.current) return;
    if (receiptError) {
      setValidationError("راجع رقم الإيصال قبل الحفظ.");
      return;
    }
    const txDate = toIsoDate(dateText);
    const incomeValue = Number(income);
    const expenseValue = Number(expense);
    if (!txDate) {
      setValidationError("أدخل التاريخ بصيغة يوم/شهر/سنة صحيحة.");
      return;
    }
    if (!Number.isFinite(incomeValue) || !Number.isFinite(expenseValue)) {
      setValidationError("أدخل مبالغ رقمية صحيحة.");
      return;
    }
    setValidationError("");
    const payload = {
      txDate,
      income: Number(income) || 0,
      expense: Number(expense) || 0,
      notes: notes.trim(),
      remarks: extraNotes.trim(),
    };
    operationInFlight.current = true;
    setBusy(true);
    setSaved(false);
    setOperationError("");
    try {
      if (selectedId === null) {
        await addMut.mutateAsync(payload);
        reset();
      } else {
        await updateMut.mutateAsync({ id: selectedId, ...payload });
      }
      setSaved(true);
      await invalidate();
    } catch {
      setOperationError(
        "تعذر إكمال حفظ القيد. راجع حالة القيد قبل إعادة المحاولة.",
      );
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  };
  const remove = async () => {
    if (operationInFlight.current) return;
    if (selectedId === null || !window.confirm("حذف القيد الحالي؟")) return;
    operationInFlight.current = true;
    setBusy(true);
    setOperationError("");
    try {
      await deleteMut.mutateAsync({ id: selectedId });
      reset();
      await invalidate();
    } catch {
      setOperationError(
        "تعذر إكمال حذف القيد. راجع حالة القيد قبل إعادة المحاولة.",
      );
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  };
  const goTo = (index: number) => {
    const row = rows[index];
    if (row) setSelectedId(row.id);
  };
  const navigationButtons: ReadonlyArray<
    readonly [label: string, onClick: () => void]
  > = [
    ["البداية", () => goTo(0)],
    ["السابق", () => goTo(selectedIndex <= 0 ? 0 : selectedIndex - 1)],
    ["التالي", () => goTo(selectedIndex < 0 ? 0 : selectedIndex + 1)],
    ["النهاية", () => goTo(rows.length - 1)],
  ];
  const fieldClass =
    "h-14 w-full border-[3px] border-foreground/45 bg-card px-3 text-start text-xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass =
    "flex h-14 items-center justify-center border-2 border-foreground/35 bg-muted px-3 text-2xl font-black text-foreground whitespace-nowrap";
  return (
    <AccountingPage title="القيود">
      <section
        dir="rtl"
        className="accounting-ledger accounting-mobile-entry mx-auto max-w-7xl text-foreground"
      >
        <div
          className="grid gap-6 xl:grid-cols-[12rem_minmax(0,1fr)_10rem]"
          dir="ltr"
        >
          <form
            dir="rtl"
            aria-busy={busy}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className="grid content-start gap-5"
          >
            {validationError && (
              <p
                id="ledger-validation-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {validationError}
              </p>
            )}
            {operationError && (
              <p role="alert" className="text-sm text-destructive">
                {operationError}
              </p>
            )}
            {busy && (
              <p role="status" className="text-sm text-muted-foreground">
                جارٍ تنفيذ العملية
              </p>
            )}
            <fieldset
              disabled={busy}
              className="grid min-w-0 gap-5 border-0 p-0"
            >
              <div className="accounting-ledger-header flex flex-wrap items-center gap-4">
                <label className="accounting-receipt-number grid gap-1">
                  <span className="text-sm font-semibold">الإيصال</span>
                  <Input bare
                    id="ledger-receipt"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="جديد"
                    aria-invalid={Boolean(receiptError)}
                    aria-describedby={
                      receiptError ? "ledger-receipt-error" : undefined
                    }
                    value={receiptNumber}
                    onChange={(event) => {
                      setReceiptNumber(event.target.value);
                      setReceiptError("");
                    }}
                    onBlur={openReceipt}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        openReceipt();
                      }
                    }}
                    disabled={navigatorQ.isLoading || navigatorQ.isError}
                  />
                </label>
                <div className="accounting-current-balance flex items-center justify-center gap-2 whitespace-nowrap">
                  <span className="text-base font-semibold">الرصيد الحالي</span>
                  <output
                    dir="ltr"
                    className="h-14 border-2 border-foreground/35 bg-card px-4 py-2 text-center text-3xl font-black"
                  >
                    {accountingMetricValue(
                      summaryQ,
                      summaryQ.data?.currentBalance,
                    )}
                  </output>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => recalcMut.mutate()}
                  disabled={recalcMut.isPending}
                >
                  <RefreshCw className="h-4 w-4" /> تحديث الأرصدة
                </Button>
              </div>
              {receiptError && (
                <p
                  id="ledger-receipt-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {receiptError}
                </p>
              )}
              <div className="accounting-revenue-totals grid grid-cols-2 gap-6 border-b border-border pb-3">
                <div className="grid justify-items-center gap-1">
                  <span className="text-sm font-semibold">الإيراد اليومي</span>
                  <output
                    dir="ltr"
                    aria-label="الإيراد اليومي"
                    className="text-center font-bold"
                  >
                    {revenuePeriods
                      ? accountingMetricValue(
                          dailyRevenueQ,
                          dailyRevenueQ.data
                            ? dailyRevenueQ.data.totalIncome -
                                dailyRevenueQ.data.totalExpense
                            : undefined,
                        )
                      : "تاريخ غير صالح"}
                  </output>
                </div>
                <div className="grid justify-items-center gap-1">
                  <span className="text-sm font-semibold">الإيراد الشهري</span>
                  <output
                    dir="ltr"
                    aria-label="الإيراد الشهري"
                    className="text-center font-bold"
                  >
                    {revenuePeriods
                      ? accountingMetricValue(
                          monthlyRevenueQ,
                          monthlyRevenueQ.data
                            ? monthlyRevenueQ.data.totalIncome -
                                monthlyRevenueQ.data.totalExpense
                            : undefined,
                        )
                      : "تاريخ غير صالح"}
                  </output>
                </div>
              </div>
              <div className="accounting-entry-pair grid gap-5 sm:grid-cols-2">
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={labelClass}>الإيراد</span>
                  <Input bare
                    id="ledger-income"
                    dir="ltr"
                    className={fieldClass}
                    type="number"
                    step="any"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "ledger-validation-error" : undefined
                    }
                    value={income}
                    onChange={(event) => {
                      setIncome(event.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={labelClass}>المصروف</span>
                  <Input bare
                    id="ledger-expense"
                    dir="ltr"
                    className={fieldClass}
                    type="number"
                    step="any"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "ledger-validation-error" : undefined
                    }
                    value={expense}
                    onChange={(event) => {
                      setExpense(event.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
              </div>
              <div className="accounting-entry-pair grid gap-5 sm:grid-cols-2">
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={labelClass}>التاريخ</span>
                  <Input bare
                    id="ledger-date"
                    dir="ltr"
                    className={fieldClass}
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError ? "ledger-validation-error" : undefined
                    }
                    value={dateText}
                    onChange={(event) => {
                      setDateText(event.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={labelClass}>الرصيد</span>
                  <output
                    dir="ltr"
                    className="h-14 border-2 border-foreground/35 bg-card px-3 py-2 text-center text-xl font-black"
                  >
                    {fmt((Number(income) || 0) - (Number(expense) || 0))}
                  </output>
                </div>
              </div>
              <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={labelClass}>البيان</span>
                <span>
                  <Input bare
                    list="ledger-employees"
                    dir="auto"
                    className={fieldClass}
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value);
                      setSaved(false);
                    }}
                  />
                  <datalist id="ledger-employees">
                    {(employeesQ.data ?? []).map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </span>
              </label>
              {showExtraNotes && (
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={labelClass}>ملاحظات</span>
                  <Input bare
                    className={fieldClass}
                    value={extraNotes}
                    dir="auto"
                    onChange={(event) => {
                      setExtraNotes(event.target.value);
                      setSaved(false);
                    }}
                  />
                </label>
              )}
              <AccountingQueryBoundary
                query={navigatorQ}
                label="القيود السابقة"
              >
                {rows.length === 0 ? (
                  <p className="border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                    لا توجد قيود سابقة للتنقل بينها.
                  </p>
                ) : (
                  <div className="mt-1 flex flex-wrap justify-between gap-3">
                    {navigationButtons.map(([label, onClick]) => (
                      <Button variant="bare"
                        key={label}
                        type="button"
                        onClick={onClick}
                        className="min-h-11 rounded-md bg-muted px-5 py-3 text-xl font-black text-foreground hover:bg-muted/70"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                )}
              </AccountingQueryBoundary>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="bare"
                  type="button"
                  onClick={() => window.history.back()}
                  className="min-h-11 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  إغلاق
                </Button>
                <Button type="button" onClick={reset} variant="outline">
                  <Plus className="h-4 w-4" /> جديد
                </Button>
                <Button
                  type="button"
                  onClick={() => void remove()}
                  disabled={selectedId === null || deleteMut.isPending}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
                <Button
                  type="submit"
                  disabled={
                    addMut.isPending ||
                    updateMut.isPending ||
                    !toIsoDate(dateText)
                  }
                >
                  <Save className="h-4 w-4" />{" "}
                  {busy ? "جارٍ التنفيذ" : saved ? "تم الحفظ" : "حفظ"}
                </Button>
              </div>
            </fieldset>
          </form>
        </div>
      </section>
    </AccountingPage>
  );
}
