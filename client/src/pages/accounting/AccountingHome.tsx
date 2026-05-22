import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect, Fragment } from "react";
import {
  ArrowUpRight,
  Banknote,
  BookOpen,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  Loader,
  Loader2,
  Pencil,
  ReceiptText,
  RefreshCw,
  Scissors,
  Smartphone,
  Stethoscope,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Link } from "wouter";
import AccountingShell from "./AccountingShell";
import { cn } from "@/lib/utils";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";

const quickLinkGroups = [
  [
    {
      label: "الخزنة — قيود",
      href: "/accounting/ledger",
      icon: BookOpen,
      desc: "إضافة وتعديل قيود الخزنة",
    },
    {
      label: "الخزنة — رصيد",
      href: "/accounting/cashbook",
      icon: Wallet,
      desc: "حركة الخزنة والرصيد الحالي",
    },
    {
      label: "كشف السلف",
      href: "/accounting/advances",
      icon: CreditCard,
      desc: "سلف الموظفين وحركات السداد",
    },
    {
      label: "القروض",
      href: "/accounting/loans",
      icon: FileText,
      desc: "متابعة القروض والسداد",
    },
  ],
  [
    {
      label: "الإيراد اليومي",
      href: "/accounting/daily-revenue",
      icon: Banknote,
      desc: "مراجعة الإيراد حسب اليوم",
    },
    {
      label: "إيراد الخدمات",
      href: "/accounting/service-revenue",
      icon: TrendingUp,
      desc: "تقرير إيراد الخدمات",
    },
    {
      label: "بحث الإيصالات",
      href: "/accounting/receipts",
      icon: ReceiptText,
      desc: "البحث بالرقم أو الكود",
    },
    {
      label: "الخدمات",
      href: "/accounting/services",
      icon: Scissors,
      desc: "قائمة الخدمات",
    },
  ],
  [
    {
      label: "بحث المرضى",
      href: "/accounting/patients",
      icon: Users,
      desc: "البحث عن المريض والإيصالات",
    },
    {
      label: "حساب مريض",
      href: "/accounting/patient",
      icon: UserRound,
      desc: "فتح حساب مريض مباشرة",
    },
    {
      label: "حساب طبيب",
      href: "/accounting/doctor",
      icon: Stethoscope,
      desc: "فتح حساب طبيب مباشرة",
    },
  ],
  [
    {
      label: "رصيد البيت",
      href: "/accounting/home-fund",
      icon: Home,
      desc: "متابعة حساب البيت",
    },
    {
      label: "رصيد انستاباي",
      href: "/accounting/instapay",
      icon: Smartphone,
      desc: "متابعة حساب انستاباي",
    },
    {
      label: "د. السعدني",
      href: "/accounting/dr-saadany",
      icon: UserRound,
      desc: "متابعة حساب الدكتور",
    },
  ],
];

function formatTime(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "م" : "ص";
  return `${String(h % 12 || 12).padStart(2, "0")}:${m} ${period}`;
}

