import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const now = new Date();
function isoMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const defaultPayrollEnd = new Date(
  now.getFullYear(),
  now.getMonth() - (now.getDate() < 25 ? 1 : 0),
  25,
);
const DEFAULT_FROM = (() => {
  const previousMonth = new Date(
    defaultPayrollEnd.getFullYear(),
    defaultPayrollEnd.getMonth() - 1,
    26,
  );
  return `${isoMonth(previousMonth)}-26`;
})();
const DEFAULT_TO = `${isoMonth(defaultPayrollEnd)}-25`;

function fmtAr(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ar-EG");
}

const PRINT_CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 9px; color: #000; direction: rtl; }
  h1 { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 2px; }
  .meta { text-align: center; font-size: 9px; color: #555; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #ddd; padding: 2px 4px; border: 1px solid #999; font-size: 8px; text-align: center; }
  td { padding: 2px 4px; border: 1px solid #ccc; font-size: 8px; text-align: center; }
  .emp-col { text-align: right; font-weight: bold; }
  .total-row { background: #eee; font-weight: bold; }
`;

export default function AbsentReport({
  sharedFromDate,
  sharedToDate,
  onFromDateChange,
  onToDateChange,
}: {
  sharedFromDate?: string;
  sharedToDate?: string;
  onFromDateChange?: (value: string) => void;
  onToDateChange?: (value: string) => void;
}) {
  const [localFromDate, setLocalFromDate] = useState(DEFAULT_FROM);
  const [localToDate, setLocalToDate] = useState(DEFAULT_TO);
  const fromDate = sharedFromDate ?? localFromDate;
  const toDate = sharedToDate ?? localToDate;
  const setFromDate = onFromDateChange ?? setLocalFromDate;
  const setToDate = onToDateChange ?? setLocalToDate;
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (empCd: string) => {
    setExpandedRows((prev) => ({ ...prev, [empCd]: !prev[empCd] }));
  };

  const absentQ = (trpc as any).salary.getAbsentDays.useQuery({
    from: fromDate,
    to: toDate,
  });
  const rows: any[] = absentQ.data ?? [];

  // Group by employee
  const byEmp: Record<string, { name: string; days: string[] }> = {};
  for (const r of rows) {
    if (!byEmp[r.empCd])
      byEmp[r.empCd] = { name: r.empName ?? `موظف رقم ${r.empCd}`, days: [] };
    byEmp[r.empCd].days.push(r.workDate);
  }
  const empEntries = Object.entries(byEmp).sort((a, b) =>
    a[1].name.localeCompare(b[1].name, "ar"),
  );

  const periodLabel = `من ${fmtAr(fromDate)} إلى ${fmtAr(toDate)}`;

  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setActionsHost(document.getElementById("salary-penalties-actions"));
  }, []);

  function handlePrint() {
    const bodyRows = empEntries
      .map(([, { name, days }]) =>
        days
          .map(
            (d, i) => `
        <tr>
          ${i === 0 ? `<td class="emp-col" rowspan="${days.length}">${name}</td>` : ""}
          <td>${fmtAr(d)}</td>
        </tr>`,
          )
          .join(""),
      )
      .join("");

    const totalsRows = empEntries
      .map(
        ([, { name, days }]) =>
          `<tr><td class="emp-col">${name}</td><td>${days.length} يوم</td></tr>`,
      )
      .join("");

    const html = `
      <h1>تقرير أيام الغياب</h1>
      <div class="meta">الفترة: ${periodLabel}: إجمالي: ${rows.length} يوم غياب</div>
      <table>
        <thead><tr><th>الموظف</th><th>تاريخ الغياب</th></tr></thead>
        <tbody>${bodyRows || '<tr><td colspan="2">لا توجد أيام غياب</td></tr>'}</tbody>
        <tfoot>
          <tr class="total-row"><td colspan="2">ملخص لكل موظف</td></tr>
          ${totalsRows}
          <tr class="total-row"><td>الإجمالي</td><td>${rows.length} يوم</td></tr>
        </tfoot>
      </table>`;

    const mask = document.createElement("style");
    mask.textContent =
      "@media print{body>*{visibility:hidden!important}#__pr__,#__pr__ *{visibility:visible!important}#__pr__{position:fixed;inset:0;direction:rtl}}";
    const container = document.createElement("div");
    container.id = "__pr__";
    container.innerHTML = `<style>${PRINT_CSS}</style>${html}`;
    document.head.appendChild(mask);
    document.body.appendChild(container);
    const cleanup = () => {
      mask.remove();
      container.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <div className="space-y-6" dir="rtl">
      {actionsHost &&
        createPortal(
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
            disabled={absentQ.isLoading}
          >
            <Printer size={16} /> طباعة / حفظ PDF
          </Button>,
          actionsHost,
        )}

      {absentQ.isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          جاري التحميل...
        </p>
      )}

      {absentQ.isError && (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-text"
        >
          <span>
            تعذر تحميل أيام الغياب. أعد المحاولة قبل الاعتماد على التقرير.
          </span>
          <Button variant="outline" onClick={() => absentQ.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {!absentQ.isLoading && !absentQ.isError && (
        <section className="rounded-xl border border-border/60 bg-background shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              أيام الغياب: {periodLabel}
            </h3>
          </div>
          <div role="region" aria-label="جدول بيانات" tabIndex={0} className="hidden xl:block overflow-x-auto">
            <table aria-label="أيام الغياب" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs">
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    الموظف
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-center">
                    التاريخ
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-center">
                    عدد أيام الغياب
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      لا توجد أيام غياب في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  empEntries.map(([empCd, { name, days }]) =>
                    days.map((d, i) => (
                      <tr
                        key={`${empCd}-${d}`}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 font-medium">
                          {i === 0 ? name : ""}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {fmtAr(d)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {i === 0 && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                              {days.length} يوم
                            </span>
                          )}
                        </td>
                      </tr>
                    )),
                  )
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 font-semibold text-xs">
                    <td className="px-3 py-2" colSpan={2}>
                      الإجمالي
                    </td>
                    <td className="px-3 py-2 text-center">{rows.length} يوم</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="block xl:hidden divide-y divide-border/60">
            {empEntries.map(([empCd, { name, days }]) => {
              const isExpanded = !!expandedRows[empCd];
              return (
                <div
                  key={empCd}
                  className="bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-controls={`absent-details-${empCd}`}
                    aria-label={`${name}، تفاصيل أيام الغياب`}
                    className="flex min-h-11 items-center justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onClick={() => toggleRow(empCd)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRow(empCd);
                      }
                    }}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground">
                        {name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <div className="text-xs font-bold text-muted-foreground ">
                          أيام الغياب
                        </div>
                        <div className="text-sm font-bold text-destructive tabular-nums">
                          {days.length} يوم
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      id={`absent-details-${empCd}`}
                      className="mt-4 pt-4 border-t border-border/40 space-y-2 text-xs"
                    >
                      <div className="text-xs font-bold text-muted-foreground  mb-2">
                        تاريخ الغياب:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {days.map((d) => (
                          <div
                            key={d}
                            className="bg-muted/30 px-3 py-1.5 rounded-lg border border-border/20 text-center font-semibold tabular-nums text-foreground"
                          >
                            {fmtAr(d)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                لا توجد أيام غياب في هذه الفترة
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
