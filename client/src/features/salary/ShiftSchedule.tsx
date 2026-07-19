import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DateInput } from "@/components/ui/date-input";

const now = new Date();
const todayStr = now.toISOString().split("T")[0];
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
const DAYS_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const DAYS_AR_CALENDAR = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
];

function getSixDayIndex(dayOfWeek: number): number {
  if (dayOfWeek === 6) return 0; // Saturday
  if (dayOfWeek === 0) return 1; // Sunday
  if (dayOfWeek === 1) return 2; // Monday
  if (dayOfWeek === 2) return 3; // Tuesday
  if (dayOfWeek === 3) return 4; // Wednesday
  if (dayOfWeek === 4) return 5; // Thursday
  return 0;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function monthDates(y: number, m: number) {
  return Array.from(
    { length: daysInMonth(y, m) },
    (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`,
  );
}

function dateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const out: string[] = [];
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    );
  }
  return out;
}

function weekDates(anchor: string, y: number, m: number) {
  const d = new Date(anchor);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(mon);
    c.setDate(mon.getDate() + i);
    return c;
  })
    .filter((c) => c.getFullYear() === y && c.getMonth() + 1 === m)
    .map(
      (c) => `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`,
    );
}

function fmtDate(ds: string) {
  const d = new Date(`${ds}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function toDateKey(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return s.slice(0, 10);
}

type Period = "day" | "week" | "month";
type ShiftName = "Morning" | "Night";
type StaffFilter = "all" | "doctor" | "tech";

interface AddForm {
  staffId: string;
  shiftName: string;
  period: Period;
  anchorDate: string;
}

const EMPTY_ADD: AddForm = {
  staffId: "",
  shiftName: "",
  period: "day",
  anchorDate: "",
};

interface HolidayForm {
  date: string;
  name: string;
}

const EMPTY_HOLIDAY: HolidayForm = { date: "", name: "" };

const SHIFT_META: Record<
  ShiftName,
  { label: string; short: string; tone: string; printClass: string }
> = {
  Morning: {
    label: "صباح",
    short: "ص",
    tone: "bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/20 hover:bg-secondary/15",
    printClass: "shift-m",
  },
  Night: {
    label: "مساء",
    short: "م",
    tone: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/15",
    printClass: "shift-n",
  },
};

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 7mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: oklch(99% 0.004 245);
    color: oklch(20% 0.018 245);
    direction: rtl;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    font-size: 8px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { display: grid; gap: 4mm; }
  .print-header {
    display: grid;
    grid-template-columns: minmax(48mm, 1fr) minmax(72mm, auto) minmax(58mm, 1fr);
    align-items: center;
    gap: 4mm;
    border: 1px solid oklch(84% 0.028 245);
    border-radius: 5mm;
    padding: 3mm 4mm;
    background: oklch(98% 0.008 245);
  }
  .brand-mark { display: flex; align-items: center; gap: 2.5mm; }
  .mark-dot {
    width: 8mm; height: 8mm; border-radius: 999px;
    background: oklch(65% 0.16 35); color: oklch(99% 0.004 245);
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 10px;
  }
  .brand-title { font-size: 9px; font-weight: 800; color: oklch(34% 0.11 255); }
  .brand-subtitle { margin-top: 1mm; color: oklch(47% 0.026 245); font-size: 7px; font-weight: 600; }
  .title-block { text-align: center; }
  h1 { margin: 0; font-size: 18px; font-weight: 850; letter-spacing: -0.01em; color: oklch(30% 0.115 255); }
  .date-range {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2mm;
    margin-top: 1.5mm;
    color: oklch(46% 0.028 245);
    font-size: 8px;
    font-weight: 700;
    direction: rtl;
    white-space: nowrap;
  }
  .summary-strip { display: flex; justify-content: flex-end; gap: 2mm; flex-wrap: wrap; }
  .summary-pill {
    min-width: 18mm; border: 1px solid oklch(88% 0.02 245); border-radius: 999px;
    padding: 1.2mm 2.5mm; background: oklch(100% 0.003 245);
    text-align: center; font-weight: 800; color: oklch(31% 0.035 245);
  }
  .summary-pill span { color: oklch(49% 0.026 245); font-size: 6.8px; font-weight: 700; margin-inline-start: 1mm; }
  .legend-row { display: flex; align-items: center; justify-content: space-between; gap: 4mm; color: oklch(43% 0.03 245); font-size: 7px; font-weight: 700; }
  .legend { display: flex; align-items: center; gap: 3mm; }
  .legend-item { display: inline-flex; align-items: center; gap: 1mm; }
  .legend-token { display: inline-grid; place-items: center; min-width: 5mm; height: 4mm; border-radius: 999px; font-size: 7px; font-weight: 900; }
  .legend-m { color: oklch(51% 0.135 55); background: oklch(95% 0.04 65); }
  .legend-n { color: oklch(43% 0.145 255); background: oklch(94% 0.035 255); }
  .legend-absent { color: oklch(44% 0.03 245); background: oklch(93% 0.012 245); }
  .table-wrap { break-inside: avoid; page-break-inside: avoid; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid oklch(76% 0.028 245); border-radius: 3mm; overflow: hidden; }
  th, td { border-inline-start: 1px solid oklch(82% 0.022 245); border-block-start: 1px solid oklch(86% 0.018 245); padding: 1.4mm 1mm; text-align: center; vertical-align: middle; }
  thead th { border-block-start: 0; background: oklch(94% 0.03 255); color: oklch(31% 0.09 255); font-weight: 850; font-size: 7.3px; line-height: 1.25; }
  th:first-child, td:first-child { border-inline-start: 0; }
  tbody tr:nth-child(even) td { background: oklch(98% 0.006 245); }
  tbody td { height: 7mm; color: oklch(23% 0.018 245); font-size: 8.2px; font-weight: 800; }
  .name-col { width: 25mm; min-width: 25mm; text-align: right; white-space: nowrap; font-weight: 850; color: oklch(25% 0.045 245); background: oklch(97% 0.01 245); }
  .date-label { color: oklch(48% 0.032 245); font-weight: 750; font-size: 6.7px; }
  .holiday-th, .holiday-cell { background: oklch(97% 0.032 75) !important; }
  .holiday-label { margin-top: .7mm; color: oklch(49% 0.125 55); font-size: 6.4px; font-weight: 850; }
  .shift-m, .shift-n { display: inline-grid; place-items: center; min-width: 4.6mm; height: 4.2mm; margin-inline: .35mm; border-radius: 999px; font-size: 7px; font-weight: 900; }
  .shift-m { color: oklch(44% 0.13 55); background: oklch(95% 0.04 65); }
  .shift-n { color: oklch(37% 0.145 255); background: oklch(94% 0.035 255); }
  .shift-absent { color: oklch(46% 0.024 245); background: oklch(93% 0.012 245); text-decoration: line-through; }
  .empty-cell { color: oklch(72% 0.018 245); font-weight: 700; }
  .diag-cell { position: relative; height: 12mm; background: oklch(96% 0.018 245) !important; }
  .diag-cell svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .diag-cell span { position: absolute; font-size: 6.6px; font-weight: 850; color: oklch(35% 0.06 245); }
  .diag-date { top: 1.2mm; left: 1.4mm; }
  .diag-name { bottom: 1.2mm; right: 1.4mm; }
  .cal-wrapper { border: 1px solid oklch(76% 0.028 245); border-radius: 2mm; overflow: hidden; margin-top: 4mm; }
  .cal-header-row { display: grid; grid-template-columns: repeat(6, 1fr); background: oklch(95% 0.02 245); border-bottom: 1px solid oklch(82% 0.022 245); }
  .cal-header-cell { padding: 2mm; text-align: center; font-size: 8px; font-weight: 800; border-inline-start: 1px solid oklch(82% 0.022 245); color: oklch(43% 0.03 245); }
  .cal-header-cell:first-child { border-inline-start: none; }
  .cal-body { display: grid; grid-template-columns: repeat(6, 1fr); background: oklch(82% 0.022 245); gap: 1px; }
  .cal-cell { background: white; min-height: 22mm; padding: 1.5mm; display: flex; flex-direction: column; gap: 1mm; }
  .cal-cell.empty-cell { background: oklch(98% 0.01 245); }
  .cal-cell.holiday { background: oklch(95% 0.05 65); }
  .cal-date-row { display: flex; justify-content: space-between; align-items: start; margin-bottom: 1mm; }
  .cal-date-num { font-size: 10px; font-weight: 900; color: oklch(30% 0.115 255); }
  .cal-holiday-tag { font-size: 6px; background: oklch(80% 0.1 65); color: white; padding: 0.5mm 1.5mm; border-radius: 999px; font-weight: bold; }
  .cal-shifts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm; flex-grow: 1; }
  .cal-shift { border-inline-end: 1px solid oklch(90% 0.02 245); padding-inline-end: 1.5mm; }
  .cal-shift:last-child { border-inline-end: none; padding-inline-end: 0; }
  .cal-shift-title { display: block; font-size: 6px; font-weight: 800; color: oklch(46% 0.028 245); margin-bottom: 0.8mm; border-bottom: 1px solid oklch(92% 0.02 245); padding-bottom: 0.5mm; }
  .cal-shift div { font-size: 7.5px; font-weight: 800; color: oklch(20% 0.018 245); margin-bottom: 0.4mm; }
  .signature-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12mm; margin-top: 2mm; color: oklch(38% 0.03 245); font-size: 7px; font-weight: 800; }
  .signature-line { border-top: 1px solid oklch(67% 0.025 245); padding-top: 1.5mm; text-align: center; }
`;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function arabicDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

function compactStaffName(staff: any) {
  const normalizedName = String(staff.name ?? "")
    .trim()
    .replace(/^(?:دكتور|د\.?)\s*/u, "");
  const shortName = normalizedName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  return staff.type === "doctor" ? `د. ${shortName}` : shortName;
}

export default function ShiftSchedule() {
  const { user } = useAuth();
  const isManager = ["admin", "manager"].includes(user?.role ?? "");

  const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [fromDate, setFromDate] = useState(`${isoMonth}-01`);
  const [toDate, setToDate] = useState(
    (() => {
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${isoMonth}-${String(last.getDate()).padStart(2, "0")}`;
    })(),
  );
  const [year, month] = fromDate.split("-").map(Number);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [showHolidayAdd, setShowHolidayAdd] = useState(false);
  const [holidayForm, setHolidayForm] = useState<HolidayForm>(EMPTY_HOLIDAY);
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all");
  const [selectedMobileDate, setSelectedMobileDate] = useState(todayStr);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  const schedQ = isManager
    ? (trpc as any).salary.getShiftSchedule.useQuery({ year, month, fromDate, toDate })
    : (trpc as any).salary.getShiftScheduleForStaff.useQuery({ year, month, fromDate, toDate });
  const shiftDefsQ = (trpc as any).attendance.listShifts.useQuery();
  const shiftOptions: { name: string; label: string }[] =
    (shiftDefsQ.data ?? []).map((sd: any) => ({
      name: sd.name,
      label: SHIFT_META[sd.name as ShiftName]?.label ?? sd.name,
    }));
  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery(
    { year, month, fromDate, toDate },
    { enabled: isManager },
  );
  const myStaffIdQ = (trpc as any).salary.getMyShiftStaffId.useQuery(
    undefined,
    {
      enabled: !isManager,
    },
  );
  const myStaffId: number | null = isManager ? null : (myStaffIdQ.data ?? null);

  const staff: any[] = schedQ.data?.staff ?? [];
  const attendance: any[] = schedQ.data?.attendance ?? [];
  const doctors = staff.filter((s: any) => s.type === "doctor");
  const techs = staff.filter((s: any) => s.type === "tech");
  const displayStaff = [...doctors, ...techs];
  const visibleStaff =
    staffFilter === "doctor"
      ? doctors
      : staffFilter === "tech"
        ? techs
        : displayStaff;

  const generateMut = (trpc as any).salary.generateFromCycles.useMutation({
    onSuccess: (res: any) => {
      schedQ.refetch();
      payrollQ.refetch();
      toast.success(`تم توليد ${res.inserted} وردية`);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkMut = (trpc as any).salary.addShiftsBulk.useMutation({
    onSuccess: (res: any) => {
      schedQ.refetch();
      payrollQ.refetch();
      setShowAdd(false);
      setAddForm(EMPTY_ADD);
      toast.success(`تم إضافة ${res.inserted} وردية`);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMut = (trpc as any).salary.toggleShiftPresent.useMutation({
    onSuccess: () => schedQ.refetch(),
    onError: (e: any) => toast.error(e.message),
  });
  const addMyShiftMut = (trpc as any).salary.addMyShiftEntry.useMutation({
    onSuccess: () => {
      schedQ.refetch();
      toast.success("تم تسجيل الوردية");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const toggleMyMut = (trpc as any).salary.toggleMyShiftEntry.useMutation({
    onSuccess: () => schedQ.refetch(),
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const deleteEntryMut = (trpc as any).salary.deleteShiftEntry.useMutation({
    onSuccess: () => {
      schedQ.refetch();
      payrollQ.refetch();
      toast.success("تم حذف الوردية");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const clearRosterMut = (trpc as any).salary.clearRoster.useMutation({
    onSuccess: () => {
      schedQ.refetch();
      payrollQ.refetch();
      toast.success("تم مسح الروستر بالكامل");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  function handleClearRoster() {
    if (
      !window.confirm(
        `هل أنت متأكد من مسح كل ورديات شهر ${fromDate.slice(0, 7)}؟\nهذه العملية لا يمكن التراجع عنها.`,
      )
    )
      return;
    clearRosterMut.mutate({ year, month });
  }
  const holidaysQ = (trpc as any).salary.listHolidays.useQuery({ year, month });
  const addHolidayMut = (trpc as any).salary.addHoliday.useMutation({
    onSuccess: () => {
      holidaysQ.refetch();
      setShowHolidayAdd(false);
      setHolidayForm(EMPTY_HOLIDAY);
      toast.success("تم إضافة العطلة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const deleteHolidayMut = (trpc as any).salary.deleteHoliday.useMutation({
    onSuccess: () => {
      holidaysQ.refetch();
      toast.success("تم حذف العطلة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const holidays: any[] = holidaysQ.data ?? [];
  const holidayByDate = new Map<string, any>();
  for (const h of holidays) {
    holidayByDate.set(String(h.date).slice(0, 10), h);
  }
  const holidayDates = new Set<string>(
    holidays.map((h: any) => String(h.date).slice(0, 10)),
  );

  const attendMap = new Map<string, any[]>();
  for (const row of attendance) {
    const key = `${row.staffId}_${toDateKey(row.workDate)}`;
    if (!attendMap.has(key)) attendMap.set(key, []);
    attendMap.get(key)!.push(row);
  }

  const allDates = (fromDate && toDate ? dateRange(fromDate, toDate) : monthDates(year, month)).filter((ds) => {
    const dow = new Date(`${ds}T00:00:00`).getDay();
    if (dow === 5) return false;
    if (fromDate && ds < fromDate) return false;
    if (toDate && ds > toDate) return false;
    return true;
  });

  const totalEntries = attendance.length;
  const totalPresent = attendance.filter((row: any) => row.present).length;
  const totalAbsent = totalEntries - totalPresent;
  const scheduledStaff = new Set(attendance.map((row: any) => row.staffId))
    .size;
  const coveredDays = new Set(
    attendance.map((row: any) => toDateKey(row.workDate)),
  ).size;
  const myEntries = myStaffId
    ? attendance.filter((row: any) => row.staffId === myStaffId)
    : [];
  const myScheduledDays = new Set(
    myEntries.map((row: any) => toDateKey(row.workDate)),
  ).size;
  const activeDates = allDates.filter(
    (ds) => new Date(`${ds}T00:00:00`).getDay() !== 5,
  );
  const mobileMonthDates = monthDates(year, month);
  const firstMonthDate = mobileMonthDates[0];
  const mobilePrefixEmpty = firstMonthDate
    ? new Date(`${firstMonthDate}T00:00:00`).getDay()
    : 0;
  const selectedDateInMonth = mobileMonthDates.includes(selectedMobileDate)
    ? selectedMobileDate
    : activeDates[0] || mobileMonthDates[0] || todayStr;
  const firstActiveDate = activeDates[0];
  const prefixEmpty = firstActiveDate
    ? getSixDayIndex(new Date(`${firstActiveDate}T00:00:00`).getDay())
    : 0;
  const todayEntries = activeDates.includes(todayStr)
    ? visibleStaff.flatMap((s: any) =>
        (attendMap.get(`${s.id}_${todayStr}`) ?? []).map((entry: any) => ({
          staff: s,
          entry,
        })),
      )
    : [];
  const nextEntries = activeDates
    .flatMap((ds) =>
      visibleStaff.flatMap((s: any) =>
        (attendMap.get(`${s.id}_${ds}`) ?? []).map((entry: any) => ({
          ds,
          staff: s,
          entry,
        })),
      ),
    )
    .slice(0, 8);
  const selectedMobileEntries = visibleStaff.flatMap((s: any) =>
    (attendMap.get(`${s.id}_${selectedDateInMonth}`) ?? []).map(
      (entry: any) => ({
        staff: s,
        entry,
      }),
    ),
  );
  const selectedMobileDateObj = new Date(`${selectedDateInMonth}T00:00:00`);

  function setWholeMonth(nextYear: number, nextMonth: number) {
    const first = `${nextYear}-${pad(nextMonth)}-01`;
    const lastDay = daysInMonth(nextYear, nextMonth);
    const last = `${nextYear}-${pad(nextMonth)}-${pad(lastDay)}`;
    setFromDate(first);
    setToDate(last);
    setSelectedMobileDate(first);
  }

  function moveMonth(offset: number) {
    const current = new Date(year, month - 1 + offset, 1);
    setWholeMonth(current.getFullYear(), current.getMonth() + 1);
  }

  function submitAdd() {
    if (!addForm.staffId || !addForm.shiftName) {
      toast.error("اختر الموظف والوردية");
      return;
    }
    if (addForm.period !== "month" && !addForm.anchorDate) {
      toast.error("اختر تاريخاً");
      return;
    }
    const dates =
      addForm.period === "day"
        ? [addForm.anchorDate]
        : addForm.period === "week"
          ? weekDates(addForm.anchorDate, year, month)
          : monthDates(year, month);
    if (dates.length === 0) {
      toast.error("لا يوجد أيام في هذه الفترة");
      return;
    }
    bulkMut.mutate({
      staffId: parseInt(addForm.staffId),
      shiftName: addForm.shiftName,
      dates,
    });
  }

  function handlePrint() {
    const printDate = new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    function buildShiftToken(entry: any) {
      const meta =
        SHIFT_META[entry.shiftName as ShiftName] ?? SHIFT_META.Morning;
      const absentClass = entry.present ? "" : " shift-absent";
      const label = entry.present ? meta.short : `(${meta.short})`;
      return `<span class="${meta.printClass}${absentClass}">${escapeHtml(label)}</span>`;
    }

    function buildTable(dates: string[], index: number) {
      const cols = dates
        .map((ds) => {
          const dow = new Date(`${ds}T00:00:00`).getDay();
          const holiday = holidayByDate.get(ds);
          return `<th class="${holiday ? "holiday-th" : ""}">
            <div>${escapeHtml(DAYS_AR[dow])}</div>
            <div class="date-label">${escapeHtml(fmtDate(ds))}</div>
            ${holiday ? `<div class="holiday-label">${escapeHtml(holiday.name || "عطلة")}</div>` : ""}
          </th>`;
        })
        .join("");
      const rows = displayStaff
        .map((s: any) => {
          const cells = dates
            .map((ds) => {
              const holiday = holidayByDate.get(ds);
              const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
              const content = entries.length
                ? entries.map(buildShiftToken).join("")
                : holiday
                  ? `<span class="holiday-label">${escapeHtml(holiday.name || "عطلة")}</span>`
                  : '<span class="empty-cell">—</span>';
              return `<td class="${holiday ? "holiday-cell" : ""}">${content}</td>`;
            })
            .join("");
          return `<tr><td class="name-col">${escapeHtml(compactStaffName(s))}</td>${cells}</tr>`;
        })
        .join("");
      return `<section class="table-wrap" aria-label="قسم الروستر ${index + 1}">
        <table>
          <thead><tr>
            <th class="diag-cell">
              <svg preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="0" x2="100%" y2="100%" stroke="oklch(60% 0.03 245)" stroke-width="1"/>
              </svg>
              <span class="diag-date">التاريخ</span>
              <span class="diag-name">الفريق</span>
            </th>${cols}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    }

    function buildCalendarGrid(dates: string[]) {
      if (dates.length === 0) return "";
      const firstStr = dates[0];
      const d0 = new Date(`${firstStr}T00:00:00`);
      const dayIndex = d0.getDay();
      const prefixEmpty = dayIndex === 6 ? 0 : dayIndex + 1;

      let cellsHTML = "";
      for (let i = 0; i < prefixEmpty; i++) {
        cellsHTML += `<div class="cal-cell empty-cell"></div>`;
      }

      dates.forEach((ds) => {
        const dateObj = new Date(`${ds}T00:00:00`);
        const holiday = holidayByDate.get(ds);
        const dayEntries: Array<{ staff: any; entry: any }> = [];

        displayStaff.forEach((s: any) => {
          const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
          entries.forEach((entry: any) => {
            dayEntries.push({ staff: s, entry });
          });
        });

        const entriesByShiftName = new Map<
          string,
          Array<{ staff: any; entry: any }>
        >();
        for (const item of dayEntries) {
          const key = item.entry.shiftName as string;
          if (!entriesByShiftName.has(key)) entriesByShiftName.set(key, []);
          entriesByShiftName.get(key)!.push(item);
        }

        const shiftsHTML = Array.from(entriesByShiftName.entries())
          .map(([shiftName, entries]) => {
            const label =
              shiftOptions.find((o) => o.name === shiftName)?.label ??
              SHIFT_META[shiftName as ShiftName]?.label ??
              shiftName;
            return `<div class="cal-shift">
              <span class="cal-shift-title">${escapeHtml(label)}</span>
              ${entries.map((e) => `<div>${escapeHtml(compactStaffName(e.staff))}</div>`).join("")}
            </div>`;
          })
          .join("");

        cellsHTML += `
          <div class="cal-cell ${holiday ? "holiday" : ""}">
            <div class="cal-date-row">
              <span class="cal-date-num">${dateObj.getDate()}</span>
              ${holiday ? `<span class="cal-holiday-tag">عطلة</span>` : ""}
            </div>
            <div class="cal-shifts-grid">
              ${shiftsHTML}
            </div>
          </div>`;
      });

      return `
        <div class="cal-wrapper">
          <div class="cal-header-row">
            ${DAYS_AR_CALENDAR.map((d) => `<div class="cal-header-cell">${d}</div>`).join("")}
          </div>
          <div class="cal-body">${cellsHTML}</div>
        </div>`;
    }

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
      <title>روستر ${escapeHtml(fromDate.slice(0, 7))}</title>
      <style>${PRINT_CSS}</style></head><body>
      <main class="sheet">
        <header class="print-header">
          <div class="brand-mark">
            <span class="mark-dot">S</span>
            <div>
              <div class="brand-title">SELRS Medical Center</div>
              <div class="brand-subtitle">جدول تشغيل الطاقم الطبي</div>
            </div>
          </div>
          <div class="title-block">
            <h1>روستر شهر ${escapeHtml(fromDate.slice(0, 7))}</h1>
            <div class="date-range">
              <span>من ${escapeHtml(fmtDate(fromDate))}</span>
              <span>إلى ${escapeHtml(fmtDate(toDate))}</span>
              <span>طبع في ${escapeHtml(printDate)}</span>
            </div>
          </div>
          <div class="summary-strip" aria-label="ملخص الروستر">
            <div class="summary-pill">${arabicDigits(displayStaff.length)}<span>فريق</span></div>
            <div class="summary-pill">${arabicDigits(coveredDays)}<span>أيام</span></div>
            <div class="summary-pill">${arabicDigits(totalEntries)}<span>وردية</span></div>
            <div class="summary-pill">${arabicDigits(totalAbsent)}<span>غياب</span></div>
          </div>
        </header>

        <div class="legend-row">
          <div class="legend">
            <span class="legend-item"><span class="legend-token legend-m">ص</span> صباح</span>
            <span class="legend-item"><span class="legend-token legend-n">م</span> مساء</span>
            <span class="legend-item"><span class="legend-token legend-absent">(ص)</span> غير حاضر</span>
          </div>
          <div>الأيام الجمعة مستبعدة من الجدول، والعطلات مميزة بخلفية دافئة.</div>
        </div>

        ${buildCalendarGrid(allDates)}

        <footer class="signature-row">
          <div class="signature-line">مسؤول الروستر</div>
          <div class="signature-line">مراجعة الموارد البشرية</div>
          <div class="signature-line">اعتماد الإدارة</div>
        </footer>
      </main>
    </body></html>`;

    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) {
      toast.error("تعذر فتح نافذة الطباعة");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const cleanup = () => {
      printWindow.removeEventListener("afterprint", cleanup);
      printWindow.close();
    };
    printWindow.addEventListener("afterprint", cleanup);
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
  }

  return (
    <div dir="rtl" className="min-h-full bg-background text-foreground">
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .roster-add-shift,
          .roster-delete-shift {
            opacity: 0;
            pointer-events: none;
          }
          .roster-day-card:hover .roster-add-shift,
          .roster-day-card:focus-within .roster-add-shift,
          .roster-shift-pill:hover .roster-delete-shift,
          .roster-shift-pill:focus-within .roster-delete-shift {
            opacity: 1;
            pointer-events: auto;
          }
        }
        @media (min-width: 1280px) {
          .roster-desktop-layout {
            grid-template-areas: "sidebar calendar";
            grid-template-columns: 300px minmax(0, 1fr);
          }
          .roster-desktop-layout.roster-sidebar-closed {
            grid-template-columns: 52px minmax(0, 1fr);
          }
          .roster-calendar-panel {
            grid-area: calendar;
          }
          .roster-side-panel {
            grid-area: sidebar;
          }
        }
      `}</style>
      <div className="space-y-4 px-4 pb-24 pt-3 md:hidden">
        <header className="sticky top-0 z-20 -mx-4 border-b border-border/70 bg-background/95 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black text-primary">
                  جدول الروستر الشهري
                </h1>
                <p className="text-xs font-semibold text-muted-foreground">
                  {isManager ? "إدارة الروستر" : "وردياتي"}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePrint}
              className="h-10 w-10 rounded-full text-primary"
              title="طباعة"
            >
              <Printer size={18} />
            </Button>
          </div>
        </header>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => moveMonth(-1)}
              className="h-10 w-10 rounded-full text-primary"
              title="الشهر السابق"
            >
              <ChevronRight size={20} />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-black text-foreground">
                {MONTHS_AR[(month || 1) - 1]}{" "}
                {arabicDigits(year || now.getFullYear())}
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                {arabicDigits(activeDates.length)} يوم عمل في العرض
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => moveMonth(1)}
              className="h-10 w-10 rounded-full text-primary"
              title="الشهر التالي"
            >
              <ChevronLeft size={20} />
            </Button>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["all", "الكل"],
              ["doctor", "الأطباء"],
              ["tech", "الفنيين"],
            ] as [StaffFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStaffFilter(value)}
              className={`min-h-10 shrink-0 rounded-full px-5 text-sm font-bold transition-colors ${
                staffFilter === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-3">
          <div className="grid grid-cols-7 text-center">
            {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map(
              (dayName) => (
                <div
                  key={dayName}
                  className="py-2 text-[11px] font-black text-muted-foreground/70"
                >
                  {dayName}
                </div>
              ),
            )}
          </div>
          <div className="grid grid-cols-7 gap-y-2">
            {Array.from({ length: mobilePrefixEmpty }).map((_, idx) => (
              <div key={`mobile-empty-${idx}`} className="h-12" />
            ))}
            {mobileMonthDates.map((ds) => {
              const dayEntries = visibleStaff.flatMap((s: any) =>
                (attendMap.get(`${s.id}_${ds}`) ?? []).map((entry: any) => ({
                  staff: s,
                  entry,
                })),
              );
              const hasMorning = dayEntries.some(
                ({ entry }) => entry.shiftName === "Morning",
              );
              const hasNight = dayEntries.some(
                ({ entry }) => entry.shiftName === "Night",
              );
              const isSelected = ds === selectedDateInMonth;
              const isToday = ds === todayStr;
              const isFriday = new Date(`${ds}T00:00:00`).getDay() === 5;
              const holiday = holidayByDate.get(ds);

              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => setSelectedMobileDate(ds)}
                  className={`mx-auto flex h-12 w-10 flex-col items-center justify-center rounded-lg text-sm font-bold transition-transform active:scale-95 ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/10 text-primary"
                        : isFriday
                          ? "text-muted-foreground/40"
                          : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span>
                    {arabicDigits(new Date(`${ds}T00:00:00`).getDate())}
                  </span>
                  <span className="mt-1 flex h-2 items-center gap-0.5">
                    {hasMorning && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground" : "bg-secondary"
                        }`}
                      />
                    )}
                    {hasNight && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        }`}
                      />
                    )}
                    {holiday && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground" : "bg-warning"
                        }`}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3 border-t border-border pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
              صباحي
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              مسائي
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              عطلة
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-foreground">
                ورديات اليوم المحدد
              </h3>
              <p className="text-xs font-semibold text-muted-foreground">
                {DAYS_AR[selectedMobileDateObj.getDay()]}،{" "}
                {arabicDigits(selectedDateInMonth)}
              </p>
            </div>
            {isManager && (
              <Button
                size="sm"
                onClick={() => {
                  setAddForm((prev) => ({
                    ...prev,
                    period: "day",
                    anchorDate: selectedDateInMonth,
                  }));
                  setShowAdd(true);
                }}
                className="gap-1.5 rounded-xl font-bold"
              >
                <Plus size={14} />
                تسجيل شفت
              </Button>
            )}
          </div>

          {selectedMobileEntries.length > 0 ? (
            <div className="space-y-2">
              {selectedMobileEntries.map(({ staff, entry }) => {
                const meta =
                  SHIFT_META[entry.shiftName as ShiftName] ??
                  SHIFT_META.Morning;
                const isMyRow = !isManager && myStaffId === staff.id;
                const canEdit = isManager || isMyRow;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 ${
                      entry.present ? "" : "opacity-70"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-12 w-1.5 shrink-0 rounded-full ${
                          entry.shiftName === "Morning"
                            ? "bg-secondary"
                            : "bg-primary"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">
                          {compactStaffName(staff)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[11px] font-black ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        canEdit
                          ? isManager
                            ? toggleMut.mutate({
                                id: entry.id,
                                present: !entry.present,
                              })
                            : toggleMyMut.mutate({
                                id: entry.id,
                                present: !entry.present,
                              })
                          : undefined
                      }
                      disabled={
                        !canEdit || toggleMut.isPending || toggleMyMut.isPending
                      }
                      className={`flex shrink-0 items-center gap-1 text-xs font-black ${
                        entry.present
                          ? "text-success-text"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>{entry.present ? "تم الحضور" : "غير مؤكد"}</span>
                      <CheckCircle2
                        className="h-4 w-4"
                        fill={entry.present ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
              لا توجد ورديات في هذا اليوم.
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-[11px] font-bold text-muted-foreground">
              المجدولون
            </span>
            <strong className="mt-1 block text-2xl font-black text-foreground">
              {arabicDigits(scheduledStaff)}
            </strong>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-[11px] font-bold text-muted-foreground">
              المؤكدة
            </span>
            <strong className="mt-1 block text-2xl font-black text-success-text">
              {arabicDigits(totalPresent)}
            </strong>
          </div>
        </section>

        {isManager && (
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMut.mutate({ year, month })}
                disabled={generateMut.isPending}
                className="gap-1.5 rounded-xl font-bold"
              >
                <RefreshCw
                  size={14}
                  className={generateMut.isPending ? "animate-spin" : ""}
                />
                توليد
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHolidayAdd((v) => !v)}
                className="gap-1.5 rounded-xl font-bold"
              >
                <Star size={14} />
                العطلات
              </Button>
            </div>
          </section>
        )}

        {isManager && showAdd && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-black text-foreground">إضافة ورديات</h3>
            <div className="mt-3 space-y-3">
              <select
                value={addForm.staffId}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, staffId: e.target.value }))
                }
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">-- اختر الموظف --</option>
                {displayStaff.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === "doctor" ? "طبيب" : "فني"})
                  </option>
                ))}
              </select>
              <select
                value={addForm.shiftName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, shiftName: e.target.value }))
                }
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">-- الوردية --</option>
                {shiftOptions.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="flex overflow-hidden rounded-xl border border-border text-sm font-bold">
                {(
                  [
                    ["day", "يوم"],
                    ["week", "أسبوع"],
                    ["month", "شهر"],
                  ] as [Period, string][]
                ).map(([p, lbl]) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAddForm((f) => ({ ...f, period: p }))}
                    className={`flex-1 px-3 py-2 transition-colors ${
                      addForm.period === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {addForm.period !== "month" && (
                <DateInput
                  value={addForm.anchorDate}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      anchorDate: e.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submitAdd}
                  disabled={bulkMut.isPending}
                  className="flex-1 rounded-xl"
                >
                  {bulkMut.isPending ? "جاري الإضافة..." : "إضافة"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAdd(false);
                    setAddForm(EMPTY_ADD);
                  }}
                  className="flex-1 rounded-xl"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </section>
        )}

        {isManager && showHolidayAdd && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-black text-foreground">
              العطلات الرسمية
            </h3>
            {holidays.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {holidays.map((h: any) => (
                  <span
                    key={h.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning"
                  >
                    {arabicDigits(String(h.date).slice(0, 10))}
                    {h.name && <span>· {h.name}</span>}
                    <button
                      type="button"
                      onClick={() => deleteHolidayMut.mutate({ id: h.id })}
                      className="inline-flex items-center justify-center text-warning hover:text-destructive"
                      title="حذف"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <DateInput
                value={holidayForm.date}
                onChange={(e) =>
                  setHolidayForm((f) => ({ ...f, date: e.target.value }))
                }
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                type="text"
                placeholder="الاسم (اختياري)"
                value={holidayForm.name}
                onChange={(e) =>
                  setHolidayForm((f) => ({ ...f, name: e.target.value }))
                }
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!holidayForm.date) {
                    toast.error("اختر تاريخاً");
                    return;
                  }
                  addHolidayMut.mutate({
                    date: holidayForm.date,
                    name: holidayForm.name,
                    year,
                    month,
                  });
                }}
                disabled={addHolidayMut.isPending}
                className="w-full rounded-xl"
              >
                {addHolidayMut.isPending ? "جاري..." : "إضافة"}
              </Button>
            </div>
          </section>
        )}
      </div>

      <div className="mx-auto hidden w-full max-w-none flex-col gap-4 px-4 py-4 md:flex lg:px-6">
        <header className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                الروستر الشهري
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-bold text-muted-foreground">
                {isManager ? "وضع المدير الإداري" : "عرض الموظف"}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-normal text-foreground">
              جدول الروستر الشهري
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {MONTHS_AR[(month || 1) - 1]}{" "}
              {arabicDigits(year || now.getFullYear())}، من{" "}
              {arabicDigits(fromDate)} إلى {arabicDigits(toDate)}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="inline-flex rounded-xl bg-muted p-1">
              {(
                [
                  ["all", "الكل"],
                  ["doctor", "الأطباء"],
                  ["tech", "الفنيين"],
                ] as [StaffFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStaffFilter(value)}
                  className={`min-h-9 rounded-lg px-4 text-sm font-bold transition-colors ${
                    staffFilter === value
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-background/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-bold text-muted-foreground">
                <span>من</span>
                <DateInput
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 w-40 shrink-0 rounded-xl border border-border bg-background px-1 text-center text-xs font-bold text-foreground"
                  inputClassName="w-[118px] min-w-0 px-2 text-center"
                  aria-label="تاريخ بداية الروستر"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-muted-foreground">
                <span>إلى</span>
                <DateInput
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 w-40 shrink-0 rounded-xl border border-border bg-background px-1 text-center text-xs font-bold text-foreground"
                  inputClassName="w-[118px] min-w-0 px-2 text-center"
                  aria-label="تاريخ نهاية الروستر"
                />
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="h-10 gap-1.5 rounded-xl font-bold"
              >
                <Printer size={14} />
                طباعة
              </Button>
            </div>
          </div>
        </header>

        {!isManager && myStaffId === null && !myStaffIdQ.isLoading && (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
            حسابك غير مرتبط بسجل وردية، تواصل مع المدير لربط الحساب.
          </div>
        )}
        {!isManager && myStaffId !== null && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-foreground">
            يمكنك تعديل وردياتك فقط. باقي الجدول للقراءة والمتابعة.
          </div>
        )}

        <div
          className={`roster-desktop-layout grid gap-4 ${
            isSidePanelOpen ? "" : "roster-sidebar-closed"
          }`}
        >
          <section className="roster-calendar-panel min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-6 border-b border-border bg-primary/5">
              {DAYS_AR_CALENDAR.map((dayName) => (
                <div
                  key={dayName}
                  className="px-2 py-3 text-center text-xs font-black text-primary"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {schedQ.isLoading ? (
              <div className="grid grid-cols-2 gap-px bg-border p-px md:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="min-h-[148px] bg-background p-3">
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    <div className="mt-5 space-y-2">
                      <div className="h-5 animate-pulse rounded-full bg-muted" />
                      <div className="h-5 w-2/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayStaff.length === 0 ? (
              <div className="px-4 py-20 text-center text-sm font-semibold text-muted-foreground">
                لا يوجد موظفون. أضف الموظفين أولاً من تبويب الشفتات.
              </div>
            ) : (
              <>
                {attendance.length === 0 && (
                  <div className="border-b border-warning/20 bg-warning/10 px-4 py-3 text-sm font-bold text-warning">
                    لا توجد ورديات لهذا الشهر. استخدم توليد من الدورات أو إضافة
                    ورديات للبدء.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-6">
                  {Array.from({ length: prefixEmpty }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[150px] bg-muted/30"
                    />
                  ))}

                  {activeDates.map((ds) => {
                    const dateObj = new Date(`${ds}T00:00:00`);
                    const isToday = ds === todayStr;
                    const holiday = holidayByDate.get(ds);
                    const dayEntries: Array<{ staff: any; entry: any }> = [];

                    visibleStaff.forEach((s: any) => {
                      const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
                      entries.forEach((entry: any) => {
                        dayEntries.push({ staff: s, entry });
                      });
                    });

                    const entriesByShift = new Map<
                      string,
                      Array<{ staff: any; entry: any }>
                    >();
                    for (const rosterEntry of dayEntries) {
                      const shiftName = rosterEntry.entry.shiftName as string;
                      if (!entriesByShift.has(shiftName)) {
                        entriesByShift.set(shiftName, []);
                      }
                      entriesByShift.get(shiftName)!.push(rosterEntry);
                    }
                    const shiftGroups = Array.from(entriesByShift.entries()).map(
                      ([shiftName, entries]) => {
                        const meta = SHIFT_META[shiftName as ShiftName];
                        return {
                          shiftName,
                          label: meta?.short ?? shiftName,
                          entries,
                          meta,
                        };
                      },
                    );

                    return (
                      <div
                        key={ds}
                        className={`roster-day-card flex min-h-[156px] flex-col bg-card p-3 transition-colors hover:bg-primary/[0.03] ${
                          isToday ? "bg-primary/5 ring-2 ring-inset ring-primary" : ""
                        } ${holiday ? "bg-warning/10" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-lg font-black ${
                                isToday ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {arabicDigits(dateObj.getDate())}
                            </span>
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {MONTHS_AR[dateObj.getMonth()]}
                            </span>
                          </div>
                          {holiday ? (
                            <span
                              className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning"
                              title={holiday.name}
                            >
                              عطلة
                            </span>
                          ) : isToday ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              اليوم
                            </span>
                          ) : null}
                        </div>

                        <div
                          className="mt-3 grid flex-1 gap-2 text-right"
                          style={{
                            gridTemplateColumns: `repeat(${Math.max(shiftGroups.length, 1)}, minmax(0, 1fr))`,
                          }}
                        >
                          {shiftGroups.map(
                            ({ shiftName, label, entries, meta }) => {
                            return (
                              <div
                                key={shiftName}
                                className="min-w-0 space-y-1 border-r border-border/70 pr-2 first:border-r-0 first:pr-0"
                              >
                                <span className="block text-[10px] font-black text-muted-foreground">
                                  {label}
                                </span>
                                <div className="space-y-1">
                                  {entries.map(({ staff, entry }) => {
                                    const isMyRow =
                                      !isManager && myStaffId === staff.id;
                                    const canEdit = isManager || isMyRow;
                                    return (
                                      <div
                                        key={entry.id}
                                        className="roster-shift-pill relative"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            canEdit
                                              ? isManager
                                                ? toggleMut.mutate({
                                                    id: entry.id,
                                                    present: !entry.present,
                                                  })
                                                : toggleMyMut.mutate({
                                                    id: entry.id,
                                                    present: !entry.present,
                                                  })
                                              : undefined
                                          }
                                          disabled={
                                            !canEdit ||
                                            toggleMut.isPending ||
                                            toggleMyMut.isPending
                                          }
                                          className={`block w-full whitespace-normal break-words rounded-lg px-1.5 py-1 text-center text-[10px] font-bold leading-tight transition-colors ${
                                            isMyRow
                                              ? "bg-primary text-primary-foreground"
                                              : entry.present
                                                ? (meta?.tone ??
                                                  SHIFT_META.Morning.tone)
                                                : "border border-border bg-muted text-muted-foreground line-through"
                                          } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                                          title={compactStaffName(staff)}
                                        >
                                          {compactStaffName(staff)}
                                        </button>
                                        {isManager && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteEntryMut.mutate({
                                                id: entry.id,
                                              })
                                            }
                                            disabled={deleteEntryMut.isPending}
                                            className="roster-delete-shift absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground shadow-sm transition-opacity"
                                            title="حذف"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {entries.length === 0 && (
                                    <span className="block rounded-full border border-dashed border-border px-2 py-1 text-center text-[10px] font-bold text-muted-foreground/60">
                                      فارغ
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          },
                          )}
                        </div>

                        {isManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddForm((prev) => ({
                                ...prev,
                                period: "day",
                                anchorDate: ds,
                              }));
                              setShowAdd(true);
                              toast.info(
                                `تم تحديد تاريخ ${ds} في لوحة الإضافة`,
                              );
                            }}
                            className="roster-add-shift mt-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-2 py-1.5 text-[10px] font-bold text-primary transition-[opacity,background-color,border-color] hover:border-primary/45 hover:bg-primary/10"
                          >
                            إضافة وردية
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <aside className="roster-side-panel grid gap-3 md:grid-cols-2 xl:sticky xl:top-4 xl:grid-cols-1 xl:self-start">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setIsSidePanelOpen((open) => !open)}
              className="h-11 w-full rounded-xl border-primary/20 text-primary"
              title={isSidePanelOpen ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
              aria-label={isSidePanelOpen ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
              aria-expanded={isSidePanelOpen}
            >
              {isSidePanelOpen ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
            {isSidePanelOpen && (
              <>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-primary">
                    ملخص الروستر
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {visibleStaff.length} موظف في العرض الحالي
                  </p>
                </div>
                <ShieldCheck className="h-8 w-8 text-primary/70" />
              </div>
              <div className="mt-4 divide-y divide-border border-y border-border">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-bold text-muted-foreground">
                    المجدولون
                  </span>
                  <strong className="text-lg font-black text-foreground">
                    {arabicDigits(scheduledStaff)}
                  </strong>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-bold text-muted-foreground">
                    المؤكدة
                  </span>
                  <strong className="text-lg font-black text-success-text">
                    {arabicDigits(totalPresent)}
                  </strong>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-bold text-muted-foreground">
                    غير مؤكدة
                  </span>
                  <strong className="text-lg font-black text-destructive-text">
                    {arabicDigits(totalAbsent)}
                  </strong>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-bold text-muted-foreground">
                    العطلات
                  </span>
                  <strong className="text-lg font-black text-warning">
                    {arabicDigits(holidays.length)}
                  </strong>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-primary/5 px-3 py-3 text-xs font-bold text-primary">
                {coveredDays} يوم فيه ورديات مغطاة من الفترة المحددة.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground">
                  ورديات اليوم
                </h3>
                <Clock3 className="h-4 w-4 text-muted-foreground" />
              </div>
              {todayEntries.length > 0 ? (
                <div className="space-y-2">
                  {todayEntries.map(({ staff, entry }) => {
                    const meta =
                      SHIFT_META[entry.shiftName as ShiftName] ??
                      SHIFT_META.Morning;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-xs font-bold text-foreground">
                          {compactStaffName(staff)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs font-semibold text-muted-foreground">
                  لا توجد ورديات ظاهرة لليوم.
                </p>
              )}
            </div>

            {isManager ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-black text-foreground">
                    إجراءات الروستر
                  </h3>
                  <div className="mt-3 grid gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateMut.mutate({ year, month })}
                      disabled={generateMut.isPending}
                      className="justify-start gap-2 rounded-xl font-bold"
                    >
                      <RefreshCw
                        size={14}
                        className={generateMut.isPending ? "animate-spin" : ""}
                      />
                      توليد من الدورات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAdd((v) => !v)}
                      className="justify-start gap-2 rounded-xl font-bold"
                    >
                      <Plus size={14} />
                      إضافة ورديات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowHolidayAdd((v) => !v)}
                      className="justify-start gap-2 rounded-xl font-bold"
                    >
                      <Star size={14} />
                      العطلات الرسمية
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearRoster}
                      disabled={
                        clearRosterMut.isPending || attendance.length === 0
                      }
                      className="justify-start gap-2 rounded-xl border-destructive/25 font-bold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                      مسح الروستر
                    </Button>
                  </div>
                </div>

                {showAdd && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-black text-foreground">
                      إضافة ورديات
                    </h3>
                    <div className="mt-3 space-y-3">
                      <select
                        value={addForm.staffId}
                        onChange={(e) =>
                          setAddForm((f) => ({ ...f, staffId: e.target.value }))
                        }
                        className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">-- اختر الموظف --</option>
                        {displayStaff.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.type === "doctor" ? "طبيب" : "فني"})
                          </option>
                        ))}
                      </select>
                      <select
                        value={addForm.shiftName}
                        onChange={(e) =>
                          setAddForm((f) => ({
                            ...f,
                            shiftName: e.target.value,
                          }))
                        }
                        className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">-- الوردية --</option>
                        {shiftOptions.map((opt) => (
                          <option key={opt.name} value={opt.name}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex overflow-hidden rounded-xl border border-border text-sm font-bold">
                        {(
                          [
                            ["day", "يوم"],
                            ["week", "أسبوع"],
                            ["month", "شهر"],
                          ] as [Period, string][]
                        ).map(([p, lbl]) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setAddForm((f) => ({ ...f, period: p }))
                            }
                            className={`flex-1 px-3 py-2 transition-colors ${
                              addForm.period === p
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground hover:bg-muted"
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                      {addForm.period !== "month" && (
                        <DateInput
                          value={addForm.anchorDate}
                          onChange={(e) =>
                            setAddForm((f) => ({
                              ...f,
                              anchorDate: e.target.value,
                            }))
                          }
                          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={submitAdd}
                          disabled={bulkMut.isPending}
                          className="flex-1 rounded-xl"
                        >
                          {bulkMut.isPending ? "جاري الإضافة..." : "إضافة"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAdd(false);
                            setAddForm(EMPTY_ADD);
                          }}
                          className="flex-1 rounded-xl"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {showHolidayAdd && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-black text-foreground">
                      العطلات الرسمية - {fromDate.slice(0, 7)}
                    </h3>
                    {holidays.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {holidays.map((h: any) => (
                          <span
                            key={h.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning"
                          >
                            {arabicDigits(String(h.date).slice(0, 10))}
                            {h.name && <span>· {h.name}</span>}
                            <button
                              type="button"
                              onClick={() =>
                                deleteHolidayMut.mutate({ id: h.id })
                              }
                              className="inline-flex items-center justify-center text-warning hover:text-destructive"
                              title="حذف"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-muted-foreground">
                        لا توجد عطلات رسمية لهذا الشهر.
                      </p>
                    )}
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="flex flex-col gap-3">
                        <DateInput
                          value={holidayForm.date}
                          onChange={(e) =>
                            setHolidayForm((f) => ({
                              ...f,
                              date: e.target.value,
                            }))
                          }
                          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <input
                          type="text"
                          placeholder="الاسم (اختياري)"
                          value={holidayForm.name}
                          onChange={(e) =>
                            setHolidayForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!holidayForm.date) {
                              toast.error("اختر تاريخاً");
                              return;
                            }
                            addHolidayMut.mutate({
                              date: holidayForm.date,
                              name: holidayForm.name,
                              year,
                              month,
                            });
                          }}
                          disabled={addHolidayMut.isPending}
                          className="rounded-xl"
                        >
                          {addHolidayMut.isPending ? "جاري..." : "إضافة"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-black text-foreground">
                  ماذا تستطيع هنا
                </h3>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-muted-foreground">
                  <li>قراءة شهر الروستر بالكامل.</li>
                  <li>إضافة وردياتك فقط عندما تكون الخانة متاحة.</li>
                  <li>
                    الضغط على خانة موجودة لتبديل الحالة عندما يكون ذلك مسموحاً.
                  </li>
                </ul>
                {myStaffId !== null && (
                  <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-3 text-sm font-bold text-foreground">
                    لديك {arabicDigits(myScheduledDays)} يوم مجدول هذا الشهر.
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-black text-foreground">
                أقرب ورديات
              </h3>
              {nextEntries.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {nextEntries.map(({ ds, staff, entry }) => {
                    const meta =
                      SHIFT_META[entry.shiftName as ShiftName] ??
                      SHIFT_META.Morning;
                    return (
                      <div
                        key={`${entry.id}-${ds}`}
                        className="rounded-xl border border-border px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs font-bold text-foreground">
                            {compactStaffName(staff)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${meta.tone}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          {arabicDigits(ds)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs font-semibold text-muted-foreground">
                  لا توجد ورديات في العرض الحالي.
                </p>
              )}
            </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
    );
  }
