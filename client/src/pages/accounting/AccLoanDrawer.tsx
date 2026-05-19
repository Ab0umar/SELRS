import { useEffect, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const utils = trpc.useUtils();

  const [txDate, setTxDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;

    setDeleteConfirm(false);
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

  const addMut = trpc.accounting.addAccLoan.useMutation();
  const updateMut = trpc.accounting.updateAccLoan.useMutation();
  const deleteMut = trpc.accounting.deleteAccLoan.useMutation();
  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accLoansLedger.invalidate();
    utils.accounting.accReports.invalidate();
  };

  async function handleSave() {
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
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    await deleteMut.mutateAsync({ id: initial!.id });
    invalidate();
    onSaved();
  }

  const err = (addMut.error ?? updateMut.error ?? deleteMut.error)?.message;
  const remaining = (parseFloat(amount) || 0) - (parseFloat(repayment) || 0);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-muted/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-background shadow-xl sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[420px]"
        style={{ animation: "slideInRight 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary text-primary-foreground">
                القروض
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {mode === "add" ? "إضافة" : "تعديل"}
              </span>
            </div>
            <h2 className="mt-2 text-base font-bold text-foreground">
              {mode === "add" ? "قرض جديد" : "تعديل القرض"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
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
            <label htmlFor="loan-tx-date" className="text-xs font-medium text-muted-foreground">
              التاريخ
            </label>
            <Input
              id="loan-tx-date"
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="loan-name" className="text-xs font-medium text-muted-foreground">الاسم</label>
            <Input
              id="loan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المقترض"
              className="text-right text-sm"
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="loan-amount" className="text-xs font-medium text-primary">
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
              <label htmlFor="loan-repayment" className="text-xs font-medium text-success">
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
            <label htmlFor="loan-notes" className="text-xs font-medium text-muted-foreground">
              ملاحظات
            </label>
            <textarea
              id="loan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              dir="rtl"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-right text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
              placeholder="تفاصيل إضافية أو سبب القرض"
            />
          </div>

          {err ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={busy || !txDate || !name.trim()}
          >
            {busy && <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />}
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
                <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                حذف القرض
              </Button>
            )
          ) : null}
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  );
}
