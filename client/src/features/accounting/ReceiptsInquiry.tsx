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
  ReceiptHeader,
  ReceiptsInquiryInput,
} from "@shared/accounting/contracts";
import { CircleAlert, RefreshCw, Search, ReceiptText, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import reportStyles from "./AccountingOpReport.module.css";
import {
  formatDateAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";

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
const DEFAULT_LIMIT = 500;

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

function optionalText(value: string | null | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function optionalNumber(value: string | null | undefined): number | undefined {
  const t = value?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Normalize URL-derived filters for a stable tRPC query key (no "" optional fields). */
function receiptsQueryInput(
  parsed: ReceiptsInquiryInput,
): ReceiptsInquiryInput {
  const defaults = defaultDateRange();
  const secRaw = parsed.sectionCode;
  const sectionCode =
    secRaw != null && Number.isFinite(Number(secRaw))
      ? Number(secRaw)
      : DEFAULT_SECTION_CODE;
  const limit =
    parsed.limit != null && Number.isFinite(parsed.limit) && parsed.limit > 0
      ? parsed.limit
      : DEFAULT_LIMIT;

  return {
    fromDate: parsed.fromDate?.trim() || defaults.fromDate,
    toDate: parsed.toDate?.trim() || defaults.toDate,
    sectionCode,
    patientCode: optionalText(parsed.patientCode ?? undefined),
    doctorCode: optionalText(parsed.doctorCode ?? undefined),
    trNo: optionalText(parsed.trNo ?? undefined),
    trTy: parsed.trTy,
    limit,
  };
}

function readFilters(search: string): ReceiptsInquiryInput {
  const defaults = defaultDateRange();
  const p = parseQueryString(search);
  const sectionParsed = optionalNumber(p.get("sectionCode"));
  const sectionCode = sectionParsed ?? DEFAULT_SECTION_CODE;

  return {
    fromDate: p.get("fromDate") || defaults.fromDate,
    toDate: p.get("toDate") || defaults.toDate,
    patientCode: optionalText(p.get("patientCode")),
    doctorCode: optionalText(p.get("doctorCode")),
    sectionCode,
    trNo: optionalText(p.get("trNo")),
    trTy: optionalNumber(p.get("trTy")),
    limit: optionalNumber(p.get("limit")) ?? DEFAULT_LIMIT,
  };
}

function buildReceiptsUrl(input: ReceiptsInquiryInput) {
  const n = receiptsQueryInput(input);
  const params = new URLSearchParams();
  params.set("sectionCode", String(n.sectionCode));
  if (n.fromDate) params.set("fromDate", n.fromDate);
  if (n.toDate) params.set("toDate", n.toDate);
  if (n.patientCode) params.set("patientCode", n.patientCode);
  if (n.doctorCode) params.set("doctorCode", n.doctorCode);
  if (n.trNo) params.set("trNo", n.trNo);
  if (n.trTy !== undefined) params.set("trTy", String(n.trTy));
  if (n.limit != null && n.limit !== DEFAULT_LIMIT)
    params.set("limit", String(n.limit));
  return `/accounting/receipts?${params.toString()}`;
}

function receiptDetailUrl(sectionCode: number, trTy: number, trNo: string) {
  return `/accounting/receipts/${sectionCode}/${trTy}/${encodeURIComponent(trNo)}`;
}

function trTyLabel(value: number) {
  switch (value) {
    case 1:
      return "نقدي";
    case 5:
      return "آجل";
    case 6:
      return "نزلاء";
    case 8:
      return "مسترد";
    default:
      return String(value);
  }
}

const selectLikeClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ReceiptsInquiry() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const queryInput = useMemo(() => receiptsQueryInput(filters), [filters]);
  const [draft, setDraft] = useState(filters);

  const [debouncedPatient, setDebouncedPatient] = useState(
    filters.patientCode ?? "",
  );
  const [debouncedDoctor, setDebouncedDoctor] = useState(
    filters.doctorCode ?? "",
  );
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatient(draft.patientCode ?? "");
      setDebouncedDoctor(draft.doctorCode ?? "");
    }, 300);
    return () => clearTimeout(handler);
  }, [draft.patientCode, draft.doctorCode]);

  const patientLookup = trpc.accounting.patientLookup.useQuery(
    { patientCode: debouncedPatient },
    { enabled: debouncedPatient.length > 0 },
  );

  const doctorLookup = trpc.accounting.doctorLookup.useQuery(
    { doctorCode: debouncedDoctor },
    { enabled: debouncedDoctor.length > 0 },
  );

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const receiptsQuery = accountingTrpc.accounting.receiptsInquiry.useQuery(
    queryInput,
    {
      refetchOnWindowFocus: false,
    },
  );

  const rows = receiptsQuery.data ?? [];

  const applyFilters = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError("تاريخ البداية بعد تاريخ النهاية");
      return;
    }
    setDateError("");
    const normalized = receiptsQueryInput({
      ...draft,
      sectionCode:
        draft.sectionCode != null && Number.isFinite(Number(draft.sectionCode))
          ? Number(draft.sectionCode)
          : DEFAULT_SECTION_CODE,
      patientCode: optionalText(draft.patientCode ?? undefined),
      doctorCode: optionalText(draft.doctorCode ?? undefined),
      trNo: optionalText(draft.trNo ?? undefined),
      limit: draft.limit ?? DEFAULT_LIMIT,
    });
    setDraft(normalized);
    setLocation(buildReceiptsUrl(normalized));
  };

  const resetFilters = () => {
    const defaults = defaultDateRange();
    const next = receiptsQueryInput({
      ...defaults,
      sectionCode: DEFAULT_SECTION_CODE,
      patientCode: undefined,
      doctorCode: undefined,
      trNo: undefined,
      trTy: undefined,
      limit: DEFAULT_LIMIT,
    });
    setDraft(next);
    setLocation(buildReceiptsUrl(next));
  };

  return (
    <>
      <div className="space-y-2 sm:space-y-2.5" dir="rtl">
        <Card className="w-fit max-w-full border-border/60 shadow-xs">
          <CardContent className="w-fit max-w-full space-y-2 p-2.5 sm:p-3">
            {/* layout-refined-add-filter */}
            <div className="accounting-add-filter flex w-fit max-w-full flex-wrap items-end gap-2" data-add-filter="1" dir="rtl">
<label
              htmlFor="receipt-from-date"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>من تاريخ</span>
              <DateInput
                id="receipt-from-date"
                value={draft.fromDate ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
               className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </label>
            <label
              htmlFor="receipt-to-date"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>إلى تاريخ</span>
              <DateInput
                id="receipt-to-date"
                value={draft.toDate ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
               className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </label>
            {dateError && (
              <p className="text-sm text-destructive md:col-span-2">
                {dateError}
              </p>
            )}
            <label
              htmlFor="receipt-patient-code"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>كود المريض</span>
              <Input
                id="receipt-patient-code"
                value={draft.patientCode ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    patientCode: e.target.value ? e.target.value : undefined,
                  }))
                }
              />
              {draft.patientCode && (
                <span className="text-xs text-muted-foreground block mt-1">
                  {patientLookup.isLoading
                    ? "جاري البحث…"
                    : patientLookup.data
                      ? `الاسم: ${patientLookup.data.patientName}`
                      : "غير موجود"}
                </span>
              )}
            </label>
            <label
              htmlFor="receipt-doctor-code"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>كود الطبيب</span>
              <Input
                id="receipt-doctor-code"
                value={draft.doctorCode ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    doctorCode: e.target.value ? e.target.value : undefined,
                  }))
                }
              />
              {draft.doctorCode && (
                <span className="text-xs text-muted-foreground block mt-1">
                  {doctorLookup.isLoading
                    ? "جاري البحث…"
                    : doctorLookup.data
                      ? `الاسم: ${doctorLookup.data.doctorName}`
                      : "غير موجود"}
                </span>
              )}
            </label>

                                                
            <Button type="button" size="icon" className="h-11 w-11" onClick={applyFilters} aria-label="تطبيق">
              <Search className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={resetFilters} aria-label="إعادة ضبط">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => void receiptsQuery.refetch()} aria-label="تحديث">
              <RefreshCw className="h-4 w-4" aria-hidden />
            </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-0">
            {!receiptsQuery.isLoading &&
              !receiptsQuery.isError &&
              rows.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  عرض {toArabicDigits(String(rows.length))} نتيجة
                </div>
              )}
            {receiptsQuery.isLoading ? (
              <Skeleton className="h-40 w-full" aria-busy />
            ) : null}

            {receiptsQuery.isError ? (
              <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-4 text-error">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">
                    {getErrorContext(receiptsQuery.error.message).title}
                  </p>
                  <p className="mt-1 text-sm opacity-90">
                    {getErrorContext(receiptsQuery.error.message).hint}
                  </p>
                </div>
              </div>
            ) : null}

            {!receiptsQuery.isLoading &&
            !receiptsQuery.isError &&
            rows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <div className="flex justify-center mb-3">
                  <ReceiptText
                    className="h-8 w-8 text-muted-foreground/60"
                    aria-hidden
                  />
                </div>
                لا توجد إيصالات مطابقة للفلاتر الحالية.
              </div>
            ) : null}

            <div className="grid gap-2 sm:hidden">
              {receiptsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-background p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((__, j) => (
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

              {!receiptsQuery.isLoading &&
              !receiptsQuery.isError &&
              rows.length > 0
                ? rows.map((row) => (
                    <button
                      key={`${row.sectionCode}-${row.trTy}-${row.trNo}`}
                      type="button"
                      onClick={() =>
                        setLocation(
                          receiptDetailUrl(row.sectionCode, row.trTy, row.trNo),
                        )
                      }
                      className="rounded-xl border border-border bg-background p-4 text-right shadow-xs transition-colors hover:bg-primary/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="shrink-0">
                          <div className="text-sm text-muted-foreground">
                            {formatDateAr(row.transactionDate)}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {row.patientName ?? "—"}
                          </div>
                        </div>
                        <span className="rounded-full bg-primary text-primary-foreground">
                          {toArabicDigits(row.trNo)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-muted px-2 py-1.5">
                          <div className="text-[10px] text-muted-foreground">
                            النوع
                          </div>
                          <div className="mt-1 font-semibold text-foreground">
                            {trTyLabel(row.trTy)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-muted px-2 py-1.5">
                          <div className="text-[10px] text-muted-foreground">
                            الإجمالي
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatMoneyAr(row.total)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-destructive/10 px-2 py-1.5">
                          <div className="text-[10px] text-destructive">
                            الخصم
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-destructive">
                            {formatMoneyAr(row.discount)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-success/10 px-2 py-1.5">
                          <div className="text-[10px] text-success">
                            المدفوع
                          </div>
                          <div className="mt-1 font-semibold tabular-nums text-success">
                            {formatMoneyAr(row.paidValue)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                : null}
            </div>

            <div className="hidden sm:block">
              {!receiptsQuery.isLoading &&
              !receiptsQuery.isError &&
              rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className={reportStyles.gridTable}>
                    <thead>
                      <tr>
                        <th>الإيصال</th>
                        <th>التاريخ</th>
                        <th>النوع</th>
                        <th>المريض</th>
                        <th className={reportStyles.numeric}>الإجمالي</th>
                        <th className={reportStyles.numeric}>الخصم</th>
                        <th className={reportStyles.numeric}>المدفوع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={`${row.sectionCode}-${row.trTy}-${row.trNo}`}
                          className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-primary/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                          tabIndex={0}
                          role="button"
                          aria-label={`إيصال رقم ${row.trNo}، ${trTyLabel(row.trTy)}، المريض ${row.patientName ?? "غير معروف"}، ${formatDateAr(row.transactionDate)}، المدفوع ${formatMoneyAr(row.paidValue)}`}
                          onClick={() =>
                            setLocation(
                              receiptDetailUrl(
                                row.sectionCode,
                                row.trTy,
                                row.trNo,
                              ),
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setLocation(
                                receiptDetailUrl(
                                  row.sectionCode,
                                  row.trTy,
                                  row.trNo,
                                ),
                              );
                            }
                          }}
                        >
                          <td
                            data-label="الإيصال"
                            className={reportStyles.numeric}
                          >
                            {toArabicDigits(row.trNo)}
                          </td>
                          <td
                            data-label="التاريخ"
                            className={reportStyles.numeric}
                          >
                            {formatDateAr(row.transactionDate)}
                          </td>
                          <td data-label="النوع">{trTyLabel(row.trTy)}</td>
                          <td data-label="المريض">{row.patientName ?? "—"}</td>
                          <td
                            data-label="الإجمالي"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.total)}
                          </td>
                          <td
                            data-label="الخصم"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.discount)}
                          </td>
                          <td
                            data-label="المدفوع"
                            className={reportStyles.numeric}
                          >
                            {formatMoneyAr(row.paidValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {!receiptsQuery.isLoading &&
              !receiptsQuery.isError &&
              rows.length >= 500 && (
                <div className="px-4 py-2 text-sm text-warning bg-warning/10 border-t border-border/30 mt-2">
                  قد تكون النتائج مقطوعة. اضيق نطاق البحث للحصول على نتائج أدق.
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
