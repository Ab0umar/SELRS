import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Calendar,
  Clock,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Hourglass,
  AlertCircle,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";

const todayStr = new Date().toISOString().split("T")[0];
const DAYS_FULL = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function fmt(min: number): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

export default function MyAttendanceProfile({
  embeddedInHub = false,
}: { embeddedInHub?: boolean } = {}) {
  const [permForm, setPermForm] = useState({
    date: todayStr,
    type: "out" as "in" | "out",
    durationMinutes: 60,
    note: "",
  });
  const [leaveForm, setLeaveForm] = useState({
    dateFrom: todayStr,
    dateTo: todayStr,
    type: "annual" as "annual" | "sick",
    note: "",
  });
  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);

  const profileQuery = (trpc as any).attendance.myAttendanceProfile.useQuery();
  const data = profileQuery.data;
  const entryPermissionSettingQuery = (
    trpc as any
  ).attendance.getEntryPermissionRequestsEnabled.useQuery();
  const entryPermissionEnabled =
    entryPermissionSettingQuery.data?.enabled !== false;

  const permMut = (trpc as any).attendance.myRequestPermission.useMutation({
    onSuccess: () => {
      setPermMsg("✓ تم إرسال طلب الإذن");
      profileQuery.refetch();
      setPermForm({
        date: todayStr,
        type: "out",
        durationMinutes: 60,
        note: "",
      });
    },
    onError: (err: any) => setPermMsg(`✗ ${err.message}`),
  });

  const leaveMut = (trpc as any).attendance.myRequestLeave.useMutation({
    onSuccess: (res: any) => {
      const from = res?.dateFrom ?? "";
      const to = res?.dateTo ?? "";
      setLeaveMsg(`✓ تم إرسال طلب الإجازة (${from} → ${to})`);
      profileQuery.refetch();
      setLeaveForm({
        dateFrom: todayStr,
        dateTo: todayStr,
        type: "annual",
        note: "",
      });
    },
    onError: (err: any) => setLeaveMsg(`✗ ${err.message}`),
  });

  const [shiftRequestForm, setShiftRequestForm] = useState({
    requestType: "daily" as "daily" | "weekly" | "monthly" | "swap",
    newShiftId: 0,
    weekdayMask: 62,
    cycleId: 0,
    swapEmpCd: "",
    dateFrom: todayStr,
    dateTo: todayStr,
    note: "",
  });
  const [shiftRequestMsg, setShiftRequestMsg] = useState<string | null>(null);
  const [weeklyDays, setWeeklyDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4]),
  );

  const shiftRequestMut = (
    trpc as any
  ).attendance.myRequestShiftChange.useMutation({
    onSuccess: () => {
      setShiftRequestMsg("✓ تم إرسال طلب تغيير الموعد");
      profileQuery.refetch();
      setShiftRequestForm({
        requestType: "daily",
        newShiftId: 0,
        weekdayMask: 62,
        cycleId: 0,
        swapEmpCd: "",
        dateFrom: todayStr,
        dateTo: todayStr,
        note: "",
      });
      setWeeklyDays(new Set([0, 1, 2, 3, 4]));
    },
    onError: (err: any) => setShiftRequestMsg(`✗ ${err.message}`),
  });

  const shiftsQuery = (trpc as any).attendance.listShifts.useQuery(undefined, {
    enabled: !!data?.linked,
  });
  const cyclesQuery = (trpc as any).attendance.listShiftCycles.useQuery(
    undefined,
    { enabled: !!data?.linked },
  );
  const employeesQuery = (trpc as any).attendance.employeesList.useQuery(
    undefined,
    { enabled: !!data?.linked },
  );

  const shifts = shiftsQuery.data ?? [];
  const cycles = cyclesQuery.data ?? [];
  const employees = employeesQuery.data?.employees ?? [];

  const toggleWeeklyDay = (dayIndex: number) => {
    const updated = new Set(weeklyDays);
    if (updated.has(dayIndex)) {
      updated.delete(dayIndex);
    } else {
      updated.add(dayIndex);
    }
    setWeeklyDays(updated);
    setShiftRequestForm((prev) => ({
      ...prev,
      weekdayMask: Array.from(updated).reduce((m, d) => m | (1 << d), 0),
    }));
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4 p-4" dir="rtl">
        <Skeleton className="h-32 w-full animate-pulse" />
        <Skeleton className="h-32 w-full animate-pulse" />
      </div>
    );
  }

  if (!data?.linked) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center" dir="rtl">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="font-bold text-foreground">حسابك غير مرتبط بسجل موظف في الحضور.</p>
        <p className="text-xs text-muted-foreground">تواصل مع المسؤول لربط حسابك.</p>
      </div>
    );
  }

  const bal = data.leaveBalance;
  const stats = data.monthStats;

  return (
    <div
      className={
        embeddedInHub
          ? "w-full text-foreground"
          : "min-h-screen bg-background p-4 text-foreground sm:p-6"
      }
      dir="rtl"
    >
      {!embeddedInHub && (
        <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/attendance"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground font-mono">
            كود: {data.empCd}
          </span>
        </header>
      )}

      {/* ── 2. Bento Container Flow ── */}
      <div className={embeddedInHub ? "w-full space-y-6" : "max-w-6xl mx-auto space-y-6"}>

        {/* Top Section: Balances & Stats (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Bento Box 1: Leave Balance (Mint Theme) */}
          <div className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-black text-emerald-950">رصيد إجازاتي السنوية ({new Date().getFullYear()})</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-[9px] text-muted-foreground block font-bold">المخصص سنوياً</span>
                <span className="font-mono font-black text-emerald-950 text-base block mt-0.5">{bal.annualAllocation} يوم</span>
              </div>
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-[9px] text-muted-foreground block font-bold">المستخدم</span>
                <span className="font-mono font-black text-rose-600 text-base block mt-0.5">{bal.usedAnnual} يوم</span>
              </div>
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-[9px] text-muted-foreground block font-bold">المتبقي</span>
                <span className="font-mono font-black text-emerald-600 text-base block mt-0.5">{bal.remainingAnnual} يوم</span>
              </div>
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-[9px] text-muted-foreground block font-bold">مرضية مستخدمة</span>
                <span className="font-mono font-black text-emerald-950 text-base block mt-0.5">{bal.usedSick} يوم</span>
              </div>
            </div>
          </div>

          {/* Bento Box 2: Monthly Stats (Amber/Rose Theme) */}
          <div className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 hover:scale-[1.01] transition-transform duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-border/60/50 pb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-black text-amber-950">مؤشرات الحضور والمخالفات هذا الشهر</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-card border border-border/60 rounded-xl">
                  <span className="text-[9px] text-muted-foreground block font-bold">دقائق التأخير</span>
                  <span className="font-mono font-black text-rose-600 text-base block mt-0.5">{fmt(stats.lateMins)}</span>
                </div>
                <div className="p-3 bg-card border border-border/60 rounded-xl">
                  <span className="text-[9px] text-muted-foreground block font-bold">خروج مبكر</span>
                  <span className="font-mono font-black text-amber-600 text-base block mt-0.5">{fmt(stats.earlyMins)}</span>
                </div>
              </div>
            </div>

            {stats.permOutMins > 0 && (
              <div className="p-3 bg-card border border-border/60 rounded-2xl text-xs text-foreground font-bold flex justify-between mt-2">
                <span>أذونات الخروج المعتمدة هذا الشهر:</span>
                <span className="font-mono text-foreground">{fmt(stats.permOutMins)}</span>
              </div>
            )}
          </div>

        </div>

        {/* Bento Box 3: Pending Requests (Sky Theme) - Spans full width when visible */}
        {(data.pendingLeaves.length > 0 ||
          data.pendingPerms.length > 0 ||
          (data.pendingShiftChanges && data.pendingShiftChanges.length > 0)) && (
          <div className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Hourglass className="h-4 w-4 text-sky-600" />
              <h3 className="text-xs font-black text-sky-950">الطلبات المعلقة قيد المراجعة والاعتماد</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.pendingLeaves.map((l: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-card border border-border/60 rounded-2xl text-xs font-bold text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>طلب إجازة {l.type === "annual" ? "سنوية" : "مرضية"}:</span>
                  <span className="font-mono text-muted-foreground">{String(l.dateFrom).slice(0, 10)} ← {String(l.dateTo).slice(0, 10)}</span>
                </div>
              ))}

              {data.pendingPerms.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-card border border-border/60 rounded-2xl text-xs font-bold text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  <span>طلب إذن {p.type === "in" ? "دخول متأخر" : "خروج مبكر"}:</span>
                  <span className="font-mono text-muted-foreground">{p.durationMinutes} دقيقة يوم {String(p.date).slice(0, 10)}</span>
                </div>
              ))}

              {data.pendingShiftChanges && data.pendingShiftChanges.map((s: any, i: number) => {
                const typeAr =
                  s.requestType === "daily"
                    ? "يومي"
                    : s.requestType === "weekly"
                      ? "أسبوعي"
                      : s.requestType === "monthly"
                        ? "شهري"
                        : "تبادل";
                return (
                  <div key={i} className="flex items-center gap-2 p-3 bg-card border border-border/60 rounded-2xl text-xs font-bold text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span>طلب تغيير موعد ({typeAr}):</span>
                    <span className="font-mono text-muted-foreground">{s.dateFrom} {s.dateTo ? `→ ${s.dateTo}` : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Section: The 3 forms side-by-side (beside each other) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Form 1: Permission Request */}
          <div className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 shadow-sm hover:scale-[1.01] transition-transform duration-200">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-sky-600" />
              طلب إذن نوبة
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">النوع</label>
                <select
                  value={permForm.type}
                  onChange={(e) => setPermForm({ ...permForm, type: e.target.value as "in" | "out" })}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 outline-none focus:border-primary focus:bg-card transition-all font-bold text-foreground"
                >
                  <option value="out">خروج مبكر</option>
                  {entryPermissionEnabled && (
                    <option value="in">دخول متأخر</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">التاريخ</label>
                <DateInput
                  value={permForm.date}
                  onChange={(e) => setPermForm({ ...permForm, date: e.target.value })}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none focus:border-primary focus:bg-card transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">المدة (بالدقائق)</label>
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={permForm.durationMinutes}
                  onChange={(e) => setPermForm({ ...permForm, durationMinutes: Number(e.target.value) })}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none focus:border-primary focus:bg-card transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">السبب أو الملاحظة</label>
                <input
                  type="text"
                  value={permForm.note}
                  placeholder="ملاحظات اختيارية"
                  onChange={(e) => setPermForm({ ...permForm, note: e.target.value })}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none focus:border-primary focus:bg-card transition-all"
                />
              </div>

              {permMsg && (
                <p className={`text-[10px] font-bold ${permMsg.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>
                  {permMsg}
                </p>
              )}

              <Button
                size="sm"
                disabled={permMut.isPending}
                onClick={() => {
                  setPermMsg(null);
                  permMut.mutate(permForm);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-2 h-auto"
              >
                {permMut.isPending ? "جاري الإرسال…" : "إرسال طلب الإذن"}
              </Button>
            </div>
          </div>

          {/* Form 2: Leave Request */}
          <div className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 shadow-sm hover:scale-[1.01] transition-transform duration-200">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              طلب إجازة جديدة
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">النوع</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, type: e.target.value as "annual" | "sick" }))}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 outline-none focus:border-primary focus:bg-card transition-all font-bold text-foreground"
                >
                  <option value="annual">سنوية</option>
                  <option value="sick">مرضية</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">من تاريخ</label>
                  <DateInput
                    value={leaveForm.dateFrom}
                    onChange={(e) => {
                      const from = e.target.value;
                      setLeaveForm((prev) => ({
                        ...prev,
                        dateFrom: from,
                        dateTo: prev.dateTo < from ? from : prev.dateTo,
                      }));
                    }}
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">إلى تاريخ</label>
                  <DateInput
                    value={leaveForm.dateTo}
                    min={leaveForm.dateFrom}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, dateTo: e.target.value }))}
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none focus:border-primary"
                  />
                </div>
              </div>

              {leaveForm.dateFrom && leaveForm.dateTo && leaveForm.dateTo >= leaveForm.dateFrom && (
                <div className="text-[10px] text-muted-foreground font-bold bg-muted/40 px-3 py-1 rounded-lg">
                  أيام الإجازة: {Math.round((new Date(leaveForm.dateTo).getTime() - new Date(leaveForm.dateFrom).getTime()) / 86400000) + 1} يوم
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">السبب أو الملاحظة</label>
                <input
                  type="text"
                  value={leaveForm.note}
                  placeholder="ملاحظات اختيارية"
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none"
                />
              </div>

              {leaveMsg && (
                <p className={`text-[10px] font-bold ${leaveMsg.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>
                  {leaveMsg}
                </p>
              )}

              <Button
                size="sm"
                disabled={leaveMut.isPending}
                onClick={() => {
                  if (!leaveForm.dateFrom || !leaveForm.dateTo) {
                    setLeaveMsg("✗ يرجى تحديد تاريخ البداية والنهاية");
                    return;
                  }
                  setLeaveMsg(null);
                  leaveMut.mutate(leaveForm);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-2 h-auto"
              >
                {leaveMut.isPending ? "جاري الإرسال…" : "إرسال طلب الإجازة"}
              </Button>
            </div>
          </div>

          {/* Form 3: Shift Swap/Change Request */}
          <div className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 shadow-sm hover:scale-[1.01] transition-transform duration-200">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              تغيير / تبديل الوردية
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">نوع التغيير المطلوب</label>
                <select
                  value={shiftRequestForm.requestType}
                  onChange={(e) => setShiftRequestForm({ ...shiftRequestForm, requestType: e.target.value as any })}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 outline-none focus:border-primary font-bold text-foreground"
                >
                  <option value="daily">يومي (مؤقت لفترة)</option>
                  <option value="weekly">أسبوعي (أيام عمل ووردية)</option>
                  <option value="monthly">شهري (دورة كاملة)</option>
                  <option value="swap">تبادل مع زميل</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">من تاريخ</label>
                  <DateInput
                    value={shiftRequestForm.dateFrom}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        dateFrom: e.target.value,
                        dateTo: e.target.value > shiftRequestForm.dateTo ? e.target.value : shiftRequestForm.dateTo,
                      })
                    }
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none"
                  />
                </div>

                {(shiftRequestForm.requestType === "daily" ||
                  shiftRequestForm.requestType === "swap" ||
                  shiftRequestForm.requestType === "monthly") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground">حتى تاريخ</label>
                    <DateInput
                      value={shiftRequestForm.dateTo}
                      min={shiftRequestForm.dateFrom}
                      onChange={(e) => setShiftRequestForm({ ...shiftRequestForm, dateTo: e.target.value })}
                      className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none"
                    />
                  </div>
                )}
              </div>

              {(shiftRequestForm.requestType === "daily" || shiftRequestForm.requestType === "weekly") && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">الوردية المطلوبة</label>
                  <select
                    value={shiftRequestForm.newShiftId || ""}
                    onChange={(e) => setShiftRequestForm({ ...shiftRequestForm, newShiftId: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 outline-none font-bold text-foreground"
                  >
                    <option value="">— اختر الوردية —</option>
                    {shifts.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shiftRequestForm.requestType === "weekly" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">أيام العمل المطلوبة</label>
                  <div className="flex flex-wrap gap-1">
                    {DAYS_FULL.map((name, index) => {
                      const active = weeklyDays.has(index);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleWeeklyDay(index)}
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold border transition-all ${
                            active
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {shiftRequestForm.requestType === "monthly" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">الدورة المطلوبة</label>
                  <select
                    value={shiftRequestForm.cycleId || ""}
                    onChange={(e) => setShiftRequestForm({ ...shiftRequestForm, cycleId: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 outline-none font-bold text-foreground"
                  >
                    <option value="">— اختر الدورة —</option>
                    {cycles.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.period === "week" ? "أسبوعية" : c.period === "month" ? "شهرية" : "يومية"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shiftRequestForm.requestType === "swap" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">الزميل المراد التبادل معه</label>
                  <select
                    value={shiftRequestForm.swapEmpCd}
                    onChange={(e) => setShiftRequestForm({ ...shiftRequestForm, swapEmpCd: e.target.value })}
                    className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 outline-none font-bold text-foreground"
                  >
                    <option value="">— اختر الزميل —</option>
                    {employees
                      .filter((e: any) => e.empCd !== data.empCd)
                      .map((emp: any) => (
                        <option key={emp.empCd} value={emp.empCd}>
                          {emp.fullName} ({emp.empCd})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground">ملاحظة أو سبب الطلب</label>
                <input
                  type="text"
                  value={shiftRequestForm.note}
                  placeholder="ملاحظات اختيارية"
                  onChange={(e) => setShiftRequestForm({ ...shiftRequestForm, note: e.target.value })}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 outline-none"
                />
              </div>

              {shiftRequestMsg && (
                <p className={`text-[10px] font-bold ${shiftRequestMsg.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>
                  {shiftRequestMsg}
                </p>
              )}

              <Button
                size="sm"
                disabled={shiftRequestMut.isPending}
                onClick={() => {
                  if (shiftRequestForm.requestType === "daily" && !shiftRequestForm.newShiftId) {
                    return setShiftRequestMsg("✗ يرجى تحديد الوردية المطلوبة");
                  }
                  if (shiftRequestForm.requestType === "weekly" && !shiftRequestForm.newShiftId) {
                    return setShiftRequestMsg("✗ يرجى تحديد الوردية المطلوبة");
                  }
                  if (shiftRequestForm.requestType === "weekly" && weeklyDays.size === 0) {
                    return setShiftRequestMsg("✗ يرجى تحديد يوم عمل واحد على الأقل");
                  }
                  if (shiftRequestForm.requestType === "monthly" && !shiftRequestForm.cycleId) {
                    return setShiftRequestMsg("✗ يرجى تحديد الدورة المطلوبة");
                  }
                  if (shiftRequestForm.requestType === "swap" && !shiftRequestForm.swapEmpCd) {
                    return setShiftRequestMsg("✗ يرجى تحديد الزميل المراد التبادل معه");
                  }

                  setShiftRequestMsg(null);
                  shiftRequestMut.mutate(shiftRequestForm);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-2 h-auto"
              >
                {shiftRequestMut.isPending ? "جاري الإرسال…" : "إرسال طلب التبديل"}
              </Button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
