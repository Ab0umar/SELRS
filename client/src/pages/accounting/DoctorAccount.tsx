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
import type { ServiceRevenueInput } from "@shared/accounting/contracts";
import { ArrowLeft, CircleAlert, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import AccountingShell from "./AccountingShell";
import reportStyles from "./AccountingOpReport.module.css";
import { formatCountAr, formatMoneyAr, toArabicDigits } from "./accountingFormat";

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
  const [queryInput, setQueryInput] = useState<ServiceRevenueInput | null>(null);

  const detailDoctor = detailMatch?.doctorCode ? decodeURIComponent(detailMatch.doctorCode) : "";

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
      <div className="space-y-4" dir="rtl">
        {detailDoctor ? (
          <Button variant="outline" type="button" onClick={onBack}>
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            العودة للبحث
          </Button>
        ) : null}

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="gap-1">
            <CardTitle className="text-xl tracking-tight">حساب طبيب</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              أدخل كود الطبيب والفترة ثم اضغط بحث.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود الطبيب</span>
              <Input
                value={draft.doctorCode}
                onChange={(e) => setDraft((p) => ({ ...p, doctorCode: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>من تاريخ</span>
              <Input
                type="date"
                value={draft.fromDate}
                onChange={(e) => setDraft((p) => ({ ...p, fromDate: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>إلى تاريخ</span>
              <Input
                type="date"
                value={draft.toDate}
                onChange={(e) => setDraft((p) => ({ ...p, toDate: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود الخدمة</span>
              <Input
                value={draft.serviceCode}
                placeholder="اختياري"
                onChange={(e) => setDraft((p) => ({ ...p, serviceCode: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>كود القسم</span>
              <Input
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
              <Button type="button" className="w-full" onClick={() => void runSearch()}>
                <Search className="ml-2 h-4 w-4" />
                بحث
              </Button>
            </div>
          </CardContent>
        </Card>

        {!didSearch ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            ابحث عن طبيب لعرض الحساب
          </div>
        ) : null}

        {didSearch && revenueQuery.isLoading ? <Skeleton className="h-48 w-full" /> : null}

        {didSearch && revenueQuery.isError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 py-4">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">خطأ في تحميل بيانات الطبيب</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {revenueQuery.error.message || "تحقق من الاتصال أو الفلاتر."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {didSearch && !revenueQuery.isLoading && !revenueQuery.isError && data ? (
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
                      الإجمالي · كود الطبيب {toArabicDigits(queryInput?.doctorCode ?? "")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-4">
                    <div className="rounded border p-3 text-sm">
                      <div className="text-muted-foreground">أسطر</div>
                      <div className="font-semibold">{formatCountAr(data.grandTotal.rowCount)}</div>
                    </div>
                    <div className="rounded border p-3 text-sm">
                      <div className="text-muted-foreground">إجمالي قبل الخصم</div>
                      <div className="font-semibold">{formatMoneyAr(data.grandTotal.totalGross)}</div>
                    </div>
                    <div className="rounded border p-3 text-sm">
                      <div className="text-muted-foreground">خصم</div>
                      <div className="font-semibold">{formatMoneyAr(data.grandTotal.totalDiscount)}</div>
                    </div>
                    <div className="rounded border p-3 text-sm">
                      <div className="text-muted-foreground">مدفوع</div>
                      <div className="font-semibold">{formatMoneyAr(data.grandTotal.totalPaid)}</div>
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
                    <CardContent className="space-y-4 overflow-x-auto">
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
                              <td>{s.serviceName || s.serviceCode}</td>
                              <td className={reportStyles.numeric}>{formatCountAr(s.rowCount)}</td>
                              <td className={reportStyles.numeric}>{formatMoneyAr(s.totalGross)}</td>
                              <td className={reportStyles.numeric}>{formatMoneyAr(s.totalDiscount)}</td>
                              <td className={reportStyles.numeric}>{formatMoneyAr(s.totalPaid)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className={reportStyles.grandTotalRow}>
                            <td className="font-bold">إجمالي القسم</td>
                            <td className={reportStyles.numeric}>{formatCountAr(section.subtotal.rowCount)}</td>
                            <td className={reportStyles.numeric}>{formatMoneyAr(section.subtotal.totalGross)}</td>
                            <td className={reportStyles.numeric}>{formatMoneyAr(section.subtotal.totalDiscount)}</td>
                            <td className={reportStyles.numeric}>{formatMoneyAr(section.subtotal.totalPaid)}</td>
                          </tr>
                        </tfoot>
                      </table>
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
