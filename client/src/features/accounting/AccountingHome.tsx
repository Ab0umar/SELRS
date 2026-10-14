import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  Banknote,
  ClipboardList,
  FileText,
  RefreshCw,
  ReceiptText,
  Scissors,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatCountAr, formatMoneyAr } from "./accountingFormat";
import AccountingLedger from "./AccountingLedger";
import AccountingServiceEntry from "./AccountingServiceEntry";
import AccountingLoanEntry from "./AccountingLoanEntry";
import AccountingCombinedSummary from "./AccountingCombinedSummary";

const reports = [
  {
    label: "الإيراد اليومي",
    href: "/accounting/daily-revenue",
    icon: Banknote,
    description: "مراجعة الإيرادات حسب اليوم",
  },
  {
    label: "إيراد الخدمات",
    href: "/accounting/service-revenue",
    icon: TrendingUp,
    description: "إجماليات الطبيب والخدمة",
  },
  {
    label: "استعلام الإيصالات",
    href: "/accounting/receipts",
    icon: ReceiptText,
    description: "البحث في الإيصالات وعرض تفاصيلها",
  },
  {
    label: "الخدمات",
    href: "/accounting/services",
    icon: Scissors,
    description: "حركة خدمات الليزك",
  },
  {
    label: "استعلام المرضى",
    href: "/accounting/patients",
    icon: Users,
    description: "بحث المرضى والإيصالات",
  },
  {
    label: "حساب مريض",
    href: "/accounting/patient",
    icon: UserRound,
    description: "بحث حساب مريض",
  },
  {
    label: "حساب طبيب",
    href: "/accounting/doctor",
    icon: Stethoscope,
    description: "بحث حساب طبيب",
  },
  {
    label: "مقارنة واجهة الحسابات",
    href: "/accounting/prototypes",
    icon: ClipboardList,
    description: "مراجعة اتجاهات عرض الحسابات واختيار اتجاه",
  },
] as const;

function formatTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  const hour = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "م" : "ص";
  return `${String(hour % 12 || 12).padStart(2, "0")}:${minutes} ${period}`;
}

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function metricValue(
  query: { isLoading: boolean; isError: boolean },
  value: number | undefined,
  formatter: (value: number) => string,
) {
  if (query.isLoading) return "جارٍ التحميل";
  if (query.isError || value == null) return "غير متاح";
  return formatter(value);
}

