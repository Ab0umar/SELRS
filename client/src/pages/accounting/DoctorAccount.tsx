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
import type { ServiceRevenueInput } from "@shared/accounting/contracts";
import { ArrowLeft, CircleAlert, Search, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import AccountingShell from "./AccountingShell";
import reportStyles from "./AccountingOpReport.module.css";
import {
  formatCountAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";

type ServiceRevenueQuery = {
  data?: import("@shared/accounting/contracts").ServiceRevenueOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    serviceRevenue: {
      useQuery: (
        input: ServiceRevenueInput,
        options?: { enabled?: boolean; refetchOnWindowFocus?: boolean },
      ) => ServiceRevenueQuery;
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

export default function DoctorAccount() {
  const [, setLocation] = useLocation();
  const [, detailMatch] = useRoute("/accounting/doctor/:doctorCode");

  const defaults = defaultDateRange();
  const [draft, setDraft] = useState({
    doctorCode: "",
    fromDate: defaults.fromDate,
    toDate: defaults.toDate,
    serviceCode: "",
    sectionCode: DEFAULT_SECTION_CODE,
  });
  const [didSearch, setDidSearch] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [queryInput, setQueryInput] = useState<ServiceRevenueInput | null>(
    null,
  );

  const detailDoctor = detailMatch?.doctorCode
    ? decodeURIComponent(detailMatch.doctorCode)
    : "";

  useEffect(() => {
    if (!detailDoctor) return;
    const dr = defaultDateRange();
    setDraft((prev) => ({
      ...prev,
      doctorCode: detailDoctor,
      fromDate: dr.fromDate,
      toDate: dr.toDate,
      sectionCode: DEFAULT_SECTION_CODE,
      serviceCode: "",
    }));
    setDidSearch(true);
    setQueryInput({
      doctorCode: detailDoctor,
      fromDate: dr.fromDate,
      toDate: dr.toDate,
      sectionCode: DEFAULT_SECTION_CODE,
    });
  }, [detailDoctor]);

  const enabled =
    queryInput != null &&
    typeof queryInput.doctorCode === "string" &&
    queryInput.doctorCode.trim().length > 0;

  const revenueQuery = accountingTrpc.accounting.serviceRevenue.useQuery(
    queryInput ?? {
      doctorCode: "",
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      sectionCode: DEFAULT_SECTION_CODE,
    },
    { enabled, refetchOnWindowFocus: false },
  );

  const data = revenueQuery.data;

  const runSearch = () => {
    const code = draft.doctorCode.trim();
    if (!code) return;
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setDateError(true);
      return;
    }
    setDateError(false);
    const svc = draft.serviceCode.trim();
    setDidSearch(true);
    setQueryInput({
      doctorCode: code,
      fromDate: draft.fromDate,
      toDate: draft.toDate,
      sectionCode: draft.sectionCode ?? DEFAULT_SECTION_CODE,
      ...(svc ? { serviceCode: svc } : {}),
    });
  };

  const onBack = () => {
    setLocation("/accounting/doctor");
  };

  return (
    <AccountingShell>
      <div className="space-y-4 sm:space-y-5 md:space-y-6" dir="rtl">
        {detailDoctor ? (
          <Button variant="outline" type="button" onClick={onBack}>
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            العودة للبحث
          </Button>
        ) : null}

        <Card className="border-border shadow-sm">
          <CardHeader className="gap-1">
            <CardTitle className="text-xl tracking-tight">حساب طبيب</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              أدخل كود الطبيب والفترة ثم اضغط بحث.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label
              htmlFor="doctor-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود الطبيب</span>
              <Input
                id="doctor-code"
                value={draft.doctorCode}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, doctorCode: e.target.value }))
                }
              />
            </label>
            <label
              htmlFor="doctor-from-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>من تاريخ</span>
              <Input
                id="doctor-from-date"
                type="date"
                value={draft.fromDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
              />
            </label>
            <label
              htmlFor="doctor-to-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>إلى تاريخ</span>
              <Input
                id="doctor-to-date"
                type="date"
                value={draft.toDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
              />
            </label>
            {dateError && (
              <p className="text-[11px] text-destructive md:col-span-2">
                تاريخ البداية بعد تاريخ النهاية
              </p>
            )}
            <label
              htmlFor="doctor-service-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود الخدمة</span>
              <Input
                id="doctor-service-code"
                value={draft.serviceCode}
                placeholder="اختياري"
                onChange={(e) =>
                  setDraft((p) => ({ ...p, serviceCode: e.target.value }))
                }
              />
            </label>
            <label
              htmlFor="doctor-section-code"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>كود القسم</span>
              <Input
                id="doctor-section-code"
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
                aria-label="بحث عن طبيب"
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
              <Stethoscope
                className="h-8 w-8 text-muted-foreground/60"
                aria-hidden
              />
            </div>
            ابحث عن طبيب لعرض الحساب
          </div>
        ) : null}

        {didSearch && revenueQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : null}

        {didSearch && revenueQuery.isError ? (
          <Card className="border-error/30 bg-error/5">
            <CardContent className="flex items-start gap-3 py-4">
              <CircleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-error"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-error">
                  {getErrorContext(revenueQuery.error.message).title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getErrorContext(revenueQuery.error.message).hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {didSearch &&
        !revenueQuery.isLoading &&
        !revenueQuery.isError &&
        data ? (
          <>
            {data.grandTotal.rowCount === 0 ? (
              <div className="rounded-lg border p-6 text-center text-muted-foreground">
                لا توجد بيانات للفلاتر المحددة.
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      الإجمالي · كود الطبيب{" "}
                      {toArabicDigits(queryInput?.doctorCode ?? "")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">أسطر</div>
                      <div className="font-semibold tabular-nums">
                        {formatCountAr(data.grandTotal.rowCount)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">
                        إجمالي قبل الخصم
                      </div>
                      <div className="font-semibold tabular-nums">
                        {formatMoneyAr(data.grandTotal.totalGross)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">خصم</div>
                      <div className="font-semibold tabular-nums">
                        {formatMoneyAr(data.grandTotal.totalDiscount)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                      <div className="text-muted-foreground">مدفوع</div>
                      <div className="font-semibold tabular-nums">
                        {formatMoneyAr(data.grandTotal.totalPaid)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {data.sections.map((section) => (
                  <Card key={section.sectionCode}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        القسم {toArabicDigits(String(section.sectionCode))}
                        {section.sectionName ? ` — ${section.sectionName}` : ""}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:hidden">
                        {section.services.map((s) => (
                          <div
                            key={s.serviceCode}
                            className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[11px] text-muted-foreground">
                                  الخدمة
                                </div>
                                <div className="mt-1 text-sm font-semibold text-foreground">
                                  {s.serviceName || s.serviceCode}
                                </div>
                              </div>
                              <span className="rounded-full bg-primary text-primary-foreground">
                                {formatCountAr(s.rowCount)} سطر
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-muted px-3 py-2">
                                <div className="text-[10px] text-muted-foreground">
                                  الإجمالي
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-foreground">
                                  {formatMoneyAr(s.totalGross)}
                                </div>
                              </div>
                              <div className="rounded-xl bg-destructive/10 px-3 py-2">
                                <div className="text-[10px] text-destructive">
                                  الخصم
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-destructive">
                                  {formatMoneyAr(s.totalDiscount)}
                                </div>
                              </div>
                              <div className="col-span-2 rounded-xl bg-success/10 px-3 py-2">
                                <div className="text-[10px] text-success">
                                  المدفوع
                                </div>
                                <div className="mt-1 font-semibold tabular-nums text-success">
                                  {formatMoneyAr(s.totalPaid)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                          <div className="text-xs font-semibold text-primary">
                            إجمالي القسم
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-background px-3 py-2">
                              <div className="text-[10px] text-muted-foreground">
                                الأسطر
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {formatCountAr(section.subtotal.rowCount)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-background px-3 py-2">
                              <div className="text-[10px] text-muted-foreground">
                                الإجمالي
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {formatMoneyAr(section.subtotal.totalGross)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-background px-3 py-2">
                              <div className="text-[10px] text-muted-foreground">
                                الخصم
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {formatMoneyAr(section.subtotal.totalDiscount)}
                              </div>
                            </div>
                            <div className="rounded-xl bg-background px-3 py-2">
                              <div className="text-[10px] text-muted-foreground">
                                المدفوع
                              </div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">
                                {formatMoneyAr(section.subtotal.totalPaid)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden overflow-x-auto sm:block">
                        <table className={reportStyles.gridTable}>
                          <thead>
                            <tr>
                              <th>الخدمة</th>
                              <th className={reportStyles.numeric}>الأسطر</th>
                              <th className={reportStyles.numeric}>الإجمالي</th>
                              <th className={reportStyles.numeric}>الخصم</th>
                              <th className={reportStyles.numeric}>المدفوع</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.services.map((s) => (
                              <tr key={s.serviceCode}>
                                <td data-label="الخدمة">
                                  {s.serviceName || s.serviceCode}
                                </td>
                                <td
                                  data-label="الأسطر"
                                  className={reportStyles.numeric}
                                >
                                  {formatCountAr(s.rowCount)}
                                </td>
                                <td
                                  data-label="الإجمالي"
                                  className={reportStyles.numeric}
                                >
                                  {formatMoneyAr(s.totalGross)}
                                </td>
                                <td
                                  data-label="الخصم"
                                  className={reportStyles.numeric}
                                >
                                  {formatMoneyAr(s.totalDiscount)}
                                </td>
                                <td
                                  data-label="المدفوع"
                                  className={reportStyles.numeric}
                                >
                                  {formatMoneyAr(s.totalPaid)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className={reportStyles.grandTotalRow}>
                              <td className="font-bold">إجمالي القسم</td>
                              <td className={reportStyles.numeric}>
                                {formatCountAr(section.subtotal.rowCount)}
                              </td>
                              <td className={reportStyles.numeric}>
                                {formatMoneyAr(section.subtotal.totalGross)}
                              </td>
                              <td className={reportStyles.numeric}>
                                {formatMoneyAr(section.subtotal.totalDiscount)}
                              </td>
                              <td className={reportStyles.numeric}>
                                {formatMoneyAr(section.subtotal.totalPaid)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </>
        ) : null}
      </div>
    </AccountingShell>
  );
}
