import { Button } from "@/components/ui/button";
import AccountingCompactRecord from "./AccountingCompactRecord";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import type {
  DailyRevenueInput,
  DailyRevenueOutput,
} from "@shared/accounting/contracts";
import {
  Printer,
  RefreshCw,
  Search,
  Banknote,
  ReceiptText,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { formatCountAr, formatDateAr, formatMoneyAr } from "./accountingFormat";
import { useAccountingTabMetrics } from "./accountingTabMetrics";
import reportStyles from "./AccountingOpReport.module.css";
import { DateInput } from "@/components/ui/date-input";
import { AccountingQueryBoundary } from "./AccountingPagePrimitives";
import { accountingMetricValue } from "./accountingQueryState";

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

function escapePrintHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseQueryString(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

function readFilters(search: string): DailyRevenueInput {
  const defaults = defaultDateRange();
  const params = parseQueryString(search);
  const sectionRaw = params.get("sectionCode");
  const sectionParsed =
    sectionRaw != null && sectionRaw !== "" ? Number(sectionRaw) : NaN;
  const sectionCode = Number.isFinite(sectionParsed)
    ? sectionParsed
    : DEFAULT_SECTION_CODE;
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

  if (input.sectionCode != null && input.sectionCode !== DEFAULT_SECTION_CODE) {
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

  const dailyRevenueQuery = accountingTrpc.accounting.dailyRevenue.useQuery(
    filters,
    {
      refetchOnWindowFocus: false,
    },
  );

  const rows = dailyRevenueQuery.data?.rows ?? [];
  const totals = dailyRevenueQuery.data?.totals ?? {
    totalReceipts: 0,
    totalGross: 0,
    totalDiscount: 0,
    totalCash: 0,
    totalPaid: 0,
    netAfterDiscount: 0,
  };
  const tabMetricItems = [
    {
      label: "الإجمالي",
      value: accountingMetricValue(
        dailyRevenueQuery,
        dailyRevenueQuery.data?.totals.totalGross,
        formatMoneyAr,
      ),
      icon: Banknote,
    },
    {
      label: "المدفوع",
      value: accountingMetricValue(
        dailyRevenueQuery,
        dailyRevenueQuery.data?.totals.totalPaid,
        formatMoneyAr,
      ),
      icon: ReceiptText,
    },
    {
      label: "الصافي",
      value: accountingMetricValue(
        dailyRevenueQuery,
        dailyRevenueQuery.data?.totals.netAfterDiscount,
        formatMoneyAr,
      ),
      icon: Wallet,
    },
  ];
  useAccountingTabMetrics([]);

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
    if (
      dailyRevenueQuery.isLoading ||
      dailyRevenueQuery.isError ||
      rows.length === 0
    )
      return;
    const bodyRows = rows
      .map(
        (row) => `
          <tr>
            <td>${escapePrintHtml(formatDateAr(row.date))}</td>
            <td class="numeric">${formatCountAr(row.totalReceipts)}</td>
            <td class="numeric">${formatMoneyAr(row.totalGross)}</td>
            <td class="numeric">${formatMoneyAr(row.totalDiscount)}</td>
            <td class="numeric">${formatMoneyAr(row.totalCash)}</td>
            <td class="numeric">${formatMoneyAr(row.totalPaid)}</td>
            <td class="numeric">${formatMoneyAr(row.netAfterDiscount)}</td>
          </tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>تقرير الإيراد اليومي</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111827; direction: rtl; font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 11px; }
        h1 { margin: 0 0 6px; text-align: center; font-size: 17px; }
        .meta { margin-bottom: 9px; text-align: center; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
        th { background: #f3f4f6; font-weight: 800; }
        .numeric { direction: ltr; text-align: left; white-space: nowrap; font-variant-numeric: tabular-nums; }
        tfoot td { background: #f8fafc; font-weight: 900; border-top: 2px solid #98a2b3; }
      </style></head><body>
        <h1>تقرير الإيراد اليومي</h1>
        <div class="meta">الفترة: من ${escapePrintHtml(formatDateAr(filters.fromDate))} إلى ${escapePrintHtml(formatDateAr(filters.toDate))}</div>
        <table><thead><tr><th>التاريخ</th><th>عدد الإيصالات</th><th>الإجمالي</th><th>الخصم</th><th>نقدي</th><th>المدفوع</th><th>الصافي</th></tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><td>الإجمالي العام</td><td class="numeric">${formatCountAr(totals.totalReceipts)}</td><td class="numeric">${formatMoneyAr(totals.totalGross)}</td><td class="numeric">${formatMoneyAr(totals.totalDiscount)}</td><td class="numeric">${formatMoneyAr(totals.totalCash)}</td><td class="numeric">${formatMoneyAr(totals.totalPaid)}</td><td class="numeric">${formatMoneyAr(totals.netAfterDiscount)}</td></tr></tfoot>
        </table></body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
      iframe.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
  };

  return (
    <>
      <div className="accounting-report space-y-4" dir="rtl">
        <h1 className="print:hidden">الإيراد اليومي</h1>
        <Card
          className={`${reportStyles.noPrint} w-fit max-w-full border-border/60 shadow-xs`}
        >
          <CardContent className="w-fit max-w-full space-y-2 p-2.5 sm:p-3">
            <div
              className="flex w-fit max-w-full flex-wrap items-end gap-2"
              dir="rtl"
            >
              <label
                htmlFor="daily-from-date"
                className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
              >
                <span>من تاريخ</span>
                <DateInput
                  id="daily-from-date"
                  value={draft.fromDate}
                  onChange={(event) => {
                    setDraft((prev) => ({
                      ...prev,
                      fromDate: event.target.value,
                    }));
                    setDateError("");
                  }}
                  className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </label>
              <label
                htmlFor="daily-to-date"
                className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
              >
                <span>إلى تاريخ</span>
                <DateInput
                  id="daily-to-date"
                  value={draft.toDate}
                  onChange={(event) => {
                    setDraft((prev) => ({
                      ...prev,
                      toDate: event.target.value,
                    }));
                    setDateError("");
                  }}
                  className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </label>
              {dateError && (
                <p className="text-sm text-destructive">{dateError}</p>
              )}
              <div className="flex w-[7.5rem] flex-col gap-1 sm:w-28">
                <label
                  htmlFor="daily-shift-code"
                  className="text-base font-bold text-foreground"
                >
                  الوردية
                </label>
                <Select
                  value={draft.shiftCode ?? "all"}
                  onValueChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      shiftCode: val === "all" ? undefined : val,
                    }))
                  }
                  dir="rtl"
                >
                  <SelectTrigger id="daily-shift-code" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="1">صباحي</SelectItem>
                    <SelectItem value="2">مسائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="h-11 px-4 text-base font-bold"
                onClick={applyFilters}
                aria-label="تطبيق"
              >
                <Search className="me-1.5 h-4 w-4" aria-hidden />
                تطبيق
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => void dailyRevenueQuery.refetch()}
                disabled={dailyRevenueQuery.isFetching}
                aria-label="تحديث"
              >
                <RefreshCw
                  className={
                    dailyRevenueQuery.isFetching
                      ? "h-4 w-4 animate-spin"
                      : "h-4 w-4"
                  }
                  aria-hidden
                />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-11 w-11"
                onClick={printReport}
                disabled={
                  dailyRevenueQuery.isLoading ||
                  dailyRevenueQuery.isError ||
                  rows.length === 0
                }
                aria-label="طباعة"
              >
                <Printer className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>

        <AccountingQueryBoundary
          query={dailyRevenueQuery}
          label="الإيراد اليومي"
        >
          <Card className={`${reportStyles.printScope} border-border/60 shadow-xs`}>
            <CardContent className="p-3 sm:p-4">
              <h2 className="hidden print:block text-lg font-semibold mb-3">
                الإيراد اليومي
              </h2>
              <div className={reportStyles.reportMeta} role="note">
                <span className="font-semibold">الفترة:</span> من{" "}
                {formatDateAr(filters.fromDate)} إلى{" "}
                {formatDateAr(filters.toDate)}
              </div>

              <div className="grid gap-2 sm:hidden">
                {dailyRevenueQuery.isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border bg-background p-4 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {Array.from({ length: 6 }).map((__, j) => (
                            <div
                              key={j}
                              className="rounded-xl border border-border bg-muted p-3"
                            >
                              <Skeleton className="h-3 w-12" />
                              <Skeleton className="mt-2 h-4 w-16" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  : null}

                {!dailyRevenueQuery.isLoading && rows.length === 0 ? (
                  <div
                    className={`${reportStyles.emptyState} text-muted-foreground`}
                  >
                    لا توجد بيانات للإيراد اليومي للفلاتر المختارة.
                  </div>
                ) : null}

                {!dailyRevenueQuery.isLoading && rows.length > 0 ? (
                  <>
                    {rows.map((row) => (
                      <AccountingCompactRecord
                        key={row.date}
                        title="الإيراد اليومي"
                        meta={
                          <>
                            {formatDateAr(row.date)} ·{" "}
                            {formatCountAr(row.totalReceipts)} إيصال
                          </>
                        }
                        value={formatMoneyAr(row.netAfterDiscount)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateAr(row.date)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              الإيراد اليومي
                            </div>
                          </div>
                          <span className="rounded-full bg-primary text-primary-foreground">
                            {formatCountAr(row.totalReceipts)} إيصال
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-muted px-2 py-1.5">
                            <div className="text-[13px] text-muted-foreground">
                              الإجمالي
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {formatMoneyAr(row.totalGross)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted px-2 py-1.5">
                            <div className="text-[13px] text-muted-foreground">
                              الخصم
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-foreground">
                              {formatMoneyAr(row.totalDiscount)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-success/10 px-2 py-1.5">
                            <div className="text-[13px] text-success">نقدي</div>
                            <div className="mt-1 font-semibold tabular-nums text-success">
                              {formatMoneyAr(row.totalCash)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-success/10 px-2 py-1.5">
                            <div className="text-[13px] text-success">
                              المدفوع
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-success">
                              {formatMoneyAr(row.totalPaid)}
                            </div>
                          </div>
                          <div className="col-span-2 rounded-xl bg-primary/5 px-2 py-1.5">
                            <div className="text-[13px] text-primary">
                              الصافي
                            </div>
                            <div className="mt-1 text-lg font-bold tabular-nums text-primary">
                              {formatMoneyAr(row.netAfterDiscount)}
                            </div>
                          </div>
                        </div>
                      </AccountingCompactRecord>
                    ))}

                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="text-xs font-semibold text-primary">
                        الإجمالي العام
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-background px-2 py-1.5">
                          <div className="text-[13px] text-muted-foreground">
                            الإيصالات
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatCountAr(totals.totalReceipts)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-background px-2 py-1.5">
                          <div className="text-[13px] text-muted-foreground">
                            الإجمالي
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(totals.totalGross)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-background px-2 py-1.5">
                          <div className="text-[13px] text-muted-foreground">
                            الخصم
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(totals.totalDiscount)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-background px-2 py-1.5">
                          <div className="text-[13px] text-muted-foreground">
                            نقدي
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(totals.totalCash)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-background px-2 py-1.5">
                          <div className="text-[13px] text-muted-foreground">
                            المدفوع
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(totals.totalPaid)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-background px-2 py-1.5">
                          <div className="text-[13px] text-muted-foreground">
                            الصافي
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(totals.netAfterDiscount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="hidden sm:block">
                {dailyRevenueQuery.isLoading ? (
                  <table className={reportStyles.gridTable} aria-hidden>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j}>
                              <Skeleton className="h-5 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {!dailyRevenueQuery.isLoading && rows.length === 0 ? (
                  <div
                    className={`${reportStyles.emptyState} text-muted-foreground`}
                  >
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
                        <th scope="col" className={reportStyles.numeric}>
                          التاريخ
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          عدد الإيصالات
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          الإجمالي
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          الخصم
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          نقدي
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          المدفوع
                        </th>
                        <th scope="col" className={reportStyles.numeric}>
                          الصافي
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.date}>
                          <td
                            data-label="التاريخ"
                            className={reportStyles.numeric}
                          >
                            {formatDateAr(row.date)}
                          </td>
                          <td
                            data-label="الإيصالات"
                            className={reportStyles.numeric}
                          >
                            {formatCountAr(row.totalReceipts)}
                          </td>
                          <td
                            data-label="الإجمالي"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.totalGross)}
                          </td>
                          <td
                            data-label="الخصم"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.totalDiscount)}
                          </td>
                          <td
                            data-label="نقدي"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.totalCash)}
                          </td>
                          <td
                            data-label="المدفوع"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.totalPaid)}
                          </td>
                          <td
                            data-label="الصافي"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.netAfterDiscount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={reportStyles.grandTotalRow}>
                        <td className="font-bold">الإجمالي العام</td>
                        <td
                          data-label="الإيصالات"
                          className={reportStyles.numeric}
                        >
                          {formatCountAr(totals.totalReceipts)}
                        </td>
                        <td
                          data-label="الإجمالي"
                          className={reportStyles.numeric}
                        >
                          {formatMoneyAr(totals.totalGross)}
                        </td>
                        <td data-label="الخصم" className={reportStyles.numeric}>
                          {formatMoneyAr(totals.totalDiscount)}
                        </td>
                        <td data-label="نقدي" className={reportStyles.numeric}>
                          {formatMoneyAr(totals.totalCash)}
                        </td>
                        <td
                          data-label="المدفوع"
                          className={reportStyles.numeric}
                        >
                          {formatMoneyAr(totals.totalPaid)}
                        </td>
                        <td
                          data-label="الصافي"
                          className={reportStyles.numeric}
                        >
                          {formatMoneyAr(totals.netAfterDiscount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </AccountingQueryBoundary>
      </div>
    </>
  );
}
