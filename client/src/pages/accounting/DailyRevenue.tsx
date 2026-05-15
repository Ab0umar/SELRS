import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { getErrorContext } from "@/lib/errorMessages";
import type {
  DailyRevenueInput,
  DailyRevenueOutput,
} from "@shared/accounting/contracts";
import { CircleAlert, Printer, RefreshCw, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import AccountingShell from "./AccountingShell";
import { formatCountAr, formatDateAr, formatMoneyAr } from "./accountingFormat";
import reportStyles from "./AccountingOpReport.module.css";

type DailyRevenueQuery = {
  data?: DailyRevenueOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    dailyRevenue: {
      useQuery: (
        input: DailyRevenueInput,
        options?: { refetchOnWindowFocus?: boolean },
      ) => DailyRevenueQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;
const DEFAULT_SECTION_CODE = 15;

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const today = new Date();
  return {
    fromDate: toDateInputValue(today),
    toDate: toDateInputValue(today),
  };
}

function parseQueryString(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

function readFilters(search: string): DailyRevenueInput {
  const defaults = defaultDateRange();
  const params = parseQueryString(search);
  const sectionRaw = params.get("sectionCode");
  const sectionParsed = sectionRaw != null && sectionRaw !== "" ? Number(sectionRaw) : NaN;
  const sectionCode = Number.isFinite(sectionParsed) ? sectionParsed : DEFAULT_SECTION_CODE;
  const shiftCode = params.get("shiftCode")?.trim() || undefined;

  return {
    fromDate: params.get("fromDate") || defaults.fromDate,
    toDate: params.get("toDate") || defaults.toDate,
    sectionCode,
    shiftCode,
  };
}

function buildDailyRevenueUrl(input: DailyRevenueInput) {
  const params = new URLSearchParams();
  params.set("fromDate", input.fromDate);
  params.set("toDate", input.toDate);

  if (
    input.sectionCode != null &&
    input.sectionCode !== DEFAULT_SECTION_CODE
  ) {
    params.set("sectionCode", String(input.sectionCode));
  }

  if (input.shiftCode?.trim()) {
    params.set("shiftCode", input.shiftCode.trim());
  }

  const qs = params.toString();
  return qs ? `/accounting/daily-revenue?${qs}` : "/accounting/daily-revenue";
}

function LoadingRows() {
  return (
    <table className={reportStyles.loadingTable} aria-hidden>
      <tbody>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: 7 }).map((__, cellIndex) => (
              <td key={cellIndex}>
                <Skeleton className="h-5 w-full min-w-16" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DailyRevenue() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    setDraft(filters);
    setDateError("");
  }, [filters]);

  const dailyRevenueQuery = accountingTrpc.accounting.dailyRevenue.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  const rows = dailyRevenueQuery.data?.rows ?? [];
  const totals = dailyRevenueQuery.data?.totals ?? {
    totalReceipts: 0,
    totalGross: 0,
    totalDiscount: 0,
    totalCash: 0,
    totalPaid: 0,
    netAfterDiscount: 0,
  };

  const applyFilters = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError("تاريخ البداية بعد تاريخ النهاية");
      return;
    }
    setDateError("");
    setLocation(buildDailyRevenueUrl(draft));
  };

  const resetFilters = () => {
    const defaults = defaultDateRange();
    const next = {
      ...defaults,
      sectionCode: DEFAULT_SECTION_CODE,
      shiftCode: undefined,
    };
    setDraft(next);
    setLocation(buildDailyRevenueUrl(next));
  };

  const printReport = () => {
    const printClass = "print-daily-revenue";
    const cleanup = () => {
      document.body.classList.remove(printClass);
      window.removeEventListener("afterprint", cleanup);
    };
    document.body.classList.add(printClass);
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  };

  return (
    <AccountingShell>
      <div className="space-y-4 sm:space-y-5 md:space-y-6" dir="rtl">
        <Card className={`${reportStyles.noPrint} border-border shadow-sm`}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl tracking-tight">الإيراد اليومي</CardTitle>
                <CardDescription className="mt-1 text-sm">
                  تصفية إجمالي الإيصالات اليومية وإيرادات الخدمات.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void dailyRevenueQuery.refetch()}
                  disabled={dailyRevenueQuery.isFetching}
                  aria-label="تحديث بيانات الإيراد اليومي"
                >
                  <RefreshCw className={dailyRevenueQuery.isFetching ? "animate-spin" : ""} aria-hidden />
                  تحديث
                </Button>
                <Button
                  type="button"
                  onClick={printReport}
                  disabled={dailyRevenueQuery.isLoading || rows.length === 0}
                  aria-label="طباعة تقرير الإيراد اليومي"
                >
                  <Printer className="ml-2 h-4 w-4" aria-hidden />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label htmlFor="daily-from-date" className="space-y-1.5 text-sm font-medium">
              <span>من تاريخ</span>
              <Input
                id="daily-from-date"
                type="date"
                value={draft.fromDate}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, fromDate: event.target.value }));
                  setDateError("");
                }}
              />
            </label>
            <label htmlFor="daily-to-date" className="space-y-1.5 text-sm font-medium">
              <span>إلى تاريخ</span>
              <Input
                id="daily-to-date"
                type="date"
                value={draft.toDate}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, toDate: event.target.value }));
                  setDateError("");
                }}
              />
            </label>
            {dateError && (
              <p className="col-span-full text-sm text-red-600">{dateError}</p>
            )}
            <label htmlFor="daily-section-code" className="space-y-1.5 text-sm font-medium">
              <span>كود القسم</span>
              <Input
                id="daily-section-code"
                type="number"
                min={1}
                value={draft.sectionCode ?? DEFAULT_SECTION_CODE}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    sectionCode: Number(event.target.value || DEFAULT_SECTION_CODE),
                  }))
                }
              />
            </label>
            <div className="space-y-1.5 text-sm font-medium">
              <label htmlFor="daily-shift-code">الوردية</label>
              <Select
                value={draft.shiftCode ?? "all"}
                onValueChange={(val) =>
                  setDraft((prev) => ({ ...prev, shiftCode: val === "all" ? undefined : val }))
                }
                dir="rtl"
              >
                <SelectTrigger id="daily-shift-code" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="1">الأولى</SelectItem>
                  <SelectItem value="2">الثانية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" className="flex-1" onClick={applyFilters} aria-label="تطبيق الفلاتر">
                <Search className="ml-2 h-4 w-4" aria-hidden />
                تطبيق
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters} aria-label="إعادة ضبط الفلاتر">
                إعادة ضبط
              </Button>
            </div>
          </CardContent>
        </Card>

        {dailyRevenueQuery.isError ? (
          <Card className="border-error/30 bg-error/5">
            <CardContent className="flex items-start gap-3 py-5">
              <div className="rounded-lg bg-error/10 p-2 text-error">
                <CircleAlert className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {getErrorContext(dailyRevenueQuery.error.message).title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getErrorContext(dailyRevenueQuery.error.message).hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className={`${reportStyles.printScope} border-border shadow-sm`}>
          <CardHeader>
            <CardTitle className="text-base">البيانات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={reportStyles.reportMeta} role="note">
              <span className="font-semibold">الفترة:</span> من {formatDateAr(filters.fromDate)} إلى{" "}
              {formatDateAr(filters.toDate)}
            </div>

            {dailyRevenueQuery.isLoading ? (
              <table className={reportStyles.gridTable} aria-hidden>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><Skeleton className="h-5 w-full" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {!dailyRevenueQuery.isLoading && rows.length === 0 ? (
              <div className={`${reportStyles.emptyState} text-muted-foreground`}>
                لا توجد بيانات للإيراد اليومي للفلاتر المختارة.
              </div>
            ) : null}

            {!dailyRevenueQuery.isLoading && rows.length > 0 ? (
              <table className={reportStyles.gridTable}>
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className={reportStyles.numeric}>التاريخ</th>
                    <th scope="col" className={reportStyles.numeric}>عدد الإيصالات</th>
                    <th scope="col" className={reportStyles.numeric}>الإجمالي</th>
                    <th scope="col" className={reportStyles.numeric}>الخصم</th>
                    <th scope="col" className={reportStyles.numeric}>نقدي</th>
                    <th scope="col" className={reportStyles.numeric}>المدفوع</th>
                    <th scope="col" className={reportStyles.numeric}>الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date}>
                      <td data-label="التاريخ" className={reportStyles.numeric}>{formatDateAr(row.date)}</td>
                      <td data-label="الإيصالات" className={reportStyles.numeric}>{formatCountAr(row.totalReceipts)}</td>
                      <td data-label="الإجمالي" className={reportStyles.numeric}>{formatMoneyAr(row.totalGross)}</td>
                      <td data-label="الخصم" className={reportStyles.numeric}>{formatMoneyAr(row.totalDiscount)}</td>
                      <td data-label="نقدي" className={reportStyles.numeric}>{formatMoneyAr(row.totalCash)}</td>
                      <td data-label="المدفوع" className={reportStyles.numeric}>{formatMoneyAr(row.totalPaid)}</td>
                      <td data-label="الصافي" className={reportStyles.numeric}>{formatMoneyAr(row.netAfterDiscount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={reportStyles.grandTotalRow}>
                    <td className="font-bold">الإجمالي العام</td>
                    <td className={reportStyles.numeric}>{formatCountAr(totals.totalReceipts)}</td>
                    <td className={reportStyles.numeric}>{formatMoneyAr(totals.totalGross)}</td>
                    <td className={reportStyles.numeric}>{formatMoneyAr(totals.totalDiscount)}</td>
                    <td className={reportStyles.numeric}>{formatMoneyAr(totals.totalCash)}</td>
                    <td className={reportStyles.numeric}>{formatMoneyAr(totals.totalPaid)}</td>
                    <td className={reportStyles.numeric}>{formatMoneyAr(totals.netAfterDiscount)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : null}

            </CardContent>
            </Card>
            </div>
            </AccountingShell>
            );
            }
