import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { PatientLasikSummaryInput } from "@shared/accounting/contracts";
import { ArrowLeft, Printer, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import reportStyles from "./AccountingOpReport.module.css";
import {
  formatCountAr,
  formatDateAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";
import { AccountingQueryBoundary } from "./AccountingPagePrimitives";

type PatientLasikQuery = {
  data?: import("@shared/accounting/contracts").PatientLasikSummaryOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    patientLasikSummary: {
      useQuery: (
        input: PatientLasikSummaryInput,
        options?: { enabled?: boolean; refetchOnWindowFocus?: boolean },
      ) => PatientLasikQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;
const DEFAULT_SECTION_CODE = 15;

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

export default function PatientAccount() {
  const [, setLocation] = useLocation();
  const [, detailMatch] = useRoute("/accounting/patient/:patientCode");

  const defaults = defaultDateRange();
  const [draft, setDraft] = useState({
    patientCode: "",
    fromDate: defaults.fromDate,
    toDate: defaults.toDate,
    sectionCode: DEFAULT_SECTION_CODE,
  });
  const [didSearch, setDidSearch] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [queryInput, setQueryInput] = useState<PatientLasikSummaryInput | null>(
    null,
  );

  const detailCode = detailMatch?.patientCode
    ? decodeURIComponent(detailMatch.patientCode)
    : "";

  useEffect(() => {
    if (!detailCode) return;
    const dr = defaultDateRange();
    setDraft((prev) => ({
      ...prev,
      patientCode: detailCode,
      fromDate: dr.fromDate,
      toDate: dr.toDate,
      sectionCode: DEFAULT_SECTION_CODE,
    }));
    setDidSearch(true);
    setQueryInput({
      patientCode: detailCode,
      fromDate: dr.fromDate,
      toDate: dr.toDate,
      sectionCode: DEFAULT_SECTION_CODE,
    });
  }, [detailCode]);

  const enabled =
    queryInput != null &&
    typeof queryInput.patientCode === "string" &&
    queryInput.patientCode.trim().length > 0;

  const summaryQuery = accountingTrpc.accounting.patientLasikSummary.useQuery(
    queryInput ?? {
      patientCode: "",
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      sectionCode: DEFAULT_SECTION_CODE,
    },
    { enabled, refetchOnWindowFocus: false },
  );

  const data = summaryQuery.data;

  const runSearch = () => {
    const code = draft.patientCode.trim();
    if (!code) {
      setCodeError(true);
      return;
    }
    setCodeError(false);
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError(true);
      return;
    }
    setDateError(false);
    setDidSearch(true);
    setQueryInput({
      patientCode: code,
      fromDate: draft.fromDate,
      toDate: draft.toDate,
      sectionCode: draft.sectionCode ?? DEFAULT_SECTION_CODE,
    });
  };

  const onBack = () => {
    setLocation("/accounting/patient");
  };

  const printAccount = () => {
    document.body.classList.add("print-daily-revenue");
    window.print();
    window.setTimeout(
      () => document.body.classList.remove("print-daily-revenue"),
      500,
    );
  };

  return (
    <>
      <div
        className={`accounting-report space-y-4 ${reportStyles.printScope}`}
        dir="rtl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">حساب مريض</h1>
          <div className={reportStyles.noPrint}>
            <div className="flex flex-wrap gap-2">
              {detailCode ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={onBack}
                >
                  <ArrowLeft
                    className="me-1.5 h-3.5 w-3.5 rotate-180"
                    aria-hidden="true"
                  />
                  العودة للبحث
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={printAccount}
                disabled={
                  !data || summaryQuery.isLoading || summaryQuery.isError
                }
                aria-label="طباعة حساب المريض"
              >
                <Printer className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
                طباعة الحساب
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-border/60 shadow-xs">
          <CardContent
            className="grid gap-3 p-3 sm:p-4 sm:grid-cols-2 md:gap-4 md:grid-cols-3 lg:grid-cols-4"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
              }
            }}
          >
            <label
              htmlFor="patient-code"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>كود المريض</span>
              <Input
                id="patient-code"
                value={draft.patientCode}
                aria-invalid={codeError}
                aria-describedby={codeError ? "patient-code-error" : undefined}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, patientCode: e.target.value }))
                }
                placeholder="مثال: 01354"
              />
            </label>
            <label
              htmlFor="patient-from-date"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>من تاريخ</span>
              <DateInput
                id="patient-from-date"
                value={draft.fromDate}
                aria-invalid={dateError}
                aria-describedby={dateError ? "patient-date-error" : undefined}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
              />
            </label>
            <label
              htmlFor="patient-to-date"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>إلى تاريخ</span>
              <DateInput
                id="patient-to-date"
                value={draft.toDate}
                aria-invalid={dateError}
                aria-describedby={dateError ? "patient-date-error" : undefined}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
              />
            </label>
            {codeError && (
              <p
                id="patient-code-error"
                role="alert"
                className="text-xs text-destructive md:col-span-2"
              >
                أدخل كود المريض قبل البحث.
              </p>
            )}
            {dateError && (
              <p
                id="patient-date-error"
                role="alert"
                className="text-xs text-destructive md:col-span-2"
              >
                تاريخ البداية بعد تاريخ النهاية
              </p>
            )}
            <label
              htmlFor="patient-section-code"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>كود القسم</span>
              <Input
                id="patient-section-code"
                type="number"
                min={1}
                value={draft.sectionCode}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    sectionCode: Number(e.target.value || DEFAULT_SECTION_CODE),
                  }))
                }
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                onClick={() => void runSearch()}
                aria-label="بحث عن مريض"
              >
                <Search className="me-2 h-4 w-4" aria-hidden />
                بحث
              </Button>
            </div>
          </CardContent>
        </Card>

        {!didSearch ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <div className="flex justify-center mb-3">
              <Users className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            </div>
            ابحث عن مريض لعرض الحساب
          </div>
        ) : null}

        {didSearch ? (
          <AccountingQueryBoundary query={summaryQuery} label="حساب المريض">
            {didSearch &&
            !summaryQuery.isLoading &&
            !summaryQuery.isError &&
            data ? (
              <>
                {data.receipts.length === 0 && data.services.length === 0 ? (
                  <div className="rounded-lg border p-6 text-center text-muted-foreground">
                    لا توجد بيانات للفلاتر المحددة.
                  </div>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          ملخص: {toArabicDigits(data.patientCode)}{" "}
                          {data.patientName ? `(${data.patientName})` : ""}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="accounting-receipt-context grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="border-b border-border bg-muted/30 p-3 text-sm">
                          <div className="text-muted-foreground">إيصالات</div>
                          <div className="font-semibold tabular-nums">
                            {formatCountAr(data.totals.totalReceipts)}
                          </div>
                        </div>
                        <div className="border-b border-border bg-muted/30 p-3 text-sm">
                          <div className="text-muted-foreground">خدمات</div>
                          <div className="font-semibold tabular-nums">
                            {formatCountAr(data.totals.totalServices)}
                          </div>
                        </div>
                        <div className="border-b border-border bg-muted/30 p-3 text-sm">
                          <div className="text-muted-foreground">
                            إجمالي قبل الخصم
                          </div>
                          <div className="font-semibold tabular-nums">
                            {formatMoneyAr(data.totals.totalGross)}
                          </div>
                        </div>
                        <div className="border-b border-border bg-muted/30 p-3 text-sm">
                          <div className="text-muted-foreground">خصم</div>
                          <div className="font-semibold tabular-nums">
                            {formatMoneyAr(data.totals.totalDiscount)}
                          </div>
                        </div>
                        <div className="border-b border-border bg-muted/30 p-3 text-sm">
                          <div className="text-muted-foreground">مدفوع</div>
                          <div className="font-semibold tabular-nums">
                            {formatMoneyAr(data.totals.totalPaid)}
                          </div>
                        </div>
                        <div className="border-b border-border bg-muted/30 p-3 text-sm">
                          <div className="text-muted-foreground">آخر حركة</div>
                          <div className="font-semibold">
                            {data.totals.lastTransactionDate
                              ? formatDateAr(data.totals.lastTransactionDate)
                              : "غير متاح"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {data.receipts.length > 0 ? (
                      <Card>
                        <CardHeader>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 sm:hidden">
                            {data.receipts.map((r) => (
                              <div
                                key={`${r.sectionCode}:${r.trTy}:${r.trNo}`}
                                className="border-b border-border p-4 last:border-b-0"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDateAr(String(r.transactionDate))}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">
                                      إيصال {toArabicDigits(r.trNo)}
                                    </div>
                                  </div>
                                  <span className="font-semibold tabular-nums text-foreground">
                                    {formatMoneyAr(r.paidValue)}
                                  </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                  <div className="border border-border bg-muted/30 px-3 py-2">
                                    <div className="text-xs text-muted-foreground">
                                      الإجمالي
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-foreground">
                                      {formatMoneyAr(r.total)}
                                    </div>
                                  </div>
                                  <div className="border border-destructive/30 bg-destructive/10 px-3 py-2">
                                    <div className="text-xs text-destructive">
                                      المدفوع
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-destructive">
                                      {formatMoneyAr(r.paidValue)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            className="hidden overflow-x-auto sm:block"
                            tabIndex={0}
                            role="region"
                            aria-label="إيصالات المريض"
                          >
                            <table className={reportStyles.gridTable}>
                              <thead>
                                <tr>
                                  <th>رقم الإيصال</th>
                                  <th>التاريخ</th>
                                  <th className={reportStyles.numeric}>
                                    الإجمالي
                                  </th>
                                  <th className={reportStyles.numeric}>
                                    المدفوع
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.receipts.map((r) => (
                                  <tr
                                    key={`${r.sectionCode}:${r.trTy}:${r.trNo}`}
                                  >
                                    <td
                                      data-label="رقم الإيصال"
                                      className={reportStyles.numeric}
                                    >
                                      {toArabicDigits(r.trNo)}
                                    </td>
                                    <td
                                      data-label="التاريخ"
                                      className={reportStyles.numeric}
                                    >
                                      {formatDateAr(String(r.transactionDate))}
                                    </td>
                                    <td
                                      data-label="الإجمالي"
                                      className={reportStyles.numeric}
                                    >
                                      {formatMoneyAr(r.total)}
                                    </td>
                                    <td
                                      data-label="المدفوع"
                                      className={reportStyles.numeric}
                                    >
                                      {formatMoneyAr(r.paidValue)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}

                    {data.services.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">الخدمات</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 sm:hidden">
                            {data.services.map((s, idx) => (
                              <div
                                key={`${s.trNo}-${s.serviceCode}-${idx}`}
                                className="border-b border-border p-4 last:border-b-0"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground">
                                      الخدمة
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">
                                      {s.serviceName || s.serviceCode}
                                    </div>
                                  </div>
                                  <span className="font-semibold tabular-nums text-foreground">
                                    {formatCountAr(s.quantity)}
                                  </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                  <div className="border border-border bg-muted/30 px-3 py-2">
                                    <div className="text-xs text-muted-foreground">
                                      السعر
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-foreground">
                                      {formatMoneyAr(s.price)}
                                    </div>
                                  </div>
                                  <div className="border border-destructive/30 bg-destructive/10 px-3 py-2">
                                    <div className="text-xs text-destructive">
                                      الخصم
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-destructive">
                                      {formatMoneyAr(s.discountValue)}
                                    </div>
                                  </div>
                                  <div className="col-span-2 rounded-xl bg-success/10 px-3 py-2">
                                    <div className="text-xs text-success">
                                      المشاركة
                                    </div>
                                    <div className="mt-1 font-semibold tabular-nums text-success">
                                      {formatMoneyAr(s.paidValue)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            className="hidden overflow-x-auto sm:block"
                            tabIndex={0}
                            role="region"
                            aria-label="خدمات المريض"
                          >
                            <table className={reportStyles.gridTable}>
                              <thead>
                                <tr>
                                  <th>الخدمة</th>
                                  <th className={reportStyles.numeric}>
                                    الكمية
                                  </th>
                                  <th className={reportStyles.numeric}>
                                    السعر
                                  </th>
                                  <th className={reportStyles.numeric}>
                                    الخصم
                                  </th>
                                  <th className={reportStyles.numeric}>
                                    المشاركة
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.services.map((s, idx) => (
                                  <tr key={`${s.trNo}-${s.serviceCode}-${idx}`}>
                                    <td data-label="الخدمة">
                                      {s.serviceName || s.serviceCode}
                                    </td>
                                    <td
                                      data-label="الكمية"
                                      className={reportStyles.numeric}
                                    >
                                      {formatCountAr(s.quantity)}
                                    </td>
                                    <td
                                      data-label="السعر"
                                      className={reportStyles.numeric}
                                    >
                                      {formatMoneyAr(s.price)}
                                    </td>
                                    <td
                                      data-label="الخصم"
                                      className={reportStyles.numeric}
                                    >
                                      {formatMoneyAr(s.discountValue)}
                                    </td>
                                    <td
                                      data-label="المشاركة"
                                      className={reportStyles.numeric}
                                    >
                                      {formatMoneyAr(s.paidValue)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </AccountingQueryBoundary>
        ) : null}
      </div>
    </>
  );
}
