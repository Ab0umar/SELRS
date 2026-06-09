import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  CheckCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const DEFAULT_FROM = `${isoMonth(now)}-01`;
const DEFAULT_TO = (() => {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${isoMonth(last)}-${String(last.getDate()).padStart(2, "0")}`;
})();

function fmt(n: any): string {
  return Number(n).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function pct(n: any): string {
  return (Number(n) * 100).toFixed(1) + "%";
}

const SECTIONS = ["مركز", "عيادة"] as const;
type Section = (typeof SECTIONS)[number];

type TabType = "salaries" | "shifts";

export default function PayrollReport() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [section, setSection] = useState<Section>("مركز");
  const [activeTab, setActiveTab] = useState<TabType>("salaries");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {},
  );
  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const year = new Date(fromDate).getFullYear();
  const month = new Date(fromDate).getMonth() + 1;
  const periodLabel = `${new Date(fromDate).toLocaleDateString("ar-EG")} — ${new Date(toDate).toLocaleDateString("ar-EG")}`;

  const centerQ = (trpc as any).salary.getPayroll.useQuery({
    year,
    month,
    section: "مركز",
  });
  const clinicQ = (trpc as any).salary.getPayroll.useQuery({
    year,
    month,
    section: "عيادة",
  });
  const sectionPoolQ = (trpc as any).salary.getCommissionPool.useQuery({
    year,
    month,
    section,
  });
  const otherSectionPoolQ = (trpc as any).salary.getCommissionPool.useQuery({
    year,
    month,
    section: section === "مركز" ? "عيادة" : "مركز",
  });

  // salaryBasics — for allowance breakdown in day-1 slips
  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const latestBasics: Record<string, any> = (
    (basicsQ.data ?? []) as any[]
  ).reduce((acc: Record<string, any>, b: any) => {
    if (
      !acc[b.empCd] ||
      String(b.effectiveFrom) > String(acc[b.empCd].effectiveFrom)
    )
      acc[b.empCd] = b;
    return acc;
  }, {});

  // Fetch shift staff data and roster schedule
  const shiftStaffQ = (trpc as any).salary.listShiftStaff.useQuery();
  const shiftScheduleQ = (trpc as any).salary.getShiftSchedule.useQuery({
    year,
    month,
  });
  const shiftStaff: any[] = shiftStaffQ.data ?? [];
  const shiftSchedule: any[] = shiftScheduleQ.data?.attendance ?? [];

  // Build shift count map by staffId and shiftName (صباحي/ليلي) from roster
  const shiftCountByStaffShift: Record<string, number> = {};
  shiftSchedule.forEach((entry: any) => {
    const key = `${entry.staffId}_${entry.shiftName}`;
    shiftCountByStaffShift[key] = (shiftCountByStaffShift[key] ?? 0) + 1;
  });

  const rows: any[] = (section === "مركز" ? centerQ : clinicQ).data ?? [];
  const sectionPool = sectionPoolQ.data;
  const otherSectionPool = otherSectionPoolQ.data;
  const allowanceSource =
    sectionPool &&
    (Number(sectionPool.costOfLivingAllowanceAmount ?? 0) > 0 ||
      Number(sectionPool.transportAllowanceAmount ?? 0) > 0)
      ? sectionPool
      : otherSectionPool;
  const colaFallback = Number(
    allowanceSource?.costOfLivingAllowanceAmount ?? 0,
  );
  const travelFallback = Number(allowanceSource?.transportAllowanceAmount ?? 0);
  const getAllowanceValues = (r: any) => ({
    cola: Number(r.costOfLivingAllowance) || colaFallback,
    travel: Number(r.transportAllowance) || travelFallback,
  });
  const getCommissionTotal = (r: any) => {
    const a = getAllowanceValues(r);
    return (
      Number(r.attendanceCommission) +
      Number(r.examCommission) +
      Number(r.pentacamCommission) +
      a.cola +
      a.travel
    );
  };

  // Separate regular and shift employees
  const regularRows = rows.filter(
    (r: any) => !String(r.empCd).startsWith("shift_"),
  );
  const shiftRows = rows.filter((r: any) =>
    String(r.empCd).startsWith("shift_"),
  );

  // Build enhanced shift rows with day/night breakdown from roster
  const enhancedShiftRows = shiftStaff.map((staff: any) => {
    // Get shift counts from roster (shift-schedule)
    const dayCount = shiftCountByStaffShift[`${staff.id}_Morning`] ?? 0;
    const nightCount = shiftCountByStaffShift[`${staff.id}_Night`] ?? 0;
    const dayRate = staff.ratePerShift ?? 0;
    const nightRate = staff.ratePerShift ?? 0;

    const dayTotal = dayCount * dayRate;
    const nightTotal = nightCount * nightRate;
    const totalPay = dayTotal + nightTotal;

    // Find corresponding payroll row for deductions
    const payrollRow = rows.find((r: any) => r.empCd === `shift_${staff.id}`);

    return {
      id: staff.id,
      fullName: staff.name,
      type: staff.type,
      shiftDayCount: dayCount,
      shiftDayRate: dayRate,
      shiftDayTotal: dayTotal,
      shiftNightCount: nightCount,
      shiftNightRate: nightRate,
      shiftNightTotal: nightTotal,
      totalDeductions: payrollRow?.totalDeductions ?? 0,
      leaveMultiplier: payrollRow?.leaveMultiplier ?? 1,
      netBasic: totalPay - (payrollRow?.totalDeductions ?? 0),
    };
  });

  // All non-shift employees from both sections — used for combined receipts print
  const allPrintRows: any[] = [
    ...(centerQ.data ?? []).map((r: any) => ({ ...r, _section: "مركز" })),
    ...(clinicQ.data ?? []).map((r: any) => ({ ...r, _section: "عيادة" })),
  ].filter((r: any) => !String(r.empCd).startsWith("shift_"));

  const refetchBoth = () => {
    centerQ.refetch();
    clinicQ.refetch();
  };

  const computeMut = (trpc as any).salary.computePayroll.useMutation({
    onSuccess: (res: any) => {
      refetchBoth();
      toast.success(`تم احتساب ${res.saved} موظف`);
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const finalizeMut = (trpc as any).salary.finalizePayroll.useMutation({
    onSuccess: () => {
      refetchBoth();
      toast.success("تم اعتماد كشف الرواتب");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const totals = allPrintRows.reduce(
    (acc: any, r: any) => ({
      basic: acc.basic + Number(r.basicSalary),
      deductions: acc.deductions + Number(r.totalDeductions),
      netBasic: acc.netBasic + Number(r.netBasic),
      commission: acc.commission + getCommissionTotal(r),
      overtime: acc.overtime + Number(r.overtimePay ?? 0),
      totalPay: acc.totalPay + Number(r.totalPay),
    }),
    {
      basic: 0,
      deductions: 0,
      netBasic: 0,
      commission: 0,
      overtime: 0,
      totalPay: 0,
    },
  );

  const isFinalized =
    rows.length > 0 && rows.every((r: any) => r.payrollStatus === "final");

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
    .slip { padding: 6px 0 4px; break-inside: avoid; border-bottom: 1px dashed #aaa; margin-bottom: 4px; }
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
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>${title}</title><style>${css}</style></head><body>${html}</body></html>`,
    );
    doc.close();
    const cleanup = () => {
      iframe.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
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
    const nonShift = rows.filter(
      (r: any) => !String(r.empCd).startsWith("shift_"),
    );
    const tBasic = nonShift.reduce(
      (s: number, r: any) => s + Number(r.basicSalary),
      0,
    );
    const tAbsent = nonShift.reduce(
      (s: number, r: any) => s + Number(r.absentDeduction),
      0,
    );
    const tLate = nonShift.reduce(
      (s: number, r: any) => s + Number(r.lateDeduction ?? 0),
      0,
    );
    const tEarly = nonShift.reduce(
      (s: number, r: any) => s + Number(r.earlyLeaveDeduction ?? 0),
      0,
    );
    const tPenalty = nonShift.reduce(
      (s: number, r: any) => s + Number(r.penaltyDeduction),
      0,
    );
    const tDed = nonShift.reduce(
      (s: number, r: any) => s + Number(r.totalDeductions),
      0,
    );
    const tNetBasic = nonShift.reduce(
      (s: number, r: any) => s + Number(r.netBasic),
      0,
    );
    const tAttend = nonShift.reduce(
      (s: number, r: any) => s + Number(r.attendanceCommission),
      0,
    );
    const tExam = nonShift.reduce(
      (s: number, r: any) => s + Number(r.examCommission),
      0,
    );
    const tPenta = nonShift.reduce(
      (s: number, r: any) => s + Number(r.pentacamCommission),
      0,
    );
    const tOT = nonShift.reduce(
      (s: number, r: any) => s + Number(r.overtimePay ?? 0),
      0,
    );
    const tTotal = nonShift.reduce(
      (s: number, r: any) => s + Number(r.totalPay),
      0,
    );

    const bodyRows = nonShift
      .map(
        (r: any) => `
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
      </tr>`,
      )
      .join("");

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
    const nonShift = rows.filter(
      (r: any) => !String(r.empCd).startsWith("shift_"),
    );
    const tBasic = nonShift.reduce(
      (s: number, r: any) => s + Number(r.basicSalary),
      0,
    );
    const tAbsent = nonShift.reduce(
      (s: number, r: any) => s + Number(r.absentDeduction),
      0,
    );
    const tLate = nonShift.reduce(
      (s: number, r: any) => s + Number(r.lateDeduction ?? 0),
      0,
    );
    const tEarly = nonShift.reduce(
      (s: number, r: any) => s + Number(r.earlyLeaveDeduction ?? 0),
      0,
    );
    const tPenalty = nonShift.reduce(
      (s: number, r: any) => s + Number(r.penaltyDeduction),
      0,
    );
    const tDed = nonShift.reduce(
      (s: number, r: any) => s + Number(r.totalDeductions),
      0,
    );
    const tNet = nonShift.reduce(
      (s: number, r: any) => s + Number(r.netBasic),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
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
      </tr>`,
      )
      .join("");
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
    const nonShift = rows.filter(
      (s: any) => !String(s.empCd).startsWith("shift_"),
    );
    const tAttend = nonShift.reduce(
      (s: number, r: any) => s + Number(r.attendanceCommission),
      0,
    );
    const tExam = nonShift.reduce(
      (s: number, r: any) => s + Number(r.examCommission),
      0,
    );
    const tPenta = nonShift.reduce(
      (s: number, r: any) => s + Number(r.pentacamCommission),
      0,
    );
    const tCola = nonShift.reduce(
      (s: number, r: any) => s + getAllowanceValues(r).cola,
      0,
    );
    const tTravel = nonShift.reduce(
      (s: number, r: any) => s + getAllowanceValues(r).travel,
      0,
    );
    const tOT = nonShift.reduce(
      (s: number, r: any) => s + Number(r.overtimePay ?? 0),
      0,
    );
    const tDay10 = nonShift.reduce(
      (s: number, r: any) =>
        s + getCommissionTotal(r) + Number(r.overtimePay ?? 0),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${r.fullName ?? r.empCd}</td>
        <td>${fmt(r.attendanceCommission)}</td>
        <td>${fmt(r.examCommission)}</td>
        ${!isClinic ? `<td>${fmt(r.pentacamCommission)}</td>` : ""}
        <td>${fmt(getAllowanceValues(r).cola)}</td>
        <td>${fmt(getAllowanceValues(r).travel)}</td>
        <td>${fmt(r.overtimePay ?? 0)}</td>
        <td style="font-weight:bold">${fmt(getCommissionTotal(r) + Number(r.overtimePay ?? 0))}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      <div class="top"><span>نظام مرتبات</span><span>عيون السروق للخدمات الطبية</span></div>
      <h1>كشف العمولات عن الفترة ${periodLabel}</h1>
      <div class="dept">قسم ${section}</div>
      <table>
        <thead><tr>
          <th>الاسم</th><th>عمولة حضور</th><th>عمولة فحص</th>
          ${!isClinic ? "<th>عمولة بنتاكام</th>" : ""}
          <th>غلاء معيشه</th><th>بدل مواصلات</th><th>إضافي</th><th>إجمالي العمولات</th><th class="sig-col">التوقيع</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td>${fmt(tAttend)}</td><td>${fmt(tExam)}</td>
            ${!isClinic ? `<td>${fmt(tPenta)}</td>` : ""}
            <td>${fmt(tCola)}</td><td>${fmt(tTravel)}</td><td>${fmt(tOT)}</td><td style="font-weight:bold">${fmt(tDay10)}</td><td></td>
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

  function buildSlip(
    r: any,
    title: string,
    tableHtml: string,
    netPay: number,
    empSection?: string,
  ): string {
    return `
      <div class="slip">
        <div class="slip-top">
          <span>مرتبات</span>
          <span>عيون السروق للخدمات الطبية</span>
        </div>
        <div class="slip-title">${title}</div>
        <div class="emp-name">الاسم/ ${r.fullName ?? r.empCd}</div>
        <div class="dept-row">القسم التابع له/ ${empSection ?? r._section ?? section}</div>
        ${tableHtml}
        <div class="words">${toArabicWords(netPay)}</div>
        <div class="sigs">
          <div class="sig-block"><div class="sig-line"></div>توقيع المستلم</div>
          <div class="sig-block"><div class="sig-line"></div>يعتمد</div>
        </div>
      </div>`;
  }

  function printDay1Slips() {
    const html = allPrintRows
      .map((r: any, i: number) => {
        const net = Number(r.netBasic);
        const b = latestBasics[r.empCd] ?? {};
        const basicAmt = Number(b.basicAmount ?? r.basicSalary);
        const social = Number(b.socialAllowance ?? 0);
        const cola = Number(b.costOfLivingAllowance ?? 0);
        const badlat =
          Number(b.transportAllowance ?? 0) +
          Number(b.workNatureAllowance ?? 0) +
          Number(b.receptionAllowance ?? 0);
        const raise = Number(b.yearlyRaise ?? 0);
        const grossBasic = basicAmt + social + cola + badlat + raise;
        const absent = Number(r.absentDeduction);
        const penalty = Number(r.penaltyDeduction);
        const advances = Number(r.advancesDeduction ?? 0);
        const insurance = Number(r.insuranceDeduction ?? 0);
        const other =
          Number(r.lateDeduction ?? 0) + Number(r.earlyLeaveDeduction ?? 0);
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
            <td>${fmt(basicAmt)}</td>
            <td>${fmt(social)}</td>
            <td>${fmt(cola)}</td>
            <td>${fmt(badlat)}</td>
            <td>${fmt(raise)}</td>
            <td>0.00</td>
            <td>${fmt(grossBasic)}</td>
            <td>0.00</td>
            <td>${fmt(grossBasic)}</td>
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
            <td>${fmt(insurance)}</td><td>${fmt(advances)}</td><td>0.00</td>
            <td>${fmt(absent)}</td><td>${fmt(penalty)}</td><td>${fmt(other)}</td><td>0.00</td>
            <td colspan="2">${fmt(totalDed)}</td>
          </tr>
        </table>`;
        return buildSlip(r, `مرتب ${MONTHS[month - 1]} ${year}`, table, net);
      })
      .join("");
    openPrint(html, `دفعة يوم 1 — ${MONTHS[month - 1]} ${year}`, SLIPS_CSS);
  }

  function printDay10Slips() {
    const html = allPrintRows
      .map((r: any, i: number) => {
        const isClinic = (r._section ?? section) === "عيادة";
        const attend = Number(r.attendanceCommission);
        const exam = Number(r.examCommission);
        const penta = Number(r.pentacamCommission);
        const cola = Number(r.costOfLivingAllowance ?? 0);
        const travel = Number(r.transportAllowance ?? 0);
        const ot = Number(r.overtimePay ?? 0);
        const net = attend + exam + (isClinic ? 0 : penta) + cola + travel + ot;
        const table = `
        <table class="main">
          <tr>
            <th>نسبة الحضور</th>
            <th>نسبة الكشف</th>
            ${!isClinic ? "<th>نسبة البنتاكام</th>" : ""}
            <th>غلاء معيشه</th>
            <th>بدل مواصلات</th>
            <th>أوفرتايم</th>
            <th>إجمالي المكافآت</th>
            <th rowspan="2" class="net-cell"><span class="net-label">صافي المستحق</span><span class="net-val">${fmt(net)}</span></th>
          </tr>
          <tr>
            <td>${fmt(attend)}</td>
            <td>${fmt(exam)}</td>
            ${!isClinic ? `<td>${fmt(penta)}</td>` : ""}
            <td>${fmt(cola)}</td>
            <td>${fmt(travel)}</td>
            <td>${fmt(ot)}</td>
            <td>${fmt(net)}</td>
          </tr>
        </table>`;
        return buildSlip(r, `نسب ${MONTHS[month - 1]} ${year}`, table, net);
      })
      .join("");
    openPrint(html, `دفعة يوم 10 — ${MONTHS[month - 1]} ${year}`, SLIPS_CSS);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            الرواتب
          </p>
          <h2 className="text-2xl font-bold text-foreground">كشف الرواتب</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm w-full sm:w-auto">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={`flex-1 sm:flex-none px-4 py-2 transition-colors ${section === s ? "bg-primary text-primary-foreground font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm flex-1 sm:flex-initial"
            />
            <span className="text-sm text-muted-foreground">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm flex-1 sm:flex-initial"
            />
          </div>
          <Button
            onClick={() => computeMut.mutate({ year, month, section })}
            disabled={computeMut.isPending}
            className="gap-2 w-full sm:w-auto justify-center"
          >
            <RefreshCw
              size={15}
              className={computeMut.isPending ? "animate-spin" : ""}
            />
            احتساب
          </Button>
          {rows.length > 0 && (
            <>
              {/* Desktop Print Actions */}
              <div className="hidden lg:flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={printSheet}
                  className="gap-2"
                >
                  <Printer size={15} /> كامل
                </Button>
                <Button
                  variant="outline"
                  onClick={printDay1Slips}
                  className="gap-2"
                >
                  <Printer size={15} /> يوم 1
                </Button>
                <Button
                  variant="outline"
                  onClick={printDay10Slips}
                  className="gap-2"
                >
                  <Printer size={15} /> يوم 10
                </Button>
              </div>

              {/* Mobile Print Actions Dropdown */}
              <div className="lg:hidden w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 w-full justify-center"
                    >
                      <Printer size={15} /> طباعة التقارير
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={printSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> كامل
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printDay1Slips}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> يوم 1
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printDay10Slips}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> يوم 10
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
          {rows.length > 0 && !isFinalized && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("اعتماد كشف الرواتب كنهائي؟"))
                  finalizeMut.mutate({ year, month });
              }}
              disabled={finalizeMut.isPending}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <CheckCircle size={15} /> اعتماد
            </Button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="البحث باسم الموظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "الرواتب الأساسية",
              value: fmt(totals.basic),
              tone: "text-foreground",
            },
            {
              label: "الخصومات",
              value: fmt(totals.deductions),
              tone: "text-destructive",
            },
            {
              label: "الإجمالي الكلي",
              value: fmt(totals.totalPay),
              tone: "text-primary font-bold",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className={`mt-1 text-lg font-bold ${m.tone}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              دفعة يوم 1 — الراتب
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {fmt(totals.netBasic)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              صافي الراتب الأساسي بعد الخصومات
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              دفعة يوم 10 — المكافآت
            </div>
            <div className="mt-1 text-2xl font-bold text-success">
              {fmt(totals.commission + totals.overtime)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              حضور + فحص + بنتاكام + غلاء معيشه + بدل مواصلات
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      {section === "مركز" && (
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("salaries")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "salaries"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الرواتب
          </button>
          <button
            onClick={() => setActiveTab("shifts")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "shifts"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الشفتات
          </button>
        </div>
      )}

      {/* ── Salaries Tab ── */}
      {(section === "عيادة" || activeTab === "salaries") &&
        (() => {
          const filteredRegularRows = regularRows.filter(
            (r: any) =>
              !searchTerm ||
              (r.fullName ?? r.empCd)
                .toLowerCase()
                .includes(searchTerm.toLowerCase()),
          );
          return (
            <section className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/10">
                <h3 className="text-base font-semibold">
                  الرواتب الأساسية — {periodLabel}
                </h3>
                <div className="flex items-center gap-2">
                  {isFinalized && (
                    <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success font-semibold">
                      نهائي
                    </span>
                  )}
                  {rows.length > 0 && !isFinalized && (
                    <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning font-semibold">
                      مسودة
                    </span>
                  )}
                  {filteredRegularRows.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printBasicSheet}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Printer size={13} /> طباعة
                    </Button>
                  )}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto" dir="rtl">
                <table dir="rtl" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الموظف
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الأساسي
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        أيام عمل
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        غياب
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        تأخير (د)
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        مبكر (د)
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        جزاء
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إجمالي الخصم
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إجازة
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        معامل
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground font-bold">
                        صافي الأساسي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegularRows.map((r: any) => (
                      <tr
                        key={r.empCd}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-3 py-3 text-center">
                          <div className="font-medium">
                            {r.fullName ?? r.empCd}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.salaryType ?? r.department ?? ""}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {fmt(r.basicSalary)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.workingDays}
                        </td>
                        <td className="px-3 py-3 text-center text-destructive">
                          {r.absentDays}
                        </td>
                        <td className="px-3 py-3 text-center text-warning">
                          {r.lateMinutes}
                        </td>
                        <td className="px-3 py-3 text-center text-warning">
                          {r.earlyLeaveMinutes ?? 0}
                        </td>
                        <td className="px-3 py-3 text-center text-destructive">
                          {fmt(r.penaltyDeduction)}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-destructive">
                          {fmt(r.totalDeductions)}
                        </td>
                        <td className="px-3 py-3 text-center">{r.leaveDays}</td>
                        <td className="px-3 py-3 text-center">
                          {pct(r.leaveMultiplier)}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-primary">
                          {fmt(r.netBasic)}
                        </td>
                      </tr>
                    ))}
                    {filteredRegularRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          لا توجد رواتب تطابق البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredRegularRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                        <td className="px-3 py-2" colSpan={7}>
                          الإجمالي
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.totalDeductions),
                              0,
                            ),
                          )}
                        </td>
                        <td colSpan={2} />
                        <td className="px-3 py-2 text-center font-bold text-primary">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) => s + Number(r.netBasic),
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Mobile Accordion Card List View */}
              <div className="block lg:hidden divide-y divide-border/60">
                {filteredRegularRows.map((r: any) => {
                  const isExpanded = !!expandedCards[`salary-${r.empCd}`];
                  return (
                    <div
                      key={r.empCd}
                      className="bg-card p-4 transition-colors hover:bg-muted/5"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => toggleCard(`salary-${r.empCd}`)}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-sm">
                            {r.fullName ?? r.empCd}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.salaryType ?? r.department ?? ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground block uppercase">
                              صافي الأساسي
                            </span>
                            <span className="font-bold text-primary tabular-nums text-sm">
                              {fmt(r.netBasic)}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              الراتب الأساسي:
                            </span>
                            <span className="font-medium tabular-nums">
                              {fmt(r.basicSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              أيام عمل:
                            </span>
                            <span className="font-medium tabular-nums">
                              {r.workingDays}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              الغياب (أيام):
                            </span>
                            <span className="font-medium text-destructive tabular-nums">
                              {r.absentDays}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              التأخير (دقائق):
                            </span>
                            <span className="font-medium text-warning tabular-nums">
                              {r.lateMinutes}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              خروج مبكر (دقائق):
                            </span>
                            <span className="font-medium text-warning tabular-nums">
                              {r.earlyLeaveMinutes ?? 0}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              الجزاءات:
                            </span>
                            <span className="font-medium text-destructive tabular-nums">
                              {fmt(r.penaltyDeduction)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              إجمالي الخصم:
                            </span>
                            <span className="font-bold text-destructive tabular-nums">
                              {fmt(r.totalDeductions)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              أيام الإجازة:
                            </span>
                            <span className="font-medium tabular-nums">
                              {r.leaveDays}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1 col-span-2">
                            <span className="text-muted-foreground">
                              معامل راتب الإجازة:
                            </span>
                            <span className="font-medium tabular-nums">
                              {pct(r.leaveMultiplier)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredRegularRows.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    لا توجد رواتب تطابق البحث
                  </div>
                )}

                {/* Mobile Footer/Totals */}
                {filteredRegularRows.length > 0 && (
                  <div className="bg-muted/20 p-4 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي الخصومات:
                      </span>
                      <span className="text-destructive tabular-nums">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) =>
                              s + Number(r.totalDeductions),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2">
                      <span className="text-foreground font-bold">
                        إجمالي صافي الأساسي:
                      </span>
                      <span className="text-primary font-bold tabular-nums text-sm">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) => s + Number(r.netBasic),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

      {/* ── Shifts Tab (Center only) ── */}
      {section === "مركز" &&
        activeTab === "shifts" &&
        (() => {
          const filteredEnhancedShiftRows = enhancedShiftRows.filter(
            (r: any) =>
              !searchTerm ||
              r.fullName.toLowerCase().includes(searchTerm.toLowerCase()),
          );
          return (
            <section className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/10">
                <h3 className="text-base font-semibold">
                  الشفتات — {periodLabel}
                </h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto" dir="rtl">
                <table dir="rtl" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الموظف
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        شفت نهاري
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        قيمة
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إجمالي
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        شفت مسائي
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        قيمة
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إجمالي
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الخصومات
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        معامل
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground font-bold">
                        صافي الأساسي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnhancedShiftRows.map((r: any) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-3 py-3 text-center">
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.type === "doctor" ? "طبيب" : "فني"}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.shiftDayCount}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {fmt(r.shiftDayRate)}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-success">
                          {fmt(r.shiftDayTotal)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.shiftNightCount}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {fmt(r.shiftNightRate)}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-success">
                          {fmt(r.shiftNightTotal)}
                        </td>
                        <td className="px-3 py-3 text-center text-destructive">
                          {fmt(r.totalDeductions)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {pct(r.leaveMultiplier)}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-primary">
                          {fmt(r.netBasic)}
                        </td>
                      </tr>
                    ))}
                    {filteredEnhancedShiftRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          لا توجد موظفي شفتات تطابق البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredEnhancedShiftRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                        <td className="px-3 py-2">الإجمالي</td>
                        <td colSpan={2} />
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredEnhancedShiftRows.reduce(
                              (s: number, r: any) => s + r.shiftDayTotal,
                              0,
                            ),
                          )}
                        </td>
                        <td colSpan={2} />
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredEnhancedShiftRows.reduce(
                              (s: number, r: any) => s + r.shiftNightTotal,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredEnhancedShiftRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.totalDeductions),
                              0,
                            ),
                          )}
                        </td>
                        <td colSpan={1} />
                        <td className="px-3 py-2 text-center font-bold text-primary">
                          {fmt(
                            filteredEnhancedShiftRows.reduce(
                              (s: number, r: any) => s + Number(r.netBasic),
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Mobile Accordion Card List View */}
              <div className="block lg:hidden divide-y divide-border/60">
                {filteredEnhancedShiftRows.map((r: any) => {
                  const isExpanded = !!expandedCards[`shift-${r.id}`];
                  return (
                    <div
                      key={r.id}
                      className="bg-card p-4 transition-colors hover:bg-muted/5"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => toggleCard(`shift-${r.id}`)}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-sm">
                            {r.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.type === "doctor" ? "طبيب شفتات" : "فني شفتات"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground block uppercase">
                              صافي الأساسي
                            </span>
                            <span className="font-bold text-primary tabular-nums text-sm">
                              {fmt(r.netBasic)}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
                          {/* Morning Shift details */}
                          <div className="bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                            <div className="font-medium text-foreground">
                              شفت نهاري
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                              <div>
                                العدد:{" "}
                                <span className="text-foreground font-medium tabular-nums">
                                  {r.shiftDayCount}
                                </span>
                              </div>
                              <div>
                                القيمة:{" "}
                                <span className="text-foreground font-medium tabular-nums">
                                  {fmt(r.shiftDayRate)}
                                </span>
                              </div>
                              <div className="text-left">
                                الإجمالي:{" "}
                                <span className="text-success font-semibold tabular-nums">
                                  {fmt(r.shiftDayTotal)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Night Shift details */}
                          <div className="bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                            <div className="font-medium text-foreground">
                              شفت مسائي
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                              <div>
                                العدد:{" "}
                                <span className="text-foreground font-medium tabular-nums">
                                  {r.shiftNightCount}
                                </span>
                              </div>
                              <div>
                                القيمة:{" "}
                                <span className="text-foreground font-medium tabular-nums">
                                  {fmt(r.shiftNightRate)}
                                </span>
                              </div>
                              <div className="text-left">
                                الإجمالي:{" "}
                                <span className="text-success font-semibold tabular-nums">
                                  {fmt(r.shiftNightTotal)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* General Shift details */}
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 px-1 pt-1">
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                الخصومات:
                              </span>
                              <span className="font-medium text-destructive tabular-nums">
                                {fmt(r.totalDeductions)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                معامل الحضور:
                              </span>
                              <span className="font-medium tabular-nums">
                                {pct(r.leaveMultiplier)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredEnhancedShiftRows.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    لا توجد شفتات تطابق البحث
                  </div>
                )}

                {/* Mobile Footer/Totals */}
                {filteredEnhancedShiftRows.length > 0 && (
                  <div className="bg-muted/20 p-4 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي نهاري:
                      </span>
                      <span className="text-foreground tabular-nums">
                        {fmt(
                          filteredEnhancedShiftRows.reduce(
                            (s: number, r: any) => s + r.shiftDayTotal,
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي مسائي:
                      </span>
                      <span className="text-foreground tabular-nums">
                        {fmt(
                          filteredEnhancedShiftRows.reduce(
                            (s: number, r: any) => s + r.shiftNightTotal,
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي الخصومات:
                      </span>
                      <span className="text-destructive tabular-nums">
                        {fmt(
                          filteredEnhancedShiftRows.reduce(
                            (s: number, r: any) =>
                              s + Number(r.totalDeductions),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2">
                      <span className="text-foreground font-bold">
                        إجمالي صافي الشفتات:
                      </span>
                      <span className="text-primary font-bold tabular-nums text-sm">
                        {fmt(
                          filteredEnhancedShiftRows.reduce(
                            (s: number, r: any) => s + Number(r.netBasic),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

      {/* ── Shift Commissions (inside Shifts tab) ── */}
      {section === "مركز" &&
        activeTab === "shifts" &&
        enhancedShiftRows.length > 0 &&
        (() => {
          const EXAM_PRICE = 50;
          const EXAM_EMP_PCT = 0.4;
          const TIERS = [
            { deduction: 123.75, empPct: 0.455 },
            { deduction: 110, empPct: 0.455 },
            { deduction: 85, empPct: 0.47 },
            { deduction: 60, empPct: 0.5 },
          ];

          const pool = sectionPool;
          const examCount = Number(pool?.examCount ?? 0);
          const examStaffPool =
            Math.round(examCount * EXAM_PRICE * EXAM_EMP_PCT * 100) / 100;
          const pentacamStaff =
            Math.round(
              (Number(pool?.cases450 ?? 0) *
                TIERS[0].deduction *
                TIERS[0].empPct +
                Number(pool?.cases400 ?? 0) *
                  TIERS[1].deduction *
                  TIERS[1].empPct +
                Number(pool?.cases350 ?? 0) *
                  TIERS[2].deduction *
                  TIERS[2].empPct +
                Number(pool?.cases250 ?? 0) *
                  TIERS[3].deduction *
                  TIERS[3].empPct) *
                100,
            ) / 100;

          const totalShiftPay = enhancedShiftRows
            .filter((r: any) => r.type === "doctor")
            .reduce((s: number, r: any) => s + Number(r.netBasic), 0);

          const commRows = enhancedShiftRows
            .filter((r: any) => r.type === "doctor")
            .map((r: any) => {
              const base = Number(r.netBasic);
              const share = totalShiftPay > 0 ? base / totalShiftPay : 0;
              const attend = Math.round(base * 0.25 * 100) / 100;
              const examComm = Math.round(share * examStaffPool * 100) / 100;
              const pentComm = Math.round(share * pentacamStaff * 100) / 100;
              return {
                ...r,
                base,
                share,
                attend,
                examComm,
                pentComm,
                total: attend + examComm + pentComm,
              };
            });

          const filteredCommRows = commRows.filter(
            (r: any) =>
              !searchTerm ||
              r.fullName.toLowerCase().includes(searchTerm.toLowerCase()),
          );

          const tAttend = filteredCommRows.reduce(
            (s: number, r: any) => s + r.attend,
            0,
          );
          const tExam = filteredCommRows.reduce(
            (s: number, r: any) => s + r.examComm,
            0,
          );
          const tPent = filteredCommRows.reduce(
            (s: number, r: any) => s + r.pentComm,
            0,
          );
          const tTotal = filteredCommRows.reduce(
            (s: number, r: any) => s + r.total,
            0,
          );

          return (
            <section className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 bg-muted/10">
                <h3 className="text-base font-semibold">عمولات الشفتات</h3>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>
                    إجمالي نسبة الفحص:{" "}
                    <strong className="text-foreground">
                      {fmt(examStaffPool)} ج
                    </strong>
                  </span>
                  <span>
                    إجمالي نسبة البنتاكام:{" "}
                    <strong className="text-foreground">
                      {fmt(pentacamStaff)} ج
                    </strong>
                  </span>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto" dir="rtl">
                <table dir="rtl" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الموظف
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الأساسي (صافي الشفتات)
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        النسبة %
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        حضور (٢٥٪)
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        فحص
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        بنتاكام
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground font-bold">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommRows.map((r: any) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-3 py-3 text-center">
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.type === "doctor" ? "طبيب" : "فني"}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {fmt(r.base)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {pct(r.share)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {fmt(r.attend)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {fmt(r.examComm)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {fmt(r.pentComm)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums font-bold text-primary">
                          {fmt(r.total)}
                        </td>
                      </tr>
                    ))}
                    {filteredCommRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          لا توجد عمولات تطابق البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredCommRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                        <td className="px-3 py-2" colSpan={3}>
                          الإجمالي
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {fmt(tAttend)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {fmt(tExam)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {fmt(tPent)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold text-primary">
                          {fmt(tTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Mobile Accordion Card List View */}
              <div className="block lg:hidden divide-y divide-border/60">
                {filteredCommRows.map((r: any) => {
                  const isExpanded = !!expandedCards[`shiftcomm-${r.id}`];
                  return (
                    <div
                      key={r.id}
                      className="bg-card p-4 transition-colors hover:bg-muted/5"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => toggleCard(`shiftcomm-${r.id}`)}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-sm">
                            {r.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.type === "doctor" ? "طبيب" : "فني"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground block uppercase">
                              إجمالي العمولات
                            </span>
                            <span className="font-bold text-primary tabular-nums text-sm">
                              {fmt(r.total)}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              الأساسي (صافي الشفتات):
                            </span>
                            <span className="font-medium tabular-nums">
                              {fmt(r.base)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              نسبة المساهمة:
                            </span>
                            <span className="font-medium tabular-nums">
                              {pct(r.share)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة حضور (25%):
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.attend)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة فحص:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.examComm)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1 col-span-2">
                            <span className="text-muted-foreground">
                              عمولة بنتاكام:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.pentComm)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredCommRows.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    لا توجد عمولات تطابق البحث
                  </div>
                )}

                {/* Mobile Footer/Totals */}
                {filteredCommRows.length > 0 && (
                  <div className="bg-muted/20 p-4 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي حضور (25%):
                      </span>
                      <span className="text-success tabular-nums">
                        {fmt(tAttend)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي فحص:</span>
                      <span className="text-success tabular-nums">
                        {fmt(tExam)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي بنتاكام:
                      </span>
                      <span className="text-success tabular-nums">
                        {fmt(tPent)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2">
                      <span className="text-foreground font-bold">
                        المجموع الكلي:
                      </span>
                      <span className="text-primary font-bold tabular-nums text-sm">
                        {fmt(tTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

      {/* ── Commissions section — hidden in shifts tab ── */}
      {(section === "عيادة" || activeTab === "salaries") &&
        (() => {
          const filteredRegularRows = regularRows.filter(
            (r: any) =>
              !searchTerm ||
              (r.fullName ?? r.empCd)
                .toLowerCase()
                .includes(searchTerm.toLowerCase()),
          );
          const filteredTechRows = enhancedShiftRows.filter(
            (r: any) =>
              r.type !== "doctor" &&
              (!searchTerm ||
                r.fullName.toLowerCase().includes(searchTerm.toLowerCase())),
          );
          return (
            <section className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/10">
                <h3 className="text-base font-semibold">
                  العمولات — {periodLabel}
                </h3>
                {filteredRegularRows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={printCommissionsSheet}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Printer size={13} /> طباعة
                  </Button>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto" dir="rtl">
                <table dir="rtl" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        الموظف
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        حضور
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        فحص
                      </th>
                      {section !== "عيادة" && (
                        <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                          بنتاكام
                        </th>
                      )}
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        غلاء معيشه
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        بدل مواصلات
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إضافي (د)
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إضافي (ج)
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground font-bold">
                        إجمالي العمولات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegularRows.map((r: any) => {
                      const a = getAllowanceValues(r);
                      return (
                        <tr
                          key={r.empCd}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-3 py-3 text-center">
                            <div className="font-medium">
                              {r.fullName ?? r.empCd}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.salaryType ?? r.department ?? ""}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(r.attendanceCommission)}
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(r.examCommission)}
                          </td>
                          {section !== "عيادة" && (
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(r.pentacamCommission)}
                            </td>
                          )}
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(a.cola)}
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(a.travel)}
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {r.overtimeMinutes ?? 0}
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(r.overtimePay ?? 0)}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-primary">
                            {fmt(getCommissionTotal(r))}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRegularRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          لا توجد عمولات تطابق البحث
                        </td>
                      </tr>
                    )}

                    {/* ── Tech shift rows appended to salary commissions ── */}
                    {section === "مركز" &&
                      filteredTechRows.map((tech: any) => {
                        const EXAM_PRICE_T = 50;
                        const EXAM_EMP_PCT_T = 0.4;
                        const TIERS_T = [
                          { deduction: 123.75, empPct: 0.455 },
                          { deduction: 110, empPct: 0.455 },
                          { deduction: 85, empPct: 0.47 },
                          { deduction: 60, empPct: 0.5 },
                        ];
                        const pool2 = sectionPool;
                        const examPool2 =
                          Math.round(
                            Number(pool2?.examCount ?? 0) *
                              EXAM_PRICE_T *
                              EXAM_EMP_PCT_T *
                              100,
                          ) / 100;
                        const pentPool2 =
                          Math.round(
                            (Number(pool2?.cases450 ?? 0) *
                              TIERS_T[0].deduction *
                              TIERS_T[0].empPct +
                              Number(pool2?.cases400 ?? 0) *
                                TIERS_T[1].deduction *
                                TIERS_T[1].empPct +
                              Number(pool2?.cases350 ?? 0) *
                                TIERS_T[2].deduction *
                                TIERS_T[2].empPct +
                              Number(pool2?.cases250 ?? 0) *
                                TIERS_T[3].deduction *
                                TIERS_T[3].empPct) *
                              100,
                          ) / 100;
                        const totalSalary =
                          regularRows.reduce(
                            (s: number, r: any) => s + Number(r.basicSalary),
                            0,
                          ) + Number(tech.netBasic);
                        const techShare =
                          totalSalary > 0
                            ? Number(tech.netBasic) / totalSalary
                            : 0;
                        const tAttend2 =
                          Math.round(Number(tech.netBasic) * 0.25 * 100) / 100;
                        const tExam2 =
                          Math.round(techShare * examPool2 * 100) / 100;
                        const tPent2 =
                          Math.round(techShare * pentPool2 * 100) / 100;
                        const techAllowances = getAllowanceValues(tech);
                        const tCola2 = techAllowances.cola;
                        const tTravel2 = techAllowances.travel;
                        const tOTMin2 = tech.overtimeMinutes ?? 0;
                        const tOTPay2 = Number(tech.overtimePay ?? 0);
                        const tTotal2 =
                          tAttend2 +
                          tExam2 +
                          tPent2 +
                          tCola2 +
                          tTravel2 +
                          tOTPay2;
                        return (
                          <tr
                            key={`tech-${tech.id}`}
                            className="border-b border-border/50 bg-amber-50/30 hover:bg-amber-50/50 transition-colors"
                          >
                            <td className="px-3 py-3 text-center">
                              <div className="font-medium">{tech.fullName}</div>
                              <div className="text-xs text-amber-600 font-medium">
                                فني شفتات
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(tAttend2)}
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(tExam2)}
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(tPent2)}
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(tCola2)}
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(tTravel2)}
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {tOTMin2}
                            </td>
                            <td className="px-3 py-3 text-center text-success">
                              {fmt(tOTPay2)}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-primary">
                              {fmt(tTotal2)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  {(filteredRegularRows.length > 0 ||
                    (section === "مركز" && filteredTechRows.length > 0)) && (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                        <td className="px-3 py-2 text-center">الإجمالي</td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.attendanceCommission),
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) => {
                                      const tAttend2 =
                                        Math.round(
                                          Number(tech.netBasic) * 0.25 * 100,
                                        ) / 100;
                                      return s + tAttend2;
                                    },
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.examCommission),
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) => {
                                      const EXAM_PRICE_T = 50;
                                      const EXAM_EMP_PCT_T = 0.4;
                                      const pool2 = sectionPool;
                                      const examPool2 =
                                        Math.round(
                                          Number(pool2?.examCount ?? 0) *
                                            EXAM_PRICE_T *
                                            EXAM_EMP_PCT_T *
                                            100,
                                        ) / 100;
                                      const totalSalary =
                                        regularRows.reduce(
                                          (sum: number, reg: any) =>
                                            sum + Number(reg.basicSalary),
                                          0,
                                        ) + Number(tech.netBasic);
                                      const techShare =
                                        totalSalary > 0
                                          ? Number(tech.netBasic) / totalSalary
                                          : 0;
                                      const tExam2 =
                                        Math.round(
                                          techShare * examPool2 * 100,
                                        ) / 100;
                                      return s + tExam2;
                                    },
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.pentacamCommission),
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) => {
                                      const TIERS_T = [
                                        { deduction: 123.75, empPct: 0.455 },
                                        { deduction: 110, empPct: 0.455 },
                                        { deduction: 85, empPct: 0.47 },
                                        { deduction: 60, empPct: 0.5 },
                                      ];
                                      const pool2 = sectionPool;
                                      const pentPool2 =
                                        Math.round(
                                          (Number(pool2?.cases450 ?? 0) *
                                            TIERS_T[0].deduction *
                                            TIERS_T[0].empPct +
                                            Number(pool2?.cases400 ?? 0) *
                                              TIERS_T[1].deduction *
                                              TIERS_T[1].empPct +
                                            Number(pool2?.cases350 ?? 0) *
                                              TIERS_T[2].deduction *
                                              TIERS_T[2].empPct +
                                            Number(pool2?.cases250 ?? 0) *
                                              TIERS_T[3].deduction *
                                              TIERS_T[3].empPct) *
                                            100,
                                        ) / 100;
                                      const totalSalary =
                                        regularRows.reduce(
                                          (sum: number, reg: any) =>
                                            sum + Number(reg.basicSalary),
                                          0,
                                        ) + Number(tech.netBasic);
                                      const techShare =
                                        totalSalary > 0
                                          ? Number(tech.netBasic) / totalSalary
                                          : 0;
                                      const tPent2 =
                                        Math.round(
                                          techShare * pentPool2 * 100,
                                        ) / 100;
                                      return s + tPent2;
                                    },
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + getAllowanceValues(r).cola,
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) =>
                                      s + getAllowanceValues(tech).cola,
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + getAllowanceValues(r).travel,
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) =>
                                      s + getAllowanceValues(tech).travel,
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {filteredRegularRows.reduce(
                            (s: number, r: any) =>
                              s + Number(r.overtimeMinutes ?? 0),
                            0,
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.overtimePay ?? 0),
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) =>
                                      s + Number(tech.overtimePay ?? 0),
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-primary">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s +
                                getCommissionTotal(r) +
                                Number(r.overtimePay ?? 0),
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) => {
                                      const EXAM_PRICE_T = 50;
                                      const EXAM_EMP_PCT_T = 0.4;
                                      const TIERS_T = [
                                        { deduction: 123.75, empPct: 0.455 },
                                        { deduction: 110, empPct: 0.455 },
                                        { deduction: 85, empPct: 0.47 },
                                        { deduction: 60, empPct: 0.5 },
                                      ];
                                      const pool2 = sectionPool;
                                      const examPool2 =
                                        Math.round(
                                          Number(pool2?.examCount ?? 0) *
                                            EXAM_PRICE_T *
                                            EXAM_EMP_PCT_T *
                                            100,
                                        ) / 100;
                                      const pentPool2 =
                                        Math.round(
                                          (Number(pool2?.cases450 ?? 0) *
                                            TIERS_T[0].deduction *
                                            TIERS_T[0].empPct +
                                            Number(pool2?.cases400 ?? 0) *
                                              TIERS_T[1].deduction *
                                              TIERS_T[1].empPct +
                                            Number(pool2?.cases350 ?? 0) *
                                              TIERS_T[2].deduction *
                                              TIERS_T[2].empPct +
                                            Number(pool2?.cases250 ?? 0) *
                                              TIERS_T[3].deduction *
                                              TIERS_T[3].empPct) *
                                            100,
                                        ) / 100;
                                      const totalSalary =
                                        regularRows.reduce(
                                          (sum: number, reg: any) =>
                                            sum + Number(reg.basicSalary),
                                          0,
                                        ) + Number(tech.netBasic);
                                      const techShare =
                                        totalSalary > 0
                                          ? Number(tech.netBasic) / totalSalary
                                          : 0;
                                      const tAttend2 =
                                        Math.round(
                                          Number(tech.netBasic) * 0.25 * 100,
                                        ) / 100;
                                      const tExam2 =
                                        Math.round(
                                          techShare * examPool2 * 100,
                                        ) / 100;
                                      const tPent2 =
                                        Math.round(
                                          techShare * pentPool2 * 100,
                                        ) / 100;
                                      const techAllowances =
                                        getAllowanceValues(tech);
                                      const tCola2 = techAllowances.cola;
                                      const tTravel2 = techAllowances.travel;
                                      const tOTPay2 = Number(
                                        tech.overtimePay ?? 0,
                                      );
                                      return (
                                        s +
                                        (tAttend2 +
                                          tExam2 +
                                          tPent2 +
                                          tCola2 +
                                          tTravel2 +
                                          tOTPay2)
                                      );
                                    },
                                    0,
                                  )
                                : 0),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Mobile Accordion Card List View */}
              <div className="block lg:hidden divide-y divide-border/60">
                {/* Regular employees commissions */}
                {filteredRegularRows.map((r: any) => {
                  const isExpanded = !!expandedCards[`comm-${r.empCd}`];
                  const a = getAllowanceValues(r);
                  const totalComm = getCommissionTotal(r);
                  return (
                    <div
                      key={r.empCd}
                      className="bg-card p-4 transition-colors hover:bg-muted/5"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => toggleCard(`comm-${r.empCd}`)}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-sm">
                            {r.fullName ?? r.empCd}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.salaryType ?? r.department ?? ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground block uppercase">
                              إجمالي العمولات
                            </span>
                            <span className="font-bold text-primary tabular-nums text-sm">
                              {fmt(totalComm)}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة الحضور:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.attendanceCommission)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة الفحص:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.examCommission)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة بنتاكام:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.pentacamCommission)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              غلاء معيشة:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(a.cola)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              بدل مواصلات:
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(a.travel)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              إضافي (دقائق):
                            </span>
                            <span className="font-medium tabular-nums">
                              {r.overtimeMinutes ?? 0}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              إضافي (قيمة):
                            </span>
                            <span className="font-medium text-success tabular-nums">
                              {fmt(r.overtimePay ?? 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Tech Shift employees commissions */}
                {section === "مركز" &&
                  filteredTechRows.map((tech: any) => {
                    const isExpanded = !!expandedCards[`comm-tech-${tech.id}`];
                    const EXAM_PRICE_T = 50;
                    const EXAM_EMP_PCT_T = 0.4;
                    const TIERS_T = [
                      { deduction: 123.75, empPct: 0.455 },
                      { deduction: 110, empPct: 0.455 },
                      { deduction: 85, empPct: 0.47 },
                      { deduction: 60, empPct: 0.5 },
                    ];
                    const pool2 = sectionPool;
                    const examPool2 =
                      Math.round(
                        Number(pool2?.examCount ?? 0) *
                          EXAM_PRICE_T *
                          EXAM_EMP_PCT_T *
                          100,
                      ) / 100;
                    const pentPool2 =
                      Math.round(
                        (Number(pool2?.cases450 ?? 0) *
                          TIERS_T[0].deduction *
                          TIERS_T[0].empPct +
                          Number(pool2?.cases400 ?? 0) *
                            TIERS_T[1].deduction *
                            TIERS_T[1].empPct +
                          Number(pool2?.cases350 ?? 0) *
                            TIERS_T[2].deduction *
                            TIERS_T[2].empPct +
                          Number(pool2?.cases250 ?? 0) *
                            TIERS_T[3].deduction *
                            TIERS_T[3].empPct) *
                          100,
                      ) / 100;
                    const totalSalary =
                      regularRows.reduce(
                        (s: number, r: any) => s + Number(r.basicSalary),
                        0,
                      ) + Number(tech.netBasic);
                    const techShare =
                      totalSalary > 0 ? Number(tech.netBasic) / totalSalary : 0;
                    const tAttend2 =
                      Math.round(Number(tech.netBasic) * 0.25 * 100) / 100;
                    const tExam2 =
                      Math.round(techShare * examPool2 * 100) / 100;
                    const tPent2 =
                      Math.round(techShare * pentPool2 * 100) / 100;
                    const techAllowances = getAllowanceValues(tech);
                    const tCola2 = techAllowances.cola;
                    const tTravel2 = techAllowances.travel;
                    const tOTMin2 = tech.overtimeMinutes ?? 0;
                    const tOTPay2 = Number(tech.overtimePay ?? 0);
                    const tTotal2 =
                      tAttend2 + tExam2 + tPent2 + tCola2 + tTravel2 + tOTPay2;

                    return (
                      <div
                        key={`tech-${tech.id}`}
                        className="bg-amber-50/10 p-4 transition-colors hover:bg-amber-50/20 divide-y divide-border/20"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer select-none pb-2"
                          onClick={() => toggleCard(`comm-tech-${tech.id}`)}
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground text-sm">
                              {tech.fullName}
                            </div>
                            <div className="text-xs text-amber-600 font-medium">
                              فني شفتات
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-left">
                              <span className="text-[10px] text-muted-foreground block uppercase">
                                إجمالي العمولات
                              </span>
                              <span className="font-bold text-primary tabular-nums text-sm">
                                {fmt(tTotal2)}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                عمولة حضور:
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {fmt(tAttend2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                عمولة فحص:
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {fmt(tExam2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                عمولة بنتاكام:
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {fmt(tPent2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                غلاء معيشة:
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {fmt(tCola2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                بدل مواصلات:
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {fmt(tTravel2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                إضافي (دقائق):
                              </span>
                              <span className="font-medium tabular-nums">
                                {tOTMin2}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/10 pb-1">
                              <span className="text-muted-foreground">
                                إضافي (قيمة):
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {fmt(tOTPay2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {filteredRegularRows.length === 0 &&
                  filteredTechRows.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      لا توجد عمولات تطابق البحث
                    </div>
                  )}

                {/* Mobile Footer/Totals */}
                {(filteredRegularRows.length > 0 ||
                  filteredTechRows.length > 0) && (
                  <div className="bg-muted/20 p-4 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي الحضور:
                      </span>
                      <span className="text-success tabular-nums">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) =>
                              s + Number(r.attendanceCommission),
                            0,
                          ) +
                            (section === "مركز"
                              ? filteredTechRows.reduce(
                                  (s: number, tech: any) => {
                                    const tAttend2 =
                                      Math.round(
                                        Number(tech.netBasic) * 0.25 * 100,
                                      ) / 100;
                                    return s + tAttend2;
                                  },
                                  0,
                                )
                              : 0),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي الفحص:
                      </span>
                      <span className="text-success tabular-nums">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) => s + Number(r.examCommission),
                            0,
                          ) +
                            (section === "مركز"
                              ? filteredTechRows.reduce(
                                  (s: number, tech: any) => {
                                    const EXAM_PRICE_T = 50;
                                    const EXAM_EMP_PCT_T = 0.4;
                                    const pool2 = sectionPool;
                                    const examPool2 =
                                      Math.round(
                                        Number(pool2?.examCount ?? 0) *
                                          EXAM_PRICE_T *
                                          EXAM_EMP_PCT_T *
                                          100,
                                      ) / 100;
                                    const totalSalary =
                                      regularRows.reduce(
                                        (sum: number, reg: any) =>
                                          sum + Number(reg.basicSalary),
                                        0,
                                      ) + Number(tech.netBasic);
                                    const techShare =
                                      totalSalary > 0
                                        ? Number(tech.netBasic) / totalSalary
                                        : 0;
                                    const tExam2 =
                                      Math.round(techShare * examPool2 * 100) /
                                      100;
                                    return s + tExam2;
                                  },
                                  0,
                                )
                              : 0),
                        )}
                      </span>
                    </div>
                    {section !== "عيادة" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          إجمالي البنتاكام:
                        </span>
                        <span className="text-success tabular-nums">
                          {fmt(
                            filteredRegularRows.reduce(
                              (s: number, r: any) =>
                                s + Number(r.pentacamCommission),
                              0,
                            ) +
                              (section === "مركز"
                                ? filteredTechRows.reduce(
                                    (s: number, tech: any) => {
                                      const TIERS_T = [
                                        { deduction: 123.75, empPct: 0.455 },
                                        { deduction: 110, empPct: 0.455 },
                                        { deduction: 85, empPct: 0.47 },
                                        { deduction: 60, empPct: 0.5 },
                                      ];
                                      const pool2 = sectionPool;
                                      const pentPool2 =
                                        Math.round(
                                          (Number(pool2?.cases450 ?? 0) *
                                            TIERS_T[0].deduction *
                                            TIERS_T[0].empPct +
                                            Number(pool2?.cases400 ?? 0) *
                                              TIERS_T[1].deduction *
                                              TIERS_T[1].empPct +
                                            Number(pool2?.cases350 ?? 0) *
                                              TIERS_T[2].deduction *
                                              TIERS_T[2].empPct +
                                            Number(pool2?.cases250 ?? 0) *
                                              TIERS_T[3].deduction *
                                              TIERS_T[3].empPct) *
                                            100,
                                        ) / 100;
                                      const totalSalary =
                                        regularRows.reduce(
                                          (sum: number, reg: any) =>
                                            sum + Number(reg.basicSalary),
                                          0,
                                        ) + Number(tech.netBasic);
                                      const techShare =
                                        totalSalary > 0
                                          ? Number(tech.netBasic) / totalSalary
                                          : 0;
                                      const tPent2 =
                                        Math.round(
                                          techShare * pentPool2 * 100,
                                        ) / 100;
                                      return s + tPent2;
                                    },
                                    0,
                                  )
                                : 0),
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي غلاء معيشة:
                      </span>
                      <span className="text-success tabular-nums">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) =>
                              s + getAllowanceValues(r).cola,
                            0,
                          ) +
                            (section === "مركز"
                              ? filteredTechRows.reduce(
                                  (s: number, tech: any) =>
                                    s + getAllowanceValues(tech).cola,
                                  0,
                                )
                              : 0),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        إجمالي بدل مواصلات:
                      </span>
                      <span className="text-success tabular-nums">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) =>
                              s + getAllowanceValues(r).travel,
                            0,
                          ) +
                            (section === "مركز"
                              ? filteredTechRows.reduce(
                                  (s: number, tech: any) =>
                                    s + getAllowanceValues(tech).travel,
                                  0,
                                )
                              : 0),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2">
                      <span className="text-foreground font-bold">
                        المجموع الكلي للعمولات:
                      </span>
                      <span className="text-primary font-bold tabular-nums text-sm">
                        {fmt(
                          filteredRegularRows.reduce(
                            (s: number, r: any) =>
                              s +
                              getCommissionTotal(r) +
                              Number(r.overtimePay ?? 0),
                            0,
                          ) +
                            (section === "مركز"
                              ? filteredTechRows.reduce(
                                  (s: number, tech: any) => {
                                    const EXAM_PRICE_T = 50;
                                    const EXAM_EMP_PCT_T = 0.4;
                                    const TIERS_T = [
                                      { deduction: 123.75, empPct: 0.455 },
                                      { deduction: 110, empPct: 0.455 },
                                      { deduction: 85, empPct: 0.47 },
                                      { deduction: 60, empPct: 0.5 },
                                    ];
                                    const pool2 = sectionPool;
                                    const examPool2 =
                                      Math.round(
                                        Number(pool2?.examCount ?? 0) *
                                          EXAM_PRICE_T *
                                          EXAM_EMP_PCT_T *
                                          100,
                                      ) / 100;
                                    const pentPool2 =
                                      Math.round(
                                        (Number(pool2?.cases450 ?? 0) *
                                          TIERS_T[0].deduction *
                                          TIERS_T[0].empPct +
                                          Number(pool2?.cases400 ?? 0) *
                                            TIERS_T[1].deduction *
                                            TIERS_T[1].empPct +
                                          Number(pool2?.cases350 ?? 0) *
                                            TIERS_T[2].deduction *
                                            TIERS_T[2].empPct +
                                          Number(pool2?.cases250 ?? 0) *
                                            TIERS_T[3].deduction *
                                            TIERS_T[3].empPct) *
                                          100,
                                      ) / 100;
                                    const totalSalary =
                                      regularRows.reduce(
                                        (sum: number, reg: any) =>
                                          sum + Number(reg.basicSalary),
                                        0,
                                      ) + Number(tech.netBasic);
                                    const techShare =
                                      totalSalary > 0
                                        ? Number(tech.netBasic) / totalSalary
                                        : 0;
                                    const tAttend2 =
                                      Math.round(
                                        Number(tech.netBasic) * 0.25 * 100,
                                      ) / 100;
                                    const tExam2 =
                                      Math.round(techShare * examPool2 * 100) /
                                      100;
                                    const tPent2 =
                                      Math.round(techShare * pentPool2 * 100) /
                                      100;
                                    const techAllowances =
                                      getAllowanceValues(tech);
                                    const tCola2 = techAllowances.cola;
                                    const tTravel2 = techAllowances.travel;
                                    const tOTPay2 = Number(
                                      tech.overtimePay ?? 0,
                                    );
                                    return (
                                      s +
                                      (tAttend2 +
                                        tExam2 +
                                        tPent2 +
                                        tCola2 +
                                        tTravel2 +
                                        tOTPay2)
                                    );
                                  },
                                  0,
                                )
                              : 0),
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
    </div>
  );
}