export default function AccountingHome() {
  const [viewDate, setViewDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const today = new Date().toISOString().split("T")[0];
  const isToday = viewDate === today;

  const summaryQuery = trpc.accounting.dashboardSummary.useQuery(
    { sectionCode: 15, date: viewDate },
    { refetchOnWindowFocus: true },
  );
  const cashbookSummaryQuery = trpc.accounting.accLedgerSummary.useQuery(
    {},
    { refetchOnWindowFocus: true },
  );

  const activityQuery = trpc.accounting.transactions.useQuery(
    { sectionCode: 15, limit: 50, date: viewDate },
    { refetchInterval: isToday ? 60_000 : false, refetchOnWindowFocus: true },
  );

  const categoriesQ = trpc.accounting.accCategories.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const addMut = trpc.accounting.addAccEntry.useMutation();
  const utils = trpc.useUtils();

  const [txDate, setTxDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<"cashbook" | "service">("cashbook");
  const [moreQuickLinksOpen, setMoreQuickLinksOpen] = useState(false);
  const [servicePat, setServicePat] = useState("");
  const [serviceDocCode, setServiceDocCode] = useState("");
  const [serviceLines, setServiceLines] = useState([{ svcCode: "", qty: "1", discount: "", price: "" }]);
  const [serviceSaved, setServiceSaved] = useState(false);
  const [deletingTrNo, setDeletingTrNo] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<{
    trNo: string;
    patientCode: string;
    paidAmount: string;
    discount: string;
  } | null>(null);
  const [activityEverVisible, setActivityEverVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setActivityEverVisible(true));
  }, []);

  const catalogQ = trpc.accounting.serviceEntryCatalog.useQuery(undefined, {
    enabled: activeTab === "service",
    refetchOnWindowFocus: false,
  });
  const servicePatLookup = trpc.accounting.patientNameLookup.useQuery(
    { patientCode: servicePat.trim() },
    {
      enabled: activeTab === "service" && servicePat.trim().length > 0,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
  const addServicesMut = trpc.accounting.addPatientServices.useMutation({
    onSuccess: async () => {
      await Promise.all([
        summaryQuery.refetch(),
        activityQuery.refetch(),
        utils.accounting.lasikServices.invalidate(),
        utils.accounting.patientLasikSummary.invalidate(),
        utils.accounting.serviceRevenue.invalidate(),
      ]);
      setServicePat("");
      setServiceDocCode("");
      setServiceLines([{ svcCode: "", qty: "1", discount: "", price: "" }]);
      setServiceSaved(true);
      setTimeout(() => setServiceSaved(false), 2000);
    },
  });

  const deleteReceiptMut = trpc.accounting.deleteReceipt.useMutation({
    onSuccess: async () => {
      setDeletingTrNo(null);
      await Promise.all([summaryQuery.refetch(), activityQuery.refetch()]);
    },
  });
  const updateReceiptMut = trpc.accounting.updateReceipt.useMutation({
    onSuccess: async () => {
      setEditingReceipt(null);
      await activityQuery.refetch();
    },
  });

  const catalogServices = useMemo(() => catalogQ.data?.services ?? [], [catalogQ.data]);
  const catalogDoctors = useMemo(() => catalogQ.data?.doctors ?? [], [catalogQ.data]);
  const canSaveService = useMemo(
    () =>
      servicePat.trim().length > 0 &&
      serviceLines.some((l) => l.svcCode.trim()) &&
      !addServicesMut.isPending,
    [servicePat, serviceLines, addServicesMut.isPending],
  );

  function updateServiceLine(idx: number, patch: Partial<{ svcCode: string; qty: string; discount: string; price: string }>) {
    setServiceLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleQuickAddService() {
    if (!canSaveService) return;
    const lines = serviceLines
      .filter((l) => l.svcCode.trim())
      .map((l) => ({
        serviceCode: l.svcCode.trim(),
        serviceName: catalogServices.find((s) => s.code === l.svcCode)?.name ?? "",
        quantity: Math.max(1, Math.trunc(Number(l.qty) || 1)),
        discount: l.discount !== "" ? parseFloat(l.discount) : undefined,
        price: l.price !== "" ? parseFloat(l.price) : undefined,
      }));
    await addServicesMut.mutateAsync({
      patientCode: servicePat.trim(),
      doctorCode: serviceDocCode || undefined,
      doctorName: catalogDoctors.find((d) => d.code === serviceDocCode)?.name,
      lines,
    });
  }

  async function handleQuickAdd() {
    if ((!income && !expense) || !txDate) return;
    await addMut.mutateAsync({
      txDate,
      income: parseFloat(income) || 0,
      expense: parseFloat(expense) || 0,
      notes: notes.trim(),
    });
    utils.accounting.accLedger.invalidate();
    utils.accounting.accLedgerSummary.invalidate();
    utils.accounting.accHomeLedger.invalidate();
    void cashbookSummaryQuery.refetch();
    setIncome("");
    setExpense("");
    setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const s = summaryQuery.data;
  const cashbook = cashbookSummaryQuery.data;
  const receipts = useMemo(() => activityQuery.data ?? [], [activityQuery.data]);
  const cats = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const hasSummaryError = summaryQuery.isError || cashbookSummaryQuery.isError;
  const refreshSummary = useMemo(
    () => () => {
      void summaryQuery.refetch();
      void cashbookSummaryQuery.refetch();
    },
    [summaryQuery, cashbookSummaryQuery],
  );

  return (
    <AccountingShell>
      <div dir="rtl" className="space-y-4">
        <section
          className="rounded-lg border border-border bg-background p-4 lg:p-5"
          dir="rtl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {isToday ? "مؤشرات اليوم" : "مؤشرات اليوم المحدد"}
                </div>
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setViewDate(today)}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                  >
                    اليوم
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="date"
                  aria-label="تاريخ العرض"
                  value={viewDate}
                  max={today}
                  onChange={(e) => e.target.value && setViewDate(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                />
                {[
                  {
                    href: "/accounting/daily-revenue",
                    label: isToday ? "إيراد اليوم" : "إيراد اليوم المحدد",
                    val: summaryQuery.isLoading ? "..." : formatMoneyAr(s?.totalRevenueToday ?? 0),
                  },
                  {
                    href: "/accounting/receipts",
                    label: isToday ? "إيصالات اليوم" : "إيصالات اليوم المحدد",
                    val: summaryQuery.isLoading ? "..." : formatCountAr(s?.totalReceiptsToday ?? 0),
                  },
                  {
                    href: "/accounting/cashbook",
                    label: "رصيد الخزنة",
                    val: cashbookSummaryQuery.isLoading ? "..." : formatMoneyAr(cashbook?.currentBalance ?? 0),
                  },
                ].map((m) => (
                  <a
                    key={m.label}
                    href={m.href}
                    className="group hidden flex-col items-end gap-0.5 no-underline sm:flex"
                  >
                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-muted-foreground transition-colors">
                      {m.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums leading-none text-foreground">
                      {m.val}
                    </span>
                  </a>
                ))}
              </div>
            </div>
            <div className="flex gap-3 sm:hidden">
              {[
                {
                  href: "/accounting/daily-revenue",
                  label: isToday ? "إيراد اليوم" : "الإيراد",
                  val: summaryQuery.isLoading ? "..." : formatMoneyAr(s?.totalRevenueToday ?? 0),
                },
                {
                  href: "/accounting/receipts",
                  label: isToday ? "إيصالات اليوم" : "الإيصالات",
                  val: summaryQuery.isLoading ? "..." : formatCountAr(s?.totalReceiptsToday ?? 0),
                },
                {
                  href: "/accounting/cashbook",
                  label: "الخزنة",
                  val: cashbookSummaryQuery.isLoading ? "..." : formatMoneyAr(cashbook?.currentBalance ?? 0),
                },
              ].map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  className="group flex flex-col gap-0.5 no-underline"
                >
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-muted-foreground transition-colors">
                    {m.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums leading-none text-foreground">
                    {m.val}
                  </span>
                </a>
              ))}
            </div>
            <div className="h-px bg-muted" />
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("cashbook")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        activeTab === "cashbook"
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground hover:border-border",
                      )}
                    >
                      <Wallet className="h-3 w-3" />
                      قيد خزنة
                    </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("service")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    activeTab === "service"
                      ? "bg-primary text-primary-foreground"
                      : "border border-dashed border-ring/50 bg-background text-card-foreground hover:border-ring hover:bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none",
                      activeTab === "service"
                        ? "bg-background/20 text-card-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    +
                  </span>
                  خدمة
                </button>
              </div>
              {activeTab === "cashbook" && (
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      {
                        id: "qk-cb-date",
                        label: "التاريخ",
                        node: (
                          <input
                            id="qk-cb-date"
                            type="date"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          />
                        ),
                      },
                      {
                        id: "qk-cb-income",
                        label: "الإيراد",
                        node: (
                          <input
                            id="qk-cb-income"
                            type="number"
                            min="0"
                            step="0.01"
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm tabular-nums outline-none focus:border-success focus:ring-1 focus:ring-success/20"
                          />
                        ),
                      },
                      {
                        id: "qk-cb-expense",
                        label: "المصروف",
                        node: (
                          <input
                            id="qk-cb-expense"
                            type="number"
                            min="0"
                            step="0.01"
                            value={expense}
                            onChange={(e) => setExpense(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm tabular-nums outline-none focus:border-destructive/30 focus:ring-1 focus:ring-destructive/20"
                          />
                        ),
                      },
                      {
                        id: "qk-cb-notes",
                        label: "البيان",
                        node: (
                          <input
                            id="qk-cb-notes"
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            onFocus={() => setNotesFocused(true)}
                            onBlur={() => setNotesFocused(false)}
                            placeholder="اسم الموظف أو البيان..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          />
                        ),
                      },
                    ] as const
                  ).map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <label
                        htmlFor={row.id}
                        className="w-16 shrink-0 text-xs font-medium text-muted-foreground"
                      >
                        {row.label}
                      </label>
                      <div className="flex-1">{row.node}</div>
                    </div>
                  ))}
                  {cats.length > 0 && (notesFocused || notes.length > 0) && (
                    <div className="flex items-start gap-3">
                      <span className="w-16 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
                        التصنيف
                      </span>
                      <div className="flex flex-1 flex-wrap gap-1.5">
                        {cats.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={notes.trim() === c.name}
                            onClick={() =>
                              setNotes(notes.trim() === c.name ? "" : c.name)
                            }
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                              notes.trim() === c.name
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-border hover:bg-muted",
                            )}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-start pt-0.5">
                    <button
                      type="button"
                      onClick={handleQuickAdd}
                      disabled={
                        addMut.isPending || (!income && !expense) || !txDate
                      }
                      className={cn(
                        "rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors",
                        saved
                          ? "bg-success/10 text-success ring-1 ring-success/30"
                          : "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40",
                      )}
                    >
                      {saved ? "تم ✓" : "حفظ"}
                    </button>
                  </div>
                </div>
              )}
              {activeTab === "service" && (
                <div className="flex flex-col gap-1.5">
                  {/* Patient + Doctor (shared) */}
                  <div className="flex items-center gap-3">
                    <label htmlFor="qk-svc-pat" className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                      المريض
                    </label>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        id="qk-svc-pat"
                        type="text"
                        value={servicePat}
                        onChange={(e) => setServicePat(e.target.value)}
                        placeholder="كود المريض"
                        dir="ltr"
                        className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                      />
                      {servicePat.trim().length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {servicePatLookup.isFetching
                            ? "..."
                            : servicePatLookup.data?.patientName ?? "غير موجود"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="qk-svc-doctor" className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                      الدكتور
                    </label>
                    <select
                      id="qk-svc-doctor"
                      value={serviceDocCode}
                      onChange={(e) => setServiceDocCode(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                    >
                      <option value="">بدون</option>
                      {catalogDoctors.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Service lines */}
                  <div className="flex flex-col gap-1">
                    {serviceLines.map((line, idx) => {
                      const info = catalogServices.find((s) => s.code === line.svcCode);
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          <select
                            aria-label={`الخدمة ${idx + 1}`}
                            value={line.svcCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              const svcInfo = catalogServices.find((s) => s.code === code);
                              updateServiceLine(idx, {
                                svcCode: code,
                                price: svcInfo && line.price === "" ? String(svcInfo.price ?? "") : line.price,
                              });
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          >
                            <option value="">الخدمة</option>
                            {catalogServices.map((svc) => (
                              <option key={svc.code} value={svc.code}>
                                {svc.code} - {svc.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label="السعر"
                            value={line.price}
                            onChange={(e) => updateServiceLine(idx, { price: e.target.value })}
                            placeholder={info ? String(info.price ?? "سعر") : "سعر"}
                            className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            aria-label="العدد"
                            value={line.qty}
                            onChange={(e) => updateServiceLine(idx, { qty: e.target.value })}
                            className="w-14 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label="الخصم"
                            value={line.discount}
                            onChange={(e) => updateServiceLine(idx, { discount: e.target.value })}
                            placeholder="خصم"
                            className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-warning focus:ring-1 focus:ring-warning/20"
                          />
                          {serviceLines.length > 1 && (
                            <button
                              type="button"
                              aria-label="حذف السطر"
                              onClick={() => setServiceLines((prev) => prev.filter((_, i) => i !== idx))}
                              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setServiceLines((prev) => [...prev, { svcCode: "", qty: "1", discount: "", price: "" }])}
                    className="self-start rounded-full border border-dashed border-ring/30 px-3 py-0.5 text-xs font-medium text-card-foreground hover:border-ring hover:bg-primary/5"
                  >
                    + خدمة
                  </button>
                  {(() => {
                    const filled = serviceLines.filter((l) => l.svcCode.trim());
                    if (filled.length === 0) return null;
                    let gross = 0;
                    let disc = 0;
                    for (const l of filled) {
                      const info = catalogServices.find((s) => s.code === l.svcCode);
                      const price = l.price !== "" ? parseFloat(l.price) : (info?.price ?? 0);
                      const qty = Math.max(1, Math.trunc(Number(l.qty) || 1));
                      gross += (Number.isFinite(price) ? price : 0) * qty;
                      disc += l.discount !== "" && Number.isFinite(parseFloat(l.discount)) ? parseFloat(l.discount) : 0;
                    }
                    const net = Math.max(0, gross - disc);
                    return (
                      <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2 text-xs">
                        <span className="text-muted-foreground">ما يخص المريض</span>
                        <span className="font-semibold tabular-nums text-foreground">{formatMoneyAr(gross)}</span>
                        {disc > 0 && (
                          <>
                            <span className="text-muted-foreground">خصم</span>
                            <span className="tabular-nums text-warning">{formatMoneyAr(disc)}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">الإجمالي</span>
                        <span className="font-bold tabular-nums text-success">{formatMoneyAr(net)}</span>
                      </div>
                    );
                  })()}
                  {addServicesMut.error && (
                    <p className="text-xs text-destructive">{addServicesMut.error.message}</p>
                  )}
                  <div className="flex justify-start pt-0.5">
                    <button
                      type="button"
                      onClick={handleQuickAddService}
                      disabled={!canSaveService}
                      className={cn(
                        "rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors",
                        serviceSaved
                          ? "bg-success/10 text-success ring-1 ring-success/30"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40",
                      )}
                    >
                      {serviceSaved ? "تم ✓" : "حفظ"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-4 lg:p-5">
          <button
            type="button"
            onClick={() => setMoreQuickLinksOpen((v) => !v)}
            aria-expanded={moreQuickLinksOpen}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            <span>المسارات السريعة</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                moreQuickLinksOpen && "rotate-180",
              )}
            />
          </button>
          {moreQuickLinksOpen ? (
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
              {quickLinkGroups
                .flatMap((group) => group)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex flex-col gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 px-2.5 py-2.5 transition-colors hover:bg-primary/70 sm:gap-2 sm:px-3 sm:py-3"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground ring-1 ring-primary/30 sm:h-8 sm:w-8">
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="truncate text-xs font-semibold text-primary sm:text-sm">
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
            </div>
          ) : null}
        </section>

        {activityEverVisible && (
          <section className="w-full overflow-hidden rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isToday ? "حركات اليوم" : `حركات ${viewDate}`}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                إيصالات ودفعيات القسم 15{isToday ? "" : ` — ${viewDate}`}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activityQuery.isFetching && !activityQuery.isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
              <span className="rounded-full bg-muted text-muted-foreground">
                {activityQuery.isLoading
                  ? "..."
                  : formatCountAr(receipts.length)}
              </span>
            </div>
          </div>

          {activityQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              جاري التحميل...
            </div>
          ) : activityQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
              <span>تعذر تحميل الحركات</span>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => activityQuery.refetch()}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <span>لا توجد حركات مسجلة اليوم</span>
              <span className="text-xs text-muted-foreground">
                ستظهر الإيصالات هنا تلقائيًا عندما يبدأ القسم بالحركة
              </span>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:hidden">
                {receipts.map((r) => {
                  const href = `/accounting/receipts/${r.sectionCode}/${r.trTy}/${r.trNo}`;
                  const remaining = r.total - r.discount - r.paidValue;
                  const balanceTone =
                    remaining > 0
                      ? "bg-warning/10 text-warning ring-warning/15"
                      : "bg-success/10 text-success ring-success/20";
                  const isDeleting = deletingTrNo === r.trNo;
                  const isEditing = editingReceipt?.trNo === r.trNo;
                  return (
                    <div
                      key={`${r.trTy}-${r.trNo}`}
                      className={cn(
                        "rounded-2xl border bg-background p-4 shadow-sm",
                        isDeleting ? "border-destructive/30 bg-destructive/10" : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link href={href} className="min-w-0 flex-1 no-underline">
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] font-medium text-muted-foreground">
                              {formatTime(r.transactionDate)}
                            </div>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              إيصال
                            </span>
                          </div>
                          <div className="mt-1 text-base font-semibold leading-snug text-foreground">
                            {r.patientName || "—"}
                          </div>
                        </Link>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                            balanceTone,
                          )}
                        >
                          {r.trNo}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-muted px-3 py-2">
                          <div className="text-[10px] text-muted-foreground">الكود</div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {r.patientCode || "—"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-muted px-3 py-2">
                          <div className="text-[10px] text-muted-foreground">ما يخص المريض</div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(r.total)}
                          </div>
                        </div>
                        <div className="col-span-2 rounded-xl bg-success/10 px-3 py-2">
                          <div className="text-[10px] text-success">المدفوع</div>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <div className="font-semibold tabular-nums text-success">
                              {formatMoneyAr(r.paidValue)}
                            </div>
                            <div
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1",
                                balanceTone,
                              )}
                            >
                              {remaining > 0 ? "متبقي" : "مسدد"}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isEditing && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!editingReceipt) return;
                            await updateReceiptMut.mutateAsync({
                              patientCode: editingReceipt.patientCode,
                              trNo: Number(editingReceipt.trNo),
                              paidAmount: editingReceipt.paidAmount !== "" ? parseFloat(editingReceipt.paidAmount) : undefined,
                              discount: editingReceipt.discount !== "" ? parseFloat(editingReceipt.discount) : undefined,
                            });
                          }}
                          className="mt-3 flex flex-wrap gap-2 border-t border-primary/20 pt-3"
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground">المدفوع</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={editingReceipt?.paidAmount ?? ""}
                              onChange={(e) => setEditingReceipt((p) => p ? { ...p, paidAmount: e.target.value } : null)}
                              className="w-28 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground">الخصم</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={editingReceipt?.discount ?? ""}
                              onChange={(e) => setEditingReceipt((p) => p ? { ...p, discount: e.target.value } : null)}
                              className="w-24 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring"
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <button type="submit" disabled={updateReceiptMut.isPending}
                              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                              {updateReceiptMut.isPending ? "..." : "حفظ"}
                            </button>
                            <button type="button" onClick={() => setEditingReceipt(null)}
                              className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
                              إلغاء
                            </button>
                          </div>
                        </form>
                      )}
                      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                        {isDeleting ? (
                          <>
                            <button
                              type="button"
                              disabled={deleteReceiptMut.isPending}
                              onClick={() => deleteReceiptMut.mutate({ patientCode: r.patientCode, trNo: Number(r.trNo) })}
                              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive disabled:opacity-50"
                            >
                              {deleteReceiptMut.isPending ? "..." : "تأكيد الحذف"}
                            </button>
                            <button type="button" onClick={() => setDeletingTrNo(null)}
                              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                              إلغاء
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingReceipt(isEditing ? null : { trNo: r.trNo, patientCode: r.patientCode, paidAmount: String(r.paidValue ?? ""), discount: String(r.discount ?? "") })}
                              className={cn("rounded-full p-1.5 transition-colors", isEditing ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted text-muted-foreground")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setDeletingTrNo(r.trNo)}
                              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-2xl border border-border bg-muted p-4 text-xs font-semibold text-muted-foreground">
                  {formatCountAr(receipts.length)} إيصال
                </div>
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                      <th scope="col" className="w-20 px-3 py-2.5 text-right">
                        الوقت
                      </th>
                      <th scope="col" className="w-24 px-3 py-2.5 text-right">
                        الإيصال
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        المريض
                      </th>
                      <th
                        scope="col"
                        className="hidden w-20 px-3 py-2.5 text-right sm:table-cell"
                      >
                        الكود
                      </th>
                      <th
                        scope="col"
                        className="hidden w-28 px-3 py-2.5 text-left sm:table-cell"
                        dir="ltr"
                      >
                        ما يخص المريض
                      </th>
                      <th
                        scope="col"
                        className="w-28 px-3 py-2.5 text-left"
                        dir="ltr"
                      >
                        المدفوع
                      </th>
                      <th scope="col" className="w-32 px-3 py-2.5 text-center">
                        إجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {receipts.map((r) => {
                      const remaining = r.total - r.discount - r.paidValue;
                      const href = `/accounting/receipts/${r.sectionCode}/${r.trTy}/${r.trNo}`;
                      const isDeleting = deletingTrNo === r.trNo;
                      const isEditing = editingReceipt?.trNo === r.trNo;
                      return (
                        <Fragment key={`${r.trTy}-${r.trNo}`}>
                          <tr
                            className={cn(
                              "transition-colors hover:bg-muted",
                              isDeleting && "bg-destructive/10",
                              isEditing && "bg-primary/40",
                            )}
                          >
                            <td
                              className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground"
                              dir="ltr"
                            >
                              {formatTime(r.transactionDate)}
                            </td>
                            <td
                              className="px-3 py-2 font-semibold tabular-nums text-foreground"
                              dir="ltr"
                            >
                              {r.trNo}
                            </td>
                            <td className="truncate px-3 py-2 text-foreground">
                              {r.patientName || "—"}
                            </td>
                            <td
                              className="hidden px-3 py-2 tabular-nums text-muted-foreground sm:table-cell"
                              dir="ltr"
                            >
                              {r.patientCode || "—"}
                            </td>
                            <td
                              className={cn(
                                "hidden px-3 py-2 tabular-nums sm:table-cell",
                                remaining > 0 && "font-semibold text-foreground",
                              )}
                              dir="ltr"
                            >
                              {formatMoneyAr(r.total)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 tabular-nums font-medium",
                                remaining <= 0 ? "text-success" : "text-warning",
                              )}
                              dir="ltr"
                            >
                              {formatMoneyAr(r.paidValue)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {!isDeleting && (
                                  <Link
                                    href={href}
                                    aria-label={`فتح الإيصال ${r.trNo}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-card-foreground transition-colors hover:border-ring/30 hover:bg-primary/5"
                                  >
                                    عرض
                                    <ArrowUpRight className="h-3 w-3" />
                                  </Link>
                                )}
                                {!isDeleting && (
                                  <button
                                    type="button"
                                    title="تعديل"
                                    onClick={() =>
                                      setEditingReceipt(
                                        isEditing
                                          ? null
                                          : {
                                              trNo: r.trNo,
                                              patientCode: r.patientCode,
                                              paidAmount: String(r.paidValue ?? ""),
                                              discount: String(r.discount ?? ""),
                                            },
                                      )
                                    }
                                    className={cn(
                                      "rounded-full p-1.5 transition-colors",
                                      isEditing
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted text-muted-foreground",
                                    )}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                                {isDeleting ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={deleteReceiptMut.isPending}
                                      onClick={() =>
                                        deleteReceiptMut.mutate({
                                          patientCode: r.patientCode,
                                          trNo: Number(r.trNo),
                                        })
                                      }
                                      className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive disabled:opacity-50"
                                    >
                                      {deleteReceiptMut.isPending ? "..." : "تأكيد"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingTrNo(null)}
                                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted text-muted-foreground"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    title="حذف"
                                    onClick={() => setDeletingTrNo(r.trNo)}
                                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isEditing && (
                            <tr className="bg-primary/50">
                              <td colSpan={7} className="px-4 py-3">
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!editingReceipt) return;
                                    await updateReceiptMut.mutateAsync({
                                      patientCode: editingReceipt.patientCode,
                                      trNo: Number(editingReceipt.trNo),
                                      paidAmount: editingReceipt.paidAmount !== "" ? parseFloat(editingReceipt.paidAmount) : undefined,
                                      discount: editingReceipt.discount !== "" ? parseFloat(editingReceipt.discount) : undefined,
                                    });
                                  }}
                                  className="flex flex-wrap items-center gap-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-muted-foreground">المدفوع</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editingReceipt?.paidAmount ?? ""}
                                      onChange={(e) =>
                                        setEditingReceipt((prev) =>
                                          prev ? { ...prev, paidAmount: e.target.value } : null,
                                        )
                                      }
                                      className="w-28 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-muted-foreground">الخصم</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editingReceipt?.discount ?? ""}
                                      onChange={(e) =>
                                        setEditingReceipt((prev) =>
                                          prev ? { ...prev, discount: e.target.value } : null,
                                        )
                                      }
                                      className="w-24 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                                    />
                                  </div>
                                  {updateReceiptMut.error && (
                                    <span className="text-xs text-destructive">{updateReceiptMut.error.message}</span>
                                  )}
                                  <div className="flex gap-1.5">
                                    <button
                                      type="submit"
                                      disabled={updateReceiptMut.isPending}
                                      className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                      {updateReceiptMut.isPending ? "..." : "حفظ"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingReceipt(null)}
                                      className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/80">
                      <td
                        colSpan={3}
                        className="px-3 py-2.5 text-xs font-semibold text-muted-foreground"
                      >
                        {formatCountAr(receipts.length)} إيصال
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell" />
                      <td
                        className="hidden px-3 py-2.5 text-left tabular-nums font-bold text-foreground sm:table-cell"
                        dir="ltr"
                      >
                        {formatMoneyAr(
                          receipts.reduce((a, r) => a + r.total, 0),
                        )}
                      </td>
                      <td
                        className="px-3 py-2.5 text-left tabular-nums font-bold text-success"
                        dir="ltr"
                      >
                        {formatMoneyAr(
                          receipts.reduce((a, r) => a + r.paidValue, 0),
                        )}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>
        )}
      </div>
    </AccountingShell>
  );
}
