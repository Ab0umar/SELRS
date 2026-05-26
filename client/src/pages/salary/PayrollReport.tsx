import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, Printer } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const DEFAULT_FROM = `${isoMonth(now)}-01`;
const DEFAULT_TO = (() => { const last = new Date(now.getFullYear(), now.getMonth() + 1, 0); return `${isoMonth(last)}-${String(last.getDate()).padStart(2, "0")}`; })();

function fmt(n: any): string {
  return Number(n).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n: any): string {
  return (Number(n) * 100).toFixed(1) + "%";
}

const SECTIONS = ["مركز", "عيادة"] as const;
type Section = typeof SECTIONS[number];

export default function PayrollReport() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [section, setSection] = useState<Section>("مركز");

  const year = new Date(fromDate).getFullYear();
  const month = new Date(fromDate).getMonth() + 1;
  const periodLabel = `${new Date(fromDate).toLocaleDateString("ar-EG")} — ${new Date(toDate).toLocaleDateString("ar-EG")}`;

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

  const SHEET_CSS = `
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 8px; color: #000; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; font-size: 10px; }
    h1 { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 3px; }
    .dept { text-align: right; font-size: 12px; font-weight: bold; color: #b00; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #ddd; font-size: 7.5px; padding: 2px 3px; border: 1px solid #999; text-align: center; white-space: nowrap; }
    td { font-size: 7.5px; padding: 2px 3px; border: 1px solid #bbb; text-align: center; white-space: nowrap; }
    .emp-col { text-align: right !important; font-weight: bold; }
    .total-row { background: #eee; font-weight: bold; }
    .sig-col { width: 55px; }
    .footer { margin-top: 16px; display: flex; justify-content: space-between; }
    .footer-block { text-align: center; font-size: 9px; }
    .footer-line { border-top: 1px solid #000; width: 130px; margin: 20px auto 3px; }
    .footer-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 8px; color: #555; }
    .note { font-size: 8px; color: #555; }
  `;

  const SLIPS_CSS = `
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 9px; color: #000; }
    .slip { padding: 8px 0 6px; page-break-inside: avoid; }
    hr.sep { border: none; border-top: 1px dashed #888; margin: 6px 0; }
    .slip-top { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
    .slip-title { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 4px; }
    .emp-name { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 3px; }
    .dept-row { text-align: right; font-size: 9px; margin-bottom: 5px; }
    table.main { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    table.main th { border: 1px solid #999; padding: 2px 3px; font-size: 7.5px; background: #e8e8e8; text-align: center; white-space: nowrap; }
    table.main td { border: 1px solid #aaa; padding: 2px 4px; font-size: 8.5px; text-align: center; }
    .net-cell { border: 2px solid #000 !important; text-align: center; vertical-align: middle; min-width: 62px; padding: 3px 5px; }
    .net-label { font-size: 7.5px; display: block; margin-bottom: 4px; }
    .net-val { font-size: 15px; font-weight: bold; display: block; }
    .words { text-align: right; font-size: 9px; margin: 4px 0 2px; }
    .sigs { display: flex; justify-content: space-between; margin-top: 8px; }
    .sig-block { text-align: center; font-size: 9px; }
    .sig-line { border-top: 1px solid #000; width: 110px; margin: 16px auto 3px; }
  `;

  function openPrint(html: string, title: string, css: string) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>${title}</title><style>${css}</style></head><body>${html}</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      iframe.contentWindow!.onafterprint = () => document.body.removeChild(iframe);
    }, 300);
  }

  function toArabicWords(amount: number): string {
    const n = Math.round(amount);
    if (n === 0) return "صفر جنيه";
    const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة",
      "أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
    const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
    function b100(x: number): string {
      if (x < 20) return ones[x];
      const o = x % 10;
      return (o ? ones[o] + " و" : "") + tens[Math.floor(x / 10)];
    }
    function b1000(x: number): string {
      if (x < 100) return b100(x);
      const h = Math.floor(x / 100);
      const r = x % 100;
      const hw = h === 1 ? "مائة" : h === 2 ? "مئتان" : ones[h] + "مائة";
      return hw + (r ? " و" + b100(r) : "");
    }
    const th = Math.floor(n / 1000);
    const rem = n % 1000;
    let out = "";
    if (th === 1) out = "ألف";
    else if (th === 2) out = "ألفان";
    else if (th >= 3 && th <= 10) out = ones[th] + " آلاف";
    else if (th > 10) out = b100(th) + " ألف";
    if (rem) out += (out ? " و" : "") + b1000(rem);
    return out + " جنيه";
  }

  function printSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const isClinic = section === "عيادة";
    const nonShift = rows.filter((r: any) => !String(r.empCd).startsWith("shift_"));
    const tBasic    = nonShift.reduce((s: number, r: any) => s + Number(r.basicSalary), 0);
    const tAbsent   = nonShift.reduce((s: number, r: any) => s + Number(r.absentDeduction), 0);
    const tLate     = nonShift.reduce((s: number, r: any) => s + Number(r.lateDeduction ?? 0), 0);
    const tEarly    = nonShift.reduce((s: number, r: any) => s + Number(r.earlyLeaveDeduction ?? 0), 0);
    const tPenalty  = nonShift.reduce((s: number, r: any) => s + Number(r.penaltyDeduction), 0);
    const tDed      = nonShift.reduce((s: number, r: any) => s + Number(r.totalDeductions), 0);
    const tNetBasic = nonShift.reduce((s: number, r: any) => s + Number(r.netBasic), 0);
    const tAttend   = nonShift.reduce((s: number, r: any) => s + Number(r.attendanceCommission), 0);
    const tExam     = nonShift.reduce((s: number, r: any) => s + Number(r.examCommission), 0);
    const tPenta    = nonShift.reduce((s: number, r: any) => s + Number(r.pentacamCommission), 0);
    const tOT       = nonShift.reduce((s: number, r: any) => s + Number(r.overtimePay ?? 0), 0);
    const tTotal    = nonShift.reduce((s: number, r: any) => s + Number(r.totalPay), 0);

    const bodyRows = nonShift.map((r: any) => `
      <tr>
        <td class="emp-col">${r.fullName ?? r.empCd}</td>
        <td>${fmt(r.basicSalary)}</td>
        <td>${fmt(r.absentDeduction)}</td>
        <td>${fmt(r.lateDeduction ?? 0)}</td>
        <td>${fmt(r.earlyLeaveDeduction ?? 0)}</td>
        <td>${fmt(r.penaltyDeduction)}</td>
        <td>${fmt(r.totalDeductions)}</td>
        <td>${fmt(r.netBasic)}</td>
        <td>${fmt(r.attendanceCommission)}</td>
        <td>${fmt(r.examCommission)}</td>
        ${!isClinic ? `<td>${fmt(r.pentacamCommission)}</td>` : ""}
        <td>${fmt(r.overtimePay ?? 0)}</td>
        <td style="font-weight:bold">${fmt(r.totalPay)}</td>
        <td class="sig-col"></td>
      </tr>`).join("");

    const html = `
      <div class="top">
        <span>نظام مرتبات</span>
        <span>عيون السروق للخدمات الطبية</span>
      </div>
      <h1>كشف المرتبات الشهرية عن الفترة ${periodLabel}</h1>
      <div class="dept">قسم ${section}</div>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الأساسي</th>
            <th>خصم غياب</th>
            <th>خصم تأخير</th>
            <th>خصم مبكر</th>
            <th>جزاءات</th>
            <th>إجمالي الخصم</th>
            <th>صافي الأساسي</th>
            <th>عمولة حضور</th>
            <th>عمولة فحص</th>
            ${!isClinic ? "<th>عمولة بنتاكام</th>" : ""}
            <th>إضافي</th>
            <th>صافي المستحق</th>
            <th class="sig-col">التوقيع</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td>${fmt(tBasic)}</td>
            <td>${fmt(tAbsent)}</td>
            <td>${fmt(tLate)}</td>
            <td>${fmt(tEarly)}</td>
            <td>${fmt(tPenalty)}</td>
            <td>${fmt(tDed)}</td>
            <td>${fmt(tNetBasic)}</td>
            <td>${fmt(tAttend)}</td>
            <td>${fmt(tExam)}</td>
            ${!isClinic ? `<td>${fmt(tPenta)}</td>` : ""}
            <td>${fmt(tOT)}</td>
            <td style="font-weight:bold">${fmt(tTotal)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <div class="footer-block"><div class="footer-line"></div>المدير الإداري</div>
        <div class="footer-block"><div class="footer-line"></div>الحسابات</div>
        <div class="footer-block"><div class="footer-line"></div>شئون العاملين</div>
      </div>
      <div class="footer-meta">
        <span>صفحة 1 من 1</span>
        <span>تاريخ الطباعة: ${today}</span>
      </div>`;

    openPrint(html, `كشف الرواتب — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function printBasicSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const nonShift = rows.filter((r: any) => !String(r.empCd).startsWith("shift_"));
    const tBasic   = nonShift.reduce((s: number, r: any) => s + Number(r.basicSalary), 0);
    const tAbsent  = nonShift.reduce((s: number, r: any) => s + Number(r.absentDeduction), 0);
    const tLate    = nonShift.reduce((s: number, r: any) => s + Number(r.lateDeduction ?? 0), 0);
    const tEarly   = nonShift.reduce((s: number, r: any) => s + Number(r.earlyLeaveDeduction ?? 0), 0);
    const tPenalty = nonShift.reduce((s: number, r: any) => s + Number(r.penaltyDeduction), 0);
    const tDed     = nonShift.reduce((s: number, r: any) => s + Number(r.totalDeductions), 0);
    const tNet     = nonShift.reduce((s: number, r: any) => s + Number(r.netBasic), 0);
    const bodyRows = nonShift.map((r: any) => `
      <tr>
        <td class="emp-col">${r.fullName ?? r.empCd}</td>
        <td>${fmt(r.basicSalary)}</td>
        <td>${fmt(r.absentDeduction)}</td>
        <td>${fmt(r.lateDeduction ?? 0)}</td>
        <td>${fmt(r.earlyLeaveDeduction ?? 0)}</td>
        <td>${fmt(r.penaltyDeduction)}</td>
        <td>${fmt(r.totalDeductions)}</td>
        <td style="font-weight:bold">${fmt(r.netBasic)}</td>
        <td class="sig-col"></td>
      </tr>`).join("");
    const html = `
      <div class="top"><span>نظام مرتبات</span><span>عيون السروق للخدمات الطبية</span></div>
      <h1>كشف الرواتب الأساسية عن الفترة ${periodLabel}</h1>
      <div class="dept">قسم ${section}</div>
      <table>
        <thead><tr>
          <th>الاسم</th><th>الأساسي</th><th>خصم غياب</th><th>خصم تأخير</th>
          <th>خصم مبكر</th><th>جزاءات</th><th>إجمالي الخصم</th><th>صافي الأساسي</th>
          <th class="sig-col">التوقيع</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td>${fmt(tBasic)}</td><td>${fmt(tAbsent)}</td><td>${fmt(tLate)}</td>
            <td>${fmt(tEarly)}</td><td>${fmt(tPenalty)}</td><td>${fmt(tDed)}</td>
            <td style="font-weight:bold">${fmt(tNet)}</td><td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <div class="footer-block"><div class="footer-line"></div>المدير الإداري</div>
        <div class="footer-block"><div class="footer-line"></div>الحسابات</div>
        <div class="footer-block"><div class="footer-line"></div>شئون العاملين</div>
      </div>
      <div class="footer-meta"><span>صفحة 1 من 1</span><span>تاريخ الطباعة: ${today}</span></div>`;
    openPrint(html, `كشف الأساسي — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function printCommissionsSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const isClinic = section === "عيادة";
    const nonShift = rows.filter((s: any) => !String(s.empCd).startsWith("shift_"));
    const tAttend = nonShift.reduce((s: number, r: any) => s + Number(r.attendanceCommission), 0);
    const tExam   = nonShift.reduce((s: number, r: any) => s + Number(r.examCommission), 0);
    const tPenta  = nonShift.reduce((s: number, r: any) => s + Number(r.pentacamCommission), 0);
    const tOT     = nonShift.reduce((s: number, r: any) => s + Number(r.overtimePay ?? 0), 0);
    const tComm   = nonShift.reduce((s: number, r: any) => s + Number(r.totalCommission), 0);
    const bodyRows = nonShift.map((r: any) => `
      <tr>
        <td class="emp-col">${r.fullName ?? r.empCd}</td>
        <td>${fmt(r.attendanceCommission)}</td>
        <td>${fmt(r.examCommission)}</td>
        ${!isClinic ? `<td>${fmt(r.pentacamCommission)}</td>` : ""}
        <td>${fmt(r.overtimePay ?? 0)}</td>
        <td style="font-weight:bold">${fmt(r.totalCommission)}</td>
        <td class="sig-col"></td>
      </tr>`).join("");
    const html = `
      <div class="top"><span>نظام مرتبات</span><span>عيون السروق للخدمات الطبية</span></div>
      <h1>كشف العمولات عن الفترة ${periodLabel}</h1>
      <div class="dept">قسم ${section}</div>
      <table>
        <thead><tr>
          <th>الاسم</th><th>عمولة حضور</th><th>عمولة فحص</th>
          ${!isClinic ? "<th>عمولة بنتاكام</th>" : ""}
          <th>إضافي</th><th>إجمالي العمولات</th><th class="sig-col">التوقيع</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td>${fmt(tAttend)}</td><td>${fmt(tExam)}</td>
            ${!isClinic ? `<td>${fmt(tPenta)}</td>` : ""}
            <td>${fmt(tOT)}</td><td style="font-weight:bold">${fmt(tComm)}</td><td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <div class="footer-block"><div class="footer-line"></div>المدير الإداري</div>
        <div class="footer-block"><div class="footer-line"></div>الحسابات</div>
        <div class="footer-block"><div class="footer-line"></div>شئون العاملين</div>
      </div>
      <div class="footer-meta"><span>صفحة 1 من 1</span><span>تاريخ الطباعة: ${today}</span></div>`;
    openPrint(html, `كشف العمولات — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function buildSlip(r: any, title: string, tableHtml: string, netPay: number): string {
    return `
      <div class="slip">
        <div class="slip-top">
          <span>مرتبات</span>
          <span>عيون السروق للخدمات الطبية</span>
        </div>
        <div class="slip-title">${title}</div>
        <div class="emp-name">الاسم/ ${r.fullName ?? r.empCd}</div>
        <div class="dept-row">القسم التابع له/ ${section}</div>
        ${tableHtml}
        <div class="words">${toArabicWords(netPay)}</div>
        <div class="sigs">
          <div class="sig-block"><div class="sig-line"></div>توقيع المستلم</div>
          <div class="sig-block"><div class="sig-line"></div>يعتمد</div>
        </div>
      </div>`;
  }

  function printDay1Slips() {
    const html = rows.filter((r: any) => !String(r.empCd).startsWith("shift_")).map((r: any, i: number) => {
      const net     = Number(r.netBasic);
      const basic   = Number(r.basicSalary);
      const absent  = Number(r.absentDeduction);
      const penalty = Number(r.penaltyDeduction);
      const other   = Number(r.lateDeduction ?? 0) + Number(r.earlyLeaveDeduction ?? 0);
      const totalDed = Number(r.totalDeductions);
      const table = `
        <table class="main">
          <tr>
            <th>اساسي الراتب</th>
            <th>اعانة اجتماعية</th>
            <th>غلاء معيشة</th>
            <th>بدلات</th>
            <th>زيادة سنوات سابقة</th>
            <th>زيادة يناير</th>
            <th>إجمالي أساسي</th>
            <th>ح عاملين</th>
            <th>إجمالي الاستحقاقات</th>
            <th rowspan="4" class="net-cell"><span class="net-label">صافي المستحق</span><span class="net-val">${fmt(net)}</span></th>
          </tr>
          <tr>
            <td>${fmt(basic)}</td><td>0.00</td><td>0.00</td><td>0.00</td>
            <td>0.00</td><td>0.00</td><td>${fmt(basic)}</td><td>0.00</td><td>${fmt(basic)}</td>
          </tr>
          <tr>
            <th>تامينت اجتماعية</th>
            <th>سلف عاملين</th>
            <th>أرصدة مدينة</th>
            <th>غياب</th>
            <th>جزاءات</th>
            <th>أخرى</th>
            <th>فرق تقييم</th>
            <th colspan="2">أجمال الاستقطاعات</th>
          </tr>
          <tr>
            <td>0.00</td><td>0.00</td><td>0.00</td>
            <td>${fmt(absent)}</td><td>${fmt(penalty)}</td><td>${fmt(other)}</td><td>0.00</td>
            <td colspan="2">${fmt(totalDed)}</td>
          </tr>
        </table>`;
      return (i > 0 ? '<hr class="sep"/>' : "") + buildSlip(r, `مرتب ${periodLabel}`, table, net);
    }).join("");
    openPrint(html, `دفعة يوم 1 — ${section} — ${periodLabel}`, SLIPS_CSS);
  }

  function printDay10Slips() {
    const isClinic = section === "عيادة";
    const html = rows.filter((r: any) => !String(r.empCd).startsWith("shift_")).map((r: any, i: number) => {
      const attend  = Number(r.attendanceCommission);
      const exam    = Number(r.examCommission);
      const penta   = Number(r.pentacamCommission);
      const ot      = Number(r.overtimePay ?? 0);
      const net     = attend + exam + (isClinic ? 0 : penta) + ot;
      const table = `
        <table class="main">
          <tr>
            <th>نسبة الحضور</th>
            <th>نسبة الكشف</th>
            ${!isClinic ? "<th>نسبة البنتاكام</th>" : ""}
            <th>أوفرتايم</th>
            <th>إجمالي المكافآت</th>
            <th rowspan="2" class="net-cell"><span class="net-label">صافي المستحق</span><span class="net-val">${fmt(net)}</span></th>
          </tr>
          <tr>
            <td>${fmt(attend)}</td>
            <td>${fmt(exam)}</td>
            ${!isClinic ? `<td>${fmt(penta)}</td>` : ""}
            <td>${fmt(ot)}</td>
            <td>${fmt(net)}</td>
          </tr>
        </table>`;
      return (i > 0 ? '<hr class="sep"/>' : "") + buildSlip(r, `نسب ${periodLabel}`, table, net);
    }).join("");
    openPrint(html, `دفعة يوم 10 — ${section} — ${periodLabel}`, SLIPS_CSS);
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
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <span className="text-sm text-muted-foreground">—</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <Button onClick={() => computeMut.mutate({ year, month, section })} disabled={computeMut.isPending} className="gap-2">
            <RefreshCw size={15} className={computeMut.isPending ? "animate-spin" : ""} />
            احتساب
          </Button>
          {rows.length > 0 && (
            <>
              <Button variant="outline" onClick={printSheet} className="gap-2">
                <Printer size={15} /> كامل
              </Button>
              <Button variant="outline" onClick={printDay1Slips} className="gap-2">
                <Printer size={15} /> يوم 1
              </Button>
              <Button variant="outline" onClick={printDay10Slips} className="gap-2">
                <Printer size={15} /> يوم 10
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

      {/* ── Basics section ── */}
      <section className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">الرواتب الأساسية — {periodLabel}</h3>
          <div className="flex items-center gap-2">
            {isFinalized && <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">نهائي</span>}
            {rows.length > 0 && !isFinalized && <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">مسودة</span>}
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={printBasicSheet} className="gap-1.5 h-8 text-xs">
                <Printer size={13} /> طباعة
              </Button>
            )}
          </div>
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
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">جزاء</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إجمالي الخصم</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إجازة</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">معامل</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground font-bold">صافي الأساسي</th>
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
                  <td className="px-3 py-3 text-right text-destructive">{fmt(r.penaltyDeduction)}</td>
                  <td className="px-3 py-3 text-right font-medium text-destructive">{fmt(r.totalDeductions)}</td>
                  <td className="px-3 py-3 text-right">{r.leaveDays}</td>
                  <td className="px-3 py-3 text-right">{pct(r.leaveMultiplier)}</td>
                  <td className="px-3 py-3 text-right font-bold text-primary">{fmt(r.netBasic)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">اضغط «احتساب» لتوليد كشف الرواتب</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                  <td className="px-3 py-2" colSpan={7}>الإجمالي</td>
                  <td className="px-3 py-2 text-right">{fmt(totals.deductions)}</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2 text-right font-bold text-primary">{fmt(totals.netBasic)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ── Commissions section ── */}
      <section className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">العمولات — {periodLabel}</h3>
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={printCommissionsSheet} className="gap-1.5 h-8 text-xs">
              <Printer size={13} /> طباعة
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs">
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">حضور</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">فحص</th>
                {section !== "عيادة" && <th className="px-3 py-3 text-right font-medium text-muted-foreground">بنتاكام</th>}
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إضافي (د)</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إضافي (ج)</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground font-bold">إجمالي العمولات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.empCd} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.fullName ?? r.empCd}</div>
                    <div className="text-xs text-muted-foreground">{r.salaryType ?? r.department ?? ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.attendanceCommission)}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.examCommission)}</td>
                  {section !== "عيادة" && <td className="px-3 py-3 text-right text-success">{fmt(r.pentacamCommission)}</td>}
                  <td className="px-3 py-3 text-right text-success">{r.overtimeMinutes ?? 0}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.overtimePay ?? 0)}</td>
                  <td className="px-3 py-3 text-right font-bold text-primary">{fmt(r.totalCommission)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={section !== "عيادة" ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">اضغط «احتساب» لتوليد كشف الرواتب</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                  <td className="px-3 py-2" colSpan={section !== "عيادة" ? 6 : 5}>الإجمالي</td>
                  <td className="px-3 py-2 text-right font-bold text-primary">{fmt(totals.commission)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
      {/* ── Combined section ── */}
      <section className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">الكشف الكامل — {periodLabel}</h3>
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={printSheet} className="gap-1.5 h-8 text-xs">
              <Printer size={13} /> طباعة
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs">
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">الأساسي</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إجمالي الخصم</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">صافي الأساسي</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">حضور</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">فحص</th>
                {section !== "عيادة" && <th className="px-3 py-3 text-right font-medium text-muted-foreground">بنتاكام</th>}
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">إضافي (ج)</th>
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
                  <td className="px-3 py-3 text-right text-destructive">{fmt(r.totalDeductions)}</td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(r.netBasic)}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.attendanceCommission)}</td>
                  <td className="px-3 py-3 text-right text-success">{fmt(r.examCommission)}</td>
                  {section !== "عيادة" && <td className="px-3 py-3 text-right text-success">{fmt(r.pentacamCommission)}</td>}
                  <td className="px-3 py-3 text-right text-success">{fmt(r.overtimePay ?? 0)}</td>
                  <td className="px-3 py-3 text-right font-bold text-primary text-base">{fmt(r.totalPay)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={section !== "عيادة" ? 9 : 8} className="px-4 py-10 text-center text-muted-foreground">اضغط «احتساب» لتوليد كشف الرواتب</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                  <td className="px-3 py-2">الإجمالي</td>
                  <td className="px-3 py-2 text-right">{fmt(totals.basic)}</td>
                  <td className="px-3 py-2 text-right">{fmt(totals.deductions)}</td>
                  <td className="px-3 py-2 text-right">{fmt(totals.netBasic)}</td>
                  <td colSpan={section !== "عيادة" ? 4 : 3} />
                  <td className="px-3 py-2 text-right font-bold text-primary">{fmt(totals.totalPay)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
