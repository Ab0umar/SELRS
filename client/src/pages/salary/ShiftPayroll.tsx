import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw, Printer } from "lucide-react";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function fmt(n: number) {
  return Number(n).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const hw = h === 1 ? "مائة" : h === 2 ? "مئتان" : ones[h] + " مائة";
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

export default function ShiftPayroll() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery({ year, month });
  const rows: any[] = payrollQ.data ?? [];

  const doctors = rows.filter((r: any) => r.type === "doctor");
  const techs    = rows.filter((r: any) => r.type === "tech");

  const totalScheduled = rows.reduce((s: number, r: any) => s + r.scheduled, 0);
  const totalAttended  = rows.reduce((s: number, r: any) => s + r.attended, 0);
  const totalAbsent    = rows.reduce((s: number, r: any) => s + r.absent, 0);
  const totalPay       = rows.reduce((s: number, r: any) => s + r.totalPay, 0);

  function printSlips() {
    // Collect all unique shift names across all rows
    const allShiftNames = Array.from(new Set(
      rows.flatMap((r: any) => Object.keys(r.byShift ?? {}))
    ));

    const SLIP_CSS = `
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: "Traditional Arabic", "Simplified Arabic", Arial, sans-serif; font-size: 9px; color: #000; direction: rtl; }
      .slip { padding: 6px 0 4px; page-break-inside: avoid; }
      .top { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
      .title { text-align: center; font-size: 16px; font-weight: bold; color: #00008B; margin-bottom: 6px; }
      .meta { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
      .meta-right { font-size: 12px; font-weight: bold; }
      .meta-left { font-size: 9px; color: #555; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
      .dept { font-size: 10px; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #999; padding: 2px 3px; text-align: center; font-size: 8px; }
      .emp-cell { font-weight: bold; font-size: 9px; background: #f0f4ff; }
      .net-cell { font-size: 16px; font-weight: bold; color: #00008B; background: #f0f4ff; vertical-align: middle; min-width: 60px; }
      .net-label { font-size: 7px; display: block; margin-bottom: 4px; }
      .total-cell { font-weight: bold; }
      .words { text-align: right; font-size: 10px; margin: 4px 0 3px; }
      .sigs { display: flex; justify-content: space-between; margin-top: 8px; }
      .sig-block { text-align: center; font-size: 9px; }
      .sig-line { border-bottom: 1px solid #000; width: 120px; margin: 14px auto 3px; }
      hr.sep { border: none; border-top: 1px dashed #888; margin: 8px 0; }
    `;

    const titleAr = `مرتب شهر ${MONTHS_AR[month - 1]} ${year}`;
    const today = new Date().toLocaleDateString("ar-EG");

    const slips = rows.map((r: any, i: number) => {
      const byShift = r.byShift ?? {};
      const shiftCols = allShiftNames.map((sn: string) => {
        const s = byShift[sn] ?? { attended: 0, rate: r.ratePerShift };
        return `<td>${fmt(s.attended)}</td><td>${fmt(s.rate)}</td>`;
      }).join("");

      const shiftHeaders = allShiftNames.map((sn: string) =>
        `<th colspan="2">شفتي ${sn}</th>`
      ).join("");

      const shiftSubHeaders = allShiftNames.map(() =>
        `<th>عدد</th><th>قيمة</th>`
      ).join("");

      const shiftColspan = allShiftNames.length * 2;

      return `
        ${i > 0 ? '<hr class="sep"/>' : ""}
        <div class="slip">
          <div class="top">
            <span></span>
            <span>عيون السروق للخدمات الطبية</span>
          </div>
          <div class="title">${titleAr}</div>
          <div class="meta">
            <div class="meta-left">شفتات</div>
            <div class="meta-right">
              <div>الاسم/ ${r.name}</div>
              <div class="dept">القسم التابع له/</div>
            </div>
          </div>
          <table>
            <tr>
              <th rowspan="3" class="emp-cell">موظف</th>
              ${shiftHeaders}
              <th>إجمالي الاستحقاقات</th>
              <th rowspan="3" class="net-cell"><span class="net-label">صافي المستحق</span>${fmt(r.totalPay)}</th>
            </tr>
            <tr>
              ${shiftSubHeaders}
              <th></th>
            </tr>
            <tr>
              ${shiftCols}
              <td class="total-cell">${fmt(r.totalPay)}</td>
            </tr>
            <tr>
              <td class="emp-cell">موظف</td>
              <td colspan="${shiftColspan - 2}">سلف عاملين</td>
              <td>أرصدة مدينة</td>
              <td>غياب</td>
              <td>جزاءات</td>
              <td>إجمالي الاستقطاعات</td>
            </tr>
            <tr>
              <td></td>
              <td colspan="${shiftColspan - 2}">0.00</td>
              <td>0.00</td>
              <td>${r.absent}</td>
              <td>0.00</td>
              <td>0.00</td>
            </tr>
          </table>
          <div class="words">${toArabicWords(r.totalPay)}</div>
          <div class="sigs">
            <div class="sig-block"><div class="sig-line"></div>توقيع المستلم</div>
            <div class="sig-block"><div class="sig-line"></div>يعتمد</div>
          </div>
        </div>`;
    }).join("");

    const footer = `
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;margin-top:10px;">
        <span>تاريخ الطباعة: ${today}</span>
        <span>صفحة 1 من 1</span>
      </div>`;

    const mask = document.createElement("style");
    mask.textContent = "@media print{body>*{visibility:hidden!important}#__pr__,#__pr__ *{visibility:visible!important}#__pr__{position:fixed;inset:0;direction:rtl}}";
    const container = document.createElement("div");
    container.id = "__pr__";
    container.innerHTML = `<style>${SLIP_CSS}</style>${slips}${footer}`;
    document.head.appendChild(mask);
    document.body.appendChild(container);
    const cleanup = () => { mask.remove(); container.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  function renderSection(data: any[], title: string) {
    if (data.length === 0) return null;
    const sectionPay = data.reduce((s: number, r: any) => s + r.totalPay, 0);
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          <span className="text-sm font-semibold text-primary">{fmt(sectionPay)} ج.م</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs">
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الاسم</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">قيمة الشفت</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">مجدول</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-success">حضور</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-destructive">غياب</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground font-bold">المستحق</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(r.ratePerShift)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.scheduled}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-600 font-medium">{r.attended}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">{r.absent}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">{fmt(r.totalPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">مسار الشفتات</p>
          <h2 className="text-2xl font-bold">كشف الشفتات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            مستحقات الأطباء والفنيين حسب الشفتات المسجلة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => payrollQ.refetch()} disabled={payrollQ.isFetching} className="gap-2">
            <RefreshCw size={15} className={payrollQ.isFetching ? "animate-spin" : ""} />
            تحديث
          </Button>
          {rows.length > 0 && (
            <Button variant="outline" onClick={printSlips} className="gap-2">
              <Printer size={15} /> طباعة
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "الشفتات المجدولة", value: String(totalScheduled), tone: "text-foreground" },
            { label: "تم الحضور",         value: String(totalAttended),  tone: "text-green-600 font-bold" },
            { label: "غياب",              value: String(totalAbsent),    tone: "text-destructive" },
            { label: "إجمالي المستحق",    value: fmt(totalPay) + " ج.م", tone: "text-primary font-bold" },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className={`mt-1 text-lg ${card.tone}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tables */}
      {payrollQ.isLoading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-background px-4 py-16 text-center text-muted-foreground text-sm">
          لا يوجد طاقم شفتات أو حضور مسجل لشهر {MONTHS[month - 1]} {year}.
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection(doctors, "الأطباء")}
          {renderSection(techs, "الفنيون")}

          {/* Grand total */}
          <div className="flex justify-end">
            <div className="rounded-xl border border-border bg-muted/20 px-6 py-3 text-sm">
              الإجمالي: <span className="font-bold text-primary ml-2">{fmt(totalPay)} ج.م</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
