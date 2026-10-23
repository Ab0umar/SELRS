import { useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { fmt, todayIso } from "./accountingFormat";
import { AccountingQueryBoundary } from "./AccountingPagePrimitives";
import { Input } from "@/components/ui/input";

const toDisplayDate = (iso: string) => iso.split("-").reverse().join("/");
const toIsoDate = (value: string) => {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

export default function AccountingLoanEntry() {
  const utils = trpc.useUtils();
  const [dateText, setDateText] = useState(toDisplayDate(todayIso()));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [validationError, setValidationError] = useState("");
  const saving = useRef(false);
  const addMut = trpc.accounting.addAccLoan.useMutation({ retry: false });
  const employeesQ = trpc.accounting.accEmployeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const loansSummaryQ = trpc.accounting.accLoansSummary.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const reset = () => {
    setDateText(toDisplayDate(todayIso()));
    setName("");
    setAmount("");
    setRepayment("");
    setNotes("");
    setSaved(false);
    setSaveError("");
  };
  const save = async () => {
    if (saving.current) return;
    const txDate = toIsoDate(dateText);
    const amountValue = Number(amount);
    const repaymentValue = Number(repayment);
    if (!txDate) {
      setValidationError("أدخل التاريخ بصيغة يوم/شهر/سنة صحيحة.");
      return;
    }
    if (!name.trim()) {
      setValidationError("اختر الموظف قبل حفظ القرض.");
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
    const payload = {
      txDate,
      name: name.trim(),
      amount: amountValue,
      repayment: repaymentValue,
      notes: notes.trim(),
    };
    saving.current = true;
    setBusy(true);
    setSaved(false);
    setSaveError("");
    try {
      await addMut.mutateAsync(payload);
      reset();
      setSaved(true);
      await Promise.all([
        utils.accounting.accLoansLedger.invalidate(),
        utils.accounting.accReports.invalidate(),
        utils.accounting.accLoansSummary.invalidate(),
      ]);
    } catch {
      setSaveError("تعذر إكمال حفظ القرض. راجع حالة القرض قبل إعادة المحاولة.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const field =
    "h-14 w-full border-[3px] border-primary/45 bg-card px-3 text-start text-xl font-bold text-foreground outline-none focus:border-primary";
  const label =
    "flex h-14 items-center justify-center border-2 border-primary/35 bg-muted px-3 text-2xl font-black text-foreground whitespace-nowrap";
  const remaining = (Number(amount) || 0) - (Number(repayment) || 0);
  const employeeLoan = (loansSummaryQ.data?.byPerson ?? []).find(
    (row) => row.name.trim() === name.trim(),
  );
  return (
    <section
      dir="rtl"
      className="accounting-ledger accounting-entry-workspace accounting-mobile-entry mx-auto max-w-7xl text-foreground"
    >
      <div
        className="grid gap-5 xl:grid-cols-[12rem_minmax(0,1fr)_9rem]"
        dir="ltr"
      >
        <aside dir="rtl" className="grid content-start gap-3">
          <a
            href="/accounting/loans"
            className="rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
          >
            إجمالي القروض
          </a>
        </aside>
        <form
          dir="rtl"
          aria-busy={busy}
          onChangeCapture={() => setSaved(false)}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="grid content-start gap-3"
        >
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
          {validationError && (
            <p
              id="loan-entry-validation-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {validationError}
            </p>
          )}
          {busy && (
            <p role="status" className="text-sm text-muted-foreground">
              جارٍ حفظ القرض
            </p>
          )}
          <AccountingQueryBoundary query={employeesQ} label="قائمة الموظفين">
            <fieldset
              disabled={busy}
              className="grid min-w-0 gap-5 border-0 p-0"
            >
              <div className="accounting-entry-pair grid gap-3 sm:grid-cols-2">
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={label}>الموظف</span>
                  <select
                    aria-label="الموظف"
                    className={field}
                    value={name}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError
                        ? "loan-entry-validation-error"
                        : undefined
                    }
                    onChange={(event) => setName(event.target.value)}
                  >
                    <option value="">اختر الموظف</option>
                    {(employeesQ.data ?? []).map((employee) => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={label}>التاريخ</span>
                  <Input bare aria-label="DD/MM/YYYY"
                    className={field}
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError
                        ? "loan-entry-validation-error"
                        : undefined
                    }
                    value={dateText}
                    onChange={(event) => setDateText(event.target.value)}
                  />
                </label>
              </div>
              {name && (
                <AccountingQueryBoundary
                  query={loansSummaryQ}
                  label="ملخص القروض"
                >
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        إجمالي القروض
                      </span>
                      <strong className="block text-xl">
                        {loansSummaryQ.isLoading
                          ? "…"
                          : fmt(employeeLoan?.totalLoan ?? 0)}
                      </strong>
                    </div>
                    <div className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        المسدد
                      </span>
                      <strong className="block text-xl text-success">
                        {loansSummaryQ.isLoading
                          ? "…"
                          : fmt(employeeLoan?.totalPaid ?? 0)}
                      </strong>
                    </div>
                    <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        المتبقي
                      </span>
                      <strong className="block text-xl text-destructive">
                        {loansSummaryQ.isLoading
                          ? "…"
                          : fmt(employeeLoan?.remaining ?? 0)}
                      </strong>
                    </div>
                  </div>
                </AccountingQueryBoundary>
              )}
              <div className="accounting-entry-pair grid gap-3 sm:grid-cols-2">
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={label}>القرض</span>
                  <Input bare
                    className={field}
                    type="number"
                    min="0"
                    value={amount}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError
                        ? "loan-entry-validation-error"
                        : undefined
                    }
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                  <span className={label}>المسدد</span>
                  <Input bare
                    className={field}
                    type="number"
                    min="0"
                    value={repayment}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={
                      validationError
                        ? "loan-entry-validation-error"
                        : undefined
                    }
                    onChange={(event) => setRepayment(event.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={label}>المتبقي</span>
                <output className="h-14 border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-2xl font-black text-destructive">
                  {fmt(remaining)}
                </output>
              </div>
              <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={label}>ملاحظات</span>
                <Input bare
                  className={field}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button type="button" onClick={reset} variant="outline">
                  <Plus className="h-4 w-4" /> جديد
                </Button>
                <Button
                  type="submit"
                  disabled={
                    addMut.isPending ||
                    !name.trim() ||
                    !toIsoDate(dateText) ||
                    (!Number(amount) && !Number(repayment))
                  }
                >
                  <Save className="h-4 w-4" />{" "}
                  {busy ? "جارٍ الحفظ" : saved ? "تم الحفظ" : "حفظ"}
                </Button>
              </div>
            </fieldset>
          </AccountingQueryBoundary>
        </form>
        <aside dir="rtl" className="grid content-start gap-3">
          <a
            href="/accounting/loans"
            className="rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
          >
            القروض
          </a>
        </aside>
      </div>
    </section>
  );
}
