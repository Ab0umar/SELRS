import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { localISODate } from "@/lib/utils";
import reportStyles from "./AccountingOpReport.module.css";
import {
  formatCountAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";
import { DateInput } from "@/components/ui/date-input";

const DEFAULT_SECTION_CODE = 15;

type LasikServicesFilters = {
  fromDate: string;
  toDate: string;
  serviceCode?: string;
};

function defaultDateRange(): LasikServicesFilters {
  const today = localISODate();
  return { fromDate: today, toDate: today };
}

export default function LasikServices() {
  const [filters, setFilters] = useState(defaultDateRange());
  const [draft, setDraft] = useState(filters);
  const [debouncedService, setDebouncedService] = useState(
    filters.serviceCode ?? "",
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedService(draft.serviceCode ?? "");
    }, 300);
    return () => clearTimeout(handler);
  }, [draft.serviceCode]);

  const serviceLookup = trpc.accounting.serviceLookup.useQuery(
    { serviceCode: debouncedService, sectionCode: DEFAULT_SECTION_CODE },
    { enabled: debouncedService.length > 0 },
  );

  const servicesQuery = trpc.accounting.lasikServices.useQuery(
    {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      serviceCode: filters.serviceCode,
    },
    { refetchOnWindowFocus: false },
  );

  const rows = servicesQuery.data ?? [];

  return (
    <>
      <div className="space-y-2 sm:space-y-2.5" dir="rtl">
        <Card className="w-fit max-w-full border-border/60 shadow-xs">
          <CardContent className="w-fit max-w-full space-y-2 p-2.5 sm:p-3">
            {/* layout-refined-add-filter */}
            <div className="accounting-add-filter flex w-fit max-w-full flex-wrap items-end gap-2" data-add-filter="1" dir="rtl">
<label
              htmlFor="lasik-svc-from-date"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>من تاريخ</span>
              <DateInput
                id="lasik-svc-from-date"
                value={draft.fromDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
               className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </label>
            <label
              htmlFor="lasik-svc-to-date"
              className="flex w-fit min-w-[7rem] flex-col gap-1 text-base font-bold text-foreground"
            >
              <span>إلى تاريخ</span>
              <DateInput
                id="lasik-svc-to-date"
                value={draft.toDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
               className="h-11 w-[11rem] shrink-0 rounded-lg border border-border bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </label>
            <label htmlFor="lasik-svc-service-code" className="space-y-1">
              <span className="block text-sm font-medium">كود الخدمة</span>
              <Input
                id="lasik-svc-service-code"
                placeholder="اختياري"
                value={draft.serviceCode ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    serviceCode: e.target.value.trim() || undefined,
                  }))
                }
              />
              {draft.serviceCode && (
                <span className="text-xs text-muted-foreground block mt-1">
                  {serviceLookup.isLoading
                    ? "جاري البحث…"
                    : serviceLookup.data
                      ? `الاسم: ${serviceLookup.data.serviceName}`
                      : "غير موجود"}
                </span>
              )}
            </label>
            <Button
              onClick={() => setFilters(draft)}
              aria-label="بحث عن خدمة الليزك"
            >
              <Search className="ml-2" aria-hidden /> بحث
            </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="grid gap-2 sm:hidden">
              {servicesQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                rows.map((row) => (
                  <div
                    key={row.serviceCode}
                    className="rounded-xl border border-border bg-background p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="shrink-0">
                        <div className="text-sm text-muted-foreground">
                          كود الخدمة
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {toArabicDigits(row.serviceCode)}
                        </div>
                      </div>
                      <span className="rounded-full bg-primary text-primary-foreground">
                        {formatCountAr(row.quantity)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-medium text-foreground">
                      {row.serviceName}
                    </div>
                    <div className="mt-4 rounded-xl bg-muted px-2 py-1.5">
                      <div className="text-[10px] text-muted-foreground">
                        الإجمالي
                      </div>
                      <div className="mt-1 font-semibold tabular-nums text-foreground">
                        {formatMoneyAr(row.price)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              {servicesQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <table className={reportStyles.gridTable}>
                  <thead>
                    <tr>
                      <th scope="col">كود الخدمة</th>
                      <th scope="col">اسم الخدمة</th>
                      <th scope="col">العدد</th>
                      <th scope="col">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.serviceCode}>
                        <td
                          data-label="كود الخدمة"
                          className={reportStyles.numeric}
                        >
                          {toArabicDigits(row.serviceCode)}
                        </td>
                        <td data-label="اسم الخدمة">{row.serviceName}</td>
                        <td data-label="العدد" className={reportStyles.numeric}>
                          {formatCountAr(row.quantity)}
                        </td>
                        <td
                          data-label="الإجمالي"
                          className={reportStyles.numeric}
                        >
                          {formatMoneyAr(row.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
