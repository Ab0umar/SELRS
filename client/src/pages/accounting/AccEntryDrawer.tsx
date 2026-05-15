import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return new Date().toISOString().split("T")[0];
}

export default function AccEntryDrawer({ open, mode, initial, onClose, onSaved }: Props) {
  const utils = trpc.useUtils();
  const categoriesQ = trpc.accounting.accCategories.useQuery(undefined, { refetchOnWindowFocus: false });

  const [txDate,  setTxDate]  = useState(todayIso());
  const [income,  setIncome]  = useState("");
  const [expense, setExpense] = useState("");
  const [notes,   setNotes]   = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setDeleteConfirm(false);
      if (mode === "edit" && initial) {
        setTxDate(initial.txDate?.slice(0, 10) ?? todayIso());
        setIncome(initial.income  ? String(initial.income)  : "");
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

  const addMut    = trpc.accounting.addAccEntry.useMutation();
  const updateMut = trpc.accounting.updateAccEntry.useMutation();
  const deleteMut = trpc.accounting.deleteAccEntry.useMutation();

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accLedger.invalidate();
    utils.accounting.accLedgerSummary.invalidate();
    utils.accounting.accReports.invalidate();
    utils.accounting.accAdvancesLedger.invalidate();
    utils.accounting.accHomeLedger.invalidate();
    utils.accounting.accInstagramLedger.invalidate();
    utils.accounting.accSaadanyLedger.invalidate();
  };

  async function handleSave() {
    const payload = {
      txDate,
      income:  parseFloat(income)  || 0,
      expense: parseFloat(expense) || 0,
      notes:   notes.trim(),
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
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    await deleteMut.mutateAsync({ id: initial!.id });
    invalidate();
    onSaved();
  }

  const err = (addMut.error ?? updateMut.error ?? deleteMut.error)?.message;

  const cats = categoriesQ.data ?? [];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        dir="rtl"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-xl sm:w-[420px]"
        style={{ animation: "slideInRight 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-slate-500">الخزنة</p>
            <h2 className="text-base font-bold text-slate-900">
              {mode === "add" ? "قيد جديد" : "تعديل القيد"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">التاريخ</label>
            <Input
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Income / Expense */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-emerald-700">إيراد</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={income}
                onChange={e => setIncome(e.target.value)}
                placeholder="0"
                className="text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-rose-700">مصروف</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={expense}
                onChange={e => setExpense(e.target.value)}
                placeholder="0"
                className="text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Balance preview */}
          {(income || expense) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500">الرصيد</span>
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                (parseFloat(income) || 0) - (parseFloat(expense) || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              )}>
                {((parseFloat(income) || 0) - (parseFloat(expense) || 0)).toLocaleString("ar-EG")}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">ملاحظات</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="البيان أو اسم الموظف..."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
            />
            {/* Category quick-fill */}
            {cats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cats.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNotes(c.name)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      notes.trim() === c.name
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {err && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>
          )}
        </div>


        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-4 space-y-2">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={busy || !txDate}
          >
            {busy && <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />}
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
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "تأكيد الحذف"}
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
                  className="w-full text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                  حذف القيد
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </>
  );
}
