import { useRoute } from "wouter";
import { ROUTES } from "../../../../shared/routes";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Hourglass,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";

const todayStr = new Date().toISOString().split("T")[0];
const firstOfMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
)
  .toISOString()
  .split("T")[0];
const thisYear = new Date().getFullYear();
const DAYS_FULL = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const STATUS_AR: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  leave: "إجازة",
  partial: "جزئي",
  holiday: "عطلة",
  missing_checkout: "بدون خروج",
};
const STATUS_CLS: Record<string, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  leave: "bg-primary/10 text-primary",
  partial: "bg-warning/10 text-warning",
  holiday: "bg-secondary/10 text-secondary",
  missing_checkout: "bg-muted text-muted-foreground",
};

function fmt(date: string | Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmployeeDetail() {
  const [, params] = useRoute("/attendance/employees/:empCd");
  const empCd = params?.empCd ?? "";

  // Date range for attendance history
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    toDate: todayStr,
  });

  // Permission request form
  const [permForm, setPermForm] = useState({
    date: todayStr,
    type: "out" as "in" | "out",
    durationMinutes: 60,
    notAffectSalary: false,
    note: "",
  });

  // Leave request form
  const [leaveForm, setLeaveForm] = useState({
    dateFrom: todayStr,
    dateTo: todayStr,
    type: "annual" as "annual" | "sick",
    note: "",
  });

  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);

  // Shift change request form state
  const [shiftForm, setShiftForm] = useState({
    requestType: "daily" as "daily" | "weekly" | "monthly" | "swap",
    newShiftId: 0,
    weekdayMask: 62, // default Sun-Thu
    cycleId: 0,
    swapEmpCd: "",
    dateFrom: todayStr,
    dateTo: todayStr,
    note: "",
  });
  const [weeklyDays, setWeeklyDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4]),
  );
  const [shiftMsg, setShiftMsg] = useState<string | null>(null);

  const toggleWeeklyDay = (dayIndex: number) => {
    const updated = new Set(weeklyDays);
    if (updated.has(dayIndex)) {
      updated.delete(dayIndex);
    } else {
      updated.add(dayIndex);
    }
    setWeeklyDays(updated);
    setShiftForm((prev) => ({
      ...prev,
      weekdayMask: Array.from(updated).reduce((m, d) => m | (1 << d), 0),
    }));
  };

  // Queries
  const employeeQuery = (trpc as any).attendance.employeesList.useQuery();
  const employee = employeeQuery.data?.employees?.find(
    (e: any) => e.empCd === empCd,
  );

  const dailyQuery = (trpc as any).attendance.dailyByEmployee.useQuery(
    { empCd, ...dateRange },
    { enabled: !!empCd },
  );

  const leaveBalanceQuery = (trpc as any).attendance.leaveBalance.useQuery(
    { empCd, year: thisYear },
    { enabled: !!empCd },
  );

  const permReportQuery = (trpc as any).attendance.permissionReport.useQuery(
    { from: firstOfMonth, to: todayStr },
    { enabled: !!empCd },
  );

  const permListQuery = (trpc as any).attendance.listPermissions.useQuery(
    { empCd },
    { enabled: !!empCd },
  );

  const shiftRequestsQuery = (
    trpc as any
  ).attendance.listShiftChangeRequests.useQuery(
    { empCd },
    { enabled: !!empCd },
  );

  const shiftsQuery = (trpc as any).attendance.listShifts.useQuery();
  const cyclesQuery = (trpc as any).attendance.listShiftCycles.useQuery();

  const shifts = shiftsQuery.data ?? [];
  const cycles = cyclesQuery.data ?? [];
  const employees = employeeQuery.data?.employees ?? [];

  // Mutations
  const createPermMut = (trpc as any).attendance.createPermission.useMutation({
    onSuccess: () => {
      setPermMsg("✓ تم حفظ الإذن");
      permReportQuery.refetch();
      permListQuery.refetch();
      setPermForm({
        date: todayStr,
        type: "out",
        durationMinutes: 60,
        notAffectSalary: false,
        note: "",
      });
      dailyQuery.refetch();
    },
    onError: (err: any) => setPermMsg(`✗ ${err.message}`),
  });

  const createLeaveMut = (trpc as any).attendance.createLeave.useMutation({
    onSuccess: () => {
      setLeaveMsg("✓ تم حفظ الإجازة");
      leaveBalanceQuery.refetch();
      setLeaveForm({
        dateFrom: todayStr,
        dateTo: todayStr,
        type: "annual",
        note: "",
      });
      dailyQuery.refetch();
    },
    onError: (err: any) => setLeaveMsg(`✗ ${err.message}`),
  });

  const createShiftMut = (
    trpc as any
  ).attendance.createShiftChangeRequest.useMutation({
    onSuccess: () => {
      setShiftMsg("✓ تم حفظ طلب تغيير الموعد");
      shiftRequestsQuery.refetch();
      setShiftForm({
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
    onError: (err: any) => setShiftMsg(`✗ ${err.message}`),
  });

  const approveShiftMut = (
    trpc as any
  ).attendance.approveShiftChangeRequest.useMutation({
    onSuccess: () => {
      shiftRequestsQuery.refetch();
      dailyQuery.refetch();
      toast.success("تم اعتماد تعديل الموعد بنجاح");
    },
    onError: (err: any) => toast.error(`خطأ أثناء الاعتماد: ${err.message}`),
  });

  const rejectShiftMut = (
    trpc as any
  ).attendance.rejectShiftChangeRequest.useMutation({
    onSuccess: () => {
      shiftRequestsQuery.refetch();
      toast.success("تم رفض تعديل الموعد");
    },
    onError: (err: any) => toast.error(`خطأ أثناء الرفض: ${err.message}`),
  });

  // Compute current-month stats from daily records
  const thisMonthPrefix = firstOfMonth.slice(0, 7);
  const monthlyRecords = (dailyQuery.data ?? []).filter((r: any) =>
    String(r.workDate).startsWith(thisMonthPrefix),
  );
  const monthStats = {
    lateMins: monthlyRecords.reduce(
      (s: number, r: any) => s + (r.lateMinutes ?? 0),
      0,
    ),
    earlyMins: monthlyRecords.reduce(
      (s: number, r: any) => s + (r.earlyLeaveMin ?? 0),
      0,
    ),
  };

  // Permission stats for current month
  const empPermRow = (permReportQuery.data ?? []).find(
    (r: any) => r.empCd === empCd,
  );
  const permStats = {
    inMins: empPermRow?.totalInMins ?? 0,
    outMins: empPermRow?.totalOutMins ?? 0,
    inCount: empPermRow?.inCount ?? 0,
    outCount: empPermRow?.outCount ?? 0,
  };

  const leaveBalance = leaveBalanceQuery.data;

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (!empCd) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        الموظف غير موجود
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={ROUTES.attendanceEmployees}
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" /> الموظفون
          </Link>
          {employee ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">
                {employee.fullName}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                {employee.empCd} · {employee.department || "بدون قسم"}
              </p>
            </>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
        </div>
        {employee && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
          >
            {employee.active ? "نشط" : "غير نشط"}
          </span>
        )}
      </div>

      {/* ── Info Card ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column: stats */}
        <div className="space-y-4">
          {/* Leave balance */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                رصيد الإجازات {thisYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {leaveBalanceQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : leaveBalance ? (
                <>
                  {/* Annual */}
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      إجازة سنوية
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-foreground">
                          {leaveBalance.annualAllocation}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          المستحق
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-destructive">
                          {leaveBalance.usedDays}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          مستخدم
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-success">
                          {leaveBalance.remainingDays}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          متبقي
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (leaveBalance.usedDays / leaveBalance.annualAllocation) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly stats */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Clock className="h-4 w-4 text-warning" />
                إحصائيات هذا الشهر
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-3">
                <StatPill
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="تأخير"
                  value={`${monthStats.lateMins} د`}
                  tone="destructive"
                />
                <StatPill
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  label="مغادرة مبكرة"
                  value={`${monthStats.earlyMins} د`}
                  tone="warning"
                />
                <StatPill
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  label={`إذن دخول (${permStats.inCount})`}
                  value={`${permStats.inMins} د`}
                  tone="primary"
                />
                <StatPill
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  label={`إذن خروج (${permStats.outCount})`}
                  value={`${permStats.outMins} د`}
                  tone="secondary"
                />
                <div className="col-span-2">
                  <StatPill
                    icon={<Hourglass className="h-3.5 w-3.5" />}
                    label="إجمالي الخصومات (تأخير + مبكر)"
                    value={`${monthStats.lateMins + monthStats.earlyMins} د`}
                    tone="muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: request forms */}
        <div className="space-y-4">
          {/* Permission request */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                طلب إذن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* Type toggle */}
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["out", "in"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPermForm({ ...permForm, type: t })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      permForm.type === t
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "out" ? "إذن خروج" : "إذن دخول"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    التاريخ
                  </label>
                  <DateInput
                    value={permForm.date}
                    onChange={(e) =>
                      setPermForm({ ...permForm, date: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    المدة (دقيقة)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={permForm.durationMinutes}
                    onChange={(e) =>
                      setPermForm({
                        ...permForm,
                        durationMinutes: parseInt(e.target.value) || 60,
                      })
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  ملاحظة
                </label>
                <input
                  type="text"
                  value={permForm.note}
                  onChange={(e) =>
                    setPermForm({ ...permForm, note: e.target.value })
                  }
                  placeholder="اختياري"
                  className={inputCls}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permForm.notAffectSalary}
                  onChange={(e) =>
                    setPermForm({ ...permForm, notAffectSalary: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border accent-secondary"
                />
                <span className="text-sm text-muted-foreground">لا يؤثر على الراتب</span>
              </label>

              <Button
                size="sm"
                onClick={() => {
                  setPermMsg(null);
                  createPermMut.mutate({ empCd, ...permForm });
                }}
                disabled={createPermMut.isPending}
                className="w-full"
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                {createPermMut.isPending ? "جارٍ الحفظ…" : "حفظ الإذن"}
              </Button>

              {permMsg && (
                <p
                  className={`text-center text-xs font-medium ${permMsg.startsWith("✓") ? "text-success" : "text-destructive"}`}
                >
                  {permMsg}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Permissions list */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                سجل الأذونات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {permListQuery.isLoading ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>
              ) : !permListQuery.data?.length ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد أذونات مسجلة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-right">التاريخ</th>
                        <th className="px-3 py-2 text-right">النوع</th>
                        <th className="px-3 py-2 text-right">المدة</th>
                        <th className="px-3 py-2 text-right">يؤثر على الراتب</th>
                        <th className="px-3 py-2 text-right">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(permListQuery.data as any[]).map((p: any) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs">{p.date instanceof Date ? p.date.toLocaleDateString("ar-EG") : String(p.date ?? "")}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${p.type === "out" ? "bg-warning/15 text-warning" : "bg-primary/15 text-foreground"}`}>
                              {p.type === "out" ? "خروج" : "دخول"}
                            </span>
                          </td>
                          <td className="px-3 py-2">{p.durationMinutes} د</td>
                          <td className="px-3 py-2">
                            {p.notAffectSalary
                              ? <span className="text-xs text-muted-foreground">لا</span>
                              : <span className="text-xs text-destructive">نعم</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{p.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave request */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                طلب إجازة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* Type toggle */}
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["annual", "sick"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLeaveForm({ ...leaveForm, type: t })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      leaveForm.type === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "annual" ? "سنوية" : "مرضية"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    من
                  </label>
                  <DateInput
                    value={leaveForm.dateFrom}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, dateFrom: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    إلى
                  </label>
                  <DateInput
                    value={leaveForm.dateTo}
                    min={leaveForm.dateFrom}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, dateTo: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  ملاحظة
                </label>
                <input
                  type="text"
                  value={leaveForm.note}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, note: e.target.value })
                  }
                  placeholder="اختياري"
                  className={inputCls}
                />
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setLeaveMsg(null);
                  createLeaveMut.mutate({ empCd, ...leaveForm });
                }}
                disabled={createLeaveMut.isPending}
                className="w-full"
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                {createLeaveMut.isPending ? "جارٍ الحفظ…" : "حفظ الإجازة"}
              </Button>

              {leaveMsg && (
                <p
                  className={`text-center text-xs font-medium ${leaveMsg.startsWith("✓") ? "text-success" : "text-destructive"}`}
                >
                  {leaveMsg}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Shift swap/change request */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Clock className="h-4 w-4 text-warning" />
                طلب تغيير / تبديل موعد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  نوع التغيير المطلوب
                </label>
                <select
                  value={shiftForm.requestType}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      requestType: e.target.value as any,
                    })
                  }
                  className={inputCls}
                >
                  <option value="daily">يومي (مؤقت لفترة)</option>
                  <option value="weekly">أسبوعي (أيام عمل ووردية)</option>
                  <option value="monthly">شهري (ربط بدورة كاملة)</option>
                  <option value="swap">تبادل مع زميل</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    من تاريخ
                  </label>
                  <DateInput
                    value={shiftForm.dateFrom}
                    onChange={(e) =>
                      setShiftForm({
                        ...shiftForm,
                        dateFrom: e.target.value,
                        dateTo:
                          e.target.value > shiftForm.dateTo
                            ? e.target.value
                            : shiftForm.dateTo,
                      })
                    }
                    className={inputCls}
                  />
                </div>

                {(shiftForm.requestType === "daily" ||
                  shiftForm.requestType === "swap") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      حتى تاريخ
                    </label>
                    <DateInput
                      value={shiftForm.dateTo}
                      min={shiftForm.dateFrom}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, dateTo: e.target.value })
                      }
                      className={inputCls}
                    />
                  </div>
                )}

                {shiftForm.requestType === "monthly" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      حتى تاريخ (اختياري)
                    </label>
                    <DateInput
                      value={shiftForm.dateTo}
                      min={shiftForm.dateFrom}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, dateTo: e.target.value })
                      }
                      className={inputCls}
                    />
                  </div>
                )}

                {(shiftForm.requestType === "daily" ||
                  shiftForm.requestType === "weekly") && (
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      الوردية المطلوبة
                    </label>
                    <select
                      value={shiftForm.newShiftId || ""}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          newShiftId: e.target.value
                            ? parseInt(e.target.value)
                            : 0,
                        })
                      }
                      className={inputCls}
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

                {shiftForm.requestType === "weekly" && (
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
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
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
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

                {shiftForm.requestType === "monthly" && (
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      الدورة المطلوبة
                    </label>
                    <select
                      value={shiftForm.cycleId || ""}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          cycleId: e.target.value
                            ? parseInt(e.target.value)
                            : 0,
                        })
                      }
                      className={inputCls}
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

                {shiftForm.requestType === "swap" && (
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      الزميل المراد التبادل معه
                    </label>
                    <select
                      value={shiftForm.swapEmpCd}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          swapEmpCd: e.target.value,
                        })
                      }
                      className={inputCls}
                    >
                      <option value="">— اختر الزميل —</option>
                      {employees
                        .filter((e: any) => e.empCd !== empCd)
                        .map((emp: any) => (
                          <option key={emp.empCd} value={emp.empCd}>
                            {emp.fullName} ({emp.empCd})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    ملاحظة أو سبب الطلب
                  </label>
                  <input
                    type="text"
                    value={shiftForm.note}
                    placeholder="اختياري"
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, note: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  if (
                    shiftForm.requestType === "daily" &&
                    !shiftForm.newShiftId
                  ) {
                    return setShiftMsg("✗ يرجى تحديد الوردية المطلوبة");
                  }
                  if (
                    shiftForm.requestType === "weekly" &&
                    !shiftForm.newShiftId
                  ) {
                    return setShiftMsg("✗ يرجى تحديد الوردية المطلوبة");
                  }
                  if (
                    shiftForm.requestType === "weekly" &&
                    weeklyDays.size === 0
                  ) {
                    return setShiftMsg("✗ يرجى تحديد يوم عمل واحد على الأقل");
                  }
                  if (
                    shiftForm.requestType === "monthly" &&
                    !shiftForm.cycleId
                  ) {
                    return setShiftMsg("✗ يرجى تحديد الدورة المطلوبة");
                  }
                  if (
                    shiftForm.requestType === "swap" &&
                    !shiftForm.swapEmpCd
                  ) {
                    return setShiftMsg(
                      "✗ يرجى تحديد الزميل المراد التبادل معه",
                    );
                  }

                  setShiftMsg(null);
                  createShiftMut.mutate({ empCd, ...shiftForm });
                }}
                disabled={createShiftMut.isPending}
                className="w-full"
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                {createShiftMut.isPending ? "جاري الحفظ…" : "حفظ الطلب"}
              </Button>

              {shiftMsg && (
                <p
                  className={`text-center text-xs font-medium ${shiftMsg.startsWith("✓") ? "text-success" : "text-destructive"}`}
                >
                  {shiftMsg}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Shift Change Requests List ── */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            طلبات تغيير وتبديل المواعيد
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {shiftRequestsQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !shiftRequestsQuery.data?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا توجد طلبات تغيير مواعيد مسجلة
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      نوع الطلب
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الفترة
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      التفاصيل
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      ملاحظات
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الحالة
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shiftRequestsQuery.data.map((r: any) => {
                    const typeAr =
                      r.requestType === "daily"
                        ? "يومي (مؤقت)"
                        : r.requestType === "weekly"
                          ? "أسبوعي"
                          : r.requestType === "monthly"
                            ? "شهري"
                            : "تبادل مع زميل";

                    let details = "";
                    if (
                      r.requestType === "daily" ||
                      r.requestType === "weekly"
                    ) {
                      details = `الوردية: ${r.newShiftName || "—"}`;
                      if (r.requestType === "weekly" && r.weekdayMask) {
                        const days = [];
                        for (let i = 0; i < 7; i++) {
                          if (r.weekdayMask & (1 << i)) days.push(DAYS_FULL[i]);
                        }
                        details += ` (${days.join("، ")})`;
                      }
                    } else if (r.requestType === "monthly") {
                      details = `الدورة: ${r.cycleName || "—"}`;
                    } else if (r.requestType === "swap") {
                      details = `تبادل مع: ${r.swapEmpName || r.swapEmpCd || "—"}`;
                    }

                    return (
                      <tr
                        key={r.id}
                        className="border-b transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {typeAr}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {r.dateFrom} {r.dateTo ? `← ${r.dateTo}` : ""}
                        </td>
                        <td className="px-4 py-3 text-foreground text-xs">
                          {details}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {r.note || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              r.status === "approved"
                                ? "bg-success/10 text-success"
                                : r.status === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-warning/10 text-warning"
                            }`}
                          >
                            {r.status === "approved"
                              ? "معتمد"
                              : r.status === "rejected"
                                ? "مرفوض"
                                : "قيد الانتظار"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.status === "pending" ? (
                            <div className="flex justify-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-success hover:bg-success/90"
                                onClick={() =>
                                  approveShiftMut.mutate({ requestId: r.id })
                                }
                                disabled={approveShiftMut.isPending}
                              >
                                اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => {
                                  const note = prompt(
                                    "ملاحظة الرفض (اختياري):",
                                  );
                                  if (note !== null) {
                                    rejectShiftMut.mutate({
                                      requestId: r.id,
                                      note,
                                    });
                                  }
                                }}
                                disabled={rejectShiftMut.isPending}
                              >
                                رفض
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Attendance History ── */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              سجل الحضور
            </CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  من
                </label>
                <DateInput
                  value={dateRange.fromDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, fromDate: e.target.value })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  إلى
                </label>
                <DateInput
                  value={dateRange.toDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, toDate: e.target.value })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dailyQuery.refetch()}
              >
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {dailyQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !dailyQuery.data?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد سجلات في هذه الفترة
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      التاريخ
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      دخول
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      خروج
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      عمل (د)
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-destructive">
                      تأخير
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-warning">
                      مبكر
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyQuery.data.map((r: any) => (
                    <tr
                      key={r.workDate}
                      className="border-b transition-colors hover:bg-muted/20"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {r.workDate}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {fmt(r.firstIn)}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {fmt(r.lastOut)}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {r.workedMinutes ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {r.lateMinutes > 0 ? (
                          <span className="font-semibold text-destructive">
                            {r.lateMinutes} د
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {r.earlyLeaveMin > 0 ? (
                          <span className="font-semibold text-warning">
                            {r.earlyLeaveMin} د
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[r.status] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {STATUS_AR[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "secondary" | "warning" | "destructive" | "muted";
}) {
  const cls = {
    primary: "border-primary/20 bg-primary/5 text-primary",
    secondary: "border-secondary/20 bg-secondary/5 text-secondary",
    warning: "border-warning/30 bg-warning/5 text-warning",
    destructive: "border-destructive/20 bg-destructive/5 text-destructive",
    muted: "border-border bg-muted/30 text-muted-foreground",
  }[tone];

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${cls}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        {icon}
        {label}
      </div>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}
