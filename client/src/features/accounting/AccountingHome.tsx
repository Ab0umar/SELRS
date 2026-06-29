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
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { formatMoneyAr, formatCountAr } from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";

function formatTime(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "م" : "ص";
  return `${String(h % 12 || 12).padStart(2, "0")}:${m} ${period}`;
}

export default function AccountingHome() {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  const [viewDate] = useState(
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
  const [servicePat, setServicePat] = useState("");
  const [serviceDocCode, setServiceDocCode] = useState("");
  const [serviceLines, setServiceLines] = useState([
    { svcCode: "", qty: "1", discount: "", price: "" },
  ]);
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
    refetchOnWindowFocus: false,
  });
  const servicePatLookup = trpc.accounting.patientNameLookup.useQuery(
    { patientCode: servicePat.trim() },
    {
      enabled: servicePat.trim().length > 0,
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

  const syncAccMut = trpc.accounting.triggerAccSync.useMutation();
  const pushAccMut = trpc.accounting.triggerAccPush.useMutation();
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    msg: string;
    log?: string;
  } | null>(null);

  const handleAccPush = async () => {
    setSyncResult(null);
    try {
      const result = await pushAccMut.mutateAsync();
      await Promise.all([
        cashbookSummaryQuery.refetch(),
        utils.accounting.accLedger.invalidate(),
        utils.accounting.accLedgerSummary.invalidate(),
      ]);
      setSyncResult({
        ok: true,
        msg: "تم الرفع للخزنة بنجاح",
        log: result?.log,
      });
    } catch (e: any) {
      setSyncResult({ ok: false, msg: "فشل الرفع للخزنة", log: e?.message });
    }
    setTimeout(() => setSyncResult(null), 4000);
  };

  const handleAccSync = async () => {
    setSyncResult(null);
    try {
      const result = await syncAccMut.mutateAsync();
      await Promise.all([
        cashbookSummaryQuery.refetch(),
        utils.accounting.accLedger.invalidate(),
        utils.accounting.accLedgerSummary.invalidate(),
      ]);
      setSyncResult({
        ok: true,
        msg: "تمت المزامنة بنجاح",
        log: result?.log,
      });
    } catch (e: any) {
      setSyncResult({
        ok: false,
        msg: "فشلت المزامنة",
        log: e?.message,
      });
    }
    setTimeout(() => setSyncResult(null), 4000);
  };

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

  const catalogServices = useMemo(
    () => catalogQ.data?.services ?? [],
    [catalogQ.data],
  );
  const catalogDoctors = useMemo(
    () => catalogQ.data?.doctors ?? [],
    [catalogQ.data],
  );
  const canSaveService = useMemo(
    () =>
      servicePat.trim().length > 0 &&
      serviceLines.some((l) => l.svcCode.trim()) &&
      !addServicesMut.isPending,
    [servicePat, serviceLines, addServicesMut.isPending],
  );

  function updateServiceLine(
    idx: number,
    patch: Partial<{
      svcCode: string;
      qty: string;
      discount: string;
      price: string;
    }>,
  ) {
    setServiceLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  }

  async function handleQuickAddService() {
    if (!canSaveService) return;
    const lines = serviceLines
      .filter((l) => l.svcCode.trim())
      .map((l) => ({
        serviceCode: l.svcCode.trim(),
        serviceName:
          catalogServices.find((s) => s.code === l.svcCode)?.name ?? "",
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

  const receipts = useMemo(
    () => activityQuery.data ?? [],
    [activityQuery.data],
  );
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
    <>
      <div dir="rtl" className="space-y-5">
        <section
          className="rounded-lg border border-border bg-background p-4 lg:p-5"
          dir="rtl"
        >
          <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAccSync}
                    disabled={syncAccMut.isPending}
                    className="mr-auto flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3 w-3",
                        syncAccMut.isPending && "animate-spin",
                      )}
                    />
                    {syncAccMut.isPending
                      ? "جارٍ المزامنة..."
                      : "مزامنة الخزنة"}
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAccPush}
                    disabled={pushAccMut.isPending}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3 w-3",
                        pushAccMut.isPending && "animate-spin",
                      )}
                    />
                    {pushAccMut.isPending ? "جارٍ الرفع..." : "رفع للخزنة"}
                  </button>
                )}
              </div>
              {syncResult && (
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      syncResult.ok ? "text-success" : "text-destructive",
                    )}
                  >
                    {syncResult.msg}
                  </p>
                  {syncResult.log ? (
                    <pre
                      dir="ltr"
                      className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-2 text-left text-[11px] text-muted-foreground"
                    >
                      {syncResult.log}
                    </pre>
                  ) : null}
                </div>
              )}
              <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start">
                <div className="flex-1 rounded-lg border border-border bg-background p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-foreground">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    قيد خزنة
                  </h3>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      {
                        id: "qk-cb-date",
                        label: "التاريخ",
                        node: (
                          <DateInput
                            id="qk-cb-date"
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
                              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
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
                </div>
                <div className="flex-1 rounded-lg border border-border bg-background p-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-foreground">
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                    خدمة
                  </h3>
                <div className="flex flex-col gap-1.5">
                  {/* Patient + Doctor (shared) */}
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="qk-svc-pat"
                      className="w-16 shrink-0 text-xs font-medium text-muted-foreground"
                    >
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
                            : (servicePatLookup.data?.patientName ??
                              "غير موجود")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="qk-svc-doctor"
                      className="w-16 shrink-0 text-xs font-medium text-muted-foreground"
                    >
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
                      const info = catalogServices.find(
                        (s) => s.code === line.svcCode,
                      );
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          <select
                            aria-label={`الخدمة ${idx + 1}`}
                            value={line.svcCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              const svcInfo = catalogServices.find(
                                (s) => s.code === code,
                              );
                              updateServiceLine(idx, {
                                svcCode: code,
                                price:
                                  svcInfo && line.price === ""
                                    ? String(svcInfo.price ?? "")
                                    : line.price,
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
                            onChange={(e) =>
                              updateServiceLine(idx, { price: e.target.value })
                            }
                            placeholder={
                              info ? String(info.price ?? "سعر") : "سعر"
                            }
                            className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            aria-label="العدد"
                            value={line.qty}
                            onChange={(e) =>
                              updateServiceLine(idx, { qty: e.target.value })
                            }
                            className="w-14 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label="الخصم"
                            value={line.discount}
                            onChange={(e) =>
                              updateServiceLine(idx, {
                                discount: e.target.value,
                              })
                            }
                            placeholder="خصم"
                            className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-warning focus:ring-1 focus:ring-warning/20"
                          />
                          {serviceLines.length > 1 && (
                            <button
                              type="button"
                              aria-label="حذف السطر"
                              onClick={() =>
                                setServiceLines((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
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
                    onClick={() =>
                      setServiceLines((prev) => [
                        ...prev,
                        { svcCode: "", qty: "1", discount: "", price: "" },
                      ])
                    }
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
                      const info = catalogServices.find(
                        (s) => s.code === l.svcCode,
                      );
                      const price =
                        l.price !== ""
                          ? parseFloat(l.price)
                          : (info?.price ?? 0);
                      const qty = Math.max(1, Math.trunc(Number(l.qty) || 1));
                      gross += (Number.isFinite(price) ? price : 0) * qty;
                      disc +=
                        l.discount !== "" &&
                        Number.isFinite(parseFloat(l.discount))
                          ? parseFloat(l.discount)
                          : 0;
                    }
                    const net = Math.max(0, gross - disc);
                    return (
                      <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2 text-xs">
                        <span className="text-muted-foreground">
                          ما يخص المريض
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatMoneyAr(gross)}
                        </span>
                        {disc > 0 && (
                          <>
                            <span className="text-muted-foreground">خصم</span>
                            <span className="tabular-nums text-warning">
                              {formatMoneyAr(disc)}
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground">الإجمالي</span>
                        <span className="font-bold tabular-nums text-success">
                          {formatMoneyAr(net)}
                        </span>
                      </div>
                    );
                  })()}
                  {addServicesMut.error && (
                    <p className="text-xs text-destructive">
                      {addServicesMut.error.message}
                    </p>
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
                </div>
              </div>
            </div>
        </section>

        {activityEverVisible && (
          <section className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {isToday ? "حركات اليوم" : `حركات ${viewDate}`}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  إيصالات ودفعيات القسم 15{isToday ? "" : ` — ${viewDate}`}.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {activityQuery.isFetching && !activityQuery.isLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                ) : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
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
                          isDeleting
                            ? "border-destructive/30 bg-destructive/10"
                            : "border-border",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={href}
                            className="min-w-0 flex-1 no-underline"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-medium text-muted-foreground">
                                {formatTime(r.transactionDate)}
                              </div>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
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
                            <div className="text-xs text-muted-foreground">
                              الكود
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {r.patientCode || "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted px-3 py-2">
                            <div className="text-xs text-muted-foreground">
                              ما يخص المريض
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {formatMoneyAr(r.total)}
                            </div>
                          </div>
                          <div className="col-span-2 rounded-xl bg-success/10 px-3 py-2">
                            <div className="text-xs text-success">المدفوع</div>
                            <div className="mt-1 flex items-end justify-between gap-3">
                              <div className="font-semibold tabular-nums text-success">
                                {formatMoneyAr(r.paidValue)}
                              </div>
                              <div
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
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
                                paidAmount:
                                  editingReceipt.paidAmount !== ""
                                    ? parseFloat(editingReceipt.paidAmount)
                                    : undefined,
                                discount:
                                  editingReceipt.discount !== ""
                                    ? parseFloat(editingReceipt.discount)
                                    : undefined,
                              });
                            }}
                            className="mt-3 flex flex-wrap gap-2 border-t border-primary/20 pt-3"
                          >
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                المدفوع
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingReceipt?.paidAmount ?? ""}
                                onChange={(e) =>
                                  setEditingReceipt((p) =>
                                    p
                                      ? { ...p, paidAmount: e.target.value }
                                      : null,
                                  )
                                }
                                className="w-28 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                الخصم
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingReceipt?.discount ?? ""}
                                onChange={(e) =>
                                  setEditingReceipt((p) =>
                                    p
                                      ? { ...p, discount: e.target.value }
                                      : null,
                                  )
                                }
                                className="w-24 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring"
                              />
                            </div>
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
                        )}
                        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                          {isDeleting ? (
                            <>
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
                                {deleteReceiptMut.isPending
                                  ? "..."
                                  : "تأكيد الحذف"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTrNo(null)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
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
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTrNo(r.trNo)}
                                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
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
                      <tr className="border-b border-border bg-muted text-xs font-semibold text-muted-foreground">
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
                        <th
                          scope="col"
                          className="w-32 px-3 py-2.5 text-center"
                        >
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
                                  remaining > 0 &&
                                    "font-semibold text-foreground",
                                )}
                                dir="ltr"
                              >
                                {formatMoneyAr(r.total)}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 tabular-nums font-medium",
                                  remaining <= 0
                                    ? "text-success"
                                    : "text-warning",
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
                                                paidAmount: String(
                                                  r.paidValue ?? "",
                                                ),
                                                discount: String(
                                                  r.discount ?? "",
                                                ),
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
                                        {deleteReceiptMut.isPending
                                          ? "..."
                                          : "تأكيد"}
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
                                        paidAmount:
                                          editingReceipt.paidAmount !== ""
                                            ? parseFloat(
                                                editingReceipt.paidAmount,
                                              )
                                            : undefined,
                                        discount:
                                          editingReceipt.discount !== ""
                                            ? parseFloat(
                                                editingReceipt.discount,
                                              )
                                            : undefined,
                                      });
                                    }}
                                    className="flex flex-wrap items-center gap-3"
                                  >
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium text-muted-foreground">
                                        المدفوع
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingReceipt?.paidAmount ?? ""}
                                        onChange={(e) =>
                                          setEditingReceipt((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  paidAmount: e.target.value,
                                                }
                                              : null,
                                          )
                                        }
                                        className="w-28 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium text-muted-foreground">
                                        الخصم
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingReceipt?.discount ?? ""}
                                        onChange={(e) =>
                                          setEditingReceipt((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  discount: e.target.value,
                                                }
                                              : null,
                                          )
                                        }
                                        className="w-24 rounded-lg border border-ring/30 bg-background px-2.5 py-1 text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
                                      />
                                    </div>
                                    {updateReceiptMut.error && (
                                      <span className="text-xs text-destructive">
                                        {updateReceiptMut.error.message}
                                      </span>
                                    )}
                                    <div className="flex gap-1.5">
                                      <button
                                        type="submit"
                                        disabled={updateReceiptMut.isPending}
                                        className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                      >
                                        {updateReceiptMut.isPending
                                          ? "..."
                                          : "حفظ"}
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
    </>
  );
}
