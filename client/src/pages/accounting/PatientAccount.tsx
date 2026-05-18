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
import type { PatientLasikSummaryInput } from "@shared/accounting/contracts";
import { ArrowLeft, CircleAlert, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import AccountingShell from "./AccountingShell";
import reportStyles from "./AccountingOpReport.module.css";
import {
  formatCountAr,
  formatDateAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";

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
    if (!code) return;
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

  return (
    <AccountingShell>
      <div className="space-y-4 sm:space-y-5 md:space-y-6" dir="rtl">
        {detailCode ? (
          <Button variant="outline" type="button" onClick={onBack}>
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            العودة للبحث
          </Button>
        ) : null}

        <Card className="border-border shadow-sm">
          <CardHeader className="gap-1">
            <CardTitle className="text-xl tracking-tight">حساب مريض</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              أدخل كود المريض والفترة ثم اضغط بحث.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label
              htmlFor="patient-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود المريض</span>
              <Input
                id="patient-code"
                value={draft.patientCode}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, patientCode: e.target.value }))
                }
                placeholder="مثال: 01354"
              />
            </label>
            <label
              htmlFor="patient-from-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>من تاريخ</span>
              <Input
                id="patient-from-date"
                type="date"
                value={draft.fromDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
              />
            </label>
            <label
              htmlFor="patient-to-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>إلى تاريخ</span>
              <Input
                id="patient-to-date"
                type="date"
                value={draft.toDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
              />
            </label>
            {dateError && (
              <p className="text-[11px] text-red-500 md:col-span-2">
                تاريخ البداية بعد تاريخ النهاية
              </p>
            )}
            <label
              htmlFor="patient-section-code"
              className="space-y-1.5 text-sm font-medium"
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
                <Search className="ml-2 h-4 w-4" aria-hidden />
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

        {didSearch && summaryQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : null}

        {didSearch && summaryQuery.isError ? (
          <Card className="border-error/30 bg-error/5">
            <CardContent className="flex items-start gap-3 py-4">
              <CircleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-error"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-error">
                  {getErrorContext(summaryQuery.error.message).title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getErrorContext(summaryQuery.error.message).hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                      ملخص · {toArabicDigits(data.patientCode)}{" "}
                      {data.patientName ? `— ${data.patientName}` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">إيصالات</div>
                      <div className="font-semibold tabular-nums">
                        {formatCountAr(data.totals.totalReceipts)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">خدمات</div>
                      <div className="font-semibold tabular-nums">
                        {formatCountAr(data.totals.totalServices)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">
                        إجمالي قبل الخصم
                      </div>
                      <div className="font-semibold tabular-nums">
                        {formatMoneyAr(data.totals.totalGross)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">خصم</div>
                      <div className="font-semibold tabular-nums">
                        {formatMoneyAr(data.totals.totalDiscount)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">مدفوع</div>
                      <div className="font-semibold tabular-nums">
                        {formatMoneyAr(data.totals.totalPaid)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">آخر حركة</div>
                      <div className="font-semibold">
                        {data.totals.lastTransactionDate
                          ? formatDateAr(data.totals.lastTransactionDate)
                          : "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {data.receipts.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">الإيصالات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:hidden">
                        {data.receipts.map((r) => (
                          <div
                            key={`${r.sectionCode}:${r.trTy}:${r.trNo}`}
                            className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[11px] text-slate-500">
                                  {formatDateAr(String(r.transactionDate))}
                                </div>
                                <div className="mt-1 text-sm font-semibold text-foreground">
                                  إيصال {toArabicDigits(r.trNo)}
                                </div>
                              </div>
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {formatMoneyAr(r.paidValue)}
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-muted px-3 py-2">
                                <div className="text-[10px] text-slate-500">
                                  الإجمالي
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-foreground">
                                  {formatMoneyAr(r.total)}
                                </div>
                              </div>
                              <div className="rounded-xl bg-rose-50 px-3 py-2">
                                <div className="text-[10px] text-rose-700">
                                  المدفوع
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-rose-700">
                                  {formatMoneyAr(r.paidValue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden overflow-x-auto sm:block">
                        <table className={reportStyles.gridTable}>
                          <thead>
                            <tr>
                              <th>رقم الإيصال</th>
                              <th>التاريخ</th>
                              <th className={reportStyles.numeric}>الإجمالي</th>
                              <th className={reportStyles.numeric}>المدفوع</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.receipts.map((r) => (
                              <tr key={`${r.sectionCode}:${r.trTy}:${r.trNo}`}>
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
                            className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[11px] text-slate-500">
                                  الخدمة
                                </div>
                                <div className="mt-1 text-sm font-semibold text-foreground">
                                  {s.serviceName || s.serviceCode}
                                </div>
                              </div>
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {formatCountAr(s.quantity)}
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-muted px-3 py-2">
                                <div className="text-[10px] text-slate-500">
                                  السعر
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-foreground">
                                  {formatMoneyAr(s.price)}
                                </div>
                              </div>
                              <div className="rounded-xl bg-rose-50 px-3 py-2">
                                <div className="text-[10px] text-rose-700">
                                  الخصم
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-rose-700">
                                  {formatMoneyAr(s.discountValue)}
                                </div>
                              </div>
                              <div className="col-span-2 rounded-xl bg-emerald-50 px-3 py-2">
                                <div className="text-[10px] text-emerald-700">
                                  المشاركة
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-emerald-700">
                                  {formatMoneyAr(s.paidValue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden overflow-x-auto sm:block">
                        <table className={reportStyles.gridTable}>
                          <thead>
                            <tr>
                              <th>الخدمة</th>
                              <th className={reportStyles.numeric}>الكمية</th>
                              <th className={reportStyles.numeric}>السعر</th>
                              <th className={reportStyles.numeric}>الخصم</th>
                              <th className={reportStyles.numeric}>المشاركة</th>
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
      </div>
    </AccountingShell>
  );
}
