import { useEffect, useState, useRef } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export interface AccLoanRow {
  id: number;
  txDate: string;
  name: string | null;
  amount: number | null;
  repayment: number | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  mode: "add" | "edit";
  initial?: AccLoanRow;
  onClose: () => void;
  onSaved: () => void;
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export default function AccLoanDrawer({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const operationInFlight = useRef(false);
  const utils = trpc.useUtils();

  const [txDate, setTxDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [operationError, setOperationError] = useState("");

  useEffect(() => {
    if (!open) return;

    setDeleteConfirm(false);
    setOperationError("");
    if (mode === "edit" && initial) {
      setTxDate(initial.txDate?.slice(0, 10) ?? todayIso());
      setName(initial.name ?? "");
      setAmount(initial.amount ? String(initial.amount) : "");
      setRepayment(initial.repayment ? String(initial.repayment) : "");
      setNotes(initial.notes ?? "");
    } else {
      setTxDate(todayIso());
      setName("");
      setAmount("");
      setRepayment("");
      setNotes("");
    }
  }, [open, mode, initial]);

  const addMut = trpc.accounting.addAccLoan.useMutation({ retry: false });
  const updateMut = trpc.accounting.updateAccLoan.useMutation({ retry: false });
  const deleteMut = trpc.accounting.deleteAccLoan.useMutation({ retry: false });
  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accLoansLedger.invalidate();
    utils.accounting.accReports.invalidate();
  };

  async function handleSave() {
    if (busy || operationInFlight.current) return;
    operationInFlight.current = true;
    try {
      const payload = {
        txDate,
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        repayment: parseFloat(repayment) || 0,
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
      setOperationError("تعذر حفظ القرض. راجع البيانات ثم أعد المحاولة.");
    } finally {
      operationInFlight.current = false;
    }
  }

  async function handleDelete() {
    if (busy || operationInFlight.current) return;
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
      setOperationError("تعذر حذف القرض. أعد المحاولة أو أغلق النافذة.");
    } finally {
      operationInFlight.current = false;
    }
  }

  const err =
    operationError ||
    (addMut.error ?? updateMut.error ?? deleteMut.error)?.message;
  const remaining = (parseFloat(amount) || 0) - (parseFloat(repayment) || 0);

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
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary text-primary-foreground">
                القروض
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[13px] font-semibold text-muted-foreground">
                {mode === "add" ? "إضافة" : "تعديل"}
              </span>
            </div>
            <SheetTitle className="mt-2 text-base font-semibold text-foreground">
              {mode === "add" ? "قرض جديد" : "تعديل القرض"}
            </SheetTitle>
          </div>
          <Button variant="bare"
            type="button"
            aria-label="إغلاق تعديل القرض"
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
          <div className="rounded-2xl border border-border bg-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  المتبقي الحالي
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                  {remaining.toLocaleString("ar-EG")}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                  remaining > 0
                    ? "bg-destructive/10 text-destructive ring-destructive/20"
                    : "bg-success/10 text-success ring-success/20",
                )}
              >
                {remaining > 0 ? "رصيد قائم" : "متوازن"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="loan-tx-date"
              className="text-xs font-medium text-muted-foreground"
            >
              التاريخ
            </label>
            <DateInput
              id="loan-tx-date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="loan-name"
              className="text-xs font-medium text-muted-foreground"
            >
              الاسم
            </label>
            <Input
              id="loan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المقترض"
              className="text-start text-sm"
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="loan-amount"
                className="text-xs font-medium text-primary"
              >
                المبلغ
              </label>
              <Input
                id="loan-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="loan-repayment"
                className="text-xs font-medium text-success"
              >
                السداد
              </label>
              <Input
                id="loan-repayment"
                type="number"
                min="0"
                step="0.01"
                value={repayment}
                onChange={(e) => setRepayment(e.target.value)}
                placeholder="0"
                className="text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="loan-notes"
              className="text-xs font-medium text-muted-foreground"
            >
              ملاحظات
            </label>
            <textarea
              id="loan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              dir="rtl"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-start text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
              placeholder="تفاصيل إضافية أو سبب القرض"
            />
          </div>

          {err ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {err}
            </p>
          ) : null}
        </fieldset>

        <div className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={busy || !txDate || !name.trim()}
          >
            {busy && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" />}
            {mode === "add" ? "حفظ القرض" : "تحديث القرض"}
          </Button>

          {mode === "edit" ? (
            deleteConfirm ? (
              <div className="flex gap-2">
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
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={busy}
              >
                <Trash2 className="me-1.5 h-3.5 w-3.5" />
                حذف القرض
              </Button>
            )
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
