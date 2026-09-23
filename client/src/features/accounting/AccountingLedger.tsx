import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { fmt, todayIso } from "./accountingFormat";
import { AccountingPage } from "./AccountingPagePrimitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const summaryButtons = [
  "إجمالي السلف",
  "إجمالي القرض",
  "د_السعدني",
  "إجمالي شامل",
] as const;
type SummaryDialog = (typeof summaryButtons)[number] | null;
const orangeLinks = [
  ["الخزنة", "/accounting/cashbook"],
  ["السلف", "/accounting/advances"],
  ["القرض", "/accounting/loans"],
] as const;
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [summaryDialog, setSummaryDialog] = useState<SummaryDialog>(null);
  const summaryQ = trpc.accounting.accLedgerSummary.useQuery(
    {},
    { refetchOnWindowFocus: false },
  );
  const dashboardQ = (trpc as any).accounting.dashboardSummary.useQuery(
    { sectionCode: 15, date: todayIso() },
    { refetchOnWindowFocus: false },
  );
  const navigatorQ = trpc.accounting.accLedgerNavigator.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const reportsQ = trpc.accounting.accReports.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: summaryDialog !== null,
  });
  const employeesQ = trpc.accounting.accEmployeesList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const addMut = trpc.accounting.addAccEntry.useMutation();
  const updateMut = trpc.accounting.updateAccEntry.useMutation();
  const deleteMut = trpc.accounting.deleteAccEntry.useMutation();
  const recalcMut = trpc.accounting.recalcAccLedgerBalances.useMutation({
    onSuccess: () => utils.accounting.accLedgerSummary.invalidate(),
  });
  const currentBalance = summaryQ.data?.currentBalance ?? 0;
  const rows = navigatorQ.data ?? [];
  const selectedIndex =
    selectedId === null ? -1 : rows.findIndex((row) => row.id === selectedId);
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
    setDateText(toDisplayDate(todayIso()));
    setIncome("");
    setExpense("");
    setNotes("");
    setExtraNotes("");
    setSaved(false);
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
    const txDate = toIsoDate(dateText);
    if (!txDate || (!Number(income) && !Number(expense))) return;
    const payload = {
      txDate,
      income: Number(income) || 0,
      expense: Number(expense) || 0,
      notes: notes.trim(),
      remarks: extraNotes.trim(),
    };
    if (selectedId === null) {
      await addMut.mutateAsync(payload);
      reset();
    } else {
      await updateMut.mutateAsync({ id: selectedId, ...payload });
    }
    await invalidate();
    setSaved(true);
  };
  const remove = async () => {
    if (selectedId === null || !window.confirm("حذف القيد الحالي؟")) return;
    await deleteMut.mutateAsync({ id: selectedId });
    reset();
    await invalidate();
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
    "h-14 w-full border-[3px] border-foreground/45 bg-card px-3 text-right text-xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass =
    "flex h-14 items-center justify-center border-2 border-foreground/35 bg-muted px-3 text-2xl font-black text-foreground whitespace-nowrap";
  const summaryCards =
    summaryDialog === "إجمالي السلف"
      ? [
          {
            label: "إجمالي السلف",
            value: (reportsQ.data?.advances ?? []).reduce(
              (sum, row) => sum + row.totalAdvance,
              0,
            ),
          },
          {
            label: "إجمالي المسدد",
            value: (reportsQ.data?.advances ?? []).reduce(
              (sum, row) => sum + row.totalRepaid,
              0,
            ),
          },
          {
            label: "المتبقي",
            value: (reportsQ.data?.advances ?? []).reduce(
              (sum, row) => sum + row.remaining,
              0,
            ),
          },
        ]
      : summaryDialog === "إجمالي القرض"
        ? [
            {
              label: "إجمالي القرض",
              value: (reportsQ.data?.loans ?? []).reduce(
                (sum, row) => sum + row.totalLoan,
                0,
              ),
            },
            {
              label: "إجمالي المسدد",
              value: (reportsQ.data?.loans ?? []).reduce(
                (sum, row) => sum + row.totalPaid,
                0,
              ),
            },
            {
              label: "المتبقي",
              value: (reportsQ.data?.loans ?? []).reduce(
                (sum, row) => sum + row.remaining,
                0,
              ),
            },
          ]
        : summaryDialog === "د_السعدني"
          ? [
              {
                label: "المسحوبات",
                value: reportsQ.data?.saadany.totalWithdrawals ?? 0,
              },
              {
                label: "المسدد",
                value: reportsQ.data?.saadany.totalRepaid ?? 0,
              },
              {
                label: "المتبقي",
                value: reportsQ.data?.saadany.remaining ?? 0,
              },
            ]
          : [
              {
                label: "إجمالي الإيراد",
                value: summaryQ.data?.totalIncome ?? 0,
              },
              {
                label: "إجمالي المصروف",
                value: summaryQ.data?.totalExpense ?? 0,
              },
              { label: "رصيد الخزنة", value: currentBalance },
            ];
  return (
    <AccountingPage>
      <section
        dir="rtl"
        className="mx-auto max-w-7xl rounded-2xl border border-border bg-background p-5 text-foreground shadow-sm sm:p-10"
      >
        <div
          className="grid gap-8 xl:grid-cols-[13rem_minmax(0,1fr)_9rem]"
          dir="ltr"
        >
          <aside dir="rtl" className="grid content-start gap-4">
            <button
              type="button"
              onClick={() => recalcMut.mutate()}
              disabled={recalcMut.isPending}
              className="h-14 rounded-md border-2 border-green-700 bg-gradient-to-b from-green-100 to-green-300 text-xl font-black text-black disabled:opacity-60"
            >
              تحديث الأرصدة
            </button>
            <div className="mt-12 grid gap-6">
              {summaryButtons.map((label) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setSummaryDialog(label)}
                  className="rounded-lg border-4 border-cyan-950 bg-sky-800 px-3 py-3 text-center text-xl font-black text-white hover:bg-sky-700"
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>
          <form
            dir="rtl"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className="grid content-start gap-5"
          >
            <div className="grid items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_10rem]">
              <span className="text-3xl font-black">الرصيد الحالي</span>
              <output className="h-14 border-2 border-foreground/35 bg-card px-4 py-2 text-center text-3xl font-black">
                {fmt(currentBalance)}
              </output>
              <output
                aria-label="رقم القيد"
                className="h-14 border-2 border-foreground/35 bg-card px-2 py-2 text-center text-3xl font-black tabular-nums"
              >
                {selectedId ?? "جديد"}
              </output>
            </div>
            <div className="grid items-center justify-self-center gap-2 sm:grid-cols-[auto_18rem]">
              <span className={labelClass}>الإجمالي</span>
              <output className="h-14 border-2 border-destructive/50 bg-destructive/10 px-4 py-2 text-center text-3xl font-black text-destructive">
                {fmt(
                  selectedIndex >= 0
                    ? rows[selectedIndex].total
                    : currentBalance +
                        (Number(income) || 0) -
                        (Number(expense) || 0),
                )}
              </output>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={labelClass}>الإيراد</span>
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  value={income}
                  onChange={(event) => {
                    setIncome(event.target.value);
                    setSaved(false);
                  }}
                />
              </label>
              <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={labelClass}>المصروف</span>
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  value={expense}
                  onChange={(event) => {
                    setExpense(event.target.value);
                    setSaved(false);
                  }}
                />
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={labelClass}>التاريخ</span>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  placeholder="DD/MM/YYYY"
                  value={dateText}
                  onChange={(event) => {
                    setDateText(event.target.value);
                    setSaved(false);
                  }}
                />
              </label>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
                <span className={labelClass}>الرصيد</span>
                <output className="h-14 border-2 border-foreground/35 bg-card px-3 py-2 text-center text-xl font-black">
                  {fmt((Number(income) || 0) - (Number(expense) || 0))}
                </output>
              </div>
            </div>
            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center">
              <span className={labelClass}>البيان</span>
              <span>
                <input
                  list="ledger-employees"
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
                <input
                  className={fieldClass}
                  value={extraNotes}
                  onChange={(event) => {
                    setExtraNotes(event.target.value);
                    setSaved(false);
                  }}
                />
              </label>
            )}
            <div className="mt-1 flex flex-wrap justify-between gap-3">
              {navigationButtons.map(([label, onClick]) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="rounded-md bg-muted px-5 py-3 text-xl font-black text-foreground hover:bg-muted/70"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="rounded-md border-2 border-foreground/35 bg-card px-6 py-3 text-xl font-black text-foreground"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md bg-yellow-300 px-6 py-3 text-xl font-black text-black"
              >
                جديد
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={selectedId === null || deleteMut.isPending}
                className="rounded-md bg-red-600 px-6 py-3 text-xl font-black text-white disabled:opacity-50"
              >
                حذف
              </button>
              <button
                type="submit"
                disabled={
                  addMut.isPending ||
                  updateMut.isPending ||
                  !toIsoDate(dateText) ||
                  (!Number(income) && !Number(expense))
                }
                className="rounded-md bg-green-600 px-6 py-3 text-xl font-black text-white disabled:opacity-50"
              >
                {saved ? "تم الحفظ" : "حفظ"}
              </button>
            </div>
          </form>
          <aside dir="rtl" className="grid content-start gap-4">
            <div dir="rtl" className="grid justify-items-stretch gap-1.5">
              <div
                dir="rtl"
                className="w-fit justify-self-end rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-right"
              >
                <span className="text-[11px] font-bold text-muted-foreground">
                  إيصالات اليوم:{" "}
                </span>
                <span
                  dir="rtl"
                  className="inline-block text-sm font-black tabular-nums text-primary"
                >
                  {dashboardQ.isLoading
                    ? "…"
                    : fmt(dashboardQ.data?.totalReceiptsToday ?? 0)}
                </span>
              </div>
              <div
                dir="rtl"
                className="w-fit justify-self-end rounded-md border border-success/35 bg-success/10 px-2 py-1 text-right"
              >
                <span className="text-[11px] font-bold text-muted-foreground">
                  إيراد اليوم:{" "}
                </span>
                <span
                  dir="rtl"
                  className="inline-block text-sm font-black tabular-nums text-success"
                >
                  {dashboardQ.isLoading
                    ? "…"
                    : fmt(dashboardQ.data?.totalRevenueToday ?? 0)}
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-5">
              {orangeLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="border-4 border-orange-950 bg-orange-500 px-3 py-3 text-center text-2xl font-black text-black hover:bg-orange-400"
                >
                  {label}
                </a>
              ))}
            </div>
          </aside>
        </div>
      </section>
      <Dialog
        open={summaryDialog !== null}
        onOpenChange={(open) => !open && setSummaryDialog(null)}
      >
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl">
              {summaryDialog}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-muted/40 p-4 text-center"
              >
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-black tabular-nums">
                  {reportsQ.isLoading ? "…" : fmt(card.value)}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AccountingPage>
  );
}
