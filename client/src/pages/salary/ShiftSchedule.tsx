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
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const now = new Date();
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function monthDates(y: number, m: number) {
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
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
    .map((c) => `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`);
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

const EMPTY_ADD: AddForm = { staffId: "", shiftName: "", period: "day", anchorDate: "" };

interface HolidayForm {
  date: string;
  name: string;
}

const EMPTY_HOLIDAY: HolidayForm = { date: "", name: "" };

const SHIFT_META: Record<ShiftName, { label: string; short: string; tone: string; printClass: string }> = {
  Morning: {
    label: "صباح",
    short: "ص",
    tone: "bg-orange-500/10 text-orange-700 ring-1 ring-inset ring-orange-500/20 hover:bg-orange-500/15",
    printClass: "shift-m",
  },
  Night: {
    label: "مساء",
    short: "م",
    tone: "bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/20 hover:bg-blue-500/15",
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

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [showHolidayAdd, setShowHolidayAdd] = useState(false);
  const [holidayForm, setHolidayForm] = useState<HolidayForm>(EMPTY_HOLIDAY);

  const schedQ = isManager
    ? (trpc as any).salary.getShiftSchedule.useQuery({ year, month })
    : (trpc as any).salary.getShiftScheduleForStaff.useQuery({ year, month });
  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery(
    { year, month },
    { enabled: isManager },
  );
  const myStaffIdQ = (trpc as any).salary.getMyShiftStaffId.useQuery(undefined, {
    enabled: !isManager,
  });
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
  const holidayDates = new Set<string>(holidays.map((h: any) => String(h.date).slice(0, 10)));

  const attendMap = new Map<string, any[]>();
  for (const row of attendance) {
    const key = `${row.staffId}_${toDateKey(row.workDate)}`;
    if (!attendMap.has(key)) attendMap.set(key, []);
    attendMap.get(key)!.push(row);
  }

  const allDates = monthDates(year, month).filter(
    (ds) => new Date(`${ds}T00:00:00`).getDay() !== 5,
  );
  const monthMin = `${year}-${pad(month)}-01`;
  const monthMax = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;

  const totalEntries = attendance.length;
  const totalPresent = attendance.filter((row: any) => row.present).length;
  const totalAbsent = totalEntries - totalPresent;
  const scheduledStaff = new Set(attendance.map((row: any) => row.staffId)).size;
  const coveredDays = new Set(attendance.map((row: any) => toDateKey(row.workDate))).size;
  const myEntries = myStaffId ? attendance.filter((row: any) => row.staffId === myStaffId) : [];
  const myScheduledDays = new Set(myEntries.map((row: any) => toDateKey(row.workDate))).size;

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
    bulkMut.mutate({ staffId: parseInt(addForm.staffId), shiftName: addForm.shiftName, dates });
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
          const holLabel = holiday ? '<div style="font-size:7px;color:#b45309;">عطلة</div>' : "";
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
                    const meta = SHIFT_META[e.shiftName as ShiftName] ?? SHIFT_META.Morning;
                    return `<span class="${meta.printClass}">${e.present ? meta.short : `(${meta.short})`}</span>`;
                  })
                  .join("") || (holiday ? '<span style="color:#b45309;font-size:7px;">عطلة</span>' : "");
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
      <h1>روستر شهر ${MONTHS_AR[month - 1]} ${year}</h1>
      ${halves.map((half) => buildTable(half)).join("")}
    </body></html>`;

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

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-border bg-background px-4 py-4 shadow-none sm:px-5 sm:py-5">
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                    <CalendarDays className="h-3.5 w-3.5" />
                    الروستر الشهري
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold text-foreground">
                    {isManager ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                        وضع المدير
                      </>
                    ) : (
                      <>
                        <Users className="h-3.5 w-3.5 text-secondary" />
                        عرض الموظف
                      </>
                    )}
                  </span>
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    روستر شهر {MONTHS_AR[month - 1]} {year}
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    جدول عملي للشهر، يبيّن الورديات والعطلات والحضور في قراءة واحدة، مع تحكم مباشر للمدير وواجهة خفيفة للموظف.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {MONTHS_AR.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {isManager && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateMut.mutate({ year, month })}
                      disabled={generateMut.isPending}
                      className="gap-1.5"
                    >
                      <RefreshCw size={14} className={generateMut.isPending ? "animate-spin" : ""} />
                      توليد من الدورات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAdd((v) => !v)}
                      className="gap-1.5"
                    >
                      <Plus size={14} />
                      إضافة ورديات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowHolidayAdd((v) => !v)}
                      className="gap-1.5"
                    >
                      <Star size={14} />
                      العطلات الرسمية
                    </Button>
                  </>
                )}
                <Button size="sm" variant="default" onClick={handlePrint} className="gap-1.5">
                  <Printer size={14} />
                  طباعة
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Clock3 className="h-4 w-4" />
                  حالة العرض
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">
                  {isManager ? "إدارة الشهر من لوحة واحدة" : "عرض الموظف مع صلاحية التعديل على الخانة الخاصة"}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {isManager
                    ? "التوليد، التعديل، الحذف، والعطلات كلها من نفس الصفحة."
                    : "الأعضاء الآخرون للقراءة فقط، والخانة الخاصة بك تظهر أزرار الإضافة عند الحاجة."}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <div className="text-xs font-semibold text-muted-foreground">الموظفون المجدولون</div>
                <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{scheduledStaff}</div>
                <div className="mt-1 text-xs text-muted-foreground">من أصل {displayStaff.length} ظاهرين في الجدول</div>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <div className="text-xs font-semibold text-muted-foreground">الخانات المؤكدة</div>
                <div className="mt-2 text-2xl font-bold tabular-nums text-success">{totalPresent}</div>
                <div className="mt-1 text-xs text-muted-foreground">مقابل {totalAbsent} غير مؤكدة أو محذوفة</div>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <div className="text-xs font-semibold text-muted-foreground">العطلات</div>
                <div className="mt-2 text-2xl font-bold tabular-nums text-warning">{holidays.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">{coveredDays} يوم فيه ورديات خلال الشهر</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">لوحة الشهر</p>
              <h3 className="text-lg font-semibold text-foreground">الجدول العملي</h3>
            </div>
            <div className="text-xs text-muted-foreground">
              {attendance.length > 0 ? `${attendance.length} خانة وردية` : "لا توجد ورديات بعد"}
            </div>
          </div>

          {schedQ.isLoading ? (
            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background px-4 py-14 text-center text-sm text-muted-foreground">
              لا يوجد موظفون. أضف الموظفين أولاً من تبويب الشفتات.
            </div>
          ) : (
            <>
              {attendance.length === 0 && (
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  لا توجد ورديات لهذا الشهر. استخدم <strong>توليد من الدورات</strong> أو <strong>إضافة ورديات</strong> للبدء.
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup>
                      <col style={{ width: 140 }} />
                      {allDates.map((ds) => (
                        <col key={ds} style={{ width: `${100 / Math.max(allDates.length, 1)}%` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="sticky right-0 top-0 z-30 border-l border-border bg-muted/60 px-3 py-3 text-right">
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-muted-foreground">الاسم</div>
                            <div className="text-[10px] text-muted-foreground">التاريخ / الخانة</div>
                          </div>
                        </th>
                        {allDates.map((ds) => {
                          const dow = new Date(`${ds}T00:00:00`).getDay();
                          const holiday = holidayByDate.get(ds);
                          return (
                            <th
                              key={ds}
                              className={`sticky top-0 z-20 border-l border-border px-0 py-0 text-center ${holiday ? "bg-amber-50/80" : "bg-background"}`}
                              title={holiday?.name || undefined}
                            >
                              <div className="flex h-full min-h-14 flex-col justify-center px-1.5 py-1.5">
                                <div className={`text-[10px] font-semibold leading-tight ${holiday ? "text-amber-700" : "text-foreground"}`}>
                                  {DAYS_AR[dow]}
                                </div>
                                <div className={`text-[10px] tabular-nums ${holiday ? "text-amber-600" : "text-muted-foreground"}`}>
                                  {fmtDate(ds)}
                                </div>
                                {holiday && (
                                  <div className="mt-1 inline-flex items-center justify-center rounded-full bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                    عطلة
                                  </div>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {displayStaff.map((s: any, idx: number) => (
                        <tr key={s.id} className={`border-b border-border/60 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                          <td className="sticky right-0 z-20 border-l border-border bg-inherit px-3 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">{s.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {s.type === "doctor" ? "طبيب" : "فني"}
                                </div>
                              </div>
                            </div>
                          </td>
                          {allDates.map((ds) => {
                            const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
                            const isMyRow = !isManager && myStaffId === s.id;
                            const canEdit = isManager || isMyRow;
                            const isHoliday = holidayDates.has(ds);
                            const rowClasses = isHoliday ? "bg-amber-50/40" : "";

                            return (
                              <td key={ds} className={`border-l border-border/60 px-1.5 py-2 align-top ${rowClasses}`}>
                                <div className="flex min-h-10 flex-col items-center gap-1">
                                  {entries.map((e: any) => {
                                    const meta = SHIFT_META[e.shiftName as ShiftName] ?? SHIFT_META.Morning;
                                    return (
                                      <div key={e.id} className="relative w-full">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            canEdit
                                              ? isManager
                                                ? toggleMut.mutate({ id: e.id, present: !e.present })
                                                : toggleMyMut.mutate({ id: e.id, present: !e.present })
                                              : undefined
                                          }
                                          disabled={!canEdit || toggleMut.isPending || toggleMyMut.isPending}
                                          title={
                                            canEdit
                                              ? e.present
                                                ? "انقر لتغيير الحضور"
                                                : "انقر لتسجيل الحضور"
                                              : undefined
                                          }
                                          className={`inline-flex min-h-8 w-full items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                                            e.present ? meta.tone : "bg-muted text-muted-foreground line-through"
                                          } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                                        >
                                          {meta.short}
                                        </button>
                                        {isManager && (
                                          <button
                                            type="button"
                                            onClick={() => deleteEntryMut.mutate({ id: e.id })}
                                            disabled={deleteEntryMut.isPending}
                                            title="حذف الوردية"
                                            className="absolute -top-2 -left-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90"
                                          >
                                            <X size={10} strokeWidth={2.5} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {isHoliday && entries.length === 0 && (
                                    <span className="text-[9px] font-semibold text-amber-700">عطلة</span>
                                  )}

                                  {isMyRow && entries.length === 0 && !isHoliday && (
                                    <div className="flex w-full gap-1">
                                      {(["Morning", "Night"] as ShiftName[]).map((shiftName) => (
                                        <button
                                          key={shiftName}
                                          type="button"
                                          onClick={() =>
                                            addMyShiftMut.mutate({
                                              year,
                                              month,
                                              workDate: ds,
                                              shiftName,
                                            })
                                          }
                                          disabled={addMyShiftMut.isPending}
                                          className="inline-flex min-h-8 flex-1 items-center justify-center rounded-md bg-muted px-1.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                          title={SHIFT_META[shiftName].label}
                                        >
                                          +{SHIFT_META[shiftName].short}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          {isManager ? (
            <>
              {showAdd && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold text-foreground">إضافة ورديات</h3>
                  <div className="mt-3 space-y-3">
                    <select
                      value={addForm.staffId}
                      onChange={(e) => setAddForm((f) => ({ ...f, staffId: e.target.value }))}
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
                      onChange={(e) => setAddForm((f) => ({ ...f, shiftName: e.target.value }))}
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
                          onClick={() => setAddForm((f) => ({ ...f, period: p }))}
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
                      <input
                        type="date"
                        value={addForm.anchorDate}
                        min={monthMin}
                        max={monthMax}
                        onChange={(e) => setAddForm((f) => ({ ...f, anchorDate: e.target.value }))}
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
                    العطلات الرسمية - {MONTHS_AR[month - 1]} {year}
                  </h3>
                  {holidays.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {holidays.map((h: any) => (
                        <span
                          key={h.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                        >
                          {String(h.date).slice(0, 10)}
                          {h.name && <span>· {h.name}</span>}
                          <button
                            type="button"
                            onClick={() => deleteHolidayMut.mutate({ id: h.id })}
                            className="inline-flex items-center justify-center text-amber-700 hover:text-destructive"
                            title="حذف"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">لا توجد عطلات رسمية لهذا الشهر.</p>
                  )}
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex flex-col gap-3">
                      <input
                        type="date"
                        value={holidayForm.date}
                        min={monthMin}
                        max={monthMax}
                        onChange={(e) => setHolidayForm((f) => ({ ...f, date: e.target.value }))}
                        className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="text"
                        placeholder="الاسم (اختياري)"
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))}
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
              <h3 className="text-sm font-semibold text-foreground">ماذا تستطيع هنا</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• قراءة شهر الروستر بالكامل.</li>
                <li>• إضافة وردياتك فقط في خانتك عندما تكون فارغة.</li>
                <li>• الضغط على خانة موجودة لتبديل الحالة عندما يكون ذلك مسموحاً.</li>
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
