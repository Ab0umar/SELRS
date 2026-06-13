import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function StatBox({
  label,
  value,
  sub,
  cls,
}: {
  label: string;
  value: string | number;
  sub?: string;
  cls?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-lg border px-4 py-3 ${cls ?? "border-border bg-card"}`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function MyAttendanceProfile() {
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
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data?.linked) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base font-semibold">حضوري</h1>
          <p className="text-xs text-muted-foreground">
            رصيد الإجازات والإحصائيات وطلب الأذونات
          </p>
        </div>
      </div>
      <div className="space-y-5 p-4">
        {/* Leave balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              رصيد الإجازات {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              label="المخصص سنوياً"
              value={bal.annualAllocation}
              sub="يوم"
            />
            <StatBox
              label="المستخدم"
              value={bal.usedAnnual}
              sub="يوم"
              cls="border-destructive/30 bg-destructive/5 text-foreground"
            />
            <StatBox
              label="المتبقي"
              value={bal.remainingAnnual}
              sub="يوم"
              cls="border-success/30 bg-success/5 text-foreground"
            />
            <StatBox
              label="إجازة مرضية"
              value={bal.usedSick}
              sub="يوم هذا العام"
            />
          </CardContent>
        </Card>

        {/* Monthly stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-secondary" />
              إحصائيات هذا الشهر
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              label="تأخير"
              value={fmt(stats.lateMins)}
              cls="border-destructive/20 bg-destructive/5 text-foreground"
            />
            <StatBox
              label="خروج مبكر"
              value={fmt(stats.earlyMins)}
              cls="border-warning/20 bg-warning/10 text-foreground"
            />
            <StatBox
              label="إجمالي (تأخير+مبكر)"
              value={fmt(stats.lateMins + stats.earlyMins)}
            />
            <StatBox
              label="أذونات دخول"
              value={fmt(stats.permInMins)}
              cls="border-info/20 bg-info/10 text-foreground"
            />
          </CardContent>
          {stats.permOutMins > 0 && (
            <CardContent className="pt-0">
              <div className="rounded-md border border-border px-4 py-2 text-sm">
                <span className="text-muted-foreground">
                  أذونات خروج هذا الشهر:{" "}
                </span>
                <span className="font-medium">{fmt(stats.permOutMins)}</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Pending requests */}
        {(data.pendingLeaves.length > 0 ||
          data.pendingPerms.length > 0 ||
          (data.pendingShiftChanges &&
            data.pendingShiftChanges.length > 0)) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hourglass className="h-4 w-4 text-warning" />
                طلبات قيد الانتظار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.pendingLeaves.map((l: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm"
                >
                  <Calendar className="h-4 w-4 text-warning shrink-0" />
                  <span>
                    إجازة {l.type === "annual" ? "سنوية" : "مرضية"}:{" "}
                    {String(l.dateFrom).slice(0, 10)} →{" "}
                    {String(l.dateTo).slice(0, 10)}
                  </span>
                </div>
              ))}
              {data.pendingPerms.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-info/20 bg-info/10 px-3 py-2 text-sm"
                >
                  <ShieldCheck className="h-4 w-4 text-info shrink-0" />
                  <span>
                    إذن {p.type === "in" ? "دخول متأخر" : "خروج مبكر"} —{" "}
                    {p.durationMinutes} دقيقة ({String(p.date).slice(0, 10)})
                  </span>
                </div>
              ))}
              {data.pendingShiftChanges &&
                data.pendingShiftChanges.map((s: any, i: number) => {
                  const typeAr =
                    s.requestType === "daily"
                      ? "يومي (مؤقت)"
                      : s.requestType === "weekly"
                        ? "أسبوعي"
                        : s.requestType === "monthly"
                          ? "شهري (دورة)"
                          : "تبادل مع زميل";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-secondary/20 bg-secondary/10 px-3 py-2 text-sm"
                    >
                      <Clock className="h-4 w-4 text-secondary shrink-0" />
                      <span>
                        طلب تغيير موعد ({typeAr}): {s.dateFrom}{" "}
                        {s.dateTo ? `→ ${s.dateTo}` : ""}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* Permission request */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-info" />
              طلب إذن
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">النوع</label>
                <select
                  value={permForm.type}
                  onChange={(e) =>
                    setPermForm({
                      ...permForm,
                      type: e.target.value as "in" | "out",
                    })
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="out">خروج مبكر</option>
                  <option value="in">دخول متأخر</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">التاريخ</label>
                <input
                  type="date"
                  value={permForm.date}
                  onChange={(e) =>
                    setPermForm({ ...permForm, date: e.target.value })
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  المدة (دقيقة)
                </label>
                <input
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
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">ملاحظة</label>
                <input
                  type="text"
                  value={permForm.note}
                  placeholder="اختياري"
                  onChange={(e) =>
                    setPermForm({ ...permForm, note: e.target.value })
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            {permMsg && (
              <p
                className={`text-sm ${permMsg.startsWith("✓") ? "text-success" : "text-destructive"}`}
              >
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
            >
              {permMut.isPending ? "جاري الإرسال…" : "إرسال الطلب"}
            </Button>
          </CardContent>
        </Card>

        {/* Leave request */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-success" />
              طلب إجازة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">النوع</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      type: e.target.value as "annual" | "sick",
                    }))
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="annual">سنوية</option>
                  <option value="sick">مرضية</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-1" />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">من</label>
                <input
                  type="date"
                  value={leaveForm.dateFrom}
                  onChange={(e) => {
                    const from = e.target.value;
                    setLeaveForm((prev) => ({
                      ...prev,
                      dateFrom: from,
                      dateTo: prev.dateTo < from ? from : prev.dateTo,
                    }));
                  }}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">إلى</label>
                <input
                  type="date"
                  value={leaveForm.dateTo}
                  min={leaveForm.dateFrom}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      dateTo: e.target.value,
                    }))
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              {leaveForm.dateFrom &&
                leaveForm.dateTo &&
                leaveForm.dateTo >= leaveForm.dateFrom && (
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {Math.round(
                      (new Date(leaveForm.dateTo).getTime() -
                        new Date(leaveForm.dateFrom).getTime()) /
                        86400000,
                    ) + 1}{" "}
                    يوم
                  </div>
                )}
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-muted-foreground">ملاحظة</label>
                <input
                  type="text"
                  value={leaveForm.note}
                  placeholder="اختياري"
                  onChange={(e) =>
                    setLeaveForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            {leaveMsg && (
              <p
                className={`text-sm ${leaveMsg.startsWith("✓") ? "text-success" : "text-destructive"}`}
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
            >
              {leaveMut.isPending ? "جاري الإرسال…" : "إرسال الطلب"}
            </Button>
          </CardContent>
        </Card>

        {/* Shift swap/change request */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-secondary" />
              طلب تغيير / تبديل موعد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                نوع التغيير المطلوب
              </label>
              <select
                value={shiftRequestForm.requestType}
                onChange={(e) =>
                  setShiftRequestForm({
                    ...shiftRequestForm,
                    requestType: e.target.value as any,
                  })
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="daily">يومي (مؤقت لفترة)</option>
                <option value="weekly">أسبوعي (أيام عمل ووردية)</option>
                <option value="monthly">شهري (ربط بدورة كاملة)</option>
                <option value="swap">تبادل مع زميل</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Daily/Weekly/Monthly/Swap common dates */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  من تاريخ
                </label>
                <input
                  type="date"
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
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {(shiftRequestForm.requestType === "daily" ||
                shiftRequestForm.requestType === "swap") && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    حتى تاريخ (شامل)
                  </label>
                  <input
                    type="date"
                    value={shiftRequestForm.dateTo}
                    min={shiftRequestForm.dateFrom}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        dateTo: e.target.value,
                      })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}

              {shiftRequestForm.requestType === "monthly" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    حتى تاريخ (اختياري)
                  </label>
                  <input
                    type="date"
                    value={shiftRequestForm.dateTo}
                    min={shiftRequestForm.dateFrom}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        dateTo: e.target.value,
                      })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Daily / Weekly Shift Selection */}
              {(shiftRequestForm.requestType === "daily" ||
                shiftRequestForm.requestType === "weekly") && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs text-muted-foreground">
                    الوردية المطلوبة
                  </label>
                  <select
                    value={shiftRequestForm.newShiftId || ""}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        newShiftId: e.target.value
                          ? parseInt(e.target.value)
                          : 0,
                      })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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

              {/* Weekly Days Selection */}
              {shiftRequestForm.requestType === "weekly" && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs text-muted-foreground">
                    أيام العمل المطلوبة
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DAYS_FULL.map((name, index) => {
                      const active = weeklyDays.has(index);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleWeeklyDay(index)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                            active
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "bg-background border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Cycle Selection */}
              {shiftRequestForm.requestType === "monthly" && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs text-muted-foreground">
                    الدورة المطلوبة
                  </label>
                  <select
                    value={shiftRequestForm.cycleId || ""}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        cycleId: e.target.value ? parseInt(e.target.value) : 0,
                      })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— اختر الدورة —</option>
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

              {/* Swap Employee Selection */}
              {shiftRequestForm.requestType === "swap" && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs text-muted-foreground">
                    الزميل المراد التبادل معه
                  </label>
                  <select
                    value={shiftRequestForm.swapEmpCd}
                    onChange={(e) =>
                      setShiftRequestForm({
                        ...shiftRequestForm,
                        swapEmpCd: e.target.value,
                      })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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

              {/* Note */}
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-muted-foreground">
                  ملاحظة أو سبب الطلب
                </label>
                <input
                  type="text"
                  value={shiftRequestForm.note}
                  placeholder="اختياري"
                  onChange={(e) =>
                    setShiftRequestForm({
                      ...shiftRequestForm,
                      note: e.target.value,
                    })
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {shiftRequestMsg && (
              <p
                className={`text-sm ${shiftRequestMsg.startsWith("✓") ? "text-success" : "text-destructive"}`}
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
            >
              {shiftRequestMut.isPending ? "جاري الإرسال…" : "إرسال الطلب"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
