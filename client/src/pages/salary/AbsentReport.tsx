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

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: "سنوية",
  sick: "مرضية",
  unpaid: "بدون أجر",
  other: "أخرى",
};

const PERM_TYPE_LABEL: Record<string, string> = {
  out: "خروج مبكر",
  in: "دخول متأخر",
};

function daysBetween(from: string, to: string) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

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
  h2 { font-size: 11px; font-weight: bold; margin: 10px 0 4px; border-bottom: 1px solid #999; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th { background: #ddd; padding: 2px 4px; border: 1px solid #999; font-size: 8px; text-align: center; }
  td { padding: 2px 4px; border: 1px solid #ccc; font-size: 8px; text-align: center; }
  .total-row { background: #eee; font-weight: bold; }
  .emp-col { text-align: right; font-weight: bold; }
`;

export default function AbsentReport() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);

  const leavesQ = (trpc as any).attendance.listLeaves.useQuery({ from: fromDate, to: toDate });
  const permsQ = (trpc as any).attendance.listPermissions.useQuery({ from: fromDate, to: toDate });
  const empsQ = (trpc as any).salary.listEmployees.useQuery();

  const empNameMap: Record<string, string> = {};
  for (const e of (empsQ.data ?? [])) {
    if (e.empCd) empNameMap[e.empCd] = e.fullName ?? e.empCd;
  }

  const leaves: any[] = leavesQ.data ?? [];
  const perms: any[] = permsQ.data ?? [];

  // Group leaves by empCd
  const leavesByEmp: Record<string, any[]> = {};
  for (const l of leaves) {
    if (!leavesByEmp[l.empCd]) leavesByEmp[l.empCd] = [];
    leavesByEmp[l.empCd].push(l);
  }

  // Group permissions by empCd
  const permsByEmp: Record<string, any[]> = {};
  for (const p of perms) {
    if (!permsByEmp[p.empCd]) permsByEmp[p.empCd] = [];
    permsByEmp[p.empCd].push(p);
  }

  const totalLeaveDays = leaves.reduce((s, l) => s + daysBetween(l.dateFrom, l.dateTo), 0);
  const totalPermMins = perms.reduce((s, p) => s + (p.durationMinutes ?? 0), 0);

  const periodLabel = `${fmtAr(fromDate)} — ${fmtAr(toDate)}`;

  function buildPrintHtml() {
    const leavesRows = Object.entries(leavesByEmp).map(([empCd, rows]) => {
      const name = rows[0]?.empName ?? empNameMap[empCd] ?? empCd;
      const empDays = rows.reduce((s, l) => s + daysBetween(l.dateFrom, l.dateTo), 0);
      const trs = rows.map((l) => `
        <tr>
          <td class="emp-col">${name}</td>
          <td>${fmtAr(l.dateFrom)}</td>
          <td>${fmtAr(l.dateTo)}</td>
          <td>${LEAVE_TYPE_LABEL[l.type] ?? l.type}</td>
          <td>${daysBetween(l.dateFrom, l.dateTo)}</td>
          <td>${l.approved ? "معتمد" : "غير معتمد"}</td>
          <td>${l.note ?? ""}</td>
        </tr>`).join("");
      return trs + `<tr class="total-row"><td class="emp-col">${name} — الإجمالي</td><td colspan="3"></td><td>${empDays}</td><td colspan="2"></td></tr>`;
    }).join("");

    const permsRows = Object.entries(permsByEmp).map(([empCd, rows]) => {
      const name = empNameMap[empCd] ?? empCd;
      const empMins = rows.reduce((s, p) => s + (p.durationMinutes ?? 0), 0);
      const trs = rows.map((p) => `
        <tr>
          <td class="emp-col">${name}</td>
          <td>${fmtAr(p.date)}</td>
          <td>${PERM_TYPE_LABEL[p.type] ?? p.type}</td>
          <td>${p.durationMinutes}</td>
          <td>${p.note ?? ""}</td>
        </tr>`).join("");
      return trs + `<tr class="total-row"><td class="emp-col">${name} — الإجمالي</td><td colspan="2"></td><td>${empMins}</td><td></td></tr>`;
    }).join("");

    return `
      <h1>تقرير الغياب والتصاريح</h1>
      <div class="meta">الفترة: ${periodLabel}</div>
      <h2>أيام الإجازة (${totalLeaveDays} يوم)</h2>
      <table>
        <thead><tr><th>الموظف</th><th>من</th><th>إلى</th><th>نوع الإجازة</th><th>الأيام</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
        <tbody>${leavesRows || '<tr><td colspan="7">لا توجد إجازات</td></tr>'}</tbody>
        <tfoot><tr class="total-row"><td>الإجمالي</td><td colspan="3"></td><td>${totalLeaveDays}</td><td colspan="2"></td></tr></tfoot>
      </table>
      <h2>التصاريح (${totalPermMins} دقيقة)</h2>
      <table>
        <thead><tr><th>الموظف</th><th>التاريخ</th><th>النوع</th><th>المدة (دقيقة)</th><th>ملاحظات</th></tr></thead>
        <tbody>${permsRows || '<tr><td colspan="5">لا توجد تصاريح</td></tr>'}</tbody>
        <tfoot><tr class="total-row"><td>الإجمالي</td><td colspan="2"></td><td>${totalPermMins}</td><td></td></tr></tfoot>
      </table>`;
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>تقرير الغياب</title><style>${PRINT_CSS}</style></head><body>${buildPrintHtml()}<script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  }

  const isLoading = leavesQ.isLoading || permsQ.isLoading;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">التقارير</p>
          <h2 className="text-2xl font-bold text-foreground">الغياب والتصاريح</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <span className="text-sm text-muted-foreground">—</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button variant="outline" onClick={handlePrint} className="gap-2" disabled={isLoading}>
            <Printer size={15} /> طباعة
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">إجمالي أيام الإجازة</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalLeaveDays} يوم</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{leaves.length} سجل</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">إجمالي دقائق التصاريح</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalPermMins} دقيقة</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{perms.length} تصريح</div>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">جاري التحميل...</p>
      )}

      {/* Leaves table */}
      {!isLoading && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">أيام الإجازة — {periodLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs">
                  <th className="px-3 py-2 text-right font-medium">الموظف</th>
                  <th className="px-3 py-2 font-medium">من</th>
                  <th className="px-3 py-2 font-medium">إلى</th>
                  <th className="px-3 py-2 font-medium">نوع الإجازة</th>
                  <th className="px-3 py-2 font-medium">الأيام</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 text-right font-medium">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">لا توجد إجازات في هذه الفترة</td></tr>
                ) : leaves.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{l.empName ?? empNameMap[l.empCd] ?? l.empCd}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtAr(l.dateFrom)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtAr(l.dateTo)}</td>
                    <td className="px-3 py-2 text-center">{LEAVE_TYPE_LABEL[l.type] ?? l.type}</td>
                    <td className="px-3 py-2 text-center font-semibold tabular-nums">{daysBetween(l.dateFrom, l.dateTo)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${l.approved ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {l.approved ? "معتمد" : "غير معتمد"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{l.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
              {leaves.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 font-semibold text-xs">
                    <td className="px-3 py-2" colSpan={4}>الإجمالي</td>
                    <td className="px-3 py-2 text-center">{totalLeaveDays}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {/* Permissions table */}
      {!isLoading && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">التصاريح — {periodLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs">
                  <th className="px-3 py-2 text-right font-medium">الموظف</th>
                  <th className="px-3 py-2 font-medium">التاريخ</th>
                  <th className="px-3 py-2 font-medium">النوع</th>
                  <th className="px-3 py-2 font-medium">المدة (دقيقة)</th>
                  <th className="px-3 py-2 text-right font-medium">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {perms.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">لا توجد تصاريح في هذه الفترة</td></tr>
                ) : perms.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{empNameMap[p.empCd] ?? p.empCd}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtAr(p.date)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${p.type === "out" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
                        {PERM_TYPE_LABEL[p.type] ?? p.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold tabular-nums">{p.durationMinutes}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
              {perms.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 font-semibold text-xs">
                    <td className="px-3 py-2" colSpan={3}>الإجمالي</td>
                    <td className="px-3 py-2 text-center">{totalPermMins}</td>
                    <td />
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
