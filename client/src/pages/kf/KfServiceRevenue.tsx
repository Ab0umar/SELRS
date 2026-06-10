import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Search, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { formatDateAr, formatCountAr } from "../accounting/accountingFormat";

function todayIso() { return new Date().toISOString().split("T")[0]; }
function readFilters(search: string) {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const today = todayIso();
  return { fromDate: p.get("fromDate") || today, toDate: p.get("toDate") || today };
}
function buildUrl(f: { fromDate: string; toDate: string }) {
  return `/kf/accounting/service-revenue?fromDate=${f.fromDate}&toDate=${f.toDate}`;
}
function fmt(n: number) { return n.toLocaleString("ar-EG"); }

export default function KfServiceRevenue() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState("");

  useEffect(() => { setDraft(filters); setDateError(""); }, [filters]);

  const q = trpc.kf.getServiceRevenue.useQuery(filters, { refetchOnWindowFocus: false });
  const rows = (q.data?.rows ?? []) as any[];
  const grandTotal = q.data?.grandTotal ?? 0;
  const totalCount = q.data?.totalCount ?? 0;

  const apply = () => {
    if (draft.fromDate > draft.toDate) { setDateError("تاريخ البداية بعد تاريخ النهاية"); return; }
    setDateError(""); setLocation(buildUrl(draft));
  };
  const reset = () => { const f = { fromDate: todayIso(), toDate: todayIso() }; setDraft(f); setLocation(buildUrl(f)); };

  return (
    <div className="space-y-5" dir="rtl">
      <Card className="print:hidden">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">إيراد الخدمات — KF</CardTitle>
              <CardDescription className="mt-1 text-sm">تفصيل الإيراد حسب نوع الخدمة للفترة المختارة.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void q.refetch()} disabled={q.isFetching}>
                <RefreshCw className={q.isFetching ? "animate-spin" : ""} />
                تحديث
              </Button>
              <Button onClick={() => window.print()} disabled={q.isLoading || rows.length === 0}>
                <Printer className="ml-2 h-4 w-4" />
                طباعة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span>من تاريخ</span>
            <Input type="date" value={draft.fromDate} onChange={(e) => { setDraft((p) => ({ ...p, fromDate: e.target.value })); setDateError(""); }} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>إلى تاريخ</span>
            <Input type="date" value={draft.toDate} onChange={(e) => { setDraft((p) => ({ ...p, toDate: e.target.value })); setDateError(""); }} />
          </label>
          {dateError && <p className="col-span-full text-sm text-destructive">{dateError}</p>}
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button className="flex-1" onClick={apply}><Search className="ml-2 h-4 w-4" />تطبيق</Button>
            <Button variant="outline" onClick={reset}>إعادة ضبط</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">إجمالي الإيراد</CardTitle>
          </CardHeader>
          <CardContent>
            {q.isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-3xl font-bold text-primary tabular-nums">{fmt(grandTotal)} ج</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">إجمالي الكشوفات</CardTitle>
          </CardHeader>
          <CardContent>
            {q.isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-bold tabular-nums">{formatCountAr(totalCount)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Service breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">تفصيل الخدمات</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            الفترة: من {formatDateAr(filters.fromDate)} إلى {formatDateAr(filters.toDate)}
          </p>

          {q.isLoading && (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          )}

          {!q.isLoading && rows.length === 0 && (
            <p className="py-10 text-center text-muted-foreground text-sm">لا توجد بيانات للفترة المختارة.</p>
          )}

          {!q.isLoading && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                    <th className="px-3 py-2 text-right font-medium">الخدمة</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">العدد</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">سعر الوحدة (ج)</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">الإجمالي (ج)</th>
                    <th className="px-3 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.visitType} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <Badge variant={row.unitPrice > 0 ? "default" : "secondary"} className="text-xs">{row.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{formatCountAr(row.count)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{row.unitPrice > 0 ? fmt(row.unitPrice) : "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold">{fmt(row.total)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground text-xs">
                        {grandTotal > 0 ? `${((row.total / grandTotal) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20 font-bold">
                    <td className="px-3 py-2.5">الإجمالي العام</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatCountAr(totalCount)}</td>
                    <td className="px-3 py-2.5">—</td>
                    <td className="px-3 py-2.5 tabular-nums text-primary">{fmt(grandTotal)}</td>
                    <td className="px-3 py-2.5">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
