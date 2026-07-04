import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Banknote, Receipt, CalendarDays } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";

const KF_LABELS: Record<string, string> = {
  consultation: "كشف استشاري",
  examination: "كشف أخصائي",
  followup: "متابعة",
  operation: "عملية جراحية",
};

const KF_PRICES: Record<string, number> = {
  consultation: 465,
  examination: 215,
};

export default function KfAccounting() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: revenue, isLoading: loadingRevenue } = trpc.kf.getRevenue.useQuery({ date });
  const { data: receipts = [], isLoading: loadingReceipts } = trpc.kf.listReceipts.useQuery({ fromDate: date, toDate: date });

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <section dir="rtl" className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">حسابات وحدة KF</h1>
        <p className="text-muted-foreground text-sm">الإيراد والإيصالات — كشف استشاري 465ج · كشف أخصائي 215ج</p>
      </div>

      {/* Date picker */}
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="revDate">التاريخ</Label>
          <DateInput
            id="revDate"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {isToday && (
          <Badge variant="secondary" className="mb-1">اليوم</Badge>
        )}
      </div>

      {/* Revenue summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1 shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيراد</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-3xl font-bold">{(revenue?.total ?? 0).toLocaleString("ar-EG")} ج</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(receipts as any[]).length} زيارة مسجلة
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Breakdown by service */}
        {Object.entries(KF_PRICES).map(([type, price]) => {
          const row = (revenue?.breakdown ?? []).find((b: any) => b.visitType === type);
          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                <CardTitle className="text-sm font-medium text-muted-foreground">{KF_LABELS[type]}</CardTitle>
                <span className="text-xs text-muted-foreground">{price} ج / كشف</span>
              </CardHeader>
              <CardContent>
                {loadingRevenue ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{(row?.subtotal ?? 0).toLocaleString("ar-EG")} ج</p>
                    <p className="text-xs text-muted-foreground mt-1">{row?.count ?? 0} كشف</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Receipts table */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
        <CardHeader className="flex flex-row items-center gap-2 py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">الإيصالات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingReceipts ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (receipts as any[]).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <CalendarDays className="mx-auto h-8 w-8 mb-2 opacity-40" />
              لا توجد زيارات في هذا التاريخ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                    <th className="px-4 py-2 text-right font-medium">#</th>
                    <th className="px-4 py-2 text-right font-medium">كود المريض</th>
                    <th className="px-4 py-2 text-right font-medium">اسم المريض</th>
                    <th className="px-4 py-2 text-right font-medium">نوع الخدمة</th>
                    <th className="px-4 py-2 text-right font-medium">الطبيب</th>
                    <th className="px-4 py-2 text-right font-medium">الرسوم</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipts as any[]).map((r: any, i: number) => (
                    <tr key={r.kfVisitId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.kfCode}</td>
                      <td className="px-4 py-2.5 font-medium">{r.patientName}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={r.fee > 0 ? "default" : "secondary"} className="text-xs">
                          {KF_LABELS[r.visitType] ?? r.visitType}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.doctorName ?? "—"}</td>
                      <td className="px-4 py-2.5 font-semibold">
                        {r.fee > 0 ? `${r.fee} ج` : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold">الإجمالي</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary">
                      {(revenue?.total ?? 0).toLocaleString("ar-EG")} ج
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
