import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { fmt, fmtDate } from "./accountingFormat";
import { AccountingPage } from "./AccountingPagePrimitives";
import { useAccountingTabMetrics } from "./accountingTabMetrics";

const FILTERS = [["all", "الكل"], ["instapay", "انستاباي"], ["home", "البيت"], ["abu-omar", "أبو عمر"], ["dr-saadany", "د. السعدني"], ["rent", "إيجار"], ["salaries", "مرتبات"], ["supplies", "مستلزمات عمليات"], ["device-maintenance", "صيانة أجهزة"], ["advances", "سلف"], ["insurance", "تأمينات"], ["taxes", "ضرائب"]] as const;
type Filter = (typeof FILTERS)[number][0];
const YEARS = ["الكل", "2026", "2025", "2024"] as const;
type ExpenseRow = { id: number; txDate: string; notes: string | null; expense: number };

export default function AccountingExpenses() {
  const [category, setCategory] = useState<Filter>("all"), [year, setYear] = useState<(typeof YEARS)[number]>("الكل"), [page, setPage] = useState(1);
  const dateFrom = year === "الكل" ? undefined : `${year}-01-01`, dateTo = year === "الكل" ? undefined : `${year}-12-31`;
  const query = trpc.accounting.accExpenses.useQuery({ category, dateFrom, dateTo, page, pageSize: 50 }, { placeholderData: previous => previous });
  const data = query.data, pages = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  useAccountingTabMetrics([{ label: "مصروفات الفلتر", value: query.isLoading ? "…" : fmt(data?.totalExpense), icon: TrendingDown }]);
  return <AccountingPage><div className="space-y-3.5" dir="rtl">
    <section className="rounded-xl border border-border/60 bg-card p-3 sm:p-4"><div className="flex flex-wrap gap-2"><div className="flex overflow-hidden rounded-lg border border-border">{YEARS.map(y => <button key={y} type="button" onClick={() => { setYear(y); setPage(1); }} className={cn("px-2 py-1.5 text-xs", year === y ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{y}</button>)}</div></div><div className="mt-3 flex flex-wrap gap-2">{FILTERS.map(([value, label]) => <button key={value} type="button" onClick={() => { setCategory(value); setPage(1); }} className={cn("rounded-full border px-3 py-2 text-xs font-bold", category === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted")}>{label}</button>)}</div></section>
    <section className="overflow-hidden rounded-[28px] border border-border bg-background shadow-sm"><div className="flex justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-bold">مصروفات الخزنة</h2><p className="mt-1 text-xs text-muted-foreground">{(data?.total ?? 0).toLocaleString("ar-EG")} قيد · {fmt(data?.totalExpense)} ج.م</p></div></div>
      {query.isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">جاري التحميل…</div> : !data?.rows.length ? <div className="p-10 text-center text-sm text-muted-foreground">لا توجد مصروفات مطابقة</div> : <><div className="divide-y divide-border sm:hidden">{data.rows.map((row: ExpenseRow) => <div key={row.id} className="flex justify-between gap-3 p-4"><div><div className="text-xs text-muted-foreground">{fmtDate(row.txDate)}</div><div className="mt-1 text-sm">{row.notes || "—"}</div></div><b className="tabular-nums text-destructive">{fmt(row.expense)}</b></div>)}</div><div className="hidden overflow-x-auto sm:block"><table className="w-full text-sm"><thead><tr className="bg-muted text-xs text-muted-foreground"><th className="px-4 py-3 text-right">التاريخ</th><th className="px-4 py-3 text-right">البيان</th><th className="px-4 py-3 text-left">المصروف</th></tr></thead><tbody className="divide-y divide-border">{data.rows.map((row: ExpenseRow) => <tr key={row.id}><td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.txDate)}</td><td className="px-4 py-3">{row.notes || "—"}</td><td className="px-4 py-3 text-left font-bold text-destructive">{fmt(row.expense)}</td></tr>)}</tbody></table></div></>}
      {pages > 1 && <div className="flex items-center justify-center gap-3 border-t border-border p-3"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><span className="text-xs">{page} / {pages}</span><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button></div>}
    </section></div></AccountingPage>;
}
