import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Search, ReceiptText, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { formatDateAr, toArabicDigits } from "../accounting/accountingFormat";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

const KF_LABELS: Record<string, string> = {
  consultation: "كشف استشاري",
  examination: "كشف أخصائي",
  followup: "متابعة",
  operation: "عملية جراحية",
};

function todayIso() { return new Date().toISOString().split("T")[0]; }

function readFilters(search: string) {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const today = todayIso();
  return {
    fromDate: p.get("fromDate") || today,
    toDate: p.get("toDate") || today,
    kfCode: p.get("kfCode") || "",
  };
}

function buildUrl(f: { fromDate: string; toDate: string; kfCode: string }) {
  const p = new URLSearchParams({ fromDate: f.fromDate, toDate: f.toDate });
  if (f.kfCode.trim()) p.set("kfCode", f.kfCode.trim());
  return `/kf/accounting/receipts?${p.toString()}`;
}

function fmt(n: number) { return n.toLocaleString("ar-EG"); }

export default function KfReceipts() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState("");

  useEffect(() => { setDraft(filters); setDateError(""); }, [filters]);

  const q = trpc.kf.listReceipts.useQuery(
    { fromDate: filters.fromDate, toDate: filters.toDate, kfCode: filters.kfCode || undefined },
    { refetchOnWindowFocus: false }
  );
  const rows = (q.data ?? []) as any[];
  const total = rows.reduce((s: number, r: any) => s + (r.fee ?? 0), 0);

  const apply = () => {
    if (draft.fromDate > draft.toDate) { setDateError("تاريخ البداية بعد تاريخ النهاية"); return; }
    setDateError(""); setLocation(buildUrl(draft));
  };
  const reset = () => { const f = { fromDate: todayIso(), toDate: todayIso(), kfCode: "" }; setDraft(f); setLocation(buildUrl(f)); };

  return (
    <div className="space-y-5" dir="rtl">
      <Card className="print:hidden shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-xl">استعلام الإيصالات — KF</CardTitle>
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
            <DateInput value={draft.fromDate} onChange={(e) => { setDraft((p) => ({ ...p, fromDate: e.target.value })); setDateError(""); }} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>إلى تاريخ</span>
            <DateInput value={draft.toDate} onChange={(e) => { setDraft((p) => ({ ...p, toDate: e.target.value })); setDateError(""); }} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>كود المريض (KF)</span>
            <Input
              placeholder="KF-0001"
              value={draft.kfCode}
              onChange={(e) => setDraft((p) => ({ ...p, kfCode: e.target.value }))}
            />
          </label>
          {dateError && <p className="col-span-full text-sm text-destructive">{dateError}</p>}
          <div className="flex items-end gap-2">
            <Button className="flex-1" onClick={apply}><Search className="ml-2 h-4 w-4" />تطبيق</Button>
            <Button variant="outline" onClick={reset}>إعادة ضبط</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
        <CardContent className="pt-4 space-y-0">
          {!q.isLoading && !q.isError && rows.length > 0 && (
            <div className="text-xs text-muted-foreground mb-2">
              عرض {toArabicDigits(String(rows.length))} نتيجة · إجمالي <span className="font-semibold text-primary">{fmt(total)} ج</span>
            </div>
          )}

          {q.isLoading && <Skeleton className="h-40 w-full" />}

          {!q.isLoading && rows.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <div className="flex justify-center mb-3">
                <ReceiptText className="h-8 w-8 text-muted-foreground/60" />
              </div>
              لا توجد إيصالات مطابقة للفلاتر الحالية.
            </div>
          )}

          {!q.isLoading && rows.length > 0 && isMobile && (
            <div className="space-y-2">
              {rows.map((row: any, i: number) => (
                <div key={row.kfVisitId} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{row.patientName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.kfCode}</div>
                    </div>
                    <span className="font-semibold tabular-nums text-primary">
                      {row.fee > 0 ? fmt(row.fee) : <span className="text-muted-foreground">—</span>}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={row.fee > 0 ? "default" : "secondary"} className="text-xs">
                      {KF_LABELS[row.visitType] ?? row.visitType}
                    </Badge>
                    <span className="text-muted-foreground">{row.doctorName ?? "—"}</span>
                    <span className="mr-auto text-muted-foreground">{formatDateAr(row.visitDate)}</span>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-3 text-sm font-bold flex items-center justify-between">
                <span>الإجمالي</span>
                <span className="tabular-nums text-primary">{fmt(total)}</span>
              </div>
            </div>
          )}

          {!q.isLoading && rows.length > 0 && !isMobile && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                    <th className="px-3 py-2 text-right font-medium">#</th>
                    <th className="px-3 py-2 text-right font-medium">كود المريض</th>
                    <th className="px-3 py-2 text-right font-medium">اسم المريض</th>
                    <th className="px-3 py-2 text-right font-medium">نوع الخدمة</th>
                    <th className="px-3 py-2 text-right font-medium">الطبيب</th>
                    <th className="px-3 py-2 text-right font-medium">التاريخ</th>
                    <th className="px-3 py-2 text-right font-medium tabular-nums">الرسوم (ج)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, i: number) => (
                    <tr key={row.kfVisitId} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs tabular-nums">{toArabicDigits(String(i + 1))}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{row.kfCode}</td>
                      <td className="px-3 py-2.5 font-medium">{row.patientName}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={row.fee > 0 ? "default" : "secondary"} className="text-xs">
                          {KF_LABELS[row.visitType] ?? row.visitType}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.doctorName ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDateAr(row.visitDate)}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums">
                        {row.fee > 0 ? fmt(row.fee) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={6} className="px-3 py-2.5 font-bold">الإجمالي</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-primary">{fmt(total)}</td>
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
