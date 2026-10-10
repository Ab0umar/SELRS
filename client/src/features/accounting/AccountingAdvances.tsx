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
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
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

export default function AccountingAdvances() {
  const utils = trpc.useUtils();
  const formRef = useRef<HTMLDivElement>(null);
  const operationInFlight = useRef(false);
  const employeeInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [tableOpen, setTableOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [txDate, setTxDate] = useState(todayIso());
  const [employee, setEmployee] = useState("");
  const [empCd, setEmpCd] = useState<string | null>(null);
  const [advance, setAdvance] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [validationError, setValidationError] = useState("");

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
  const attEmpsQ = trpc.accounting.accAttEmployeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const attEmps: any[] = attEmpsQ.data ?? [];
  const employeesQ = trpc.accounting.accEmployeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const ledgerQ = trpc.accounting.accAdvancesLedger.useQuery(filters, {
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const addMut = trpc.accounting.addAccAdvance.useMutation({ retry: false });
  const updateMut = trpc.accounting.updateAccAdvance.useMutation({
    retry: false,
  });
  const deleteMut = trpc.accounting.deleteAccAdvance.useMutation({
    retry: false,
  });

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accAdvancesLedger.invalidate();
    utils.accounting.accReports.invalidate();
  };

  function resetForm() {
    setEditingId(null);
    setTxDate(todayIso());
    setEmployee("");
    setEmpCd(null);
    setAdvance("");
    setRepayment("");
    setNotes("");
    setDelConfirm(false);
  }

  function selectRow(row: {
    id: number;
    txDate: string;
    employee: string | null;
    empCd?: string | null;
    advance: number | null;
    repayment: number | null;
    notes: string | null;
  }) {
    setEditingId(row.id);
    setTxDate(row.txDate.slice(0, 10));
    setEmployee(row.employee ?? "");
    setEmpCd(row.empCd ?? null);
    setAdvance(row.advance ? String(row.advance) : "");
    setRepayment(row.repayment ? String(row.repayment) : "");
    setNotes(row.notes ?? "");
    setDelConfirm(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleSubmit() {
    if (busy || operationInFlight.current) return;
    if (!employee.trim()) {
      toast.error("اختر اسم الموظف");
      return;
    }
    const advanceValue = Number(advance);
    const repaymentValue = Number(repayment);
    if (
      !Number.isFinite(advanceValue) ||
      !Number.isFinite(repaymentValue) ||
      advanceValue < 0 ||
      repaymentValue < 0 ||
      (advanceValue <= 0 && repaymentValue <= 0)
    ) {
      setValidationError("أدخل السلفة أو السداد بقيمة صحيحة أكبر من صفر.");
      return;
    }
    setValidationError("");
    const payload = {
      txDate,
      employee: employee.trim(),
      empCd: empCd || null,
      advance: advanceValue,
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
        setEmployee("");
        setEmpCd(null);
        setAdvance("");
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

  const allEmployees = reportsQ.data?.advances ?? [];
  const byEmployee = allEmployees.filter((r) => r.remaining > 0);
  const totalAdvance = allEmployees.reduce((s, r) => s + r.totalAdvance, 0);
  const totalRepaid = allEmployees.reduce((s, r) => s + r.totalRepaid, 0);
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabMetricItems = [
    {
      label: "إجمالي السلف",
      value: accountingMetricValue(
        reportsQ,
        reportsQ.data ? totalAdvance : undefined,
      ),
      icon: TrendingUp,
    },
    {
      label: "إجمالي السداد",
      value: accountingMetricValue(
        reportsQ,
        reportsQ.data ? totalRepaid : undefined,
      ),
      icon: TrendingDown,
    },
    {
      label: "المتبقي",
      value: accountingMetricValue(
        reportsQ,
        reportsQ.data ? totalAdvance - totalRepaid : undefined,
      ),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics(tabMetricItems);

  const employees = employeesQ.data ?? [];

  return (
    <AccountingPage title="السلف" className="accounting-register">
      <div className="space-y-2 sm:space-y-2.5" dir="rtl">
        <div className="flex flex-wrap items-center gap-2"></div>

        <AccountingEntrySection label="إضافة سلفة" editing={editingId !== null} className="accounting-entry rounded-xl border border-border/60 bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-2">
            <div ref={formRef} className="min-w-0">
              <fieldset disabled={busy} className="min-w-0 border-0 p-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    {editingId ? "تعديل قيد" : "إضافة سلفة"}
                  </h2>
                  {editingId && (
                    <Button variant="bare"
                      type="button"
                      onClick={resetForm}
                      className="rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted text-muted-foreground"
                    >
                      إلغاء
                    </Button>
                  )}
                </div>

                <div
                  className="flex w-fit max-w-full flex-wrap items-end gap-2"
                  dir="rtl"
                >
                  {validationError ? (
                    <p
                      id="advances-validation-error"
                      role="alert"
                      className="mb-2 w-full text-sm text-destructive"
                    >
                      {validationError}
                    </p>
                  ) : null}
                  <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                    <label
                      htmlFor="advances-advance"
                      className="text-base font-bold text-warning-text"
                    >
                      سلفة
                    </label>
                    <Input bare
                      id="advances-advance"
                      type="number"
                      min="0"
                      value={advance}
                      aria-invalid={Boolean(validationError)}
                      aria-describedby={
                        validationError
                          ? "advances-validation-error"
                          : undefined
                      }
                      onChange={(e) => setAdvance(e.target.value)}
                      placeholder="0"
                      className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-warning-text outline-none placeholder:text-muted-foreground focus:border-warning focus:ring-2 focus:ring-warning/20"
                    />
                  </div>
                  <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                    <label
                      htmlFor="advances-repayment"
                      className="text-base font-bold text-success"
                    >
                      سداد
                    </label>
                    <Input bare
                      id="advances-repayment"
                      type="number"
                      min="0"
                      value={repayment}
                      aria-invalid={Boolean(validationError)}
                      aria-describedby={
                        validationError
                          ? "advances-validation-error"
                          : undefined
                      }
                      onChange={(e) => setRepayment(e.target.value)}
                      placeholder="0"
                      className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg tabular-nums text-success outline-none placeholder:text-muted-foreground focus:border-success/60 focus:ring-2 focus:ring-success/20"
                    />
                  </div>
                  <div className="flex w-[11.5rem] shrink-0 flex-col gap-1">
                    <label
                      htmlFor="advances-date"
                      className="text-base font-bold text-foreground"
                    >
                      التاريخ
                    </label>
                    <DateInput
                      id="advances-date"
                      value={txDate}
                      aria-invalid={Boolean(validationError)}
                      aria-describedby={
                        validationError
                          ? "advances-validation-error"
                          : undefined
                      }
                      onChange={(e) => setTxDate(e.target.value)}
                      className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                  <div className="relative flex min-w-[9rem] max-w-[14rem] flex-col gap-1">
                    <label
                      htmlFor="advances-employee"
                      className="text-base font-bold text-foreground"
                    >
                      الموظف{" "}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </label>
                    <div
                      className="relative"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget))
                          setEmpOpen(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          employeeInputRef.current?.focus();
                          setEmpOpen(false);
                        }
                        if (
                          event.key === "ArrowDown" ||
                          event.key === "ArrowUp"
                        ) {
                          const options = Array.from(
                            event.currentTarget.querySelectorAll<HTMLButtonElement>(
                              '[role="option"]',
                            ),
                          );
                          if (!options.length) return;
                          event.preventDefault();
                          const index = options.indexOf(
                            document.activeElement as HTMLButtonElement,
                          );
                          const next =
                            event.key === "ArrowDown"
                              ? (index + 1) % options.length
                              : (index <= 0 ? options.length : index) - 1;
                          options[next].focus();
                        }
                      }}
                    >
                      <Input bare
                        ref={employeeInputRef}
                        id="advances-employee"
                        type="text"
                        role="combobox"
                        aria-expanded={empOpen}
                        aria-haspopup="listbox"
                        aria-controls="advances-employees"
                        aria-autocomplete="list"
                        aria-required="true"
                        required
                        value={employee}
                        onChange={(e) => {
                          setEmployee(e.target.value);
                          setEmpOpen(true);
                        }}
                        onFocus={() => setEmpOpen(true)}
                        placeholder="اختر أو اكتب…"
                        className="h-11 w-full rounded-lg border border-border bg-background px-3 pe-7 text-lg text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                      <ChevronDown
                        className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      {empOpen && employees.length > 0 && (
                        <div
                          id="advances-employees"
                          role="listbox"
                          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
                        >
                          {employees
                            .filter(
                              (e) => !employee || e.name.includes(employee),
                            )
                            .map((e) => (
                              <Button variant="bare"
                                key={e.id}
                                type="button"
                                role="option"
                                aria-selected={employee === e.name}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setEmployee(e.name);
                                  employeeInputRef.current?.focus();
                                  setEmpOpen(false);
                                }}
                                className={cn(
                                  "flex w-full items-center px-2 py-1.5 text-sm text-start hover:bg-muted",
                                  employee === e.name &&
                                    "bg-primary text-primary-foreground",
                                )}
                              >
                                {e.name}
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-[10rem] max-w-[16rem] flex-col gap-1">
                    <label className="text-base font-bold text-foreground">
                      ربط بموظف الرواتب{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (اختياري لاستيراد السلفة في الرواتب)
                      </span>
                    </label>
                    <select
                      aria-label="ربط بموظف الرواتب"
                      value={empCd ?? ""}
                      onChange={(e) => setEmpCd(e.target.value || null)}
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-lg text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="">-- غير مرتبط --</option>
                      {attEmps.map((e: any) => (
                        <option key={e.empCd} value={e.empCd}>
                          {e.fullName} ({e.empCd})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
                    <label
                      htmlFor="advances-notes"
                      className="text-base font-bold text-foreground"
                    >
                      ملاحظات
                    </label>
                    <Input bare
                      id="advances-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ملاحظات…"
                      className="h-11 w-full rounded-lg border border-border bg-background px-2 text-lg text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
                  {editingId ? (
                    <>
                      {delConfirm ? (
                        <>
                          <Button variant="bare"
                            type="button"
                            onClick={handleDelete}
                            disabled={busy}
                            className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-destructive text-destructive-foreground transition-opacity hover:bg-destructive/90 disabled:opacity-40 sm:w-auto"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "تأكيد الحذف"
                            )}
                          </Button>
                          <Button variant="bare"
                            type="button"
                            onClick={() => setDelConfirm(false)}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:w-auto"
                          >
                            إلغاء
                          </Button>
                        </>
                      ) : (
                        <Button variant="bare"
                          type="button"
                          aria-label="حذف القيد"
                          onClick={() => setDelConfirm(true)}
                          disabled={busy}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-destructive-foreground bg-destructive text-destructive-foreground disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="bare"
                        type="button"
                        onClick={handleSubmit}
                        disabled={busy || !txDate || !employee.trim()}
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "تحديث"
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button variant="bare"
                      type="button"
                      aria-label="إضافة سلفة"
                      disabled={busy || !txDate || !employee.trim()}
                      onClick={handleSubmit}
                      className={cn(
                        "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto",
                        saved
                          ? "bg-success text-success-foreground"
                          : "bg-primary",
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : saved ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-base leading-none">+</span>
                      )}
                      <span>إضافة</span>
                    </Button>
                  )}
                </div>
              </fieldset>
            </div>
          </div>
        </AccountingEntrySection>
        <AccountingQueryBoundary query={reportsQ} label="أرصدة السلف">
          {allEmployees.length > 0 && (
            <section className="accounting-history rounded-xl border border-border bg-background shadow-xs overflow-hidden">
              <div className="border-b border-border px-2.5 py-1.5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    السلف النشطة
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اضغط على صف لتحديد الموظف في نموذج الإضافة
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {byEmployee.length} موظف برصيد متبقٍ
                </span>
              </div>
              <div className="grid gap-2 px-2.5 py-1.5 sm:hidden">
                {allEmployees.map((r) => (
                  <div
                    key={r.employee}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setEmployee(r.employee);
                      setEmpCd(null);
                      setAdvance("");
                      setRepayment("");
                      setNotes("");
                      setEditingId(null);
                      setSearch(r.employee);
                      setPage(1);
                      formRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setEmployee(r.employee);
                        setSearch(r.employee);
                        setPage(1);
                      }
                    }}
                    className={cn(
                      "rounded-xl border border-border bg-background p-3 shadow-xs transition-colors",
                      employee === r.employee &&
                        "ring-1 ring-warning/40 bg-warning/5",
                      r.remaining <= 0 && "opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {r.employee}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                          r.remaining > 0
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success",
                        )}
                      >
                        {fmt(r.remaining)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-warning/10 px-2 py-1.5">
                        <div className="text-[13px] text-warning-text">
                          إجمالي السلف
                        </div>
                        <div className="mt-1 font-semibold tabular-nums text-warning-text">
                          {fmt(r.totalAdvance)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-success/10 px-2 py-1.5">
                        <div className="text-[13px] text-success">
                          إجمالي السداد
                        </div>
                        <div className="mt-1 font-semibold tabular-nums text-success">
                          {fmt(r.totalRepaid)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 text-sm font-bold">
                  <div className="flex items-center justify-between">
                    <span>الإجمالي</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        totalAdvance - totalRepaid > 0
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {fmt(totalAdvance - totalRepaid)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span className="text-warning-text">
                      سلف: {fmt(totalAdvance)}
                    </span>
                    <span className="text-success">
                      سداد: {fmt(totalRepaid)}
                    </span>
                  </div>
                </div>
              </div>
              <div role="region" aria-label="جدول بيانات" tabIndex={0} className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">
                        الموظف
                      </th>
                      <th className="px-4 py-2.5 text-end font-medium text-warning-text tabular-nums">
                        إجمالي السلف
                      </th>
                      <th className="px-4 py-2.5 text-end font-medium text-success tabular-nums">
                        إجمالي السداد
                      </th>
                      <th className="px-4 py-2.5 text-end font-medium text-destructive tabular-nums">
                        المتبقي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {allEmployees.map((r) => (
                      <tr
                        key={r.employee}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setEmployee(r.employee);
                          setEmpCd(null);
                          setAdvance("");
                          setRepayment("");
                          setNotes("");
                          setEditingId(null);
                          setSearch(r.employee);
                          setPage(1);
                          formRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setEmployee(r.employee);
                            setSearch(r.employee);
                            setPage(1);
                          }
                        }}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          employee === r.employee && "bg-warning/10",
                          r.remaining <= 0 && "opacity-50",
                        )}
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {r.employee}
                        </td>
                        <td className="px-4 py-2.5 text-end tabular-nums text-warning-text">
                          {fmt(r.totalAdvance)}
                        </td>
                        <td className="px-4 py-2.5 text-end tabular-nums text-success">
                          {fmt(r.totalRepaid)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-end tabular-nums font-bold",
                            r.remaining > 0
                              ? "text-destructive"
                              : "text-success",
                          )}
                        >
                          {fmt(r.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30 text-xs font-bold">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        الإجمالي
                      </td>
                      <td className="px-4 py-2.5 text-end tabular-nums text-warning-text">
                        {fmt(totalAdvance)}
                      </td>
                      <td className="px-4 py-2.5 text-end tabular-nums text-success">
                        {fmt(totalRepaid)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-end tabular-nums",
                          totalAdvance - totalRepaid > 0
                            ? "text-destructive"
                            : "text-success",
                        )}
                      >
                        {fmt(totalAdvance - totalRepaid)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </AccountingQueryBoundary>

        <AccountingQueryBoundary query={ledgerQ} label="حركات السلف">
          <section
            data-register-history
            className="accounting-history rounded-xl border border-border bg-background shadow-xs"
          >
            <div className="flex flex-col gap-2 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <Button variant="bare"
                type="button"
                onClick={() => setTableOpen((v) => !v)}
                aria-label={tableOpen ? "إخفاء الجدول" : "عرض الجدول"}
                aria-expanded={tableOpen}
                className="flex items-center gap-2 text-start transition-opacity hover:opacity-80 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-muted",
                    tableOpen && "bg-card",
                  )}
                >
                  <svg
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      tableOpen
                        ? "text-card-foreground"
                        : "text-muted-foreground -rotate-90",
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
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    حركات السلف
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    اضغط على أي صف للتعديل.
                  </p>
                </div>
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 sm:w-auto">
                  <Search
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <label htmlFor="advances-search" className="sr-only">
                    بحث في حركات السلف
                  </label>
                  <Input bare
                    id="advances-search"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="بحث باسم الموظف…"
                    className="shrink-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground sm:w-44 sm:flex-none"
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
                <div className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {total.toLocaleString("ar-EG")} حركة
                </div>
              </div>
            </div>

            {tableOpen && (
              <>
                <div className="grid gap-2 px-2.5 py-1.5 sm:hidden">
                  {ledgerQ.isLoading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      جاري التحميل...
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
                        "rounded-xl border border-border bg-background p-4 shadow-xs transition-colors hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        editingId === row.id && "ring-1 ring-warning/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13px] text-muted-foreground">
                            {fmtDate(row.txDate)}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-foreground">
                            {row.employee ?? "غير متاح"}
                          </div>
                          {row.notes && row.notes !== row.employee && (
                            <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                              {row.notes}
                            </div>
                          )}
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1",
                            (row.advance ?? 0) - (row.repayment ?? 0) > 0
                              ? "bg-destructive/10 text-destructive ring-destructive/20"
                              : "bg-success/10 text-success ring-success/20",
                          )}
                        >
                          {fmt(row.runningTotal)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-warning/10 px-2 py-1.5">
                          <div className="text-[13px] text-warning-text">سلفة</div>
                          <div
                            className={cn(
                              "mt-1 font-semibold tabular-nums",
                              row.advance
                                ? "text-warning-text"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.advance ? fmt(row.advance) : "غير متاح"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-success/10 px-2 py-1.5">
                          <div className="text-[13px] text-success">سداد</div>
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
                      </div>
                    </div>
                  ))}
                </div>

                <div role="region" aria-label="جدول بيانات" tabIndex={0} className="hidden w-full overflow-x-auto sm:block">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border bg-primary text-primary-foreground">
                        <th
                          scope="col"
                          className="w-[22%] px-3 py-3 text-start font-semibold sm:w-auto sm:px-4"
                          aria-sort={
                            sortDir === "desc" ? "descending" : "ascending"
                          }
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            className="gap-2 px-0 text-inherit hover:bg-transparent hover:text-inherit"
                            aria-label="ترتيب الحركات حسب التاريخ"
                            onClick={() => {
                              setSortDir((d) =>
                                d === "desc" ? "asc" : "desc",
                              );
                              setPage(1);
                            }}
                          >
                            التاريخ
                            {sortDir === "desc" ? (
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            ) : (
                              <ChevronUp className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3 text-start font-semibold sm:px-4"
                        >
                          الموظف
                        </th>
                        <th
                          scope="col"
                          className="w-[18%] px-3 py-3 text-end font-semibold tabular-nums sm:px-4"
                        >
                          سلفة
                        </th>
                        <th
                          scope="col"
                          className="w-[18%] px-3 py-3 text-end font-semibold tabular-nums sm:px-4"
                        >
                          سداد
                        </th>
                        <th
                          scope="col"
                          className="hidden w-[18%] px-2.5 py-1.5 text-end font-semibold tabular-nums sm:table-cell"
                        >
                          المتبقي
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
                            {search.trim()
                              ? "لا توجد نتائج مطابقة للبحث."
                              : "لا توجد حركات مسجلة."}
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
                            "cursor-pointer transition-colors hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                            editingId === row.id &&
                              "bg-warning/10 ring-1 ring-warning/30",
                          )}
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted-foreground sm:px-4 sm:text-xs">
                            {fmtDate(row.txDate)}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="truncate text-sm font-medium text-foreground">
                              {row.employee ?? "غير متاح"}
                            </div>
                            {row.notes && row.notes !== row.employee && (
                              <div className="truncate text-[13px] text-muted-foreground">
                                {row.notes}
                              </div>
                            )}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-end tabular-nums text-sm sm:px-4",
                              row.advance
                                ? "font-medium text-warning-text"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.advance ? fmt(row.advance) : "غير متاح"}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-end tabular-nums text-sm sm:px-4",
                              row.repayment
                                ? "font-medium text-success"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.repayment ? fmt(row.repayment) : "غير متاح"}
                          </td>
                          <td
                            className={cn(
                              "hidden px-2.5 py-1.5 text-end tabular-nums text-xs sm:table-cell",
                              (row.runningTotal ?? 0) > 0
                                ? "text-destructive"
                                : "text-success",
                            )}
                          >
                            {fmt(row.runningTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tableOpen && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-2.5 py-1.5">
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
          </section>
        </AccountingQueryBoundary>
      </div>
    </AccountingPage>
  );
}
