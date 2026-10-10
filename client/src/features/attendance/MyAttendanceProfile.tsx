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
import { useLocalToday } from "@/hooks/useLocalToday";
import "./attendance-workspace.css";
import { Input } from "@/components/ui/input";

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
  if (!min) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

export default function MyAttendanceProfile({
  embeddedInHub = false,
}: { embeddedInHub?: boolean } = {}) {
  const todayStr = useLocalToday();
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
    entryPermissionSettingQuery.data?.enabled === true;

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
    weekdayMask: 31,
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
        weekdayMask: 31,
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

  const optionsQuery = (trpc as any).attendance.myShiftRequestOptions.useQuery(
    undefined,
    {
      enabled: !!data?.linked,
    },
  );

  const shifts = optionsQuery.data?.shifts ?? [];
  const cycles = optionsQuery.data?.cycles ?? [];
  const employees = optionsQuery.data?.colleagues ?? [];

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
      <div
        role="status"
        aria-label="جارٍ التحميل"
        className="space-y-4 p-4"
        dir="rtl"
      >
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div
        className="flex flex-col items-center gap-3 p-8 text-center"
        dir="rtl"
      >
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-bold text-foreground">تعذر تحميل بيانات الحضور.</p>
        <Button variant="outline" onClick={() => profileQuery.refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!data?.linked) {
    return (
      <div
        className="flex flex-col items-center gap-3 p-8 text-center"
        dir="rtl"
      >
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="font-bold text-foreground">
          حسابك غير مرتبط بسجل موظف في الحضور.
        </p>
        <p className="text-xs text-muted-foreground">
          تواصل مع المسؤول لربط حسابك.
        </p>
      </div>
    );
  }

  const bal = data.leaveBalance;
  const stats = data.monthStats;
  const pendingCount =
    data.pendingLeaves.length +
    data.pendingPerms.length +
    (data.pendingShiftChanges?.length ?? 0);

  return (
    <div
      className={
        embeddedInHub
          ? "attendance-workspace w-full text-foreground"
          : "attendance-workspace min-h-dvh bg-background p-4 text-foreground sm:p-6"
      }
      dir="rtl"
    >
      {!embeddedInHub && (
        <header className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/attendance"
              aria-label="العودة إلى الحضور"
              title="العودة إلى الحضور"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-semibold text-foreground">حضوري وطلباتي</h1>
          </div>
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground font-mono">
            كود: {data.empCd}
          </span>
        </header>
      )}

      <div
        className={
          embeddedInHub ? "w-full space-y-6" : "max-w-6xl mx-auto space-y-6"
        }
      >
        <div className="attendance-personal-totals grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Leave Balance */}
          <div className="p-4 sm:p-6 bg-card border border-border/60 rounded-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Calendar className="h-4 w-4 text-success-text" />
              <h3 className="text-xs font-black text-foreground">
                رصيد إجازاتي السنوية ({new Date().getFullYear()})
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-xs text-muted-foreground block font-bold">
                  المخصص سنوياً
                </span>
                <span className="font-mono font-black text-foreground text-base block mt-0.5">
                  {bal.annualAllocation} يوم
                </span>
              </div>
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-xs text-muted-foreground block font-bold">
                  المستخدم
                </span>
                <span className="font-mono font-black text-destructive-text text-base block mt-0.5">
                  {bal.usedAnnual} يوم
                </span>
              </div>
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-xs text-muted-foreground block font-bold">
                  المتبقي
                </span>
                <span className="font-mono font-black text-success-text text-base block mt-0.5">
                  {bal.remainingAnnual} يوم
                </span>
              </div>
              <div className="p-3 bg-card border border-border/60 rounded-xl">
                <span className="text-xs text-muted-foreground block font-bold">
                  مرضية مستخدمة
                </span>
                <span className="font-mono font-black text-foreground text-base block mt-0.5">
                  {bal.usedSick} يوم
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="p-4 sm:p-6 bg-card border border-border/60 rounded-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-border/60/50 pb-2">
                <Clock className="h-4 w-4 text-warning-text" />
                <h3 className="text-xs font-black text-foreground">
                  مؤشرات الحضور والمخالفات هذا الشهر
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-card border border-border/60 rounded-xl">
                  <span className="text-xs text-muted-foreground block font-bold">
                    دقائق التأخير
                  </span>
                  <span className="font-mono font-black text-destructive-text text-base block mt-0.5">
                    {fmt(stats.lateMins)}
                  </span>
                </div>
                <div className="p-3 bg-card border border-border/60 rounded-xl">
                  <span className="text-xs text-muted-foreground block font-bold">
                    خروج مبكر
                  </span>
                  <span className="font-mono font-black text-warning-text text-base block mt-0.5">
                    {fmt(stats.earlyMins)}
                  </span>
                </div>
              </div>
            </div>

            {stats.permOutMins > 0 && (
              <div className="p-3 bg-card border border-border/60 rounded-xl text-xs text-foreground font-bold flex justify-between mt-2">
                <span>أذونات الخروج المعتمدة هذا الشهر:</span>
                <span className="font-mono text-foreground">
                  {fmt(stats.permOutMins)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {data.pendingLeaves && data.pendingPerms && (
          <div className="p-4 sm:p-6 bg-card border border-border/60 rounded-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Hourglass className="h-4 w-4 text-info" />
              <h3 className="text-xs font-black text-foreground">
                الطلبات المعلقة قيد المراجعة والاعتماد
              </h3>
            </div>

            {pendingCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد طلبات معلقة قيد المراجعة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.pendingLeaves.map((l: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-card border border-border/60 rounded-xl text-xs font-bold text-foreground"
                  >
                    <span>
                      طلب إجازة {l.type === "annual" ? "سنوية" : "مرضية"}:
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {String(l.dateFrom).slice(0, 10)} ←{" "}
                      {String(l.dateTo).slice(0, 10)}
                    </span>
                  </div>
                ))}

                {data.pendingPerms.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-card border border-border/60 rounded-xl text-xs font-bold text-foreground"
                  >
                    <span>
                      طلب إذن {p.type === "in" ? "دخول متأخر" : "خروج مبكر"}:
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {p.durationMinutes} دقيقة يوم{" "}
                      {String(p.date).slice(0, 10)}
                    </span>
                  </div>
                ))}

                {data.pendingShiftChanges &&
                  data.pendingShiftChanges.map((s: any, i: number) => {
                    const typeAr =
                      s.requestType === "daily"
                        ? "يومي"
                        : s.requestType === "weekly"
                          ? "أسبوعي"
                          : s.requestType === "monthly"
                            ? "شهري"
                            : "تبادل";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-3 bg-card border border-border/60 rounded-xl text-xs font-bold text-foreground"
                      >
                        <span>طلب تغيير موعد ({typeAr}):</span>
                        <span className="font-mono text-muted-foreground">
                          {s.dateFrom} {s.dateTo ? `→ ${s.dateTo}` : ""}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Section: The 3 forms side-by-side (beside each other) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form 1: Permission Request */}
          <div className="p-4 sm:p-6 bg-card border border-border/60 rounded-xl space-y-4">
            <h3 className="text-xs font-black text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-info" />
              طلب إذن نوبة
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  النوع
                </label>
                <select
                  aria-label="النوع"
                  value={permForm.type}
                  onChange={(e) =>
                    setPermForm({
                      ...permForm,
                      type: e.target.value as "in" | "out",
                    })
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary focus:bg-card transition-colors font-bold text-foreground"
                >
                  <option value="out">خروج مبكر</option>
                  {entryPermissionEnabled && (
                    <option value="in">دخول متأخر</option>
                  )}
                </select>
                {entryPermissionSettingQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">
                    جارٍ التحقق من صلاحية طلب دخول متأخر.
                  </p>
                )}
                {entryPermissionSettingQuery.isError && (
                  <p role="alert" className="text-xs text-destructive-text">
                    تعذر التحقق من صلاحية طلب دخول متأخر؛ تم إخفاء الخيار حتى
                    تتوفر الإعدادات.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  التاريخ
                </label>
                <DateInput
                  value={permForm.date}
                  onChange={(e) =>
                    setPermForm({ ...permForm, date: e.target.value })
                  }
                  className="bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary focus:bg-card transition-colors h-11 w-full sm:w-[11rem] shrink-0 rounded-xl border border-border/60 px-3 py-1.5"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  المدة (بالدقائق)
                </label>
                <Input bare
                  aria-label="المدة (بالدقائق)"
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={permForm.durationMinutes}
                  onChange={(e) =>
                    setPermForm({
                      ...permForm,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary focus:bg-card transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  السبب أو الملاحظة
                </label>
                <Input bare
                  aria-label="السبب أو الملاحظة"
                  type="text"
                  value={permForm.note}
                  placeholder="ملاحظات اختيارية"
                  onChange={(e) =>
                    setPermForm({ ...permForm, note: e.target.value })
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary focus:bg-card transition-colors"
                />
              </div>

              {permMsg && (
                <p
                  className={`text-xs font-bold ${permMsg.startsWith("✓") ? "text-success-text " : "text-destructive-text "}`}
                >
                  {permMsg}
                </p>
              )}

              <Button
                size="sm"
                disabled={permMut.isPending}
                onClick={() => {
                  if (
                    !Number.isInteger(permForm.durationMinutes) ||
                    permForm.durationMinutes < 1 ||
                    permForm.durationMinutes > 480
                  ) {
                    setPermMsg("✗ المدة يجب أن تكون بين 1 و480 دقيقة");
                    return;
                  }
                  setPermMsg(null);
                  permMut.mutate(permForm);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-2 h-auto"
              >
                {permMut.isPending ? "جاري الإرسال" : "إرسال طلب الإذن"}
              </Button>
            </div>
          </div>

          {/* Form 2: Leave Request */}
          <div className="p-4 sm:p-6 bg-card border border-border/60 rounded-xl space-y-4">
            <h3 className="text-xs font-black text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success-text" />
              طلب إجازة جديدة
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  النوع
                </label>
                <select
                  aria-label="النوع"
                  value={leaveForm.type}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      type: e.target.value as "annual" | "sick",
                    }))
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary focus:bg-card transition-colors font-bold text-foreground"
                >
                  <option value="annual">سنوية</option>
                  <option value="sick">مرضية</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    من تاريخ
                  </label>
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
                    className="bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary h-11 w-full sm:w-[11rem] shrink-0 rounded-xl border border-border/60 px-3 py-1.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    إلى تاريخ
                  </label>
                  <DateInput
                    value={leaveForm.dateTo}
                    min={leaveForm.dateFrom}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {leaveForm.dateFrom &&
                leaveForm.dateTo &&
                leaveForm.dateTo >= leaveForm.dateFrom && (
                  <div className="text-xs text-muted-foreground font-bold bg-muted/40 px-3 py-1 rounded-lg">
                    أيام الإجازة:{" "}
                    {Math.round(
                      (new Date(leaveForm.dateTo).getTime() -
                        new Date(leaveForm.dateFrom).getTime()) /
                        86400000,
                    ) + 1}{" "}
                    يوم
                  </div>
                )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  السبب أو الملاحظة
                </label>
                <Input bare
                  aria-label="السبب أو الملاحظة"
                  type="text"
                  value={leaveForm.note}
                  placeholder="ملاحظات اختيارية"
                  onChange={(e) =>
                    setLeaveForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>

              {leaveMsg && (
                <p
                  className={`text-xs font-bold ${leaveMsg.startsWith("✓") ? "text-success-text " : "text-destructive-text "}`}
                >
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
                {leaveMut.isPending ? "جاري الإرسال" : "إرسال طلب الإجازة"}
              </Button>
            </div>
          </div>

          {/* Form 3: Shift Swap/Change Request */}
          <div className="p-4 sm:p-6 bg-card border border-border/60 rounded-xl space-y-4">
            <h3 className="text-xs font-black text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              تغيير / تبديل الوردية
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">
                  نوع التغيير المطلوب
                </label>
                <select
                  aria-label="نوع التغيير المطلوب"
                  value={shiftRequestForm.requestType}
                  onChange={(e) =>
                    setShiftRequestForm({
                      ...shiftRequestForm,
                      requestType: e.target.value as any,
                    })
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:border-primary font-bold text-foreground"
                >
                  <option value="daily">يومي (مؤقت لفترة)</option>
                  <option value="weekly">أسبوعي (أيام عمل ووردية)</option>
                  <option value="monthly">شهري (دورة كاملة)</option>
                  <option value="swap">تبادل مع زميل</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    من تاريخ
                  </label>
                  <DateInput
                    value={shiftRequestForm.dateFrom}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        dateFrom: e.target.value,
                        dateTo:
                          e.target.value > shiftRequestForm.dateTo
                            ? e.target.value
                            : shiftRequestForm.dateTo,
                      })
                    }
                    className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>

                {(shiftRequestForm.requestType === "daily" ||
                  shiftRequestForm.requestType === "swap" ||
                  shiftRequestForm.requestType === "monthly") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted-foreground">
                      حتى تاريخ
                    </label>
                    <DateInput
                      value={shiftRequestForm.dateTo}
                      min={shiftRequestForm.dateFrom}
                      onChange={(e) =>
                        setShiftRequestForm({
                          ...shiftRequestForm,
                          dateTo: e.target.value,
                        })
                      }
                      className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 h-11 w-full sm:w-[11rem] shrink-0"
                    />
                  </div>
                )}
              </div>

              {(shiftRequestForm.requestType === "daily" ||
                shiftRequestForm.requestType === "weekly") && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    الوردية المطلوبة
                  </label>
                  <select
                    aria-label="الوردية المطلوبة"
                    value={shiftRequestForm.newShiftId || ""}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        newShiftId: e.target.value
                          ? parseInt(e.target.value)
                          : 0,
                      })
                    }
                    className="rounded-xl border border-input bg-muted/30 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 font-bold text-foreground"
                  >
                    <option value="">اختر الوردية</option>
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
                  <label className="text-xs font-bold text-muted-foreground">
                    أيام العمل المطلوبة
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {DAYS_FULL.map((name, index) => {
                      const active = weeklyDays.has(index);
                      return (
                        <Button variant="bare"
                          key={index}
                          type="button"
                          onClick={() => toggleWeeklyDay(index)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold border transition-colors ${
                            active
                              ? "bg-primary border-primary text-primary-foreground shadow-xs"
                              : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          {name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {shiftRequestForm.requestType === "monthly" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    الدورة المطلوبة
                  </label>
                  <select
                    aria-label="الدورة المطلوبة"
                    value={shiftRequestForm.cycleId || ""}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        cycleId: e.target.value ? parseInt(e.target.value) : 0,
                      })
                    }
                    className="rounded-xl border border-input bg-muted/30 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 font-bold text-foreground"
                  >
                    <option value="">اختر الدورة</option>
                    {cycles.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (
                        {c.period === "week"
                          ? "أسبوعية"
                          : c.period === "month"
                            ? "شهرية"
                            : "يومية"}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shiftRequestForm.requestType === "swap" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    الزميل المراد التبادل معه
                  </label>
                  <select
                    aria-label="الزميل المراد التبادل معه"
                    value={shiftRequestForm.swapEmpCd}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        swapEmpCd: e.target.value,
                      })
                    }
                    className="rounded-xl border border-input bg-muted/30 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 font-bold text-foreground"
                  >
                    <option value="">اختر الزميل</option>
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
                <label className="text-xs font-bold text-muted-foreground">
                  ملاحظة أو سبب الطلب
                </label>
                <Input bare
                  aria-label="ملاحظة أو سبب الطلب"
                  type="text"
                  value={shiftRequestForm.note}
                  placeholder="ملاحظات اختيارية"
                  onChange={(e) =>
                    setShiftRequestForm({
                      ...shiftRequestForm,
                      note: e.target.value,
                    })
                  }
                  className="rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>

              {shiftRequestMsg && (
                <p
                  className={`text-xs font-bold ${shiftRequestMsg.startsWith("✓") ? "text-success-text " : "text-destructive-text "}`}
                >
                  {shiftRequestMsg}
                </p>
              )}

              <Button
                size="sm"
                disabled={shiftRequestMut.isPending}
                onClick={() => {
                  if (
                    shiftRequestForm.requestType === "daily" &&
                    !shiftRequestForm.newShiftId
                  ) {
                    return setShiftRequestMsg("✗ يرجى تحديد الوردية المطلوبة");
                  }
                  if (
                    shiftRequestForm.requestType === "weekly" &&
                    !shiftRequestForm.newShiftId
                  ) {
                    return setShiftRequestMsg("✗ يرجى تحديد الوردية المطلوبة");
                  }
                  if (
                    shiftRequestForm.requestType === "weekly" &&
                    weeklyDays.size === 0
                  ) {
                    return setShiftRequestMsg(
                      "✗ يرجى تحديد يوم عمل واحد على الأقل",
                    );
                  }
                  if (
                    shiftRequestForm.requestType === "monthly" &&
                    !shiftRequestForm.cycleId
                  ) {
                    return setShiftRequestMsg("✗ يرجى تحديد الدورة المطلوبة");
                  }
                  if (
                    shiftRequestForm.requestType === "swap" &&
                    !shiftRequestForm.swapEmpCd
                  ) {
                    return setShiftRequestMsg(
                      "✗ يرجى تحديد الزميل المراد التبادل معه",
                    );
                  }

                  setShiftRequestMsg(null);
                  shiftRequestMut.mutate(shiftRequestForm);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-2 h-auto"
              >
                {shiftRequestMut.isPending
                  ? "جاري الإرسال"
                  : shiftRequestForm.requestType === "swap"
                    ? "إرسال طلب التبادل"
                    : "إرسال طلب تغيير الوردية"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
