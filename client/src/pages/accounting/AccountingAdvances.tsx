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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountingShell from "./AccountingShell";
import { toast } from "sonner";
import { fmt, fmtDate, todayIso } from "./accountingFormat";

const PAGE_SIZE = 50;

export default function AccountingAdvances() {
  const utils = trpc.useUtils();
  const formRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [tableOpen, setTableOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [txDate, setTxDate] = useState(todayIso());
  const [employee, setEmployee] = useState("");
  const [advance, setAdvance] = useState("");
  const [repayment, setRepayment] = useState("");
  const [notes, setNotes] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const [saved, setSaved] = useState(false);
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
  const employeesQ = trpc.accounting.accEmployeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const ledgerQ = trpc.accounting.accAdvancesLedger.useQuery(filters, {
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const addMut = trpc.accounting.addAccAdvance.useMutation();
  const updateMut = trpc.accounting.updateAccAdvance.useMutation();
  const deleteMut = trpc.accounting.deleteAccAdvance.useMutation();

  const busy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const invalidate = () => {
    utils.accounting.accAdvancesLedger.invalidate();
    utils.accounting.accReports.invalidate();
  };

  function resetForm() {
    setEditingId(null);
    setTxDate(todayIso());
    setEmployee("");
    setAdvance("");
    setRepayment("");
    setNotes("");
    setDelConfirm(false);
  }

  function selectRow(row: {
    id: number;
    txDate: string;
    employee: string | null;
    advance: number | null;
    repayment: number | null;
    notes: string | null;
  }) {
    setEditingId(row.id);
    setTxDate(row.txDate.slice(0, 10));
    setEmployee(row.employee ?? "");
    setAdvance(row.advance ? String(row.advance) : "");
    setRepayment(row.repayment ? String(row.repayment) : "");
    setNotes(row.notes ?? "");
    setDelConfirm(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleSubmit() {
    if (!employee.trim()) {
      toast.error("اختر اسم الموظف");
      return;
    }
    const payload = {
      txDate,
      employee: employee.trim(),
      advance: parseFloat(advance) || 0,
      repayment: parseFloat(repayment) || 0,
      notes: notes.trim(),
    };
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
        setAdvance("");
        setRepayment("");
        setNotes("");
      }
      invalidate();
    } catch {
      toast.error("تعذر حفظ القيد");
    }
  }

  async function handleDelete() {
    if (!delConfirm) {
      setDelConfirm(true);
      return;
    }
    try {
      await deleteMut.mutateAsync({ id: editingId! });
      toast.success("تم حذف القيد");
      resetForm();
      invalidate();
    } catch {
      toast.error("تعذر حذف القيد");
    }
  }

  const allEmployees = reportsQ.data?.advances ?? [];
  const byEmployee = allEmployees.filter((r) => r.remaining > 0);
  const totalAdvance = allEmployees.reduce((s, r) => s + r.totalAdvance, 0);
  const totalRepaid = allEmployees.reduce((s, r) => s + r.totalRepaid, 0);
  const { rows = [], total = 0 } = ledgerQ.data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const employees = employeesQ.data ?? [];

  return (
    <AccountingShell>
      <div className="space-y-4 lg:space-y-5" dir="rtl">
        <section className="rounded-[24px] border border-border bg-background p-4 shadow-sm lg:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    إدارة مالية
                  </div>
                  <h1 className="mt-1 text-xl font-bold text-foreground lg:text-2xl">
                    السلف
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    إدخال ومراجعة السلف والسداد مع كشف الحركات في نفس الصفحة.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      label: "إجمالي السلف",
                      val: totalAdvance,
                      cls: "text-warning",
                      bg: "bg-warning/10",
                      icon: TrendingDown,
                    },
                    {
                      label: "إجمالي السداد",
                      val: totalRepaid,
                      cls: "text-success",
                      bg: "bg-success/10",
                      icon: TrendingUp,
                    },
                    {
                      label: "المتبقي",
                      val: totalAdvance - totalRepaid,
                      cls:
                        totalAdvance - totalRepaid > 0
                          ? "text-destructive"
                          : "text-primary",
                      bg:
                        totalAdvance - totalRepaid > 0
                          ? "bg-destructive/10"
                          : "bg-primary/5",
                      icon: Wallet,
                    },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.label}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border border-border px-4 py-3",
                        m.bg,
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background",
                          m.cls,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          {m.label}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 text-lg font-bold tabular-nums leading-none",
                            m.cls,
                          )}
                        >
                          {reportsQ.isLoading ? "..." : fmt(m.val)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div ref={formRef} className="min-w-0 border-t border-border pt-4 xl:w-[480px] xl:border-t-0 xl:border-s xl:pt-0 xl:ps-5">
              <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {editingId ? "تعديل قيد" : "إضافة سلفة"}
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-md px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted text-muted-foreground"
                    >
                      إلغاء
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="advances-date"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      التاريخ
                    </label>
                    <input
                      id="advances-date"
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </div>

                  <div className="relative flex flex-col gap-1.5 sm:col-span-1">
                    <label
                      htmlFor="advances-employee"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      الموظف <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="advances-employee"
                        type="text"
                        role="combobox"
                        aria-expanded={empOpen}
                        aria-haspopup="listbox"
                        aria-autocomplete="list"
                        aria-required="true"
                        required
                        value={employee}
                        onChange={(e) => {
                          setEmployee(e.target.value);
                          setEmpOpen(true);
                        }}
                        onFocus={() => setEmpOpen(true)}
                        onBlur={() => setTimeout(() => setEmpOpen(false), 150)}
                        placeholder="اختر أو اكتب..."
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 pl-7 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                      <ChevronDown className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      {empOpen && employees.length > 0 && (
                        <div role="listbox" className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                          {employees
                            .filter(
                              (e) => !employee || e.name.includes(employee),
                            )
                            .map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                role="option"
                                aria-selected={employee === e.name}
                                onMouseDown={() => {
                                  setEmployee(e.name);
                                  setEmpOpen(false);
                                }}
                                className={cn(
                                  "flex w-full items-center px-3 py-2 text-sm text-right hover:bg-muted",
                                  employee === e.name &&
                                    "bg-primary text-primary-foreground",
                                )}
                              >
                                {e.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="advances-advance"
                      className="text-xs font-medium text-warning"
                    >
                      سلفة
                    </label>
                    <input
                      id="advances-advance"
                      type="number"
                      min="0"
                      value={advance}
                      onChange={(e) => setAdvance(e.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-warning outline-none placeholder:text-muted-foreground transition-colors focus:border-warning focus:ring-2 focus:ring-warning/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="advances-repayment"
                      className="text-xs font-medium text-success"
                    >
                      سداد
                    </label>
                    <input
                      id="advances-repayment"
                      type="number"
                      min="0"
                      value={repayment}
                      onChange={(e) => setRepayment(e.target.value)}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-success outline-none placeholder:text-muted-foreground transition-colors focus:border-success/60 focus:ring-2 focus:ring-success/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label
                      htmlFor="advances-notes"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      ملاحظات
                    </label>
                    <input
                      id="advances-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ملاحظات..."
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {editingId ? (
                    <>
                      {delConfirm ? (
                        <>
                          <button
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
                          </button>
                          <button
                            type="button"
                            onClick={() => setDelConfirm(false)}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:w-auto"
                          >
                            إلغاء
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-label="حذف القيد"
                          onClick={() => setDelConfirm(true)}
                          disabled={busy}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-destructive-foreground bg-destructive text-destructive-foreground disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={busy || !txDate || !employee.trim()}
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "تحديث"
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label="إضافة سلفة"
                      disabled={busy || !txDate || !employee.trim()}
                      onClick={handleSubmit}
                      className={cn(
                        "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-card-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto",
                        saved ? "bg-success/100" : "bg-primary",
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
                    </button>
                  )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <button
              type="button"
              onClick={() => setTableOpen((v) => !v)}
              aria-label={tableOpen ? "إخفاء الجدول" : "عرض الجدول"}
              aria-expanded={tableOpen}
              className="flex items-center gap-3 text-right transition-opacity hover:opacity-80 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                    tableOpen ? "text-card-foreground" : "text-muted-foreground -rotate-90",
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
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 sm:w-auto">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <label htmlFor="advances-search" className="sr-only">بحث في حركات السلف</label>
                <input
                  id="advances-search"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="بحث باسم الموظف..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:w-44 sm:flex-none"
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="rounded-full bg-primary text-primary-foreground">
                {total.toLocaleString("ar-EG")} حركة
              </div>
            </div>
          </div>

          {tableOpen && (
            <>
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
                      if (e.key === "Enter" || e.key === " ") selectRow(row);
                    }}
                    className={cn(
                      "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      editingId === row.id && "ring-1 ring-warning/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">
                          {fmtDate(row.txDate)}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-foreground">
                          {row.employee ?? "—"}
                        </div>
                        {row.notes && row.notes !== row.employee && (
                          <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                            {row.notes}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                          (row.advance ?? 0) - (row.repayment ?? 0) > 0
                            ? "bg-destructive/10 text-destructive ring-destructive/20"
                            : "bg-success/10 text-success ring-success/20",
                        )}
                      >
                        {fmt(row.runningTotal)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-warning/10 px-3 py-2">
                        <div className="text-[10px] text-warning">سلفة</div>
                        <div
                          className={cn(
                            "mt-1 font-semibold tabular-nums",
                            row.advance ? "text-warning" : "text-muted-foreground",
                          )}
                        >
                          {row.advance ? fmt(row.advance) : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-success/10 px-3 py-2">
                        <div className="text-[10px] text-success">سداد</div>
                        <div
                          className={cn(
                            "mt-1 font-semibold tabular-nums",
                            row.repayment
                              ? "text-success"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.repayment ? fmt(row.repayment) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden w-full overflow-x-auto sm:block">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-border bg-primary text-primary-foreground">
                      <th
                        scope="col"
                        className="w-[22%] cursor-pointer select-none px-3 py-3 text-right font-semibold sm:w-auto sm:px-4"
                        onClick={() => {
                          setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                          setPage(1);
                        }}
                      >
                        <span className="flex items-center gap-1">
                          التاريخ{" "}
                          <span className="text-muted-foreground">
                            {sortDir === "desc" ? "↓" : "↑"}
                          </span>
                        </span>
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right font-semibold sm:px-4"
                      >
                        الموظف
                      </th>
                      <th
                        scope="col"
                        className="w-[18%] px-3 py-3 text-left font-semibold tabular-nums text-warning sm:px-4"
                      >
                        سلفة
                      </th>
                      <th
                        scope="col"
                        className="w-[18%] px-3 py-3 text-left font-semibold tabular-nums text-success sm:px-4"
                      >
                        سداد
                      </th>
                      <th
                        scope="col"
                        className="hidden w-[18%] px-4 py-3 text-left font-semibold tabular-nums text-destructive sm:table-cell"
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
                          if (e.key === "Enter" || e.key === " ")
                            selectRow(row);
                        }}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          editingId === row.id &&
                            "bg-warning/10 ring-1 ring-warning/30",
                        )}
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-[11px] text-muted-foreground sm:px-4 sm:text-xs">
                          {fmtDate(row.txDate)}
                        </td>
                        <td className="px-3 py-3 sm:px-4">
                          <div className="truncate text-sm font-medium text-foreground">
                            {row.employee ?? "—"}
                          </div>
                          {row.notes && row.notes !== row.employee && (
                            <div className="truncate text-[10px] text-muted-foreground">
                              {row.notes}
                            </div>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-left tabular-nums text-sm sm:px-4",
                            row.advance
                              ? "font-medium text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.advance ? fmt(row.advance) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-left tabular-nums text-sm sm:px-4",
                            row.repayment
                              ? "font-medium text-success"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.repayment ? fmt(row.repayment) : "—"}
                        </td>
                        <td
                          className={cn(
                            "hidden px-4 py-3 text-left tabular-nums text-xs sm:table-cell",
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
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
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
      </div>
    </AccountingShell>
  );
}
