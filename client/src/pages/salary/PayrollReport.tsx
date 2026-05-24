import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, Printer } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function fmt(n: any): string {
  return Number(n).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n: any): string {
  return (Number(n) * 100).toFixed(1) + "%";
}

const SECTIONS = ["مركز", "عيادة"] as const;
type Section = typeof SECTIONS[number];

export default function PayrollReport() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [section, setSection] = useState<Section>("مركز");

  const payrollQ = (trpc as any).salary.getPayroll.useQuery({ year, month, section });
  const rows: any[] = payrollQ.data ?? [];

  const computeMut = (trpc as any).salary.computePayroll.useMutation({
    onSuccess: (res: any) => { payrollQ.refetch(); toast.success(`تم احتساب ${res.saved} موظف`); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const finalizeMut = (trpc as any).salary.finalizePayroll.useMutation({
    onSuccess: () => { payrollQ.refetch(); toast.success("تم اعتماد كشف الرواتب"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const totals = rows.reduce(
    (acc: any, r: any) => ({
      basic: acc.basic + Number(r.basicSalary),
      deductions: acc.deductions + Number(r.totalDeductions),
      netBasic: acc.netBasic + Number(r.netBasic),
      commission: acc.commission + Number(r.totalCommission),
      totalPay: acc.totalPay + Number(r.totalPay),
    }),
    { basic: 0, deductions: 0, netBasic: 0, commission: 0, totalPay: 0 }
  );

  const isFinalized = rows.length > 0 && rows.every((r: any) => r.payrollStatus === "final");

  const SLIP_CSS = `
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 10px; color: #000; }
    .page {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: repeat(4, 1fr);
      gap: 5mm;
      width: 100%;
      height: 277mm;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }
    .slip { border: 1px solid #999; padding: 6px 14px; display: flex; flex-direction: row; align-items: stretch; gap: 14px; overflow: hidden; }
    .slip-left { min-width: 130px; display: flex; flex-direction: column; justify-content: center; border-left: 1px dashed #ccc; padding-left: 14px; }
    .slip-title { font-size: 11px; font-weight: bold; }
    .slip-sub { font-size: 9px; color: #555; margin-top: 2px; }
    .emp-name { font-size: 12px; font-weight: bold; margin-top: 6px; }
    .slip-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    table { width: 100%; border-collapse: collapse; }
    tr td { padding: 2px 5px; font-size: 9.5px; }
    tr td:first-child { color: #555; }
    tr td:last-child { text-align: left; font-weight: bold; }
    .total-row td { border-top: 1.5px solid #000; font-size: 10.5px; font-weight: bold; padding-top: 4px; }
    .sig { min-width: 160px; display: flex; flex-direction: column; justify-content: space-around; align-items: center; border-right: 1px dashed #ccc; padding-right: 14px; }
    .sig-block { text-align: center; font-size: 9px; }
    .sig-line { border-top: 1px solid #000; width: 110px; margin-bottom: 3px; margin-top: 16px; }
  `;

  function groupIntoPages(slips: string[], perPage = 4): string {
    const pages: string[] = [];
    for (let i = 0; i < slips.length; i += perPage) {
      pages.push(`<div class="page">${slips.slice(i, i + perPage).join("")}</div>`);
    }
    return pages.join("");
  }

  function openPrint(html: string, title: string) {
    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>${title}</title><style>${SLIP_CSS}</style></head><body>${html}<script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  }

  function printDay1() {
    const ml = MONTHS[month - 1];
    const slips = rows.map((r: any) => `
      <div class="slip">
        <div class="sig">
          <div class="sig-block"><div class="sig-line"></div>المحاسب</div>
          <div class="sig-block"><div class="sig-line"></div>${r.fullName ?? r.empCd}</div>
        </div>
        <div class="slip-body">
          <table>
            <tr><td>الراتب الأساسي</td><td>${fmt(r.basicSalary)} ج</td></tr>
            <tr><td>خصم غياب</td><td>${fmt(r.absentDeduction)} ج</td></tr>
            <tr><td>خصم تأخير</td><td>${fmt(r.lateDeduction)} ج</td></tr>
            <tr><td>خصم انصراف مبكر</td><td>${fmt(r.earlyLeaveDeduction)} ج</td></tr>
            <tr><td>جزاءات</td><td>${fmt(r.penaltyDeduction)} ج</td></tr>
            <tr class="total-row"><td>صافي الراتب</td><td>${fmt(r.netBasic)} ج</td></tr>
          </table>
        </div>
        <div class="slip-left">
          <div class="slip-title">دفعة يوم 1 — ${section}</div>
          <div class="slip-sub">${ml} ${year}</div>
          <div class="emp-name">${r.fullName ?? r.empCd}</div>
        </div>
      </div>`);
    openPrint(groupIntoPages(slips), `دفعة يوم 1 — ${section} — ${ml} ${year}`);
  }

  function printDay10() {
    const ml = MONTHS[month - 1];
    const slips = rows.map((r: any) => `
      <div class="slip">
        <div class="sig">
          <div class="sig-block"><div class="sig-line"></div>المحاسب</div>
          <div class="sig-block"><div class="sig-line"></div>${r.fullName ?? r.empCd}</div>
        </div>
        <div class="slip-body">
          <table>
            <tr><td>عمولة حضور</td><td>${fmt(r.attendanceCommission)} ج</td></tr>
            <tr><td>عمولة فحص</td><td>${fmt(r.examCommission)} ج</td></tr>
            <tr><td>عمولة بنتاكام</td><td>${fmt(r.pentacamCommission)} ج</td></tr>
            <tr><td>أوفرتايم</td><td>${fmt(r.overtimePay ?? 0)} ج</td></tr>
            <tr class="total-row"><td>إجمالي المكافآت</td><td>${fmt(Number(r.totalCommission) + Number(r.overtimePay ?? 0))} ج</td></tr>
          </table>
        </div>
        <div class="slip-left">
          <div class="slip-title">دفعة يوم 10 — ${section}</div>
          <div class="slip-sub">${ml} ${year}</div>
          <div class="emp-name">${r.fullName ?? r.empCd}</div>
        </div>
      </div>`);
    openPrint(groupIntoPages(slips), `دفعة يوم 10 — ${section} — ${ml} ${year}`);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الرواتب</p>
          <h2 className="text-2xl font-bold text-foreground">كشف الرواتب</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {SECTIONS.map(s => (
              <button key={s} type="button" onClick={() => setSection(s)}
                className={`px-4 py-2 transition-colors ${section === s ? "bg-primary text-primary-foreground font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={() => computeMut.mutate({ year, month, section })} disabled={computeMut.isPending} className="gap-2">
            <RefreshCw size={15} className={computeMut.isPending ? "animate-spin" : ""} />
            احتساب
          </Button>
          {rows.length > 0 && (
            <>
              <Button variant="outline" onClick={printDay1} className="gap-2">
                <Printer size={15} /> Day 1
              </Button>
              <Button variant="outline" onClick={printDay10} className="gap-2">
                <Printer size={15} /> Day 10
              </Button>
            </>
          )}
          {rows.length > 0 && !isFinalized && (
            <Button variant="outline" onClick={() => { if (confirm("اعتماد كشف الرواتب كنهائي؟")) finalizeMut.mutate({ year, month }); }} disabled={finalizeMut.isPending} className="gap-2">
              <CheckCircle size={15} /> اعتماد
            </Button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "الرواتب الأساسية", value: fmt(totals.basic), tone: "text-foreground" },
            { label: "الخصومات", value: fmt(totals.deductions), tone: "text-destructive" },
            { label: "الإجمالي الكلي", value: fmt(totals.totalPay), tone: "text-primary font-bold" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className={`mt-1 text-lg font-bold ${m.tone}`}>{m.value}</div>
            </div>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">دفعة يوم 1 — الراتب</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{fmt(totals.netBasic)}</div>
            <div className="mt-1 text-xs text-muted-foreground">صافي الراتب الأساسي بعد الخصومات</div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">دفعة يوم 10 — المكافآت</div>
            <div className="mt-1 text-2xl font-bold text-success">{fmt(totals.commission)}</div>
            <div className="mt-1 text-xs text-muted-foreground">حضور + فحص + بنتاكام</div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">التفاصيل — {MONTHS[month-1]} {year}</h3>
          {isFinalized && (
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">نهائي</span>
          )}
          {rows.length > 0 && !isFinalized && (
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">مسودة</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs">
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">الأساسي</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">أيام عمل</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">غياب</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">تأخير (د)</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">مبكر (د)</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إضافي (د)</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إضافي (ج)</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">جزاء</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إجمالي الخصم</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إجازة</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">معامل</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">صافي الأساسي</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">حضور</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">فحص</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">بنتاكام</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">دفعة يوم 1</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">دفعة يوم 10</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground font-bold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.empCd} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.fullName ?? r.empCd}</div>
                    <div className="text-xs text-muted-foreground">{r.salaryType ?? r.department ?? ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right">{fmt(r.basicSalary)}</td>
                  <td className="px-3 py-3 text-right">{r.workingDays}</td>
                  <td className="px-3 py-3 text-right text-destructive">{r.absentDays}</td>
                  <td className="px-3 py-3 text-right text-warning">{r.lateMinutes}</td>
                  <td className="px-3 py-3 text-right text-warning">{r.earlyLeaveMinutes ?? 0}</td>
                  <td className="px-3 py-3 text-right text-success">{r.overtimeMinutes ?? 0}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.overtimePay ?? 0)}</td>
                  <td className="px-3 py-3 text-right text-destructive">{fmt(r.penaltyDeduction)}</td>
                  <td className="px-3 py-3 text-right font-medium text-destructive">{fmt(r.totalDeductions)} <span className="text-xs">({pct(r.deductionPct)})</span></td>
                  <td className="px-3 py-3 text-right">{r.leaveDays}</td>
                  <td className="px-3 py-3 text-right">{pct(r.leaveMultiplier)}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(r.netBasic)}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.attendanceCommission)}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.examCommission)}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.pentacamCommission)}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(r.netBasic)}</td>
                  <td className="px-3 py-3 text-right font-medium text-success">{fmt(r.totalCommission)}</td>
                  <td className="px-3 py-3 text-right font-bold text-primary text-base">{fmt(r.totalPay)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={19} className="px-4 py-10 text-center text-muted-foreground">اضغط «احتساب» لتوليد كشف الرواتب</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
