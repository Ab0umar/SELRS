import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import AccountingShell from "./AccountingShell";
import reportStyles from "./AccountingOpReport.module.css";
import {
  formatCountAr,
  formatMoneyAr,
  toArabicDigits,
} from "./accountingFormat";

const DEFAULT_SECTION_CODE = 15;

type LasikServicesFilters = {
  fromDate: string;
  toDate: string;
  serviceCode?: string;
};

function defaultDateRange(): LasikServicesFilters {
  const today = new Date();
  return {
    fromDate: today.toISOString().slice(0, 10),
    toDate: today.toISOString().slice(0, 10),
  };
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
    <AccountingShell>
      <div className="space-y-4 sm:space-y-5 md:space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">
              خدمات الليزك
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label
              htmlFor="lasik-svc-from-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>من تاريخ</span>
              <Input
                id="lasik-svc-from-date"
                type="date"
                value={draft.fromDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, fromDate: e.target.value }))
                }
              />
            </label>
            <label
              htmlFor="lasik-svc-to-date"
              className="space-y-1.5 text-sm font-medium"
            >
              <span>إلى تاريخ</span>
              <Input
                id="lasik-svc-to-date"
                type="date"
                value={draft.toDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, toDate: e.target.value }))
                }
              />
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
                    ? "جاري البحث..."
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
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="grid gap-3 sm:hidden">
              {servicesQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                rows.map((row) => (
                  <div
                    key={row.serviceCode}
                    className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500">
                          كود الخدمة
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {toArabicDigits(row.serviceCode)}
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {formatCountAr(row.quantity)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-medium text-foreground">
                      {row.serviceName}
                    </div>
                    <div className="mt-4 rounded-xl bg-muted px-3 py-2">
                      <div className="text-[10px] text-slate-500">الإجمالي</div>
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
    </AccountingShell>
  );
}
