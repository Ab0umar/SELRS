import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  RefreshCw,
  Users,
  ArrowLeftRight,
  CheckSquare,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

const DAYS_SH = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
const DAYS_FULL = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function ScheduleSwap() {
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState<"change" | "swap">("change");

  // State for single employee change
  const [empCd, setEmpCd] = useState("");
  const [changeType, setChangeType] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );

  // Daily parameters
  const todayStr = new Date().toISOString().split("T")[0];
  const [dailyFrom, setDailyFrom] = useState(todayStr);
  const [dailyTo, setDailyTo] = useState(todayStr);
  const [dailyShiftId, setDailyShiftId] = useState<number>(0);

  // Weekly parameters
  const [weeklyFrom, setWeeklyFrom] = useState(todayStr);
  const [weeklyShiftId, setWeeklyShiftId] = useState<number>(0);
  const [weeklyDays, setWeeklyDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4]),
  ); // Sun-Thu default

  // Monthly parameters
  const [monthlyFrom, setMonthlyFrom] = useState(todayStr);
  const [monthlyTo, setMonthlyTo] = useState("");
  const [monthlyCycleId, setMonthlyCycleId] = useState<number>(0);

  // State for swap
  const [swapEmpA, setSwapEmpA] = useState("");
  const [swapEmpB, setSwapEmpB] = useState("");
  const [swapFrom, setSwapFrom] = useState(todayStr);
  const [swapTo, setSwapTo] = useState(todayStr);

  // Queries
  const employeesQuery = (trpc as any).attendance.employeesList.useQuery();
  const shiftsQuery = (trpc as any).attendance.listShifts.useQuery();
  const cyclesQuery = (trpc as any).attendance.listShiftCycles.useQuery();
  const assignmentsQuery = (trpc as any).attendance.listAssignments.useQuery(
    {},
  );

  const pendingRequestsQuery = (
    trpc as any
  ).attendance.listShiftChangeRequests.useQuery({ status: "pending" });

  // Mutations
  const tempChangeMutation = (
    trpc as any
  ).attendance.tempChangeShift.useMutation({
    onSuccess: () => {
      toast.success("تم تطبيق التغيير اليومي للوردية بنجاح");
      assignmentsQuery.refetch();
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const assignShiftMutation = trpc.attendance.assignShift.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين الجدول الأسبوعي بنجاح");
      assignmentsQuery.refetch();
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const assignCycleMutation = (trpc as any).attendance.assignCycle.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين الدورة الشهرية بنجاح");
      assignmentsQuery.refetch();
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const swapMutation = trpc.attendance.swapShifts.useMutation({
    onSuccess: () => {
      toast.success("تم تبادل الورديات بنجاح");
      assignmentsQuery.refetch();
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const approveRequestMut = (
    trpc as any
  ).attendance.approveShiftChangeRequest.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد الطلب وتطبيق التغييرات");
      pendingRequestsQuery.refetch();
      assignmentsQuery.refetch();
    },
    onError: (e: any) => toast.error("خطأ أثناء الاعتماد: " + e.message),
  });

  const rejectRequestMut = (
    trpc as any
  ).attendance.rejectShiftChangeRequest.useMutation({
    onSuccess: () => {
      toast.success("تم رفض الطلب");
      pendingRequestsQuery.refetch();
    },
    onError: (e: any) => toast.error("خطأ أثناء الرفض: " + e.message),
  });

  const employees = employeesQuery.data?.employees ?? [];
  const shifts = shiftsQuery.data ?? [];
  const cycles = cyclesQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];

  // Helper functions
  const toggleWeeklyDay = (dayIndex: number) => {
    const updated = new Set(weeklyDays);
    if (updated.has(dayIndex)) {
      updated.delete(dayIndex);
    } else {
      updated.add(dayIndex);
    }
    setWeeklyDays(updated);
  };

  const getDaysMask = (daysSet: Set<number>): number => {
    return Array.from(daysSet).reduce((m, d) => m | (1 << d), 0);
  };

  function handleDailySubmit() {
    if (!empCd) return toast.error("الرجاء اختيار الموظف");
    if (!dailyShiftId) return toast.error("الرجاء اختيار الوردية الجديدة");
    if (dailyTo < dailyFrom)
      return toast.error("تاريخ النهاية يجب أن يكون بعد البداية");

    tempChangeMutation.mutate({
      empCd,
      newShiftId: dailyShiftId,
      dateFrom: dailyFrom,
      dateTo: dailyTo,
    });
  }

  function handleWeeklySubmit() {
    if (!empCd) return toast.error("الرجاء اختيار الموظف");
    if (!weeklyShiftId) return toast.error("الرجاء اختيار الوردية");
    if (weeklyDays.size === 0)
      return toast.error("الرجاء اختيار يوم عمل واحد على الأقل");

    assignShiftMutation.mutate({
      empCd,
      shiftId: weeklyShiftId,
      effectiveFrom: weeklyFrom,
      weekdayMask: getDaysMask(weeklyDays),
    });
  }

  function handleMonthlySubmit() {
    if (!empCd) return toast.error("الرجاء اختيار الموظف");
    if (!monthlyCycleId) return toast.error("الرجاء اختيار الدورة");

    assignCycleMutation.mutate({
      empCds: [empCd],
      cycleId: monthlyCycleId,
      effectiveFrom: monthlyFrom,
      effectiveTo: monthlyTo || undefined,
    });
  }

  function handleSwapSubmit() {
    if (!swapEmpA || !swapEmpB)
      return toast.error("الرجاء اختيار الموظفين الاثنين");
    if (swapEmpA === swapEmpB)
      return toast.error("لا يمكن اختيار نفس الموظف مرتين");
    if (swapTo < swapFrom)
      return toast.error("تاريخ النهاية يجب أن يكون بعد البداية");

    swapMutation.mutate({
      empCdA: swapEmpA,
      empCdB: swapEmpB,
      dateFrom: swapFrom,
      dateTo: swapTo,
    });
  }

  const activeAssignment = assignments.find((a: any) => a.empCd === empCd);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Pending Shift Change & Swap Requests ── */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            طلبات تغيير وتبديل المواعيد قيد الانتظار
          </CardTitle>
          <CardDescription>
            طلبات تغيير مواعيد العمل أو تبادل الورديات المقدمة من الموظفين
            بانتظار الاعتماد.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequestsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !pendingRequestsQuery.data?.length ? (
            <div className="py-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
              لا توجد طلبات تغيير مواعيد معلقة حالياً.
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {pendingRequestsQuery.data.map((r: any) => {
                const typeAr =
                  r.requestType === "daily"
                    ? "يومي (مؤقت)"
                    : r.requestType === "weekly"
                      ? "أسبوعي"
                      : r.requestType === "monthly"
                        ? "شهري"
                        : "تبادل مع زميل";

                let details = "";
                if (r.requestType === "daily" || r.requestType === "weekly") {
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
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {r.empName || "—"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {r.empCd}
                        </div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                        {typeAr}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-center text-xs">
                      <div>
                        <div className="text-muted-foreground">من</div>
                        <div className="font-mono font-medium text-foreground">
                          {r.dateFrom}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">إلى</div>
                        <div className="font-mono font-medium text-foreground">
                          {r.dateTo || "—"}
                        </div>
                      </div>
                    </div>
                    {details && (
                      <div className="mt-2 text-xs text-foreground">
                        {details}
                      </div>
                    )}
                    {r.note && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        ملاحظة: {r.note}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end gap-1.5 border-t border-border/60 pt-2">
                      <Button
                        size="sm"
                        className="h-9 px-3 text-xs bg-success hover:bg-success/90"
                        onClick={() =>
                          approveRequestMut.mutate({ requestId: r.id })
                        }
                        disabled={approveRequestMut.isPending}
                      >
                        اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-9 px-3 text-xs"
                        onClick={() => {
                          const note = prompt("ملاحظة الرفض (اختياري):");
                          if (note !== null) {
                            rejectRequestMut.mutate({ requestId: r.id, note });
                          }
                        }}
                        disabled={rejectRequestMut.isPending}
                      >
                        رفض
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الموظف
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      نوع الطلب
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      تاريخ البدء
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      تاريخ الانتهاء
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      التفاصيل
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      ملاحظة
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequestsQuery.data.map((r: any) => {
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
                          <span className="block font-mono text-xs text-muted-foreground">
                            {r.empCd}
                          </span>
                          <span>{r.empName || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-foreground">{typeAr}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.dateFrom}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.dateTo || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground text-xs">
                          {details}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {r.note || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs bg-success hover:bg-success/90"
                              onClick={() =>
                                approveRequestMut.mutate({ requestId: r.id })
                              }
                              disabled={approveRequestMut.isPending}
                            >
                              اعتماد
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-3 text-xs"
                              onClick={() => {
                                const note = prompt("ملاحظة الرفض (اختياري):");
                                if (note !== null) {
                                  rejectRequestMut.mutate({
                                    requestId: r.id,
                                    note,
                                  });
                                }
                              }}
                              disabled={rejectRequestMut.isPending}
                            >
                              رفض
                            </Button>
                          </div>
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

      {/* Sub Tabs Selection */}
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setSubTab("change")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            subTab === "change"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock size={16} />
          تغيير جدول موظف
        </button>
        <button
          onClick={() => setSubTab("swap")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            subTab === "swap"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeftRight size={16} />
          تبديل المواعيد بين موظفين
        </button>
      </div>

      {/* ── Tab 1: Single Employee Schedule Change ── */}
      {subTab === "change" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold">تغيير جدول موظف</CardTitle>
            <CardDescription>
              تغيير أو جدولة مواعيد الموظف بنمط يومي (تبديل مؤقت لفترة)، أسبوعي
              (تعديل أيام العمل والوردية)، أو شهري (ربطه بدورة وردية كاملة).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Employee selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  اختر الموظف
                </label>
                <select
                  value={empCd}
                  onChange={(e) => setEmpCd(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">— اختر الموظف —</option>
                  {employees.map((emp: any) => (
                    <option key={emp.empCd} value={emp.empCd}>
                      {emp.fullName} ({emp.empCd})
                    </option>
                  ))}
                </select>
                {empCd && activeAssignment && (
                  <p className="text-xs text-muted-foreground">
                    الجدول النشط حالياً:{" "}
                    <span className="font-semibold text-foreground">
                      {activeAssignment.shiftName}
                    </span>
                  </p>
                )}
              </div>

              {/* Change Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  نوع التغيير
                </label>
                <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
                  {(["daily", "weekly", "monthly"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setChangeType(type)}
                      className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all ${
                        changeType === type
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type === "daily"
                        ? "يومي (مؤقت)"
                        : type === "weekly"
                          ? "أسبوعي (أيام/وردية)"
                          : "شهري (دورة)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mode-specific Fields */}
            {empCd && (
              <div className="rounded-xl border border-muted-foreground/15 bg-muted/20 p-5 space-y-6">
                {/* 1. Daily (tempChangeShift) */}
                {changeType === "daily" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold">
                        تغيير مؤقت (يومي) لفترة محددة
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          من تاريخ
                        </label>
                        <DateInput
                          value={dailyFrom}
                          onChange={(e) => {
                            setDailyFrom(e.target.value);
                            if (dailyTo < e.target.value)
                              setDailyTo(e.target.value);
                          }}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          حتى تاريخ (شامل)
                        </label>
                        <DateInput
                          value={dailyTo}
                          min={dailyFrom}
                          onChange={(e) => setDailyTo(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          الوردية البديلة
                        </label>
                        <select
                          value={dailyShiftId || ""}
                          onChange={(e) =>
                            setDailyShiftId(
                              e.target.value ? parseInt(e.target.value) : 0,
                            )
                          }
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">— اختر الوردية البديلة —</option>
                          {shifts.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.startTime} - {s.endTime})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button
                      onClick={handleDailySubmit}
                      disabled={tempChangeMutation.isPending}
                      className="mt-2"
                    >
                      {tempChangeMutation.isPending
                        ? "جاري التطبيق..."
                        : "حفظ التغيير اليومي"}
                    </Button>
                  </div>
                )}

                {/* 2. Weekly (assignShift / weekdayMask) */}
                {changeType === "weekly" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold">
                        تعديل جدول العمل الأسبوعي والوردية
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          الوردية المعتمدة
                        </label>
                        <select
                          value={weeklyShiftId || ""}
                          onChange={(e) =>
                            setWeeklyShiftId(
                              e.target.value ? parseInt(e.target.value) : 0,
                            )
                          }
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">— اختر الوردية —</option>
                          {shifts.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.startTime} - {s.endTime})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          تاريخ بدء التطبيق
                        </label>
                        <DateInput
                          value={weeklyFrom}
                          onChange={(e) => setWeeklyFrom(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Weekdays selection */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-semibold text-muted-foreground block">
                        أيام العمل الأسبوعية
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_FULL.map((name, index) => {
                          const active = weeklyDays.has(index);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => toggleWeeklyDay(index)}
                              className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${
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

                    <Button
                      onClick={handleWeeklySubmit}
                      disabled={assignShiftMutation.isPending}
                      className="mt-2"
                    >
                      {assignShiftMutation.isPending
                        ? "جاري التطبيق..."
                        : "حفظ التغيير الأسبوعي"}
                    </Button>
                  </div>
                )}

                {/* 3. Monthly (assignCycle) */}
                {changeType === "monthly" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold">
                        جدولة دورة وردية شهرية
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          اختر الدورة
                        </label>
                        <select
                          value={monthlyCycleId || ""}
                          onChange={(e) =>
                            setMonthlyCycleId(
                              e.target.value ? parseInt(e.target.value) : 0,
                            )
                          }
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          تاريخ البدء
                        </label>
                        <DateInput
                          value={monthlyFrom}
                          onChange={(e) => setMonthlyFrom(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          تاريخ الانتهاء (اختياري)
                        </label>
                        <DateInput
                          value={monthlyTo}
                          onChange={(e) => setMonthlyTo(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleMonthlySubmit}
                      disabled={assignCycleMutation.isPending}
                      className="mt-2"
                    >
                      {assignCycleMutation.isPending
                        ? "جاري التطبيق..."
                        : "حفظ التغيير الشهري"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Shift Swap Between Two Employees ── */}
      {subTab === "swap" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              تبادل وردية مؤقت بين موظفين
            </CardTitle>
            <CardDescription>
              تبديل كامل للورديات وأيام العمل بين موظفين اثنين لفترة زمنية
              محددة. بمجرد انتهاء الفترة، يعود كل موظف لورديته الأصلية تلقائياً.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Date range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold">من تاريخ</label>
                <DateInput
                  value={swapFrom}
                  onChange={(e) => {
                    setSwapFrom(e.target.value);
                    if (swapTo < e.target.value) setSwapTo(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold">
                  حتى تاريخ (شامل)
                </label>
                <DateInput
                  value={swapTo}
                  min={swapFrom}
                  onChange={(e) => setSwapTo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Employees */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const key = side === "A" ? "empCdA" : "empCdB";
                const label = side === "A" ? "الموظف الأول" : "الموظف الثاني";
                const val = side === "A" ? swapEmpA : swapEmpB;
                const setVal = side === "A" ? setSwapEmpA : setSwapEmpB;
                const assignment = assignments.find(
                  (a: any) => a.empCd === val,
                );

                return (
                  <div
                    key={side}
                    className="space-y-2 border border-border bg-muted/10 rounded-xl p-4"
                  >
                    <label className="block text-sm font-semibold">
                      {label}
                    </label>
                    <select
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="">اختر موظف</option>
                      {employees.map((emp: any) => (
                        <option key={emp.empCd} value={emp.empCd}>
                          {emp.fullName} ({emp.empCd})
                        </option>
                      ))}
                    </select>

                    {val && assignment && (
                      <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs space-y-1 mt-2">
                        <div className="font-semibold text-foreground">
                          الوردية الحالية: {assignment.shiftName}
                        </div>
                        <div className="text-muted-foreground">
                          أيام العمل:{" "}
                          {DAYS_SH.filter(
                            (_, i) =>
                              (assignment.weekdayMask ?? 127) & (1 << i),
                          ).join(" ")}
                        </div>
                      </div>
                    )}
                    {val && !assignment && (
                      <p className="text-xs text-destructive mt-2">
                        ⚠️ لا توجد وردية نشطة مسجلة لهذا الموظف
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary details */}
            {swapEmpA &&
              swapEmpB &&
              swapEmpA !== swapEmpB &&
              (() => {
                const aAssign = assignments.find(
                  (a: any) => a.empCd === swapEmpA,
                );
                const bAssign = assignments.find(
                  (a: any) => a.empCd === swapEmpB,
                );
                if (!aAssign || !bAssign) return null;
                const days =
                  Math.round(
                    (new Date(swapTo).getTime() -
                      new Date(swapFrom).getTime()) /
                      86400000,
                  ) + 1;
                return (
                  <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm space-y-2">
                    <div className="font-bold text-foreground mb-1">
                      ملخص عملية التبادل ({days} {days === 1 ? "يوم" : "أيام"}):
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {aAssign.empName}
                      </span>
                      <ArrowLeftRight size={13} className="text-primary" />
                      <span className="text-primary font-medium">
                        {bAssign.shiftName}
                      </span>
                      <span className="text-xs">
                        ({swapFrom} ← {swapTo})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {bAssign.empName}
                      </span>
                      <ArrowLeftRight size={13} className="text-primary" />
                      <span className="text-primary font-medium">
                        {aAssign.shiftName}
                      </span>
                      <span className="text-xs">
                        ({swapFrom} ← {swapTo})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1">
                      ملاحظة: بعد انتهاء يوم {swapTo}، سيعود كلا الموظفين
                      تلقائياً إلى ورديتهما الأصلية.
                    </div>
                  </div>
                );
              })()}

            <Button
              onClick={handleSwapSubmit}
              disabled={
                !swapEmpA ||
                !swapEmpB ||
                swapEmpA === swapEmpB ||
                !swapFrom ||
                !swapTo ||
                swapMutation.isPending
              }
              className="gap-2 w-full sm:w-auto"
            >
              <ArrowLeftRight size={15} />
              {swapMutation.isPending
                ? "جاري التبادل..."
                : "تأكيد عملية التبادل"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
