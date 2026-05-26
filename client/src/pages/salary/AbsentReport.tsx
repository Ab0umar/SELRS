import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const now = new Date();
function isoMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const DEFAULT_FROM = `${isoMonth(now)}-01`;
const DEFAULT_TO = (() => {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${isoMonth(last)}-${String(last.getDate()).padStart(2, "0")}`;
})();

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

export default function AbsentReport() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);

  const absentQ = (trpc as any).salary.getAbsentDays.useQuery({ from: fromDate, to: toDate });
  const rows: any[] = absentQ.data ?? [];

  // Group by employee
  const byEmp: Record<string, { name: string; days: string[] }> = {};
  for (const r of rows) {
    if (!byEmp[r.empCd]) byEmp[r.empCd] = { name: r.empName ?? r.empCd, days: [] };
    byEmp[r.empCd].days.push(r.workDate);
  }
  const empEntries = Object.entries(byEmp).sort((a, b) => a[1].name.localeCompare(b[1].name, "ar"));

  const periodLabel = `${fmtAr(fromDate)} — ${fmtAr(toDate)}`;

  function handlePrint() {
    const bodyRows = empEntries.map(([, { name, days }]) =>
      days.map((d, i) => `
        <tr>
          ${i === 0 ? `<td class="emp-col" rowspan="${days.length}">${name}</td>` : ""}
          <td>${fmtAr(d)}</td>
        </tr>`).join("")
    ).join("");

    const totalsRows = empEntries.map(([, { name, days }]) =>
      `<tr><td class="emp-col">${name}</td><td>${days.length} يوم</td></tr>`
    ).join("");

    const html = `
      <h1>تقرير أيام الغياب</h1>
      <div class="meta">الفترة: ${periodLabel} — إجمالي: ${rows.length} يوم غياب</div>
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
    mask.textContent = "@media print{body>*{visibility:hidden!important}#__pr__,#__pr__ *{visibility:visible!important}#__pr__{position:fixed;inset:0;direction:rtl}}";
    const container = document.createElement("div");
    container.id = "__pr__";
    container.innerHTML = `<style>${PRINT_CSS}</style>${html}`;
    document.head.appendChild(mask);
    document.body.appendChild(container);
    const cleanup = () => { mask.remove(); container.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">التقارير</p>
          <h2 className="text-2xl font-bold text-foreground">تقرير الغياب</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <span className="text-sm text-muted-foreground">—</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button variant="outline" onClick={handlePrint} className="gap-2" disabled={absentQ.isLoading}>
            <Printer size={15} /> طباعة
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">إجمالي أيام الغياب</div>
          <div className="mt-1 text-2xl font-bold text-destructive">{rows.length} يوم</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">عدد الموظفين المتغيبين</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{empEntries.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">الفترة</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{periodLabel}</div>
        </div>
      </div>

      {absentQ.isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">جاري التحميل...</p>
      )}

      {!absentQ.isLoading && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">أيام الغياب — {periodLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs">
                  <th className="px-3 py-2 text-right font-medium">الموظف</th>
                  <th className="px-3 py-2 font-medium text-center">التاريخ</th>
                  <th className="px-3 py-2 font-medium text-center">عدد أيام الغياب</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      لا توجد أيام غياب في هذه الفترة
                    </td>
                  </tr>
                ) : empEntries.map(([empCd, { name, days }]) =>
                  days.map((d, i) => (
                    <tr key={`${empCd}-${d}`} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{i === 0 ? name : ""}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{fmtAr(d)}</td>
                      <td className="px-3 py-2 text-center">
                        {i === 0 && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            {days.length} يوم
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 font-semibold text-xs">
                    <td className="px-3 py-2" colSpan={2}>الإجمالي</td>
                    <td className="px-3 py-2 text-center">{rows.length} يوم</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
