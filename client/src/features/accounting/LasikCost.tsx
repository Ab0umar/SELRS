import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import type {
  LasikCostPeriod,
  LasikCostSummaryInput,
} from "@shared/accounting/contracts";
import {
  AlertTriangle,
  Calculator,
  CalendarDays,
  PackageOpen,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCountAr, formatDateAr, formatMoneyAr } from "./accountingFormat";

type PresetPeriod = Exclude<LasikCostPeriod, "custom">;

const PERIOD_OPTIONS: Array<{
  key: PresetPeriod;
  label: string;
  months: number;
}> = [
  { key: "month", label: "شهر", months: 1 },
  { key: "quarter", label: "٣ شهور", months: 3 },
  { key: "halfYear", label: "٦ شهور", months: 6 },
  { key: "year", label: "سنة", months: 12 },
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeForMonths(months: number) {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
  from.setDate(from.getDate() + 1);
  return {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(to),
  };
}

function metricTone(value: number) {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-red-700";
  return "text-foreground";
}

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Calculator;
  hint?: string;
  tone?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 shadow-2xs"
      title={hint}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground">{label}:</span>
      <span className={`text-sm font-black tabular-nums ${tone ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export default function LasikCost() {
  const [period, setPeriod] = useState<LasikCostPeriod>("month");
  const [range, setRange] = useState(() => rangeForMonths(1));

  const queryInput = useMemo<LasikCostSummaryInput>(
    () => ({
      period,
      fromDate: range.fromDate,
      toDate: range.toDate,
    }),
    [period, range],
  );

  const summaryQuery = trpc.accounting.lasikCostSummary.useQuery(queryInput, {
    enabled: Boolean(
      range.fromDate && range.toDate && range.fromDate <= range.toDate,
    ),
    refetchOnWindowFocus: false,
  });

  const summary = summaryQuery.data;
  const hasDateError = range.fromDate > range.toDate;

  const applyPreset = (key: PresetPeriod, months: number) => {
    setPeriod(key);
    setRange(rangeForMonths(months));
  };

  return (
    <div className="space-y-2 sm:space-y-2.5" dir="rtl">
      <Card className="w-fit max-w-full border-border/60 shadow-xs">
        <div className="flex items-center justify-end p-2 pb-0 sm:p-2.5 sm:pb-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void summaryQuery.refetch()}
            disabled={summaryQuery.isFetching || hasDateError}
          >
            <RefreshCw
              className={
                summaryQuery.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"
              }
            />
            تحديث
          </Button>
        </div>
        <CardContent className="w-fit max-w-full space-y-2 p-2.5 sm:p-3">
            {/* layout-refined-add-filter */}
            <div className="accounting-add-filter flex w-fit max-w-full flex-wrap items-end gap-2" data-add-filter="1" dir="rtl">
<div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => applyPreset(option.key, option.months)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                  period === option.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPeriod("custom")}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                period === "custom"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              مخصص
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="w-fit max-w-full space-y-1 text-xs font-medium font-bold text-foreground">
              <span>من تاريخ</span>
              <DateInput
                value={range.fromDate}
                onChange={(event) => {
                  setPeriod("custom");
                  setRange((prev) => ({
                    ...prev,
                    fromDate: event.target.value,
                  }));
                }}
               className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="w-fit max-w-full space-y-1 text-xs font-medium font-bold text-foreground">
              <span>إلى تاريخ</span>
              <DateInput
                value={range.toDate}
                onChange={(event) => {
                  setPeriod("custom");
                  setRange((prev) => ({ ...prev, toDate: event.target.value }));
                }}
               className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </label>
          </div>

          {hasDateError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm font-bold text-red-700">
              تاريخ البداية بعد تاريخ النهاية.
            </div>
          ) : null}
            </div>
          </CardContent>
      </Card>

      {summaryQuery.isLoading ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : summaryQuery.isError ? (
        <Card className="border-red-200 bg-red-50 shadow-xs">
          <CardContent className="flex items-center gap-2 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="h-5 w-5" />
            فشل تحميل تقرير تكلفة الليزك.
          </CardContent>
        </Card>
      ) : summary ? (
        <Tabs defaultValue="cost" className="space-y-2" dir="rtl">
          {summary.fromDate !== range.fromDate ? (
            <Card className="border-warning/40 bg-warning/10 shadow-xs">
              <CardContent className="flex items-start gap-2 p-4 text-sm font-bold text-warning">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  بدأ الحساب فعليًا من {formatDateAr(summary.fromDate)} لأن
                  بيانات MSSQL غير متاحة قبل هذا التاريخ. تم احتساب مصروفات
                  الخزنة لنفس الفترة فقط.
                </div>
              </CardContent>
            </Card>
          ) : null}

          {summary.stock.unpricedItemCount > 0 ? (
            <Card className="border-amber-300 bg-amber-50 shadow-xs">
              <CardContent className="flex items-start gap-2 p-4 text-sm font-bold text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  التكلفة الحالية مؤقتة ومرتفعة لأن هناك{" "}
                  {formatCountAr(summary.stock.unpricedItemCount)} صنفًا له رصيد
                  بدون سعر. سجل أسعار هذه الأصناف من تعديل الصنف ليتم خصم قيمة
                  الاستوك كاملة.
                </div>
              </CardContent>
            </Card>
          ) : null}

          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="cost">التكلفة</TabsTrigger>
            <TabsTrigger value="profit">الربحية</TabsTrigger>
          </TabsList>

          <TabsContent value="cost" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <MetricCard
                label="تكلفة العملية الواحدة"
                value={`${formatMoneyAr(summary.cost.costPerOperation)} ج.م`}
                icon={Calculator}
                hint="الرقم الأساسي: تكلفة الفترة / عدد العمليات"
              />
              <MetricCard
                label="تكلفة الفترة"
                value={`${formatMoneyAr(summary.cost.totalCost)} ج.م`}
                icon={TrendingDown}
                hint="مصروفات الخزنة - قيمة الاستوك الحالي"
              />
              <MetricCard
                label="عدد العمليات"
                value={formatCountAr(summary.revenue.operationCount)}
                icon={Calculator}
                hint={`${formatCountAr(summary.revenue.serviceRows)} سطر عملية في MSSQL`}
              />
              <MetricCard
                label="مصروفات الخزنة المحتسبة"
                value={`${formatMoneyAr(summary.expenses.cashbookExpense)} ج.م`}
                icon={Wallet}
                hint={`تم استبعاد ${formatMoneyAr(summary.expenses.excludedExpense)} ج.م`}
              />
              <MetricCard
                label="قيمة الاستوك الحالي"
                value={`${formatMoneyAr(summary.stock.stockValue)} ج.م`}
                icon={PackageOpen}
                hint={`${formatCountAr(summary.stock.itemCount)} صنف به رصيد`}
              />
            </div>
          </TabsContent>

          <TabsContent value="profit" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <MetricCard
                label="إيراد نشاط الليزك المحصل"
                value={`${formatMoneyAr(summary.revenue.totalPaid)} ج.م`}
                icon={TrendingUp}
                hint={`الصافي بعد الخصم: ${formatMoneyAr(summary.revenue.netAfterDiscount)} ج.م`}
              />
              <MetricCard
                label="تكلفة الفترة"
                value={`${formatMoneyAr(summary.cost.totalCost)} ج.م`}
                icon={TrendingDown}
                hint="نفس تكلفة تبويب التكلفة"
              />
              <MetricCard
                label="صافي ربح النشاط"
                value={`${formatMoneyAr(summary.cost.profitOnPaid)} ج.م`}
                icon={TrendingUp}
                tone={metricTone(summary.cost.profitOnPaid)}
                hint="الإيراد المحصل - تكلفة الفترة"
              />
              <MetricCard
                label="ربح العملية المتوسط"
                value={`${formatMoneyAr(summary.cost.profitPerOperation)} ج.م`}
                icon={TrendingUp}
                tone={metricTone(summary.cost.profitPerOperation)}
                hint="صافي الربح / عدد العمليات"
              />
              <MetricCard
                label="متوسط إيراد العملية"
                value={`${formatMoneyAr(
                  summary.revenue.operationCount > 0
                    ? summary.revenue.totalPaid / summary.revenue.operationCount
                    : 0,
                )} ج.م`}
                icon={Calculator}
                hint="إيراد النشاط / عدد العمليات"
              />
            </div>
          </TabsContent>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-right text-xs font-bold text-muted-foreground">
                    <th className="px-2.5 py-1.5">البند</th>
                    <th className="px-2.5 py-1.5">القيمة</th>
                    <th className="px-2.5 py-1.5">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="px-2.5 py-1.5 font-bold">
                      إجمالي MSSQL قبل الخصم
                    </td>
                    <td className="px-2.5 py-1.5 tabular-nums">
                      {formatMoneyAr(summary.revenue.totalGross)} ج.م
                    </td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">قسم الليزك ١٥</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="px-2.5 py-1.5 font-bold">خصومات MSSQL</td>
                    <td className="px-2.5 py-1.5 tabular-nums">
                      {formatMoneyAr(summary.revenue.totalDiscount)} ج.م
                    </td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">
                      مستبعدة من الصافي
                    </td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="px-2.5 py-1.5 font-bold">مصروفات مستبعدة</td>
                    <td className="px-2.5 py-1.5 tabular-nums">
                      {formatMoneyAr(summary.expenses.excludedExpense)} ج.م
                    </td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">
                      السلف، البيت، انستاباي، السعدني، العيادة، الدكتورة، أبو
                      عمر، أبو يوسف، والبنات حسب ملاحظات الخزنة والتصنيفات
                    </td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="px-2.5 py-1.5 font-bold">أصناف بلا سعر مخزن</td>
                    <td className="px-2.5 py-1.5 tabular-nums">
                      {formatCountAr(summary.stock.unpricedItemCount)}
                    </td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">
                      لا تدخل في قيمة الاستوك حتى يتم تسجيل سعر إدخال لها
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </Tabs>
      ) : null}
    </div>
  );
}
