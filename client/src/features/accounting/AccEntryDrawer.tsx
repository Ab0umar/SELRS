import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export type AccEntryMode = "add" | "edit";

export interface AccEntryRow {
  id: number;
  txDate: string;
  income: number | null;
  expense: number | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  mode: AccEntryMode;
  initial?: AccEntryRow;
  onClose: () => void;
  onSaved: () => void;
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AccEntryDrawer({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const operationInFlight = useRef(false);
  const utils = trpc.useUtils();
  const categoriesQ = trpc.accounting.accCategories.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [txDate, setTxDate] = useState(todayIso());
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [operationError, setOperationError] = useState("");

  useEffect(() => {
    if (open) {
      setDeleteConfirm(false);
      setValidationError("");
      setOperationError("");
      if (mode === "edit" && initial) {
        setTxDate(initial.txDate?.slice(0, 10) ?? todayIso());
        setIncome(initial.income ? String(initial.income) : "");
        setExpense(initial.expense ? String(initial.expense) : "");
        setNotes(initial.notes ?? "");
      } else {
        setTxDate(todayIso());
        setIncome("");
        setExpense("");
        setNotes("");
      }
    }
  }, [open, mode, initial]);

  const addMut = trpc.accounting.addAccEntry.useMutation({ retry: false });
  const updateMut = trpc.accounting.updateAccEntry.useMutation({
    retry: false,
  });
  const deleteMut = trpc.accounting.deleteAccEntry.useMutation({
    retry: false,
  });

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accLedger.invalidate();
    utils.accounting.accLedgerSummary.invalidate();
    utils.accounting.accReports.invalidate();
    utils.accounting.accAdvancesLedger.invalidate();
    utils.accounting.accHomeLedger.invalidate();
    utils.accounting.accInstapayLedger.invalidate();
    utils.accounting.accSaadanyLedger.invalidate();
  };

  async function handleSave() {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    try {
      const incomeValue = Number(income);
      const expenseValue = Number(expense);
      if (!txDate) {
        setValidationError("أدخل تاريخ القيد.");
        return;
      }
      if (
        !Number.isFinite(incomeValue) ||
        !Number.isFinite(expenseValue)
      ) {
        setValidationError("أدخل مبالغ رقمية صحيحة.");
        return;
      }
      setValidationError("");
      const payload = {
        txDate,
        income: incomeValue,
        expense: expenseValue,
        notes: notes.trim(),
      };
      if (mode === "add") {
        await addMut.mutateAsync(payload);
      } else {
        await updateMut.mutateAsync({ id: initial!.id, ...payload });
      }
      invalidate();
      onSaved();
    } catch {
      setOperationError("تعذر حفظ القيد. راجع البيانات ثم أعد المحاولة.");
    } finally {
      operationInFlight.current = false;
    }
  }

  async function handleDelete() {
    if (operationInFlight.current) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    operationInFlight.current = true;
    try {
      await deleteMut.mutateAsync({ id: initial!.id });
      invalidate();
      onSaved();
    } catch {
      setOperationError("تعذر حذف القيد. أعد المحاولة أو أغلق النافذة.");
    } finally {
      operationInFlight.current = false;
    }
  }

  const err = operationError || (addMut.error ?? updateMut.error ?? deleteMut.error)?.message;

  const cats = categoriesQ.data ?? [];

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent
        dir="rtl"
        aria-describedby={undefined}
        className="accounting-editor w-full gap-0 sm:w-[420px] sm:max-w-[420px] [&>button:last-child]:hidden"
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">الخزنة</p>
            <SheetTitle className="text-base font-semibold text-foreground">
              {mode === "add" ? "قيد جديد" : "تعديل القيد"}
            </SheetTitle>
          </div>
          <Button variant="bare"
            type="button"
            aria-label="إغلاق تعديل القيد"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <fieldset
          disabled={busy}
          className="min-w-0 flex-1 space-y-4 overflow-y-auto border-0 px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="entry-tx-date"
              className="text-xs font-medium text-muted-foreground"
            >
              التاريخ
            </label>
            <DateInput
              id="entry-tx-date"
              aria-invalid={Boolean(validationError)}
              aria-describedby={
                validationError ? "entry-validation-error" : undefined
              }
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="entry-income"
                className="text-xs font-medium text-success"
              >
                إيراد
              </label>
              <Input
                id="entry-income"
                aria-invalid={Boolean(validationError)}
                aria-describedby={
                  validationError ? "entry-validation-error" : undefined
                }
                type="number"
                step="0.01"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="0"
                className="text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="entry-expense"
                className="text-xs font-medium text-destructive"
              >
                مصروف
              </label>
              <Input
                id="entry-expense"
                aria-invalid={Boolean(validationError)}
                aria-describedby={
                  validationError ? "entry-validation-error" : undefined
                }
                type="number"
                step="0.01"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                placeholder="0"
                className="text-sm tabular-nums"
              />
            </div>
          </div>

          {(income || expense) && (
            <div className="rounded-xl border border-border bg-muted px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">الرصيد</span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  (parseFloat(income) || 0) - (parseFloat(expense) || 0) >= 0
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {(
                  (parseFloat(income) || 0) - (parseFloat(expense) || 0)
                ).toLocaleString("ar-EG")}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="entry-notes"
              className="text-xs font-medium text-muted-foreground"
            >
              ملاحظات
            </label>
            <textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="البيان أو اسم الموظف…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20 resize-none"
            />
            {cats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cats.map((c) => (
                  <Button variant="bare"
                    key={c.id}
                    type="button"
                    onClick={() => setNotes(c.name)}
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-2 text-[13px] font-medium transition-colors",
                      notes.trim() === c.name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-border hover:bg-muted",
                    )}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {(validationError || err) && (
            <p
              id="entry-validation-error"
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {validationError || err}
            </p>
          )}
        </fieldset>

        {/* Footer */}
        <div className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={busy || !txDate}
          >
            {busy && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" />}
            {mode === "add" ? "حفظ القيد" : "تحديث القيد"}
          </Button>

          {mode === "edit" && (
            <div className="flex gap-2">
              {deleteConfirm ? (
                <>
                  <Button
                    variant="destructive"
                    className="flex-1 text-xs"
                    onClick={handleDelete}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "تأكيد الحذف"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={busy}
                  >
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  <Trash2 className="me-1.5 h-3.5 w-3.5" />
                  حذف القيد
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