export default function AccountingHome() {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
    log?: string;
    mode?: "sync" | "push";
  } | null>(null);
  const [entryTab, setEntryTab] = useState<"ledger" | "service" | "loan">(
    "ledger",
  );
  const today = localIsoDate();

  const summaryQuery = trpc.accounting.dashboardSummary.useQuery(
    { sectionCode: 15, date: today },
    { refetchOnWindowFocus: true },
  );
  const cashbookSummaryQuery = trpc.accounting.accLedgerSummary.useQuery(
    {},
    { refetchOnWindowFocus: true },
  );
  const activityQuery = trpc.accounting.transactions.useQuery(
    { sectionCode: 15, limit: 20, date: today },
    { refetchInterval: 60_000, refetchOnWindowFocus: true },
  );
  const syncAccMut = trpc.accounting.triggerAccSync.useMutation();
  const pushAccMut = trpc.accounting.triggerAccPush.useMutation();

  const receipts = useMemo(
    () => activityQuery.data ?? [],
    [activityQuery.data],
  );
  const summary = summaryQuery.data;
  const hasSummaryError = summaryQuery.isError;
  const summaryIsBusy = summaryQuery.isFetching;

  const refreshSummary = () => {
    void summaryQuery.refetch();
  };

  const refreshCashbookSummary = () => {
    void cashbookSummaryQuery.refetch();
  };

  const runSync = async (mode: "sync" | "push") => {
    setSyncResult(null);
    try {
      const result =
        mode === "sync"
          ? await syncAccMut.mutateAsync()
          : await pushAccMut.mutateAsync();
      setSyncResult({
        ok: true,
        message:
          mode === "sync" ? "تمت مزامنة الخزنة" : "تم رفع القيود إلى الخزنة",
        log: result?.log,
        mode,
      });
      await cashbookSummaryQuery.refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      setSyncResult({
        ok: false,
        message:
          mode === "sync" ? "فشلت مزامنة الخزنة" : "فشل رفع القيود إلى الخزنة",
        log: message,
        mode,
      });
      toast.error(
        mode === "sync" ? "تعذر مزامنة الخزنة" : "تعذر رفع القيود إلى الخزنة",
      );
    }
  };

  const metricItems = [
    {
      label: "إيراد اليوم",
      value: metricValue(
        summaryQuery,
        summary?.totalRevenueToday,
        formatMoneyAr,
      ),
      href: "/accounting/daily-revenue",
      icon: Banknote,
    },
    {
      label: "إيصالات اليوم",
      value: metricValue(
        summaryQuery,
        summary?.totalReceiptsToday,
        formatCountAr,
      ),
      href: "/accounting/receipts",
      icon: ReceiptText,
    },
    {
      label: "إيراد الشهر",
      value: metricValue(
        summaryQuery,
        summary?.totalRevenueThisMonth,
        formatMoneyAr,
      ),
      href: "/accounting/service-revenue",
      icon: TrendingUp,
    },
    {
      label: "إيصالات الشهر",
      value: metricValue(
        summaryQuery,
        summary?.totalReceiptsThisMonth,
        formatCountAr,
      ),
      href: "/accounting/receipts",
      icon: FileText,
    },
  ];

  return (
    <div dir="rtl" className="accounting-home-workspace space-y-4">
      <section
        aria-label="إضافة قيود الحسابات"
        className="accounting-entry-workspace overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
      >
        <Tabs
          value={entryTab}
          onValueChange={(value) =>
            setEntryTab(value as "ledger" | "service" | "loan")
          }
          dir="rtl"
          className="w-full"
        >
          <div className="accounting-home-entry-toolbar flex flex-wrap items-center gap-3">
            <TabsList className="accounting-entry-tabs grid h-auto w-full grid-cols-3 rounded-xl bg-muted/40 p-1.5">
              <TabsTrigger
                value="ledger"
                className="min-h-12 rounded-lg px-3 py-3 text-sm font-semibold"
              >
                قيد
              </TabsTrigger>
              <TabsTrigger
                value="service"
                className="min-h-12 rounded-lg px-3 py-3 text-sm font-semibold"
              >
                خدمة
              </TabsTrigger>
              <TabsTrigger
                value="loan"
                className="min-h-12 rounded-lg px-3 py-3 text-sm font-semibold"
              >
                قرض
              </TabsTrigger>
            </TabsList>
            <AccountingCombinedSummary />
          </div>
          <TabsContent value="ledger" className="m-0 p-3 sm:p-4">
            <AccountingLedger />
          </TabsContent>
          <TabsContent value="service" className="m-0 p-3 sm:p-4">
            <AccountingServiceEntry />
          </TabsContent>
          <TabsContent value="loan" className="m-0 p-3 sm:p-4">
            <AccountingLoanEntry />
          </TabsContent>
        </Tabs>
      </section>

      <div className="grid gap-4">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                حركات اليوم
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                أحدث الإيصالات المسجلة في قسم الليزك.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activityQuery.isFetching ? (
                <RefreshCw
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              <span>
                {activityQuery.isLoading
                  ? "جارٍ التحميل"
                  : `آخر ${formatCountAr(receipts.length)}`}{" "}
                إيصال
              </span>
            </div>
          </div>

          {activityQuery.isLoading ? (
            <div
              role="status"
              className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              جارٍ تحميل حركات اليوم
            </div>
          ) : activityQuery.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-10 text-sm"
            >
              <span>تعذر تحميل حركات اليوم.</span>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void activityQuery.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-sm text-muted-foreground">
              <FileText className="h-6 w-6" aria-hidden="true" />
              <span>لا توجد حركات مسجلة اليوم.</span>
              <span className="text-xs">
                ستظهر الإيصالات هنا تلقائياً عندما يبدأ القسم بالحركة.
              </span>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border sm:hidden">
                {receipts.map((receipt) => {
                  const remaining =
                    receipt.total - receipt.discount - receipt.paidValue;
                  const href = `/accounting/receipts/${receipt.sectionCode}/${receipt.trTy}/${encodeURIComponent(receipt.trNo)}`;
                  return (
                    <Link
                      key={`${receipt.trTy}-${receipt.trNo}`}
                      href={href}
                      className="accounting-receipt-row block transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">
                            {formatTime(receipt.transactionDate)}
                          </div>
                          <div className="mt-1 break-words text-sm font-semibold text-foreground">
                            {receipt.patientName || "غير متاح"}
                          </div>
                        </div>
                        <span
                          className="shrink-0 text-sm font-semibold tabular-nums text-foreground"
                          dir="ltr"
                        >
                          {formatMoneyAr(receipt.paidValue)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>إيصال {receipt.trNo}</span>
                        <span>الكود: {receipt.patientCode || "غير متاح"}</span>
                        <span
                          className={
                            remaining > 0
                              ? "text-warning-text"
                              : "text-success-text"
                          }
                        >
                          {remaining > 0 ? "متبقي" : "مسدد"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div
                className="hidden overflow-x-auto sm:block"
                role="region"
                aria-label="جدول حركات اليوم"
                tabIndex={0}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-3 text-start">
                        الوقت
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        الإيصال
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        المريض
                      </th>
                      <th scope="col" className="px-4 py-3 text-left" dir="ltr">
                        المدفوع
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {receipts.map((receipt) => {
                      const remaining =
                        receipt.total - receipt.discount - receipt.paidValue;
                      const href = `/accounting/receipts/${receipt.sectionCode}/${receipt.trTy}/${encodeURIComponent(receipt.trNo)}`;
                      return (
                        <tr
                          key={`${receipt.trTy}-${receipt.trNo}`}
                          className="transition-colors hover:bg-muted"
                        >
                          <td
                            className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {formatTime(receipt.transactionDate)}
                          </td>
                          <td
                            className="px-4 py-3 font-semibold tabular-nums"
                            dir="ltr"
                          >
                            <Link
                              href={href}
                              className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {receipt.trNo}
                            </Link>
                          </td>
                          <td className="max-w-[20rem] truncate px-4 py-3">
                            {receipt.patientName || "غير متاح"}
                          </td>
                          <td
                            className="px-4 py-3 text-left font-semibold tabular-nums"
                            dir="ltr"
                          >
                            {formatMoneyAr(receipt.paidValue)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-xs font-semibold",
                              remaining > 0
                                ? "text-warning-text"
                                : "text-success-text",
                            )}
                          >
                            {remaining > 0 ? "متبقي" : "مسدد"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
