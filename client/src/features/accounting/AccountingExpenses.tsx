import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { fmt, fmtDate } from "./accountingFormat";
import { AccountingPage } from "./AccountingPagePrimitives";
import { useAccountingTabMetrics } from "./accountingTabMetrics";

const FILTERS = [
  ["all", "الكل"],
  ["instapay", "انستاباي"],
  ["home", "البيت"],
  ["abu-omar", "أبو عمر"],
  ["dr-saadany", "د. السعدني"],
  ["rent", "إيجار"],
  ["salaries", "مرتبات"],
  ["supplies", "مستلزمات عمليات"],
  ["device-maintenance", "صيانة أجهزة"],
  ["advances", "سلف"],
  ["insurance", "تأمينات"],
  ["taxes", "ضرائب"],
] as const;
type Filter = (typeof FILTERS)[number][0];
const YEARS = ["الكل", "2026", "2025", "2024"] as const;
type ExpenseRow = {
  id: number;
  txDate: string;
  notes: string | null;
  expense: number;
};

export default function AccountingExpenses() {
  const [category, setCategory] = useState<Filter>("all");
  const [year, setYear] = useState<(typeof YEARS)[number]>("الكل");
  const [page, setPage] = useState(1);
  const dateFrom = year === "الكل" ? undefined : `${year}-01-01`;
  const dateTo = year === "الكل" ? undefined : `${year}-12-31`;
  const query = trpc.accounting.accExpenses.useQuery(
    { category, dateFrom, dateTo, page, pageSize: 50 },
    { placeholderData: (previous) => previous },
  );
  const data = query.data;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  const hasFilters = category !== "all" || year !== "الكل";

  useAccountingTabMetrics([
    {
      label: "مصروفات الفلتر",
      value: query.isError
        ? "تعذر تحميل المصروفات"
        : query.isFetching
          ? "جارٍ تحميل المصروفات"
          : fmt(data?.totalExpense),
      icon: TrendingDown,
    },
  ]);

  const resetFilters = () => {
    setCategory("all");
    setYear("الكل");
    setPage(1);
  };

  return (
    <AccountingPage title="مصروفات الخزنة">
      <div className="accounting-expenses space-y-3.5" dir="rtl">
        {query.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-4 border-y border-border py-4"
          >
            <p className="text-sm">تعذر تحميل المصروفات.</p>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => void query.refetch()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> إعادة
              المحاولة
            </Button>
          </div>
        ) : null}

        <div hidden={query.isError} aria-busy={query.isFetching}>
          {query.isFetching && !query.isLoading ? (
            <p role="status" className="mb-2 text-xs text-muted-foreground">
              جارٍ تحديث المصروفات
            </p>
          ) : null}
          <section className="border-b border-border pb-3">
            <div className="flex flex-wrap gap-2">
              <fieldset className="flex overflow-hidden rounded-md border border-border">
                <legend className="sr-only">تصفية السنة</legend>
                {YEARS.map((item) => (
                  <Button variant="bare"
                    key={item}
                    type="button"
                    aria-pressed={year === item}
                    onClick={() => {
                      setYear(item);
                      setPage(1);
                    }}
                    className={cn(
                      "min-h-11 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      year === item
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-background",
                    )}
                  >
                    {item}
                  </Button>
                ))}
              </fieldset>
            </div>
            <fieldset className="mt-3 flex flex-wrap gap-2 border-0 p-0">
              <legend className="sr-only">تصفية نوع المصروف</legend>
              {FILTERS.map(([value, label]) => (
                <Button variant="bare"
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => {
                    setCategory(value);
                    setPage(1);
                  }}
                  className={cn(
                    "min-h-11 rounded-md border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    category === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </Button>
              ))}
            </fieldset>
          </section>

          <section className="overflow-hidden border border-border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-bold">مصروفات الخزنة</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(data?.total ?? 0).toLocaleString("ar-EG")} قيد،{" "}
                  {fmt(data?.totalExpense)} ج.م
                </p>
              </div>
              {hasFilters ? (
                <Button variant="bare"
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  إعادة ضبط الفلاتر
                </Button>
              ) : null}
            </div>

            {query.isLoading ? (
              <div
                role="status"
                className="p-10 text-center text-sm text-muted-foreground"
              >
                جارٍ تحميل المصروفات
              </div>
            ) : !data?.rows.length ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {hasFilters
                  ? "لا توجد مصروفات مطابقة للفلاتر الحالية."
                  : "لا توجد مصروفات مسجلة حتى الآن."}
              </div>
            ) : (
              <>
                <div className="divide-y divide-border sm:hidden">
                  {data.rows.map((row: ExpenseRow) => (
                    <div
                      key={row.id}
                      className="flex justify-between gap-3 border-b border-border p-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          <span className="sr-only">التاريخ: </span>
                          {fmtDate(row.txDate)}
                        </div>
                        <div className="mt-1 break-words text-sm">
                          <span className="sr-only">البيان: </span>
                          {row.notes || "غير متاح"}
                        </div>
                      </div>
                      <b
                        aria-label={`المصروف ${fmt(row.expense)}`}
                        className="shrink-0 tabular-nums text-destructive"
                      >
                        {fmt(row.expense)}
                      </b>
                    </div>
                  ))}
                </div>
                <div
                  className="hidden overflow-x-auto sm:block"
                  role="region"
                  aria-label="جدول مصروفات الخزنة"
                  tabIndex={0}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                        <th scope="col" className="px-4 py-3 text-start">
                          التاريخ
                        </th>
                        <th scope="col" className="px-4 py-3 text-start">
                          البيان
                        </th>
                        <th scope="col" className="px-4 py-3 text-end">
                          المصروف
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.rows.map((row: ExpenseRow) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {fmtDate(row.txDate)}
                          </td>
                          <td className="px-4 py-3">
                            {row.notes || "غير متاح"}
                          </td>
                          <td className="px-4 py-3 text-end font-bold text-destructive">
                            {fmt(row.expense)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {pages > 1 ? (
              <div className="flex items-center justify-center gap-3 border-t border-border p-3">
                <Button variant="bare"
                  type="button"
                  aria-label="الصفحة السابقة"
                  title="الصفحة السابقة"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="text-xs" aria-live="polite">
                  {page} / {pages}
                </span>
                <Button variant="bare"
                  type="button"
                  aria-label="الصفحة التالية"
                  title="الصفحة التالية"
                  disabled={page === pages}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </AccountingPage>
  );
}
