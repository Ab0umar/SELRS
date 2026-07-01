import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock3,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  Users,
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
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 8px; color: #000; direction: rtl; }
  h1 { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; }
  th { background: #f3f4f6; font-weight: 700; font-size: 7.5px; }
  .day-col { font-weight: 700; white-space: nowrap; text-align: right; }
  .fri-row td { background: #f8f8f8; color: #a3a3a3; }
  .shift-m { color: #b45309; }
  .shift-n { color: #1d4ed8; }
  .diag-cell { position: relative; min-width: 70px; height: 36px; }
`;

export default function ShiftSchedule() {
  const { user } = useAuth();
  const isManager = ["admin", "manager"].includes(user?.role ?? "");

  const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [fromDate, setFromDate] = useState(`${isoMonth}-01`);
  const [toDate, setToDate] = useState((() => {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${isoMonth}-${String(last.getDate()).padStart(2, "0")}`;
  })());
  const [year, month] = fromDate.split("-").map(Number);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [showHolidayAdd, setShowHolidayAdd] = useState(false);
  const [holidayForm, setHolidayForm] = useState<HolidayForm>(EMPTY_HOLIDAY);

  const schedQ = isManager
    ? (trpc as any).salary.getShiftSchedule.useQuery({ year, month })
    : (trpc as any).salary.getShiftScheduleForStaff.useQuery({ year, month });
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

  const allDates = monthDates(year, month).filter((ds) => {
    const dow = new Date(`${ds}T00:00:00`).getDay();
    if (dow === 5) return false;
    if (fromDate && ds < fromDate) return false;
    if (toDate && ds > toDate) return false;
    return true;
  });
  const monthMin = `${year}-${pad(month)}-01`;
  const monthMax = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;

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
    const mid = Math.ceil(allDates.length / 2);
    const halves = [allDates.slice(0, mid), allDates.slice(mid)];

    function buildTable(dates: string[]) {
      const cols = dates
        .map((ds) => {
          const dow = new Date(`${ds}T00:00:00`).getDay();
          const holiday = holidayByDate.get(ds);
          const holStyle = holiday ? ' style="background:#fffbeb;"' : "";
          const holLabel = holiday
            ? '<div style="font-size:7px;color:#b45309;">عطلة</div>'
            : "";
          return `<th${holStyle}><div style="font-weight:700">${DAYS_AR[dow]}</div><div style="color:#555">${fmtDate(ds)}</div>${holLabel}</th>`;
        })
        .join("");
      const rows = displayStaff
        .map((s: any) => {
          const cells = dates
            .map((ds) => {
              const holiday = holidayByDate.get(ds);
              const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
              const text =
                entries
                  .map((e: any) => {
                    const meta =
                      SHIFT_META[e.shiftName as ShiftName] ??
                      SHIFT_META.Morning;
                    return `<span class="${meta.printClass}">${e.present ? meta.short : `(${meta.short})`}</span>`;
                  })
                  .join("") ||
                (holiday
                  ? '<span style="color:#b45309;font-size:7px;">عطلة</span>'
                  : "");
              return `<td${holiday ? ' style="background:#fffbeb;"' : ""}>${text}</td>`;
            })
            .join("");
          return `<tr><td class="day-col">${s.name}</td>${cells}</tr>`;
        })
        .join("");
      return `<table>
        <thead><tr>
          <th style="position:relative;min-width:80px;height:40px;">
            <svg style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="#000" stroke-width="1"/>
            </svg>
            <span style="position:absolute;top:2px;left:4px;font-size:7px;">التاريخ</span>
            <span style="position:absolute;bottom:2px;right:4px;font-size:7px;">الاسم</span>
          </th>${cols}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
      <style>${PRINT_CSS} table{margin-bottom:14px}</style></head><body>
      <h1>روستر شهر ${fromDate.slice(0, 7)}</h1>
      ${halves.map((half) => buildTable(half)).join("")}
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
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

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── Page Header ── */}
      <div className="pb-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-150 bg-indigo-50/50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              <CalendarDays className="h-3.5 w-3.5" />
              الروستر الشهري
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
              {isManager ? "وضع المدير الإداري" : "عرض الموظف"}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900">
            جدول ورديات شهر {fromDate.slice(0, 7)}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateInput
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-1 py-1.5 w-28 text-center text-xs text-slate-800 font-mono font-bold focus:border-teal-500 transition-all outline-none"
          />
          <span className="text-xs text-slate-400 font-bold">—</span>
          <DateInput
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-1 py-1.5 w-28 text-center text-xs text-slate-800 font-mono font-bold focus:border-teal-500 transition-all outline-none"
          />
          {isManager && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMut.mutate({ year, month })}
                disabled={generateMut.isPending}
                className="gap-1.5 text-[10px] font-bold h-8 border-slate-250 hover:bg-slate-50 text-slate-800 rounded-lg shadow-sm"
              >
                <RefreshCw
                  size={12}
                  className={generateMut.isPending ? "animate-spin" : ""}
                />
                توليد من الدورات
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAdd((v) => !v)}
                className="gap-1.5 text-[10px] font-bold h-8 border-slate-250 hover:bg-slate-50 text-slate-800 rounded-lg shadow-sm"
              >
                <Plus size={12} />
                إضافة ورديات
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHolidayAdd((v) => !v)}
                className="gap-1.5 text-[10px] font-bold h-8 border-slate-250 hover:bg-slate-50 text-slate-800 rounded-lg shadow-sm"
              >
                <Star size={12} />
                العطلات الرسمية
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearRoster}
                disabled={
                  clearRosterMut.isPending || attendance.length === 0
                }
                className="gap-1.5 text-[10px] font-bold h-8 border-rose-250 text-rose-700 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 size={12} />
                مسح الروستر
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="default"
            onClick={handlePrint}
            className="gap-1.5 text-[10px] font-bold h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
          >
            <Printer size={12} />
            طباعة
          </Button>
        </div>
      </div>

      {/* ── Bento Stats Grid Row ── */}
      <div className="grid gap-4 md:grid-cols-4">
        
        {/* Box 1: View status (Indigo Theme) */}
        <div className="p-5 bg-[#EEF2FF] border border-indigo-150 rounded-3xl space-y-2 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-800">
            <Clock3 className="h-4 w-4" />
            <span>صلاحية العرض</span>
          </div>
          <span className="font-bold text-indigo-950 text-xs block mt-2">
            {isManager ? "إدارة الشهر من لوحة واحدة" : "صلاحية التعديل للخانة الشخصية"}
          </span>
        </div>

        {/* Box 2: Scheduled count (Sky Theme) */}
        <div className="p-5 bg-[#F0F9FF] border border-sky-150 rounded-3xl space-y-1.5 hover:scale-[1.01] transition-transform duration-200">
          <span className="text-[10px] text-sky-850 font-bold block">الموظفون المجدولون</span>
          <span className="text-2xl font-black font-mono text-sky-950 block leading-none">{scheduledStaff}</span>
          <span className="text-[9px] text-sky-700 font-semibold block">من أصل {displayStaff.length} ظاهرين</span>
        </div>

        {/* Box 3: Confirmed slots (Mint Theme) */}
        <div className="p-5 bg-[#ECFDF5] border border-emerald-150 rounded-3xl space-y-1.5 hover:scale-[1.01] transition-transform duration-200">
          <span className="text-[10px] text-emerald-850 font-bold block">الخانات المؤكدة</span>
          <span className="text-2xl font-black font-mono text-emerald-950 block leading-none">{totalPresent}</span>
          <span className="text-[9px] text-emerald-700 font-semibold block">مقابل {totalAbsent} غير مؤكدة</span>
        </div>

        {/* Box 4: Holidays (Rose Theme) */}
        <div className="p-5 bg-[#FEF2F2] border border-rose-150 rounded-3xl space-y-1.5 hover:scale-[1.01] transition-transform duration-200">
          <span className="text-[10px] text-rose-850 font-bold block">أيام العطلات الرسمية</span>
          <span className="text-2xl font-black font-mono text-rose-950 block leading-none">{holidays.length}</span>
          <span className="text-[9px] text-rose-700 font-semibold block">{coveredDays} يوم فيه ورديات مغطاة</span>
        </div>

      </div>

      {!isManager && myStaffId === null && !myStaffIdQ.isLoading && (
        <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          حسابك غير مرتبط بسجل وردية، تواصل مع المدير لربط الحساب.
        </div>
      )}
      {!isManager && myStaffId !== null && (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground">
          مرّر على خانتك لإضافة وردية. باقي الجدول للقراءة فقط.
        </div>
      )}

      <div className="space-y-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                لوحة الشهر
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                الجدول العملي
              </h3>
            </div>
          </div>

          {schedQ.isLoading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : displayStaff.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">
              لا يوجد موظفون. أضف الموظفين أولاً من تبويب الشفتات.
            </div>
          ) : (
            <>
              {attendance.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/20 px-4 py-3 text-sm text-amber-700 font-bold mb-4">
                  لا توجد ورديات لهذا الشهر. استخدم <strong>توليد من الدورات</strong> أو <strong>إضافة ورديات</strong> للبدء.
                </div>
              )}

              {/* ── 3. Bento Calendar Board ── */}
              {(() => {
                const activeDates = allDates.filter((ds) => new Date(`${ds}T00:00:00`).getDay() !== 5);
                const firstActiveDate = activeDates[0];
                const prefixEmpty = firstActiveDate ? getSixDayIndex(new Date(`${firstActiveDate}T00:00:00`).getDay()) : 0;

                return (
                  <div className="space-y-4">
                    {/* Weekday Column Headers */}
                    <div className="grid grid-cols-6 gap-1.5 text-center text-[10px] font-black text-slate-500">
                      {DAYS_AR_CALENDAR.map((dayName) => (
                        <div key={dayName} className="py-2 bg-slate-100 rounded-xl border border-slate-200 shadow-sm">
                          {dayName}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days Grid */}
                    <div className="grid grid-cols-6 gap-1.5">
                      {/* Empty cell placeholders to align first day to its weekday starting Saturday */}
                      {Array.from({ length: prefixEmpty }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="bg-slate-50/40 border border-dashed border-slate-200 rounded-xl min-h-[90px] h-full" />
                      ))}

                      {/* Actual date cards */}
                      {activeDates.map((ds) => {
                    const dateObj = new Date(`${ds}T00:00:00`);
                    const isToday = ds === todayStr;
                    const holiday = holidayByDate.get(ds);

                    // Collect all entries for this date
                    const dayEntries: Array<{ staff: any; entry: any }> = [];
                    displayStaff.forEach((s: any) => {
                      const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
                      entries.forEach((e: any) => {
                        dayEntries.push({ staff: s, entry: e });
                      });
                    });

                    const morningEntries = dayEntries.filter((x) => x.entry.shiftName === "Morning");
                    const nightEntries = dayEntries.filter((x) => x.entry.shiftName === "Night");

                    return (
                      <div
                        key={ds}
                        className={`p-1.5 bg-white border rounded-xl flex flex-col justify-start gap-1 min-h-[90px] transition-all hover:shadow-md hover:scale-[1.01] ${
                          isToday
                            ? "ring-2 ring-indigo-500 bg-indigo-50/10 border-indigo-200"
                            : holiday
                              ? "bg-amber-50/20 border-amber-200"
                              : "border-slate-200"
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1 leading-none">
                              <span className={`text-sm font-black ${isToday ? "text-indigo-700" : "text-slate-800"}`}>
                                {dateObj.getDate()}
                              </span>
                              <span className="text-[8px] text-slate-450 font-bold">
                                {MONTHS_AR[dateObj.getMonth()]}
                              </span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono mt-1 font-semibold leading-none">
                              {ds}
                            </span>
                          </div>
                          {holiday ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-bold" title={holiday.name}>
                              عطلة
                            </span>
                          ) : isToday ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                          ) : null}
                        </div>

                        {/* Shifts List (Morning & Evening side-by-side) */}
                        <div className="grid grid-cols-2 gap-1 my-0.5 flex-grow text-right">
                          
                          {/* ☀️ Morning Shift section */}
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-bold text-sky-600 block">☀️ الصباحية</span>
                            <div className="flex flex-col gap-0.5">
                              {morningEntries.map(({ staff, entry }) => {
                                const isMyRow = !isManager && myStaffId === staff.id;
                                const canEdit = isManager || isMyRow;
                                return (
                                  <div key={entry.id} className="relative group/pill w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        canEdit
                                          ? isManager
                                            ? toggleMut.mutate({ id: entry.id, present: !entry.present })
                                            : toggleMyMut.mutate({ id: entry.id, present: !entry.present })
                                          : undefined
                                      }
                                      disabled={!canEdit || toggleMut.isPending || toggleMyMut.isPending}
                                      className={`py-0.5 px-1 rounded text-[8px] font-bold transition-all w-fit mx-auto block ${
                                        isMyRow
                                          ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-300 border border-indigo-500"
                                          : entry.present
                                            ? "bg-sky-50 text-sky-850 border border-sky-200"
                                            : "bg-slate-100 text-slate-450 line-through border border-slate-200"
                                      }`}
                                    >
                                      {staff.type === "doctor" ? `د. ${staff.name.split(" ").slice(0, 2).join(" ")}` : staff.name.split(" ").slice(0, 2).join(" ")}
                                    </button>
                                    {isManager && (
                                      <button
                                        type="button"
                                        onClick={() => deleteEntryMut.mutate({ id: entry.id })}
                                        disabled={deleteEntryMut.isPending}
                                        className="absolute -top-1.5 -left-1 hidden group-hover/pill:flex h-3 w-3 items-center justify-center rounded-full bg-rose-600 text-[6px] text-white shadow"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {morningEntries.length === 0 && (
                                <span className="text-[8px] text-slate-300 block font-medium">—</span>
                              )}
                            </div>
                          </div>

                          {/* 🌙 Night/Evening Shift section */}
                          <div className="space-y-0.5 border-r border-slate-100 pr-1">
                            <span className="text-[8px] font-bold text-indigo-600 block">🌙 المسائية</span>
                            <div className="flex flex-col gap-0.5">
                              {nightEntries.map(({ staff, entry }) => {
                                const isMyRow = !isManager && myStaffId === staff.id;
                                const canEdit = isManager || isMyRow;
                                return (
                                  <div key={entry.id} className="relative group/pill w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        canEdit
                                          ? isManager
                                            ? toggleMut.mutate({ id: entry.id, present: !entry.present })
                                            : toggleMyMut.mutate({ id: entry.id, present: !entry.present })
                                          : undefined
                                      }
                                      disabled={!canEdit || toggleMut.isPending || toggleMyMut.isPending}
                                      className={`py-0.5 px-1 rounded text-[8px] font-bold transition-all w-fit mx-auto block ${
                                        isMyRow
                                          ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-300 border border-indigo-500"
                                          : entry.present
                                            ? "bg-indigo-50 text-indigo-850 border border-indigo-200"
                                            : "bg-slate-100 text-slate-455 line-through border border-slate-200"
                                      }`}
                                    >
                                      {staff.type === "doctor" ? `د. ${staff.name.split(" ").slice(0, 2).join(" ")}` : staff.name.split(" ").slice(0, 2).join(" ")}
                                    </button>
                                    {isManager && (
                                      <button
                                        type="button"
                                        onClick={() => deleteEntryMut.mutate({ id: entry.id })}
                                        disabled={deleteEntryMut.isPending}
                                        className="absolute -top-1.5 -left-1 hidden group-hover/pill:flex h-3 w-3 items-center justify-center rounded-full bg-rose-600 text-[6px] text-white shadow"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {nightEntries.length === 0 && (
                                <span className="text-[8px] text-slate-300 block font-medium">—</span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Quick Trigger Add Action for Managers */}
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddForm((prev) => ({
                                ...prev,
                                dateFrom: ds,
                                dateTo: ds,
                              }));
                              setShowAdd(true);
                              toast.info(`تم تحديد تاريخ ${ds} في لوحة الإضافة`);
                            }}
                            className="w-full mt-0.5 py-0.5 rounded bg-slate-50 border border-dashed border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-[8px] font-bold text-slate-400 transition-all text-center"
                          >
                            + إضافة وردية
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
          )}
        </section>

        <aside className="space-y-4">
          {isManager ? (
            <>
              {showAdd && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    إضافة ورديات
                  </h3>
                  <div className="mt-3 space-y-3">
                    <select
                      value={addForm.staffId}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, staffId: e.target.value }))
                      }
                      className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                      className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">-- الوردية --</option>
                      <option value="Morning">صباح</option>
                      <option value="Night">مساء</option>
                    </select>
                    <div className="flex overflow-hidden rounded-md border border-border text-sm">
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
                        min={monthMin}
                        max={monthMax}
                        onChange={(e) =>
                          setAddForm((f) => ({
                            ...f,
                            anchorDate: e.target.value,
                          }))
                        }
                        className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={submitAdd}
                        disabled={bulkMut.isPending}
                        className="flex-1"
                      >
                        {bulkMut.isPending ? "جاري الإضافة…" : "إضافة"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAdd(false);
                          setAddForm(EMPTY_ADD);
                        }}
                        className="flex-1"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showHolidayAdd && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    العطلات الرسمية - {fromDate.slice(0, 7)}
                  </h3>
                  {holidays.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {holidays.map((h: any) => (
                        <span
                          key={h.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"
                        >
                          {String(h.date).slice(0, 10)}
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
                    <p className="mt-3 text-xs text-muted-foreground">
                      لا توجد عطلات رسمية لهذا الشهر.
                    </p>
                  )}
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex flex-col gap-3">
                      <DateInput
                        value={holidayForm.date}
                        min={monthMin}
                        max={monthMax}
                        onChange={(e) =>
                          setHolidayForm((f) => ({
                            ...f,
                            date: e.target.value,
                          }))
                        }
                        className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                        className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                      >
                        {addHolidayMut.isPending ? "جاري…" : "إضافة"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                ماذا تستطيع هنا
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• قراءة شهر الروستر بالكامل.</li>
                <li>• إضافة وردياتك فقط في خانتك عندما تكون فارغة.</li>
                <li>
                  • الضغط على خانة موجودة لتبديل الحالة عندما يكون ذلك مسموحاً.
                </li>
              </ul>
              {myStaffId !== null && (
                <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-3 text-sm text-foreground">
                  لديك {myScheduledDays} يوم مجدول هذا الشهر.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
