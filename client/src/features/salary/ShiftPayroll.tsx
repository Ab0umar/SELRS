import { useState } from "react";
import {
  canUseNativeAndroidPrint,
  requestNativeAndroidPrint,
} from "@/lib/nativePrint";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

function AttendedEditableCell({
  value,
  hasOverride,
  onSave,
}: {
  value: number;
  hasOverride: boolean;
  onSave: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <Input bare
        type="number"
        min={0}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const n = Number(draft);
          if (Number.isInteger(n) && n >= 0 && n !== value) onSave(n);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-start tabular-nums"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`تعديل عدد الحضور الحالي ${value}`}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        hasOverride && "underline decoration-dotted",
      )}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setDraft(String(value));
          setEditing(true);
        }
      }}
      title="اضغط للتعديل"
    >
      {value}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
      {hasOverride && (
        <Button variant="bare"
          type="button"
          title="إرجاع للحساب التلقائي"
          aria-label="إرجاع للحساب التلقائي"
          onClick={(e) => {
            e.stopPropagation();
            onSave(null);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
    </span>
  );
}

const now = new Date();
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function fmt(n: number) {
  return Number(n).toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function toArabicWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "صفر جنيه";
  const ones = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];
  const tens = [
    "",
    "",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
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

const isoMonthStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  return `${isoMonthStr(previousMonth)}-26`;
})();
const DEFAULT_TO = `${isoMonthStr(defaultPayrollEnd)}-25`;

export default function ShiftPayroll() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // The payroll month follows the range end, matching the monthly payroll page.
  const [year, month] = toDate.split("-").map(Number);
  const periodLabel = `من ${new Date(fromDate + "T00:00:00").toLocaleDateString("ar-EG")} إلى ${new Date(toDate + "T00:00:00").toLocaleDateString("ar-EG")}`;

  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery({
    year,
    month,
    fromDate,
    toDate,
  });
  const monthlyPayrollQ = (trpc as any).salary.getPayroll.useQuery({
    year,
    month,
    section: "مركز",
    fromDate,
    toDate,
  });
  const rawRows: any[] = payrollQ.data ?? [];
  const monthlyPayrollRows: any[] = monthlyPayrollQ.data ?? [];

  const setOverrideMut = (
    trpc as any
  ).salary.setShiftAttendanceOverride.useMutation({
    onSuccess: () => {
      toast.success("تم الحفظ");
      payrollQ.refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message || "تعذر الحفظ");
    },
  });

  // Trust the backend's big/small breakdown directly - it derives shift size
  // from each shift's actual definition (attendanceShifts.shiftSize / duration),
  // not from the shift's name.
  const rows = rawRows;

  const doctors = rows.filter((r: any) => r.type === "doctor");
  const techs = rows.filter((r: any) => r.type === "tech");

  const totalPay = rows.reduce((s: number, r: any) => s + r.totalPay, 0);

  function printDay1Slips() {
    // Collect all unique shift names across all rows
    const allShiftNames = Array.from(
      new Set(rows.flatMap((r: any) => Object.keys(r.byShift ?? {}))),
    );

    const SLIP_CSS = `
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: "Traditional Arabic", "Simplified Arabic", Arial, sans-serif; font-size: 11px; color: #000; direction: rtl; }
      .slip { padding: 6px 0 4px; page-break-inside: avoid; }
      .top { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
      .title { text-align: center; font-size: 18px; font-weight: bold; color: #00008B; margin-bottom: 6px; }
      .meta { display: grid; grid-template-columns: 20px 1fr 20px; align-items: start; margin-bottom: 4px; }
      .meta-right { font-size: 13px; font-weight: bold; text-align: center; grid-column: 2; }
      .meta-left { font-size: 10px; color: #555; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); grid-column: 1; }
      .dept { font-size: 11px; margin-top: 2px; text-align: center; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #999; padding: 2px 3px; text-align: center; font-size: 9px; }
      .emp-cell { font-weight: bold; font-size: 10px; background: #f0f4ff; }
      .net-cell { font-size: 18px; font-weight: bold; color: #00008B; background: #f0f4ff; vertical-align: middle; min-width: 60px; }
      .net-label { font-size: 8px; display: block; margin-bottom: 4px; }
      .total-cell { font-weight: bold; }
      .words { text-align: right; font-size: 11px; margin: 4px 0 3px; }
      .sigs { display: flex; justify-content: space-between; margin-top: 8px; }
      .sig-block { text-align: center; font-size: 10px; }
      .sig-line { border-bottom: 1px solid #000; width: 120px; margin: 14px auto 3px; }
      hr.sep { border: none; border-top: 1px dashed #888; margin: 8px 0; }
    `;

    const titleAr = `مرتب الشفتات: يوم 1، ${periodLabel}`;
    const today = new Date().toLocaleDateString("ar-EG");

    const slips = rows
      .map((r: any, i: number) => {
        const byShift = r.byShift ?? {};
        const shiftCols = allShiftNames
          .map((sn: string) => {
            const s = byShift[sn] ?? { attended: 0, rate: r.ratePerShift };
            return `<td>${fmt(s.attended)}</td><td>${fmt(s.rate)}</td>`;
          })
          .join("");

        const shiftNameAr = (sn: string) =>
          sn === "Morning"
            ? "شفت صباحي"
            : sn === "Night"
              ? "شفت مسائي"
              : `شفت ${sn}`;
        const shiftHeaders = allShiftNames
          .map((sn: string) => `<th colspan="2">${shiftNameAr(sn)}</th>`)
          .join("");

        const shiftSubHeaders = allShiftNames
          .map(() => `<th>عدد</th><th>قيمة</th>`)
          .join("");

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
              <td colspan="${Math.max(1, shiftColspan - 2)}">غير متاح</td>
              <td>غير متاح</td>
              <td>${r.absent ?? "غير متاح"}</td>
              <td>غير متاح</td>
              <td>غير متاح</td>
            </tr>
          </table>
          <div class="words">${toArabicWords(r.totalPay)}</div>
          <div class="sigs">
            <div class="sig-block"><div class="sig-line"></div>توقيع المستلم</div>
            <div class="sig-block"><div class="sig-line"></div>يعتمد</div>
          </div>
        </div>`;
      })
      .join("");

    const footer = `
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;margin-top:10px;">
        <span>تاريخ الطباعة: ${today}</span>
        <span>التقرير الكامل في هذه الطباعة</span>
      </div>`;

    const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><style>${SLIP_CSS}</style></head><body>${slips}${footer}</body></html>`;

    if (canUseNativeAndroidPrint()) {
      void requestNativeAndroidPrint("قسائم الشفتات يوم 1", fullHtml);
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(fullHtml);
    doc.close();
    const cleanup = () => {
      iframe.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
  }

  function printDay10Slips() {
    const day10Rows = rows.map((row: any) => {
      const payrollRow = monthlyPayrollRows.find(
        (item: any) => item.empCd === `shift_${row.id}`,
      );
      const attendance = Number(payrollRow?.attendanceCommission ?? 0);
      const examination = Number(payrollRow?.examCommission ?? 0);
      const pentacam = Number(payrollRow?.pentacamCommission ?? 0);
      const costOfLiving = Number(payrollRow?.costOfLivingAllowance ?? 0);
      const transport = Number(payrollRow?.transportAllowance ?? 0);
      const overtime = Number(payrollRow?.overtimePay ?? 0);
      const total =
        attendance + examination + pentacam + costOfLiving + transport + overtime;

      return `
        <section class="slip">
          <div class="top"><span>عيون الشروق للخدمات الطبية</span><span>دفعة يوم 10</span></div>
          <h1>نسب الشفتات: ${MONTHS[month - 1]} ${year}</h1>
          <div class="employee">الاسم: ${row.name}</div>
          <table>
            <thead><tr><th>الحضور</th><th>الكشف</th><th>البنتاكام</th><th>غلاء معيشة</th><th>بدل مواصلات</th><th>أوفرتايم</th><th>الإجمالي</th></tr></thead>
            <tbody><tr><td>${fmt(attendance)}</td><td>${fmt(examination)}</td><td>${fmt(pentacam)}</td><td>${fmt(costOfLiving)}</td><td>${fmt(transport)}</td><td>${fmt(overtime)}</td><td class="total">${fmt(total)}</td></tr></tbody>
          </table>
          <div class="words">${toArabicWords(total)}</div>
          <div class="signatures"><span>توقيع المستلم</span><span>يعتمد</span></div>
        </section>`;
    }).join("");

    const css = `
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { direction: rtl; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #111; font-size: 10px; }
      .slip { min-height: 64mm; padding: 5mm; margin-bottom: 3mm; break-inside: avoid; page-break-inside: avoid; border: 1px solid #98a2b3; border-radius: 10px; }
      .top { display: flex; justify-content: space-between; color: #475467; font-size: 9px; font-weight: 700; }
      h1 { margin: 3mm 0; text-align: center; color: #172554; font-size: 16px; }
      .employee { margin-bottom: 3mm; font-size: 12px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 2.5mm 1.5mm; border: 1px solid #98a2b3; text-align: center; overflow-wrap: anywhere; }
      th { background: #e8eefc; color: #172554; font-size: 9px; }
      td { font-size: 11px; font-weight: 700; }
      .total { background: #fff4d6; color: #7a4b00; font-weight: 900; }
      .words { margin-top: 3mm; font-size: 10px; font-weight: 700; }
      .signatures { display: flex; justify-content: space-between; margin-top: 8mm; font-size: 10px; font-weight: 700; }
      .signatures span { min-width: 34%; padding-top: 4mm; border-top: 1px solid #475467; text-align: center; }
    `;
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>قسائم الشفتات يوم 10</title><style>${css}</style></head><body>${day10Rows}</body></html>`;

    if (canUseNativeAndroidPrint()) {
      void requestNativeAndroidPrint("قسائم الشفتات يوم 10", html);
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
      iframe.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
  }

  function renderSection(data: any[], title: string) {
    if (data.length === 0) return null;
    const sectionPay = data.reduce((s: number, r: any) => s + r.totalPay, 0);
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold  text-muted-foreground">
            {title}
          </h3>
          <span className="text-sm font-semibold text-primary">
            {fmt(sectionPay)} ج.م
          </span>
        </div>

        <div className="hidden xl:block rounded-xl border border-border overflow-hidden">
          <table
            aria-label="مرتبات الشفتات"
            className="w-full text-sm"
            dir="rtl"
          >
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs">
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground"
                >
                  الاسم
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground"
                >
                  شفت كبير
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground"
                >
                  شفت صغير
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground"
                >
                  مجدول ك
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground"
                >
                  مجدول ص
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground text-success"
                >
                  حضور ك
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground text-success"
                >
                  حضور ص
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground text-destructive"
                >
                  غياب ك
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground text-destructive"
                >
                  غياب ص
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-start font-medium text-muted-foreground font-bold"
                >
                  المستحق
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 hover:bg-muted/20"
                >
                  <td className="px-3 py-3 font-medium">{r.name}</td>
                  <td className="px-3 py-3 text-start tabular-nums">
                    {fmt(r.ratePerShift)}
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums">
                    {fmt(r.rateSmallShift ?? r.ratePerShift)}
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums">
                    {r.bigScheduled ?? 0}
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums">
                    {r.smallScheduled ?? 0}
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums text-success font-medium">
                    <AttendedEditableCell
                      value={r.bigAttended ?? 0}
                      hasOverride={r.hasBigAttendanceOverride}
                      onSave={(v) =>
                        setOverrideMut.mutate({
                          staffId: r.id,
                          year,
                          month,
                          bigAttended: v,
                          smallAttended: r.hasSmallAttendanceOverride
                            ? r.smallAttended
                            : null,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums text-success font-medium">
                    <AttendedEditableCell
                      value={r.smallAttended ?? 0}
                      hasOverride={r.hasSmallAttendanceOverride}
                      onSave={(v) =>
                        setOverrideMut.mutate({
                          staffId: r.id,
                          year,
                          month,
                          bigAttended: r.hasBigAttendanceOverride
                            ? r.bigAttended
                            : null,
                          smallAttended: v,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums text-destructive">
                    {r.bigAbsent ?? 0}
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums text-destructive">
                    {r.smallAbsent ?? 0}
                  </td>
                  <td className="px-3 py-3 text-start tabular-nums font-bold text-primary">
                    {fmt(r.totalPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="block xl:hidden rounded-xl border border-border overflow-hidden divide-y divide-border/60">
          {data.map((r: any) => {
            const isExpanded = !!expandedRows[r.id];
            return (
              <div
                key={r.id}
                className="p-4 bg-card hover:bg-muted/20 transition-colors"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`${r.name}، تفاصيل كشف الشفت`}
                  className="flex min-h-11 items-center justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  onClick={() => toggleRow(r.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleRow(r.id);
                    }
                  }}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-foreground">
                      {r.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      قيمة الشفت: {fmt(r.ratePerShift)} ج.م
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-end">
                      <div className="text-xs font-bold text-muted-foreground ">
                        المستحق
                      </div>
                      <div className="text-sm font-bold text-primary tabular-nums">
                        {fmt(r.totalPay)} ج.م
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
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Big shift column */}
                      <div className="bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                        <div className="font-medium text-foreground">
                          شفت كبير
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">مجدول:</span>
                          <span className="font-semibold tabular-nums">
                            {r.bigScheduled ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">حضور:</span>
                          <span className="font-semibold text-success tabular-nums">
                            {r.bigAttended ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">غياب:</span>
                          <span className="font-semibold text-destructive tabular-nums">
                            {r.bigAbsent ?? 0}
                          </span>
                        </div>
                      </div>
                      {/* Small shift column */}
                      <div className="bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                        <div className="font-medium text-foreground">
                          شفت صغير
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">مجدول:</span>
                          <span className="font-semibold tabular-nums">
                            {r.smallScheduled ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">حضور:</span>
                          <span className="font-semibold text-success tabular-nums">
                            {r.smallAttended ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">غياب:</span>
                          <span className="font-semibold text-destructive tabular-nums">
                            {r.smallAbsent ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateInput
            aria-label="من تاريخ"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <span className="hidden text-sm text-muted-foreground sm:inline">
            -
          </span>
          <DateInput
            aria-label="إلى تاريخ"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            onClick={() => payrollQ.refetch()}
            disabled={payrollQ.isFetching}
            className="gap-2"
          >
            <RefreshCw
              size={15}
              className={payrollQ.isFetching ? "animate-spin" : ""}
            />
            تحديث
          </Button>
          {rows.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={printDay1Slips}
                className="gap-2"
                aria-label="طباعة قسائم الشفتات ليوم 1 أو حفظها PDF"
              >
                <Printer size={15} /> يوم 1
              </Button>
              <Button
                variant="outline"
                onClick={printDay10Slips}
                className="gap-2"
                disabled={
                  monthlyPayrollQ.isLoading || monthlyPayrollQ.isError
                }
                aria-label="طباعة قسائم الشفتات ليوم 10 أو حفظها PDF"
              >
                <Printer size={15} /> يوم 10
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tables */}
      {payrollQ.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          جاري التحميل...
        </p>
      ) : payrollQ.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-10 text-center text-sm text-destructive"
        >
          <p>تعذر تحميل كشف الشفتات للفترة المحددة.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => payrollQ.refetch()}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-background px-4 py-16 text-center text-muted-foreground text-sm">
          لا يوجد طاقم شفتات أو حضور مسجل للفترة {periodLabel}.
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection(doctors, "الأطباء")}
          {renderSection(techs, "الفنيون")}

          {/* Grand total */}
          <div className="flex justify-end">
            <div className="rounded-xl border border-border bg-muted/20 px-6 py-3 text-sm">
              الإجمالي:{" "}
              <span className="font-bold text-primary me-2">
                {fmt(totalPay)} ج.م
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
