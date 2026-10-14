import { Button } from "@/components/ui/button";
import AccountingCompactRecord from "./AccountingCompactRecord";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import type {
  ReceiptHeader,
  ReceiptsInquiryInput,
} from "@shared/accounting/contracts";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  formatDateAr,
  formatCountAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";
import reportStyles from "./AccountingOpReport.module.css";
import { DateInput } from "@/components/ui/date-input";
import { AccountingQueryBoundary } from "./AccountingPagePrimitives";

type ReceiptsInquiryQuery = {
  data?: ReceiptHeader[];
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    receiptsInquiry: {
      useQuery: (
        input: ReceiptsInquiryInput,
        options?: { refetchOnWindowFocus?: boolean },
      ) => ReceiptsInquiryQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;
const DEFAULT_SECTION_CODE = 15;
const RECEIPT_PAGE_SIZE = 500;

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const today = new Date();
  return { fromDate: toDateInputValue(today), toDate: toDateInputValue(today) };
}

function parseQueryString(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

function optionalText(value: string | null) {
  const t = value?.trim();
  return t ? t : undefined;
}

function optionalNumber(value: string | null) {
  const t = value?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function readFilters(search: string): ReceiptsInquiryInput {
  const defaults = defaultDateRange();
  const p = parseQueryString(search);
  const sectionRaw = p.get("sectionCode");
  const sectionParsed =
    sectionRaw != null && sectionRaw !== "" ? Number(sectionRaw) : NaN;
  const sectionCode = Number.isFinite(sectionParsed)
    ? sectionParsed
    : DEFAULT_SECTION_CODE;

  return {
    fromDate: p.get("fromDate") || defaults.fromDate,
    toDate: p.get("toDate") || defaults.toDate,
    patientCode: optionalText(p.get("patientCode")),
    doctorCode: optionalText(p.get("doctorCode")),
    sectionCode,
    trNo: optionalText(p.get("trNo")),
    trTy: optionalNumber(p.get("trTy")),
    limit: optionalNumber(p.get("limit")) ?? RECEIPT_PAGE_SIZE + 1,
    offset: optionalNumber(p.get("offset")) ?? 0,
  };
}

function buildPatientsUrl(input: ReceiptsInquiryInput) {
  const params = new URLSearchParams();
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);
  if (input.sectionCode != null && input.sectionCode !== DEFAULT_SECTION_CODE) {
    params.set("sectionCode", String(input.sectionCode));
  }
  if (input.patientCode?.trim())
    params.set("patientCode", input.patientCode.trim());
  if (input.doctorCode?.trim())
    params.set("doctorCode", input.doctorCode.trim());
  if (input.trNo?.trim()) params.set("trNo", input.trNo.trim());
  if (input.trTy !== undefined) params.set("trTy", String(input.trTy));
  if (input.limit != null && input.limit !== RECEIPT_PAGE_SIZE + 1)
    params.set("limit", String(input.limit));
  if (input.offset) params.set("offset", String(input.offset));
  const qs = params.toString();
  return qs ? `/accounting/patients?${qs}` : "/accounting/patients";
}

function receiptDetailUrl(sectionCode: number, trTy: number, trNo: string) {
  return `/accounting/receipts/${sectionCode}/${trTy}/${encodeURIComponent(trNo)}`;
}

function formatMoney(value: number) {
  return formatMoneyAr(value);
}

function LoadingRows() {
  return (
    <table className={reportStyles.loadingTable} aria-hidden>
      <tbody>
        {Array.from({ length: 6 }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: 9 }).map((__, j) => (
              <td key={j}>
                <Skeleton className="h-5 w-full min-w-12" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AccountingPatientsInquiry() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const q = accountingTrpc.accounting.receiptsInquiry.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  const allRows = q.data ?? [];
  const rows = allRows.slice(0, RECEIPT_PAGE_SIZE);
  const hasNextPage = allRows.length > RECEIPT_PAGE_SIZE;
  const currentPage = Math.floor((filters.offset ?? 0) / RECEIPT_PAGE_SIZE);

  const movePage = (page: number) => {
    const next = {
      ...filters,
      offset: Math.max(0, page * RECEIPT_PAGE_SIZE),
    };
    setLocation(buildPatientsUrl(next));
  };

  const applyFilters = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError("تاريخ البداية بعد تاريخ النهاية");
      return;
    }
    setDateError("");
    setLocation(
      buildPatientsUrl({
        ...draft,
        limit: RECEIPT_PAGE_SIZE + 1,
        offset: 0,
      }),
    );
  };

  const resetFilters = () => {
    const d = defaultDateRange();
    const next: ReceiptsInquiryInput = {
      ...d,
      sectionCode: DEFAULT_SECTION_CODE,
      limit: RECEIPT_PAGE_SIZE + 1,
      offset: 0,
    };
    setDraft(next);
    setLocation(buildPatientsUrl(next));
  };

  const goReceipt = (row: ReceiptHeader) => {
    setLocation(receiptDetailUrl(row.sectionCode, row.trTy, row.trNo));
  };

  return (
    <>
      <div className="accounting-report space-y-4" dir="rtl">
        <h1 className="print:hidden">استعلام المرضى والإيصالات</h1>
        <Card className="border-border/80 shadow-sm">
          <CardContent
            className="flex w-fit max-w-full flex-wrap items-end gap-2"
            dir="rtl"
          >
            <label className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground">
              <span>من تاريخ</span>
              <DateInput
                value={draft.fromDate ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
              />
            </label>
            <label className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground">
              <span>إلى تاريخ</span>
              <DateInput
                value={draft.toDate ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
              />
            </label>
            {dateError && (
              <p className="text-[13px] text-destructive md:col-span-2">
                {dateError}
              </p>
            )}
            <label className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground">
              <span>كود المريض</span>
              <Input
                value={draft.patientCode ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    patientCode: e.target.value || undefined,
                  }))
                }
              />
            </label>
            <label className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground">
              <span>كود الطبيب</span>
              <Input
                value={draft.doctorCode ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    doctorCode: e.target.value || undefined,
                  }))
                }
              />
            </label>
            <label className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground">
              <span>رقم الإيصال</span>
              <Input
                value={draft.trNo ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, trNo: e.target.value || undefined }))
                }
              />
            </label>
            <label className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground">
              <span>نوع الإيصال</span>
              <Input
                inputMode="numeric"
                value={draft.trTy == null ? "" : String(draft.trTy)}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    trTy: e.target.value.trim()
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
              />
            </label>
            <Button
              type="button"
              size="icon"
              className="h-11 w-11"
              onClick={applyFilters}
              aria-label="تطبيق"
            >
              <Search className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={resetFilters}
              aria-label="إعادة ضبط"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={() => void q.refetch()}
              disabled={q.isFetching}
              aria-label="تحديث"
            >
              <RefreshCw
                className={q.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden
              />
            </Button>
          </CardContent>
        </Card>

        <AccountingQueryBoundary query={q} label="حسابات المرضى">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              {rows.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  عرض {formatCountAr(rows.length)} نتيجة، الصفحة{" "}
                  {toArabicDigits(String(currentPage + 1))}
                </span>
              )}
            </CardHeader>
            <CardContent>
              <div className={reportStyles.reportShell}>
                <div className={reportStyles.reportMeta} role="note">
                  <span className="font-semibold">الفترة:</span> من{" "}
                  {formatDateAr(filters.fromDate)} إلى{" "}
                  {formatDateAr(filters.toDate)}
                </div>

                {q.isLoading ? <LoadingRows /> : null}
                <div className="grid gap-3 sm:hidden">
                  {!q.isLoading && rows.length === 0 ? (
                    <div
                      className={`${reportStyles.emptyState} text-muted-foreground`}
                    >
                      لا توجد بيانات
                    </div>
                  ) : null}
                  {!q.isLoading && rows.length > 0 ? (
                    <>
                      {rows.map((row) => (
                        <AccountingCompactRecord
                          key={`${row.sectionCode}-${row.trTy}-${row.trNo}`}
                          title={row.patientName?.trim() || "غير متاح"}
                          meta={
                            <>
                              إيصال {toArabicDigits(row.trNo)} ·{" "}
                              {formatDateAr(row.transactionDate)}
                            </>
                          }
                          value={formatMoneyAr(row.paidValue)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="shrink-0">
                              <div className="text-[13px] text-muted-foreground">
                                {formatDateAr(row.transactionDate)}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-foreground">
                                {row.patientName?.trim() || "غير متاح"}
                              </div>
                            </div>
                            <span className="rounded-full bg-primary text-primary-foreground">
                              {toArabicDigits(row.trNo)}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-muted px-3 py-2">
                              <div className="text-[13px] text-muted-foreground">
                                كود المريض
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {toArabicDigits(row.patientCode)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-muted px-3 py-2">
                              <div className="text-[13px] text-muted-foreground">
                                الطبيب
                              </div>
                              <div className="mt-1 font-semibold text-foreground">
                                غير متاح
                              </div>
                            </div>
                            <div className="rounded-xl bg-muted px-3 py-2">
                              <div className="text-[13px] text-muted-foreground">
                                الإجمالي
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {formatMoney(row.total)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-destructive/10 px-3 py-2">
                              <div className="text-[13px] text-destructive">
                                الخصم
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-destructive">
                                {formatMoney(row.discount)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-success/10 px-3 py-2">
                              <div className="text-[13px] text-success">
                                المدفوع
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-success">
                                {formatMoney(row.paidValue)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-muted px-3 py-2">
                              <div className="text-[13px] text-muted-foreground">
                                المستخدم
                              </div>
                              <div className="mt-1 font-semibold text-foreground">
                                {row.enteredBy?.trim() || "غير متاح"}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="mt-2 print:hidden"
                            onClick={() => goReceipt(row)}
                          >
                            فتح الإيصال
                          </Button>
                        </AccountingCompactRecord>
                      ))}
                    </>
                  ) : null}
                </div>

                <div className="hidden sm:block">
                  {!q.isLoading && rows.length === 0 ? (
                    <div
                      className={`${reportStyles.emptyState} text-muted-foreground`}
                    >
                      لا توجد بيانات
                    </div>
                  ) : null}
                  {!q.isLoading && rows.length > 0 ? (
                    <div
                      className={reportStyles.reportBlock}
                      role="region"
                      aria-label="إيصالات المرضى"
                      tabIndex={0}
                    >
                      <div className={reportStyles.blockHeader}>
                        قائمة الإيصالات
                      </div>
                      <table className={reportStyles.gridTable}>
                        <colgroup>
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colStretch} />
                          <col className={reportStyles.colStretch} />
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colCompact} />
                          <col className={reportStyles.colStretch} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th scope="col" className={reportStyles.numeric}>
                              رقم الإيصال
                            </th>
                            <th scope="col" className={reportStyles.numeric}>
                              التاريخ
                            </th>
                            <th scope="col" className={reportStyles.numeric}>
                              كود المريض
                            </th>
                            <th scope="col">اسم المريض</th>
                            <th scope="col">الطبيب</th>
                            <th scope="col" className={reportStyles.numeric}>
                              الإجمالي
                            </th>
                            <th scope="col" className={reportStyles.numeric}>
                              الخصم
                            </th>
                            <th scope="col" className={reportStyles.numeric}>
                              المدفوع
                            </th>
                            <th scope="col">المستخدم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr
                              key={`${row.sectionCode}-${row.trTy}-${row.trNo}`}
                              role="button"
                              className={reportStyles.rowClickable}
                              tabIndex={0}
                              aria-label={`عرض إيصال ${row.trNo} للمريض ${row.patientName ?? row.patientCode}`}
                              onClick={() => goReceipt(row)}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter" || ev.key === " ") {
                                  ev.preventDefault();
                                  goReceipt(row);
                                }
                              }}
                            >
                              <td
                                data-label="رقم الإيصال"
                                className={`${reportStyles.numeric} font-medium`}
                              >
                                {toArabicDigits(row.trNo)}
                              </td>
                              <td
                                data-label="التاريخ"
                                className={reportStyles.numeric}
                              >
                                {formatDateAr(row.transactionDate)}
                              </td>
                              <td
                                data-label="كود المريض"
                                className={reportStyles.numeric}
                              >
                                {toArabicDigits(row.patientCode)}
                              </td>
                              <td data-label="اسم المريض">
                                {row.patientName?.trim() || "غير متاح"}
                              </td>
                              <td
                                data-label="الطبيب"
                                className="text-muted-foreground"
                              >
                                غير متاح
                              </td>
                              <td
                                data-label="الإجمالي"
                                className={reportStyles.numeric}
                              >
                                {formatMoney(row.total)}
                              </td>
                              <td
                                data-label="الخصم"
                                className={reportStyles.numeric}
                              >
                                {formatMoney(row.discount)}
                              </td>
                              <td
                                data-label="المدفوع"
                                className={reportStyles.numeric}
                              >
                                {formatMoney(row.paidValue)}
                              </td>
                              <td data-label="المستخدم">
                                {row.enteredBy?.trim() || "غير متاح"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
                {hasNextPage && (
                  <div className="mt-2 rounded bg-warning/10 px-3 py-1.5 text-[13px] text-warning-text">
                    توجد نتائج إضافية. استخدم زر الصفحة التالية لمتابعة
                    المراجعة.
                  </div>
                )}
                {currentPage > 0 || hasNextPage ? (
                  <nav
                    aria-label="التنقل بين صفحات نتائج الإيصالات"
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => movePage(currentPage - 1)}
                      disabled={currentPage === 0 || q.isFetching}
                    >
                      الصفحة السابقة
                    </Button>
                    <span
                      className="text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      الصفحة {toArabicDigits(String(currentPage + 1))}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => movePage(currentPage + 1)}
                      disabled={!hasNextPage || q.isFetching}
                    >
                      الصفحة التالية
                    </Button>
                  </nav>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </AccountingQueryBoundary>
      </div>
    </>
  );
}
