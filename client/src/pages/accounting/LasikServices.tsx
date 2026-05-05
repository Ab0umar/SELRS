import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import AccountingShell from "./AccountingShell";
import reportStyles from "./AccountingOpReport.module.css";
import { formatCountAr, formatMoneyAr, toArabicDigits } from "./accountingFormat";

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
  const [debouncedService, setDebouncedService] = useState(filters.serviceCode ?? "");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedService(draft.serviceCode ?? "");
    }, 300);
    return () => clearTimeout(handler);
  }, [draft.serviceCode]);

  const serviceLookup = trpc.accounting.serviceLookup.useQuery(
    { serviceCode: debouncedService, sectionCode: DEFAULT_SECTION_CODE },
    { enabled: debouncedService.length > 0 }
  );

  const servicesQuery = trpc.accounting.lasikServices.useQuery(
    { fromDate: filters.fromDate, toDate: filters.toDate, serviceCode: filters.serviceCode },
    { refetchOnWindowFocus: false }
  );

  const rows = servicesQuery.data ?? [];

  return (
    <AccountingShell>
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">خدمات الليزك</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
             <Input type="date" value={draft.fromDate} onChange={(e) => setDraft(p => ({...p, fromDate: e.target.value}))} />
             <Input type="date" value={draft.toDate} onChange={(e) => setDraft(p => ({...p, toDate: e.target.value}))} />
             <div className="space-y-1">
               <Input placeholder="كود الخدمة..." value={draft.serviceCode ?? ""} onChange={(e) => setDraft(p => ({...p, serviceCode: e.target.value.trim() || undefined}))} />
               {draft.serviceCode && (
                 <span className="text-xs text-muted-foreground block mt-1">
                   {serviceLookup.isLoading ? "جاري البحث..." : serviceLookup.data ? `الاسم: ${serviceLookup.data.serviceName}` : "غير موجود"}
                 </span>
               )}
             </div>
             <Button onClick={() => setFilters(draft)}><Search className="ml-2"/> بحث</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {servicesQuery.isLoading ? <Skeleton className="h-40 w-full" /> : (
              <table className={reportStyles.gridTable}>
                <thead>
                  <tr>
                    <th>كود الخدمة</th>
                    <th>اسم الخدمة</th>
                    <th>العدد</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.serviceCode}>
                      <td className={reportStyles.numeric}>{toArabicDigits(row.serviceCode)}</td>
                      <td>{row.serviceName}</td>
                      <td className={reportStyles.numeric}>{formatCountAr(row.quantity)}</td>
                      <td className={reportStyles.numeric}>{formatMoneyAr(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
