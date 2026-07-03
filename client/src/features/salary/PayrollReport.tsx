import { useState, useEffect } from "react";
import {
  canUseNativeAndroidPrint,
  requestNativeAndroidPrint,
} from "@/lib/nativePrint";
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
import { DateInput } from "@/components/ui/date-input";

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

function escapeHtml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SECTIONS = ["مركز", "عيادة"] as const;
type Section = (typeof SECTIONS)[number];

type TabType = "salaries" | "shifts" | "supervision";

export default function PayrollReport() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [section, setSection] = useState<Section>("مركز");
  const [activeTab, setActiveTab] = useState<TabType>("salaries");
  const [searchTerm, setSearchTerm] = useState("");
  const [bonusEdits, setBonusEdits] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {},
  );
  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [year, month] = fromDate.split("-").map(Number);
  const periodLabel = `${new Date(fromDate + "T00:00:00").toLocaleDateString("ar-EG")} — ${new Date(toDate + "T00:00:00").toLocaleDateString("ar-EG")}`;

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
  };

  const centerQ = (trpc as any).salary.getPayroll.useQuery({
    year,
    month,
    section: "مركز",
    fromDate,
    toDate,
  });
  const clinicQ = (trpc as any).salary.getPayroll.useQuery({
    year,
    month,
    section: "عيادة",
    fromDate,
    toDate,
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

  const supervisionBonusQ = (trpc as any).salary.getSupervisionBonuses.useQuery(
    { year, month, section },
  );
  const supervisionBonusMap: Record<string, string> = (
    (supervisionBonusQ.data ?? []) as any[]
  ).reduce((acc: Record<string, string>, r: any) => {
    acc[r.empCd] = String(r.amount ?? "0");
    return acc;
  }, {});

  const setSupervisionBonus = (
    trpc as any
  ).salary.setSupervisionBonus.useMutation({
    onSuccess: () => {
      supervisionBonusQ.refetch();
      toast.success("تم الحفظ");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
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

  // Fetch shift staff data, live shift payroll (has byShift big/small breakdown), and roster
  const shiftStaffQ = (trpc as any).salary.listShiftStaff.useQuery();
  const shiftScheduleQ = (trpc as any).salary.getShiftSchedule.useQuery({
    year,
    month,
  });
  const shiftPayrollQ = (trpc as any).salary.computeShiftPayroll.useQuery({
    year,
    month,
    fromDate,
    toDate,
  });
  const shiftStaff: any[] = shiftStaffQ.data ?? [];
  const shiftSchedule: any[] = shiftScheduleQ.data?.attendance ?? [];
  const shiftPayrollRows: any[] = shiftPayrollQ.data ?? [];

  // getShiftSchedule already scopes to year/month; no extra date filter needed
  const filteredShiftSchedule = shiftSchedule;

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

  // Build enhanced shift rows from computeShiftPayroll big/small breakdown
  const enhancedShiftRows = shiftStaff.map((staff: any) => {
    const liveRow = shiftPayrollRows.find(
      (r: any) => Number(r.id) === Number(staff.id),
    );
    const payrollRow = rows.find((r: any) => r.empCd === `shift_${staff.id}`);

    const rateBig = Number(staff.ratePerShift ?? 0);
    const rateSmall = Number(staff.rateSmallShift ?? 0) || rateBig;

    // ALWAYS classify big/small from byShift by name (Night=small, else=big).
    // byShift is keyed by shiftName in every backend version, so this is
    // independent of which server build is deployed.
    let bigScheduled = 0,
      bigAttended = 0,
      bigTotal = 0;
    let smallScheduled = 0,
      smallAttended = 0,
      smallTotal = 0;
    for (const [sn, b] of Object.entries(liveRow?.byShift ?? {}) as any[]) {
      const cnt = Number((b as any).scheduled ?? 0);
      const att = Number((b as any).attended ?? 0);
      const rate = Number((b as any).rate ?? 0);
      if (sn === "Night") {
        smallScheduled += cnt;
        smallAttended += att;
        smallTotal += cnt * (rate || rateSmall);
      } else {
        bigScheduled += cnt;
        bigAttended += att;
        bigTotal += cnt * (rate || rateBig);
      }
    }
    const bigAbsent = Math.max(0, bigScheduled - bigAttended);
    const smallAbsent = Math.max(0, smallScheduled - smallAttended);

    const basicSalary = bigTotal + smallTotal;
    const totalDeductions =
      payrollRow?.totalDeductions != null
        ? Number(payrollRow.totalDeductions)
        : 0;
    const netBasic =
      payrollRow?.netBasic != null
        ? Number(payrollRow.netBasic)
        : basicSalary - totalDeductions;

    return {
      id: staff.id,
      fullName: staff.name,
      type: staff.type,
      shiftDayCount: bigScheduled,
      shiftDayAttended: bigAttended,
      shiftDayAbsent: bigAbsent,
      shiftDayRate: rateBig,
      shiftDayTotal: bigTotal,
      shiftNightCount: smallScheduled,
      shiftNightAttended: smallAttended,
      shiftNightAbsent: smallAbsent,
      shiftNightRate: rateSmall,
      shiftNightTotal: smallTotal,
      totalDeductions,
      leaveMultiplier:
        payrollRow?.leaveMultiplier != null
          ? Number(payrollRow.leaveMultiplier)
          : 1,
      netBasic,
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

  const totalsBySection = (sec: "مركز" | "عيادة") =>
    allPrintRows
      .filter((r: any) => r._section === sec)
      .reduce(
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
    @page { size: A4 landscape; margin: 7mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      direction: rtl;
      background: oklch(99% 0.004 248);
      color: oklch(22% 0.035 248);
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: 8px;
      line-height: 1.35;
    }
    .payroll-sheet {
      min-height: 190mm;
      padding: 7mm;
      border: 1px solid oklch(86% 0.016 248);
      border-radius: 14px;
      background: oklch(99.5% 0.004 248);
    }
    .sheet-header {
      display: grid;
      grid-template-columns: 1fr 1.45fr 1fr;
      align-items: start;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid oklch(87% 0.02 248);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
      color: oklch(46% 0.025 248);
      font-size: 9px;
      font-weight: 800;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 800;
      color: oklch(29% 0.055 248);
    }
    .brand-mark {
      display: grid;
      width: 28px;
      height: 28px;
      place-items: center;
      border-radius: 999px;
      background: oklch(92% 0.052 248);
      color: oklch(38% 0.105 248);
      font-size: 12px;
      font-weight: 900;
    }
    .muted { color: oklch(48% 0.025 248); font-size: 7.5px; font-weight: 600; }
    .report-title { text-align: center; }
    h1 {
      color: oklch(25% 0.045 248);
      font-size: 15px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .period {
      display: inline-flex;
      margin-top: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      background: oklch(96% 0.018 248);
      color: oklch(39% 0.055 248);
      font-size: 8px;
      font-weight: 800;
    }
    .dept {
      display: inline-flex;
      margin-top: 4px;
      min-width: 92px;
      padding: 6px 10px;
      border: 1px solid oklch(88% 0.035 56);
      border-radius: 12px;
      background: oklch(98% 0.02 56);
      color: oklch(41% 0.095 56);
      text-align: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 900;
    }
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      margin: 7px 0;
    }
    .summary-pill {
      min-height: 31px;
      padding: 4px 7px;
      border: 1px solid oklch(88% 0.018 248);
      border-radius: 10px;
      background: oklch(98.5% 0.006 248);
    }
    .summary-label {
      display: block;
      color: oklch(50% 0.025 248);
      font-size: 6.8px;
      font-weight: 700;
    }
    .summary-value {
      display: block;
      margin-top: 1px;
      color: oklch(28% 0.045 248);
      font-size: 9.5px;
      font-weight: 900;
    }
    .table-wrap {
      overflow: hidden;
      border: 1px solid oklch(84% 0.017 248);
      border-radius: 12px;
    }
    table { width: 100%; border-collapse: separate; border-spacing: 0; }
    thead th {
      background: oklch(93.5% 0.025 248);
      color: oklch(31% 0.047 248);
      font-size: 7.4px;
      font-weight: 900;
      padding: 4px 3px;
      border-inline-start: 1px solid oklch(83% 0.017 248);
      border-bottom: 1px solid oklch(80% 0.02 248);
      text-align: center;
      white-space: nowrap;
    }
    tbody td {
      background: oklch(99.5% 0.003 248);
      color: oklch(25% 0.03 248);
      font-size: 7.4px;
      font-weight: 700;
      padding: 3px 3px;
      border-inline-start: 1px solid oklch(88% 0.012 248);
      border-bottom: 1px solid oklch(88% 0.012 248);
      text-align: center;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) td { background: oklch(98% 0.006 248); }
    tbody tr:last-child td { border-bottom: 0; }
    .emp-col {
      min-width: 115px;
      text-align: right !important;
      font-size: 8px;
      font-weight: 900;
      color: oklch(25% 0.045 248);
    }
    .money-strong {
      color: oklch(38% 0.105 248);
      font-size: 8px;
      font-weight: 900;
    }
    .total-row td {
      background: oklch(96% 0.035 56) !important;
      color: oklch(31% 0.055 56);
      font-size: 8px;
      font-weight: 900;
      border-top: 1px solid oklch(76% 0.06 56);
    }
    .sig-col { width: 58px; }
    .footer {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-top: 14px;
    }
    .footer-block {
      text-align: center;
      color: oklch(31% 0.035 248);
      font-size: 8.5px;
      font-weight: 800;
    }
    .footer-line {
      width: 128px;
      margin: 16px auto 4px;
      border-top: 1px solid oklch(38% 0.025 248);
    }
    .footer-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 7px;
      color: oklch(50% 0.024 248);
      font-size: 7px;
      font-weight: 700;
    }
    .note {
      margin: 6px 0;
      color: oklch(46% 0.025 248);
      font-size: 8px;
      font-weight: 700;
    }
  `;

  const SLIPS_CSS = `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      direction: rtl;
      background: oklch(99% 0.004 248);
      color: oklch(22% 0.035 248);
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: 9px;
      line-height: 1.35;
    }
    .slip {
      position: relative;
      min-height: 64mm;
      margin-bottom: 3mm;
      padding: 4mm;
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid oklch(84% 0.017 248);
      border-radius: 12px;
      background: oklch(99.5% 0.004 248);
    }
    .slip::after {
      content: "";
      position: absolute;
      inset-inline: 4mm;
      bottom: -1.5mm;
      border-bottom: 1px dashed oklch(72% 0.02 248);
    }
    .slip-top {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 6px;
      margin-bottom: 3px;
      color: oklch(48% 0.025 248);
      font-size: 7px;
      font-weight: 800;
    }
    .slip-badge {
      padding: 2px 8px;
      border-radius: 999px;
      background: oklch(96% 0.018 248);
      color: oklch(38% 0.105 248);
      font-size: 7px;
      font-weight: 900;
    }
    .slip-title {
      text-align: center;
      color: oklch(25% 0.045 248);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .employee-strip {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 6px;
      margin: 4px 0;
    }
    .employee-box {
      padding: 3px 6px;
      border: 1px solid oklch(88% 0.018 248);
      border-radius: 9px;
      background: oklch(98% 0.006 248);
    }
    .box-label {
      display: block;
      color: oklch(50% 0.025 248);
      font-size: 6.2px;
      font-weight: 700;
    }
    .box-value {
      display: block;
      margin-top: 1px;
      color: oklch(25% 0.045 248);
      font-size: 9.5px;
      font-weight: 900;
    }
    table.main {
      width: 100%;
      overflow: hidden;
      border: 1px solid oklch(84% 0.017 248);
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 10px;
      margin-bottom: 3px;
    }
    table.main th {
      border-inline-start: 1px solid oklch(84% 0.017 248);
      border-bottom: 1px solid oklch(80% 0.02 248);
      background: oklch(93.5% 0.025 248);
      color: oklch(31% 0.047 248);
      padding: 2px 3px;
      text-align: center;
      white-space: nowrap;
      font-size: 6.4px;
      font-weight: 900;
    }
    table.main td {
      border-inline-start: 1px solid oklch(88% 0.012 248);
      border-bottom: 1px solid oklch(88% 0.012 248);
      background: oklch(99.5% 0.003 248);
      color: oklch(25% 0.03 248);
      padding: 2px 3px;
      text-align: center;
      font-size: 7.2px;
      font-weight: 750;
    }
    table.main tr:last-child td { border-bottom: 0; }
    .net-cell {
      min-width: 60px;
      border: 1px solid oklch(70% 0.095 56) !important;
      background: oklch(97% 0.038 56) !important;
      color: oklch(34% 0.075 56) !important;
      text-align: center;
      vertical-align: middle;
      padding: 3px 4px !important;
    }
    .net-label {
      display: block;
      margin-bottom: 2px;
      color: oklch(42% 0.065 56);
      font-size: 6px;
      font-weight: 800;
    }
    .net-val {
      display: block;
      color: oklch(31% 0.08 56);
      font-size: 12px;
      font-weight: 950;
    }
    .words {
      margin: 3px 0 1px;
      color: oklch(30% 0.035 248);
      text-align: right;
      font-size: 7.5px;
      font-weight: 800;
    }
    .sigs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 5px;
    }
    .sig-block {
      text-align: center;
      color: oklch(31% 0.035 248);
      font-size: 7px;
      font-weight: 800;
    }
    .sig-line {
      width: 100px;
      margin: 9px auto 3px;
      border-top: 1px solid oklch(38% 0.025 248);
    }
  `;

  function openPrint(html: string, title: string, css: string) {
    const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${html}</body></html>`;

    // On Android native, use the printer plugin which accepts raw HTML
    if (canUseNativeAndroidPrint()) {
      void requestNativeAndroidPrint(title, fullHtml);
      return;
    }

    // Desktop / web: print via hidden iframe
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

  function sectionBrand(sec: string) {
    return sec === "عيادة"
      ? {
          mark: "SEC",
          name: "مركز أ.د محمد السعدني غرابة",
          sub: "Sadany Eye Center",
        }
      : {
          mark: "S",
          name: "مركز عيون الشروق",
          sub: "SELRS",
        };
  }

  function renderSheetHeader(
    title: string,
    sec: string,
    reportSystem: string = "نظام الرواتب",
  ): string {
    const brand = sectionBrand(sec);
    return `
        <header class="sheet-header">
          <div class="brand">
            <span class="brand-mark">${escapeHtml(brand.mark)}</span>
            <div>
              <div>${escapeHtml(brand.name)}</div>
              <div class="muted">${escapeHtml(brand.sub)}</div>
            </div>
          </div>
          <div class="report-title">
            <h1>${escapeHtml(title)} — ${escapeHtml(MONTHS[month - 1])}</h1>
            <span class="period">${escapeHtml(periodLabel)}</span>
          </div>
          <div class="report-title" style="text-align:left">
            <div class="muted">${escapeHtml(reportSystem)}</div>
            <div class="dept">${escapeHtml(sec)}</div>
          </div>
        </header>`;
  }

  function buildSheetFrame({
    title,
    today,
    summaryItems,
    tableHtml,
    note,
  }: {
    title: string;
    today: string;
    summaryItems: Array<{ label: string; value: string }>;
    tableHtml: string;
    note?: string;
  }): string {
    const summary = summaryItems
      .map(
        (item) => `
          <div class="summary-pill"><span class="summary-label">${escapeHtml(item.label)}</span><span class="summary-value">${escapeHtml(item.value)}</span></div>`,
      )
      .join("");

    return `
      <main class="payroll-sheet">
        <header class="sheet-header">
          <div class="brand">
            <span class="brand-mark">S</span>
            <div>
              <div>SELRS Medical Center</div>
              <div class="muted">نظام مرتبات العاملين</div>
            </div>
          </div>
          <div class="report-title">
            <h1>${escapeHtml(title)}</h1>
            <span class="period">${escapeHtml(periodLabel)}</span>
          </div>
          <div class="dept">${escapeHtml(section)}</div>
        </header>
        <section class="summary-strip" aria-label="ملخص الكشف">${summary}</section>
        ${note ? `<p class="note">${escapeHtml(note)}</p>` : ""}
        <section class="table-wrap">${tableHtml}</section>
        <div class="footer">
          <div class="footer-block"><div class="footer-line"></div>المدير الإداري</div>
          <div class="footer-block"><div class="footer-line"></div>الحسابات</div>
          <div class="footer-block"><div class="footer-line"></div>شئون العاملين</div>
        </div>
        <div class="footer-meta"><span>صفحة 1 من 1</span><span>تاريخ الطباعة: ${escapeHtml(today)}</span></div>
      </main>`;
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
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
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
        <td class="money-strong">${fmt(r.totalPay)}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");

    const html = `
      <main class="payroll-sheet">
        ${renderSheetHeader("كشف المرتبات الشهرية", section)}
        <section class="summary-strip" aria-label="ملخص كشف المرتبات">
          <div class="summary-pill"><span class="summary-label">عدد الموظفين</span><span class="summary-value">${nonShift.length}</span></div>
          <div class="summary-pill"><span class="summary-label">إجمالي الأساسي</span><span class="summary-value">${fmt(tBasic)}</span></div>
          <div class="summary-pill"><span class="summary-label">إجمالي الخصومات</span><span class="summary-value">${fmt(tDed)}</span></div>
          <div class="summary-pill"><span class="summary-label">صافي الأساسي</span><span class="summary-value">${fmt(tNetBasic)}</span></div>
          <div class="summary-pill"><span class="summary-label">صافي المستحق</span><span class="summary-value">${fmt(tTotal)}</span></div>
        </section>
        <section class="table-wrap">
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
            <td class="money-strong">${fmt(tTotal)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
        </section>
      <div class="footer">
        <div class="footer-block"><div class="footer-line"></div>المدير الإداري</div>
        <div class="footer-block"><div class="footer-line"></div>الحسابات</div>
        <div class="footer-block"><div class="footer-line"></div>شئون العاملين</div>
      </div>
      <div class="footer-meta">
        <span>صفحة 1 من 1</span>
        <span>تاريخ الطباعة: ${escapeHtml(today)}</span>
      </div>
      </main>`;

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
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${fmt(r.basicSalary)}</td>
        <td>${fmt(r.absentDeduction)}</td>
        <td>${fmt(r.lateDeduction ?? 0)}</td>
        <td>${fmt(r.earlyLeaveDeduction ?? 0)}</td>
        <td>${fmt(r.penaltyDeduction)}</td>
        <td>${fmt(r.totalDeductions)}</td>
        <td class="money-strong">${fmt(r.netBasic)}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف الرواتب الأساسية", section)}
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
            <td class="money-strong">${fmt(tNet)}</td><td></td>
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
    const tAttendRaw = nonShift.reduce(
      (s: number, r: any) =>
        s + Number(r.attendanceCommissionRaw ?? r.attendanceCommission),
      0,
    );
    const tExamRaw = nonShift.reduce(
      (s: number, r: any) => s + Number(r.examCommissionRaw ?? r.examCommission),
      0,
    );
    const tPentaRaw = nonShift.reduce(
      (s: number, r: any) =>
        s + Number(r.pentacamCommissionRaw ?? r.pentacamCommission),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${fmt(r.attendanceCommissionRaw ?? r.attendanceCommission)}</td>
        <td>${fmt(r.attendanceCommission)}</td>
        <td>${fmt(r.examCommissionRaw ?? r.examCommission)}</td>
        <td>${fmt(r.examCommission)}</td>
        ${!isClinic ? `<td>${fmt(r.pentacamCommissionRaw ?? r.pentacamCommission)}</td><td>${fmt(r.pentacamCommission)}</td>` : ""}
        <td>${fmt(getAllowanceValues(r).cola)}</td>
        <td>${fmt(getAllowanceValues(r).travel)}</td>
        <td>${fmt(r.overtimePay ?? 0)}</td>
        <td style="font-weight:bold">${fmt(getCommissionTotal(r) + Number(r.overtimePay ?? 0))}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف العمولات", section)}
      <table>
        <thead>
          <tr>
            <th rowspan="2">الاسم</th>
            <th colspan="2">عمولة حضور</th>
            <th colspan="2">عمولة فحص</th>
            ${!isClinic ? '<th colspan="2">عمولة بنتاكام</th>' : ""}
            <th rowspan="2">غلاء معيشه</th><th rowspan="2">بدل مواصلات</th><th rowspan="2">إضافي</th><th rowspan="2">إجمالي العمولات</th><th rowspan="2" class="sig-col">التوقيع</th>
          </tr>
          <tr>
            <th>النسبة</th><th>المستحق</th>
            <th>النسبة</th><th>المستحق</th>
            ${!isClinic ? "<th>النسبة</th><th>المستحق</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td>${fmt(tAttendRaw)}</td><td>${fmt(tAttend)}</td>
            <td>${fmt(tExamRaw)}</td><td>${fmt(tExam)}</td>
            ${!isClinic ? `<td>${fmt(tPentaRaw)}</td><td>${fmt(tPenta)}</td>` : ""}
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

  function printSupervisionSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const shiftSupRows = shiftStaff.map((s: any) => {
      const pr = shiftRows.find((r: any) => r.empCd === `shift_${s.id}`);
      return {
        empCd: `shift_${s.id}`,
        fullName: s.name,
        department: "مناوبة",
        supervisionBonus: pr?.supervisionBonus ?? "0",
      };
    });
    const supRows = [...regularRows, ...shiftSupRows];
    const totalBonus = supRows.reduce(
      (s: number, r: any) =>
        s + Number(bonusEdits[r.empCd] ?? r.supervisionBonus ?? 0),
      0,
    );
    const bodyRows = supRows
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${fmt(Number(bonusEdits[r.empCd] ?? r.supervisionBonus ?? 0))}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف مكافآت الإشراف", section)}
      <p class="note" style="margin-bottom:6px">ملاحظة: هذه المكافآت خارج إجمالي الراتب ولا تؤثر على الحسابات</p>
      <table>
        <thead><tr>
          <th>الاسم</th><th>مكافأة الإشراف</th><th class="sig-col">التوقيع</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td>${fmt(totalBonus)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <div class="footer-block"><div class="footer-line"></div>المدير الإداري</div>
        <div class="footer-block"><div class="footer-line"></div>الحسابات</div>
        <div class="footer-block"><div class="footer-line"></div>شئون العاملين</div>
      </div>
      <div class="footer-meta"><span>صفحة 1 من 1</span><span>تاريخ الطباعة: ${today}</span></div>`;
    openPrint(
      html,
      `كشف مكافآت الإشراف — ${section} — ${periodLabel}`,
      SHEET_CSS,
    );
  }

  function printSupervisionSlips() {
    const shiftSupRows2 = shiftStaff.map((s: any) => {
      const pr = shiftRows.find((r: any) => r.empCd === `shift_${s.id}`);
      return {
        empCd: `shift_${s.id}`,
        fullName: s.name,
        department: "مناوبة",
        supervisionBonus: pr?.supervisionBonus ?? "0",
      };
    });
    const supRows = [...regularRows, ...shiftSupRows2].filter(
      (r: any) => Number(bonusEdits[r.empCd] ?? r.supervisionBonus ?? 0) > 0,
    );
    if (!supRows.length) {
      toast.info("لا توجد مكافآت إشراف للطباعة");
      return;
    }
    const html = supRows
      .map((r: any) => {
        const bonus = Number(bonusEdits[r.empCd] ?? r.supervisionBonus ?? 0);
        const table = `
        <table class="main">
          <tr>
            <th>مكافأة الإشراف</th>
            <th rowspan="2" class="net-cell"><span class="net-label">صافي المستحق</span><span class="net-val">${fmt(bonus)}</span></th>
          </tr>
          <tr>
            <td>${fmt(bonus)}</td>
          </tr>
        </table>`;
        return buildSlip(
          r,
          `مكافأة إشراف ${MONTHS[month - 1]} ${year}`,
          table,
          bonus,
        );
      })
      .join("");
    openPrint(html, `مكافآت الإشراف — ${MONTHS[month - 1]} ${year}`, SLIPS_CSS);
  }

  function buildSlip(
    r: any,
    title: string,
    tableHtml: string,
    netPay: number,
    empSection?: string,
  ): string {
    const brand = sectionBrand(empSection ?? r._section ?? section);
    return `
      <div class="slip">
        <div class="slip-top">
          <span>${escapeHtml(brand.name)}</span>
          <span class="slip-badge">${escapeHtml(brand.mark)}</span>
          <span style="text-align:left">${escapeHtml(brand.sub)}</span>
        </div>
        <div class="slip-title">${escapeHtml(title)}</div>
        <div class="employee-strip">
          <div class="employee-box">
            <span class="box-label">اسم الموظف</span>
            <span class="box-value">${escapeHtml(r.fullName ?? r.empCd)}</span>
          </div>
          <div class="employee-box">
            <span class="box-label">الوظيفة/القسم</span>
            <span class="box-value">${escapeHtml(
              [r.jobTitle, empSection ?? r._section ?? section]
                .filter(Boolean)
                .join("/"),
            )}</span>
          </div>
        </div>
        ${tableHtml}
        <div class="words">${escapeHtml(toArabicWords(netPay))}</div>
        <div class="sigs">
          <div class="sig-block"><div class="sig-line"></div>توقيع المستلم</div>
          <div class="sig-block"><div class="sig-line"></div>يعتمد</div>
        </div>
      </div>`;
  }

  function printPenaltiesSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const nonShift = rows.filter(
      (r: any) => !String(r.empCd).startsWith("shift_"),
    );
    const tPenalty = nonShift.reduce(
      (s: number, r: any) => s + Number(r.penaltyDeduction),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${fmt(r.penaltyDeduction)}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف الجزاءات", section)}
      <table>
        <thead><tr><th>الاسم</th><th>الجزاءات</th><th class="sig-col">التوقيع</th></tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td class="emp-col">الإجمالي</td><td>${fmt(tPenalty)}</td><td></td></tr>
        </tbody>
      </table>`;
    openPrint(html, `كشف الجزاءات — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function printAdvancesSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const nonShift = rows.filter(
      (r: any) => !String(r.empCd).startsWith("shift_"),
    );
    const tAdv = nonShift.reduce(
      (s: number, r: any) => s + Number(r.advancesDeduction ?? 0),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${fmt(r.advancesDeduction ?? 0)}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف السلف", section)}
      <table>
        <thead><tr><th>الاسم</th><th>السلف</th><th class="sig-col">التوقيع</th></tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td class="emp-col">الإجمالي</td><td>${fmt(tAdv)}</td><td></td></tr>
        </tbody>
      </table>`;
    openPrint(html, `كشف السلف — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function printLateSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const nonShift = rows.filter(
      (r: any) => !String(r.empCd).startsWith("shift_"),
    );
    const tLate = nonShift.reduce(
      (s: number, r: any) => s + Number(r.lateDeduction ?? 0),
      0,
    );
    const tEarly = nonShift.reduce(
      (s: number, r: any) => s + Number(r.earlyLeaveDeduction ?? 0),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${r.lateMinutes ?? 0}</td>
        <td>${fmt(r.lateDeduction ?? 0)}</td>
        <td>${r.earlyLeaveMinutes ?? 0}</td>
        <td>${fmt(r.earlyLeaveDeduction ?? 0)}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف التأخيرات", section)}
      <table>
        <thead><tr>
          <th>الاسم</th>
          <th>تأخير (د)</th><th>خصم تأخير</th>
          <th>مبكر (د)</th><th>خصم مبكر</th>
          <th class="sig-col">التوقيع</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td class="emp-col">الإجمالي</td>
            <td></td><td>${fmt(tLate)}</td>
            <td></td><td>${fmt(tEarly)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>`;
    openPrint(html, `كشف التأخيرات — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function printInsuranceSheet() {
    const today = new Date().toLocaleDateString("ar-EG");
    const nonShift = rows.filter(
      (r: any) => !String(r.empCd).startsWith("shift_"),
    );
    const tIns = nonShift.reduce(
      (s: number, r: any) => s + Number(r.insuranceDeduction ?? 0),
      0,
    );
    const bodyRows = nonShift
      .map(
        (r: any) => `
      <tr>
        <td class="emp-col">${escapeHtml(r.fullName ?? r.empCd)}</td>
        <td>${fmt(r.insuranceDeduction ?? 0)}</td>
        <td class="sig-col"></td>
      </tr>`,
      )
      .join("");
    const html = `
      ${renderSheetHeader("كشف التأمينات الاجتماعية", section)}
      <table>
        <thead><tr><th>الاسم</th><th>التأمينات</th><th class="sig-col">التوقيع</th></tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td class="emp-col">الإجمالي</td><td>${fmt(tIns)}</td><td></td></tr>
        </tbody>
      </table>`;
    openPrint(html, `كشف التأمينات — ${section} — ${periodLabel}`, SHEET_CSS);
  }

  function printDay1Slips() {
    const html = allPrintRows
      .filter((r: any) => r._section === section)
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
      .filter((r: any) => r._section === section)
      .map((r: any, i: number) => {
        const isClinic = (r._section ?? section) === "عيادة";
        const attend = Number(r.attendanceCommission);
        const attendRaw = Number(r.attendanceCommissionRaw ?? attend);
        const exam = Number(r.examCommission);
        const examRaw = Number(r.examCommissionRaw ?? exam);
        const penta = Number(r.pentacamCommission);
        const pentaRaw = Number(r.pentacamCommissionRaw ?? penta);
        const cola = Number(r.costOfLivingAllowance ?? 0);
        const travel = Number(r.transportAllowance ?? 0);
        const ot = Number(r.overtimePay ?? 0);
        const net = attend + exam + (isClinic ? 0 : penta) + cola + travel + ot;
        const table = `
        <table class="main">
          <tr>
            <th colspan="2">الحضور</th>
            <th colspan="2">الكشف</th>
            ${!isClinic ? '<th colspan="2">البنتاكام</th>' : ""}
            <th rowspan="2">غلاء معيشه</th>
            <th rowspan="2">بدل مواصلات</th>
            <th rowspan="2">أوفرتايم</th>
            <th rowspan="2">إجمالي المكافآت</th>
            <th rowspan="3" class="net-cell"><span class="net-label">صافي المستحق</span><span class="net-val">${fmt(net)}</span></th>
          </tr>
          <tr>
            <th>النسبة</th><th>المستحق</th>
            <th>النسبة</th><th>المستحق</th>
            ${!isClinic ? "<th>النسبة</th><th>المستحق</th>" : ""}
          </tr>
          <tr>
            <td>${fmt(attendRaw)}</td><td>${fmt(attend)}</td>
            <td>${fmt(examRaw)}</td><td>${fmt(exam)}</td>
            ${!isClinic ? `<td>${fmt(pentaRaw)}</td><td>${fmt(penta)}</td>` : ""}
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
            <DateInput
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm flex-1 sm:flex-initial"
            />
            <span className="text-sm text-muted-foreground">—</span>
            <DateInput
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Printer size={15} /> كشوف
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={printPenaltiesSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> جزاءات
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printAdvancesSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> سلف
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printLateSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> تأخيرات
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printInsuranceSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> تأمينات
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    <DropdownMenuItem
                      onClick={printPenaltiesSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> جزاءات
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printAdvancesSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> سلف
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printLateSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> تأخيرات
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={printInsuranceSheet}
                      className="gap-2 justify-start cursor-pointer"
                    >
                      <Printer size={14} /> تأمينات
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

      {rows.length > 0 &&
        (() => {
          const t = totalsBySection(section as "مركز" | "عيادة");
          return (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  label: "الرواتب الأساسية",
                  value: fmt(t.basic),
                  tone: "text-foreground",
                },
                {
                  label: "الخصومات",
                  value: fmt(t.deductions),
                  tone: "text-destructive",
                },
                {
                  label: "الإجمالي الكلي",
                  value: fmt(t.totalPay),
                  tone: "text-primary font-bold",
                },
                {
                  label: "دفعة يوم 1 — الراتب",
                  value: fmt(t.netBasic),
                  tone: "text-foreground",
                },
                {
                  label: "دفعة يوم 10 — المكافآت",
                  value: fmt(t.commission + t.overtime),
                  tone: "text-success",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className={`mt-1 text-base font-bold ${m.tone}`}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

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
          <button
            onClick={() => setActiveTab("supervision")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "supervision"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            مكافأة الإشراف
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
                        شفت كبير
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        قيمة
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        إجمالي
                      </th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        شفت صغير
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
                          {/* Big shifts */}
                          <div className="bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                            <div className="font-medium text-foreground">
                              شفت كبير
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

                          {/* Small shifts */}
                          <div className="bg-muted/30 p-2.5 rounded-lg space-y-1.5">
                            <div className="font-medium text-foreground">
                              شفت صغير
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
                      <th rowSpan={2} className="px-3 py-3 text-center font-medium text-muted-foreground align-middle">
                        الموظف
                      </th>
                      <th colSpan={2} className="px-3 py-2 text-center font-medium text-muted-foreground">
                        حضور
                      </th>
                      <th colSpan={2} className="px-3 py-2 text-center font-medium text-muted-foreground">
                        فحص
                      </th>
                      {section !== "عيادة" && (
                        <th colSpan={2} className="px-3 py-2 text-center font-medium text-muted-foreground">
                          بنتاكام
                        </th>
                      )}
                      <th rowSpan={2} className="px-3 py-3 text-center font-medium text-muted-foreground align-middle">
                        غلاء معيشه
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-center font-medium text-muted-foreground align-middle">
                        بدل مواصلات
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-center font-medium text-muted-foreground align-middle">
                        إضافي (د)
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-center font-medium text-muted-foreground align-middle">
                        إضافي (ج)
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-center font-medium text-muted-foreground font-bold align-middle">
                        إجمالي العمولات
                      </th>
                    </tr>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">النسبة</th>
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">المستحق</th>
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">النسبة</th>
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">المستحق</th>
                      {section !== "عيادة" && (
                        <>
                          <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">النسبة</th>
                          <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">المستحق</th>
                        </>
                      )}
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
                          <td className="px-3 py-3 text-center text-muted-foreground">
                            {fmt(r.attendanceCommissionRaw ?? r.attendanceCommission)}
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(r.attendanceCommission)}
                          </td>
                          <td className="px-3 py-3 text-center text-muted-foreground">
                            {fmt(r.examCommissionRaw ?? r.examCommission)}
                          </td>
                          <td className="px-3 py-3 text-center text-success">
                            {fmt(r.examCommission)}
                          </td>
                          {section !== "عيادة" && (
                            <>
                              <td className="px-3 py-3 text-center text-muted-foreground">
                                {fmt(r.pentacamCommissionRaw ?? r.pentacamCommission)}
                              </td>
                              <td className="px-3 py-3 text-center text-success">
                                {fmt(r.pentacamCommission)}
                              </td>
                            </>
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
                          colSpan={section !== "عيادة" ? 11 : 9}
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
                            className="border-b border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-colors"
                          >
                            <td className="px-3 py-3 text-center">
                              <div className="font-medium">{tech.fullName}</div>
                              <div className="text-xs text-secondary font-medium">
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
                              عمولة الحضور (نسبة/مستحق):
                            </span>
                            <span className="font-medium tabular-nums">
                              <span className="text-muted-foreground">{fmt(r.attendanceCommissionRaw ?? r.attendanceCommission)}</span>
                              {" / "}
                              <span className="text-success">{fmt(r.attendanceCommission)}</span>
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة الفحص (نسبة/مستحق):
                            </span>
                            <span className="font-medium tabular-nums">
                              <span className="text-muted-foreground">{fmt(r.examCommissionRaw ?? r.examCommission)}</span>
                              {" / "}
                              <span className="text-success">{fmt(r.examCommission)}</span>
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/10 pb-1">
                            <span className="text-muted-foreground">
                              عمولة بنتاكام (نسبة/مستحق):
                            </span>
                            <span className="font-medium tabular-nums">
                              <span className="text-muted-foreground">{fmt(r.pentacamCommissionRaw ?? r.pentacamCommission)}</span>
                              {" / "}
                              <span className="text-success">{fmt(r.pentacamCommission)}</span>
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
                        className="bg-secondary/5 p-4 transition-colors hover:bg-secondary/10 divide-y divide-border/20"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer select-none pb-2"
                          onClick={() => toggleCard(`comm-tech-${tech.id}`)}
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground text-sm">
                              {tech.fullName}
                            </div>
                            <div className="text-xs text-secondary font-medium">
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

      {/* ── Supervision Bonus Tab ── */}
      {section === "مركز" &&
        activeTab === "supervision" &&
        (() => {
          const shiftSupRows3 = shiftStaff.map((s: any) => {
            const pr = shiftRows.find((r: any) => r.empCd === `shift_${s.id}`);
            return {
              empCd: `shift_${s.id}`,
              fullName: s.name,
              department: "مناوبة",
              supervisionBonus: pr?.supervisionBonus ?? "0",
            };
          });
          const supRows = [...regularRows, ...shiftSupRows3];
          const totalBonus = supRows.reduce(
            (s: number, r: any) =>
              s + Number(bonusEdits[r.empCd] ?? r.supervisionBonus ?? 0),
            0,
          );
          return (
            <section className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="border-b border-border bg-muted/25 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    مكافأة الإشراف
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    خارج إجمالي الراتب — لا تؤثر على الحسابات
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={printSupervisionSlips}
                    className="gap-1.5"
                  >
                    <Printer size={13} /> إيصالات
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={printSupervisionSheet}
                    className="gap-1.5"
                  >
                    <Printer size={13} /> كشف
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto" dir="rtl">
                <table dir="rtl" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        الموظف
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        مكافأة الإشراف
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        حفظ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supRows.map((r: any) => {
                      const key = r.empCd;
                      const current =
                        bonusEdits[key] ??
                        String(supervisionBonusMap[r.empCd] ?? "0");
                      return (
                        <tr
                          key={key}
                          className="border-b border-border/50 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {r.fullName ?? r.empCd}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.salaryType ?? r.department ?? ""}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={current}
                              onChange={(e) =>
                                setBonusEdits((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                const amount = parseFloat(current) || 0;
                                setSupervisionBonus.mutate({
                                  empCd: r.empCd,
                                  year,
                                  month,
                                  section,
                                  amount,
                                });
                              }}
                              disabled={setSupervisionBonus.isPending}
                              className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              حفظ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                      <td className="px-4 py-2 text-right">
                        الإجمالي (معلوماتي فقط)
                      </td>
                      <td className="px-4 py-2 text-center tabular-nums">
                        {fmt(totalBonus)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          );
        })()}
    </div>
  );
}
