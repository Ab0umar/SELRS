import React, { useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/ui/date-input";
import { useIsCompact } from "@/hooks/useMobile";
import { useLocalToday } from "@/hooks/useLocalToday";
import { hasNotEnded } from "./visibleAssignments";
import { Input } from "@/components/ui/input";

const PERIOD_LABEL: Record<string, string> = {
  day: "أسبوعي (قديم)",
  week: "أسبوعي",
  month: "شهري",
  rotation: "تتابع متكرر",
};

// Week cycle: slotIndex = getDay() value (0=Sun to 6=Sat), displayed Sat→Fri
const WEEK_CYCLE_DAYS = [
  { slotIndex: 6, label: "السبت" },
  { slotIndex: 0, label: "الأحد" },
  { slotIndex: 1, label: "الاثنين" },
  { slotIndex: 2, label: "الثلاثاء" },
  { slotIndex: 3, label: "الأربعاء" },
  { slotIndex: 4, label: "الخميس" },
  { slotIndex: 5, label: "الجمعة" },
];
const WEEK_DAY_BY_INDEX: Record<number, string> = Object.fromEntries(
  WEEK_CYCLE_DAYS.map((d) => [d.slotIndex, d.label]),
);

function getCycleSlotIndexForDate(cycle: any, date: Date): number {
  if (!cycle) return -1;
  if (cycle.period === "month") return date.getDate();
  if (cycle.period === "day" || cycle.period === "week") return date.getDay();
  const configured = (cycle.slots ?? []).map((slot: any) => slot.slotIndex);
  if (configured.length === 0) return -1;
  // Must match the server: pattern length is the last configured day.
  const length = Math.max(...configured) + 1;
  const [year, month, day] = String(cycle.anchorDate)
    .slice(0, 10)
    .split("-")
    .map(Number);
  const anchorDay = Date.UTC(year, month - 1, day) / 86_400_000;
  const currentDay =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  return (((currentDay - anchorDay) % length) + length) % length;
}

function getCycleSlotLabel(period: string, slotIndex: number): string {
  if (period === "day" || period === "week")
    return WEEK_DAY_BY_INDEX[slotIndex] ?? `يوم ${slotIndex}`;
  if (period === "month") return `${slotIndex}`;
  return `${slotIndex + 1}`;
}

interface AssignmentForm {
  empCd: string;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  weekdayMask?: number;
}

interface SwapForm {
  empCdA: string;
  empCdB: string;
  dateFrom: string;
  dateTo: string;
}

interface BulkForm {
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  weekdayMask: number;
  selectedEmps: string[];
}

const WEEKDAYS = [
  { bit: 0, label: "أح", fullLabel: "الأحد" },
  { bit: 1, label: "إث", fullLabel: "الاثنين" },
  { bit: 2, label: "ث", fullLabel: "الثلاثاء" },
  { bit: 3, label: "أر", fullLabel: "الأربعاء" },
  { bit: 4, label: "خ", fullLabel: "الخميس" },
  { bit: 5, label: "ج", fullLabel: "الجمعة" },
  { bit: 6, label: "س", fullLabel: "السبت" },
];

// weekdayMask is managed from the Employees page, not here

export default function ShiftAssignments() {
  const today = useLocalToday();
  const isMobile = useIsCompact();
  const [tab, setTab] = useState<"assignments" | "cycles" | "swap">(
    "assignments",
  );
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swap, setSwap] = useState<SwapForm>({
    empCdA: "",
    empCdB: "",
    dateFrom: today,
    dateTo: today,
  });

  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: "",
    period: "week" as "day" | "week" | "month" | "rotation",
    anchorDate: today,
    slots: {} as Record<number, number>, // slotIndex → shiftId (0 = none)
  });
  const [editingCycleId, setEditingCycleId] = useState<number | null>(null);
  const [editingCycleAssignId, setEditingCycleAssignId] = useState<
    number | null
  >(null);
  const [editCycleAssignRow, setEditCycleAssignRow] = useState<{
    cycleId: number;
    effectiveFrom: string;
    effectiveTo: string;
  }>({ cycleId: 0, effectiveFrom: today, effectiveTo: "" });
  const [showCycleAssignForm, setShowCycleAssignForm] = useState(false);
  const [cycleAssignForm, setCycleAssignForm] = useState({
    empCds: [] as string[],
    cycleId: 0,
    effectiveFrom: today,
    effectiveTo: "",
  });
  const [form, setForm] = useState<AssignmentForm>({
    empCd: "",
    shiftId: 0,
    effectiveFrom: today,
    weekdayMask: 127,
  });
  const [bulk, setBulk] = useState<BulkForm>({
    shiftId: 0,
    effectiveFrom: today,
    weekdayMask: 31,
    selectedEmps: [],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<{
    shiftId: number;
    effectiveFrom: string;
    effectiveTo?: string;
    weekdayMask: number;
  }>({
    shiftId: 0,
    effectiveFrom: today,
    weekdayMask: 127,
  });

  const listAssignmentsQuery = trpc.attendance.listAssignments.useQuery();
  const listEmployeesQuery = trpc.attendance.employeesList.useQuery();
  const listShiftsQuery = trpc.attendance.listShifts.useQuery();
  const listCyclesQuery = trpc.attendance.listShiftCycles.useQuery();
  const listCycleAssignmentsQuery =
    trpc.attendance.listCycleAssignments.useQuery();

  const employees: any[] = (listEmployeesQuery.data?.employees ?? []) as any;
  const shifts: any[] = (listShiftsQuery.data ?? []) as any;
  const assignments = (listAssignmentsQuery.data ?? []).filter((assignment) =>
    hasNotEnded(assignment, today),
  );
  const cycles: any[] = (listCyclesQuery.data ?? []) as any;
  const cycleAssignments = (listCycleAssignmentsQuery.data ?? []).filter(
    (assignment: { effectiveTo?: string | null }) => hasNotEnded(assignment, today),
  );

  const resetSingleForm = () =>
    setForm({
      empCd: "",
      shiftId: 0,
      effectiveFrom: today,
      weekdayMask: 127,
    });

  const resetBulkForm = () =>
    setBulk({
      shiftId: 0,
      effectiveFrom: today,
      weekdayMask: 31,
      selectedEmps: [],
    });

  const assignShiftMutation = trpc.attendance.assignShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      resetSingleForm();
      listAssignmentsQuery.refetch();
      toast.success("تم تعيين الوردية");
    },
    onError: (e) => toast.error("تعذر تعيين الوردية: " + e.message),
  });

  const bulkAssignMutation = trpc.attendance.bulkAssignShift.useMutation({
    onSuccess: (res) => {
      setShowBulk(false);
      resetBulkForm();
      listAssignmentsQuery.refetch();
      toast.success(`تم تعيين الوردية لـ ${res.inserted} موظف`);
    },
    onError: (e) => toast.error("تعذر تعيين الوردية للموظفين: " + e.message),
  });

  const updateAssignmentMutation = trpc.attendance.updateAssignment.useMutation(
    {
      onSuccess: () => {
        setEditingId(null);
        listAssignmentsQuery.refetch();
        toast.success("تم التعديل");
      },
      onError: (e) => toast.error("تعذر تعديل التعيين: " + e.message),
    },
  );

  const swapShiftsMutation = trpc.attendance.swapShifts.useMutation({
    onSuccess: () => {
      setSwap({ empCdA: "", empCdB: "", dateFrom: today, dateTo: today });
      listAssignmentsQuery.refetch();
      toast.success("تم تبادل الورديات");
    },
    onError: (e) => toast.error("تعذر تبديل الورديات: " + e.message),
  });

  const createCycleMutation = trpc.attendance.createShiftCycle.useMutation({
    onSuccess: () => {
      setShowCycleForm(false);
      setCycleForm({ name: "", period: "week", anchorDate: today, slots: {} });
      listCyclesQuery.refetch();
      toast.success("تم إنشاء الدورة");
    },
    onError: (e) => toast.error("تعذر إنشاء الدورة: " + e.message),
  });
  const updateCycleMutation = trpc.attendance.updateShiftCycle.useMutation({
    onSuccess: () => {
      setEditingCycleId(null);
      setShowCycleForm(false);
      setCycleForm({ name: "", period: "week", anchorDate: today, slots: {} });
      listCyclesQuery.refetch();
      toast.success("تم التعديل");
    },
    onError: (e) => toast.error("تعذر تعديل الدورة: " + e.message),
  });
  const updateCycleAssignmentMutation =
    trpc.attendance.updateCycleAssignment.useMutation({
      onSuccess: () => {
        setEditingCycleAssignId(null);
        listCycleAssignmentsQuery.refetch();
        toast.success("تم التعديل");
      },
      onError: (e) => toast.error("تعذر تعديل تعيين الدورة: " + e.message),
    });
  const deleteCycleMutation = trpc.attendance.deleteShiftCycle.useMutation({
    onSuccess: () => {
      listCyclesQuery.refetch();
      listCycleAssignmentsQuery.refetch();
      toast.success("تم الحذف");
    },
    onError: (e) => toast.error("تعذر حذف الدورة: " + e.message),
  });
  const assignCycleMutation = trpc.attendance.assignCycle.useMutation({
    onSuccess: (res) => {
      setShowCycleAssignForm(false);
      setCycleAssignForm({
        empCds: [],
        cycleId: 0,
        effectiveFrom: today,
        effectiveTo: "",
      });
      listCycleAssignmentsQuery.refetch();
      toast.success(`تم تعيين الدورة لـ ${res.inserted} موظف`);
    },
    onError: (e) => toast.error("تعذر تعيين الدورة: " + e.message),
  });
  const removeCycleAssignmentMutation =
    trpc.attendance.removeCycleAssignment.useMutation({
      onSuccess: () => {
        listCycleAssignmentsQuery.refetch();
        toast.success("تم الإلغاء");
      },
      onError: (e) => toast.error("تعذر إلغاء تعيين الدورة: " + e.message),
    });

  const deleteAssignmentMutation = trpc.attendance.deleteAssignment.useMutation(
    {
      onSuccess: () => {
        listAssignmentsQuery.refetch();
        toast.success("تم الحذف");
      },
      onError: (e) => toast.error("تعذر حذف التعيين: " + e.message),
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignShiftMutation.mutate({
      ...form,
      shiftId: parseInt(form.shiftId.toString(), 10),
      weekdayMask: form.weekdayMask || 127,
    });
  };

  const startEdit = (assignment: any) => {
    setEditingId(assignment.id);
    setEditRow({
      shiftId: assignment.shiftId,
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo ?? undefined,
      weekdayMask: assignment.weekdayMask ?? 127,
    });
  };

  const startEditCycle = (c: any) => {
    setEditingCycleId(c.id);
    const slotMap: Record<number, number> = {};
    for (const s of c.slots) slotMap[s.slotIndex] = s.shiftId;
    setCycleForm({
      name: c.name,
      // Existing day-cycle rows were weekday-based; map them to the current
      // weekly editor without changing their effective schedule.
      period: c.period === "day" ? "week" : c.period,
      anchorDate: c.anchorDate ?? today,
      slots: slotMap,
    });
    setShowCycleForm(true);
  };

  const toggleEmp = (empCd: string) => {
    setBulk((prev) => ({
      ...prev,
      selectedEmps: prev.selectedEmps.includes(empCd)
        ? prev.selectedEmps.filter((item) => item !== empCd)
        : [...prev.selectedEmps, empCd],
    }));
  };

  const selectAll = () =>
    setBulk((prev) => ({
      ...prev,
      selectedEmps: employees.map((employee) => employee.empCd),
    }));

  const clearAll = () => setBulk((prev) => ({ ...prev, selectedEmps: [] }));


  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap justify-start gap-2">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="عرض توزيع الورديات"
        >
          {(["assignments", "cycles", "swap"] as const).map((t) => (
            <Button variant="bare"
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "assignments"
                ? "التعيينات"
                : t === "cycles"
                  ? "الدورات"
                  : "التبادل"}
            </Button>
          ))}
        </div>
      </div>

      {/* Assignments tab */}
      {tab === "assignments" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowBulk(!showBulk);
              setShowForm(false);
            }}
            className="min-h-11 gap-2 px-4"
          >
            <Users size={16} /> تعيين جماعي
          </Button>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setShowBulk(false);
            }}
            className="min-h-11 gap-2 px-4"
          >
            <Plus size={16} /> تعيين فردي
          </Button>
        </div>
      )}

      {tab === "assignments" && showSwap && (
        <Card>
          <CardHeader>
            <CardTitle>تبادل وردية بين موظفين</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const key = side === "A" ? "empCdA" : "empCdB";
                const label = side === "A" ? "الموظف الأول" : "الموظف الثاني";
                const val = swap[key];
                const assignment = assignments.find(
                  (a: any) =>
                    a.empCd === val &&
                    a.effectiveFrom <= swap.dateFrom &&
                    (!a.effectiveTo || a.effectiveTo >= swap.dateFrom),
                );
                return (
                  <div key={side} className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      {label}
                    </label>
                    <select
                      value={val}
                      onChange={(e) =>
                        setSwap({ ...swap, [key]: e.target.value })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">اختر موظف</option>
                      {employees.map((emp: any) => (
                        <option key={emp.empCd} value={emp.empCd}>
                          {emp.fullName} ({emp.empCd})
                        </option>
                      ))}
                    </select>
                    {val && assignment && (
                      <p className="text-xs text-muted-foreground">
                        الوردية الحالية:{" "}
                        <span className="font-medium text-foreground">
                          {assignment.shiftName}
                        </span>
                      </p>
                    )}
                    {val && !assignment && (
                      <p className="text-xs text-destructive">
                        لا توجد وردية نشطة
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  swapShiftsMutation.mutate({
                    empCdA: swap.empCdA,
                    empCdB: swap.empCdB,
                    dateFrom: swap.dateFrom,
                    dateTo: swap.dateTo,
                  })
                }
                disabled={
                  !swap.empCdA ||
                  !swap.empCdB ||
                  swap.empCdA === swap.empCdB ||
                  swapShiftsMutation.isPending
                }
              >
                <ArrowLeftRight size={15} className="me-1.5" />
                {swapShiftsMutation.isPending ? "جاري التبادل" : "تبادل"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSwap(false)}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "assignments" && showForm && (
        <Card>
          <CardHeader>
            <CardTitle>تعيين وردية لموظف</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="attendance-shift-employee"
                    className="block text-sm font-medium text-foreground"
                  >
                    الموظف
                  </label>
                  <select
                    id="attendance-shift-employee"
                    value={form.empCd}
                    onChange={(e) =>
                      setForm({ ...form, empCd: e.target.value })
                    }
                    className="w-full bg-background text-sm text-foreground rounded-md border border-border px-3 py-2"
                    required
                  >
                    <option value="">اختر موظف</option>
                    {employees.map((emp) => (
                      <option key={emp.empCd} value={emp.empCd}>
                        {emp.fullName} ({emp.empCd})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="attendance-shift-id"
                    className="block text-sm font-medium text-foreground"
                  >
                    الوردية
                  </label>
                  <select
                    id="attendance-shift-id"
                    value={form.shiftId || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftId: e.target.value
                          ? parseInt(e.target.value, 10)
                          : 0,
                      })
                    }
                    className="w-full bg-background text-sm text-foreground rounded-md border border-border px-3 py-2"
                    required
                  >
                    <option value="">اختر وردية</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({shift.startTime} - {shift.endTime})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="attendance-shift-from"
                    className="block text-sm font-medium text-foreground"
                  >
                    من تاريخ
                  </label>
                  <DateInput
                    id="attendance-shift-from"
                    value={form.effectiveFrom}
                    onChange={(e) =>
                      setForm({ ...form, effectiveFrom: e.target.value })
                    }
                    className="w-full bg-background text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="attendance-shift-to"
                    className="block text-sm font-medium text-foreground"
                  >
                    حتى تاريخ (اختياري)
                  </label>
                  <DateInput
                    id="attendance-shift-to"
                    value={form.effectiveTo || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        effectiveTo: e.target.value || undefined,
                      })
                    }
                    className="w-full bg-background text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  أيام التطبيق
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(({ bit, label, fullLabel }) => {
                    const active = !!((form.weekdayMask ?? 127) & (1 << bit));
                    return (
                      <Button variant="bare"
                        key={bit}
                        type="button"
                        title={fullLabel}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            weekdayMask: (f.weekdayMask ?? 127) ^ (1 << bit),
                          }))
                        }
                        className={`min-w-[36px] rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {label}
                      </Button>
                    );
                  })}
                  <Button variant="bare"
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, weekdayMask: 127 }))}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    كل الأيام
                  </Button>
                  <Button variant="bare"
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        weekdayMask: 0b1011111 & ~(1 << 5),
                      }))
                    }
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    بدون جمعة
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={assignShiftMutation.isPending}>
                  حفظ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "assignments" && showBulk && (
        <Card>
          <CardHeader>
            <CardTitle>تعيين وردية جماعي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="attendance-shift-bulk-id"
                  className="block text-sm font-medium text-foreground"
                >
                  الوردية
                </label>
                <select
                  id="attendance-shift-bulk-id"
                  value={bulk.shiftId || ""}
                  onChange={(e) =>
                    setBulk({
                      ...bulk,
                      shiftId: e.target.value
                        ? parseInt(e.target.value, 10)
                        : 0,
                    })
                  }
                  className="w-full bg-background text-sm text-foreground rounded-md border border-border px-3 py-2"
                >
                  <option value="">اختر وردية</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="attendance-shift-bulk-from"
                  className="block text-sm font-medium text-foreground"
                >
                  من تاريخ
                </label>
                <DateInput
                  id="attendance-shift-bulk-from"
                  value={bulk.effectiveFrom}
                  onChange={(e) =>
                    setBulk({ ...bulk, effectiveFrom: e.target.value })
                  }
                  className="w-full bg-background text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                أيام التطبيق
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(({ bit, label, fullLabel }) => {
                  const active = !!(bulk.weekdayMask & (1 << bit));
                  return (
                    <Button variant="bare"
                      key={bit}
                      type="button"
                      title={fullLabel}
                      onClick={() =>
                        setBulk((b) => ({
                          ...b,
                          weekdayMask: b.weekdayMask ^ (1 << bit),
                        }))
                      }
                      className={`min-w-[36px] rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </Button>
                  );
                })}
                <Button variant="bare"
                  type="button"
                  onClick={() => setBulk((b) => ({ ...b, weekdayMask: 127 }))}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  كل الأيام
                </Button>
                <Button variant="bare"
                  type="button"
                  onClick={() =>
                    setBulk((b) => ({
                      ...b,
                      weekdayMask: 0b1011111 & ~(1 << 5),
                    }))
                  }
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  بدون جمعة
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm font-medium text-foreground">
                  اختر الموظفين ({bulk.selectedEmps.length} مختار)
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10 px-3"
                    onClick={selectAll}
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10 px-3"
                    onClick={clearAll}
                  >
                    إلغاء الكل
                  </Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border bg-background">
                {employees.map((emp) => {
                  const checked = bulk.selectedEmps.includes(emp.empCd);

                  return (
                    <label
                      key={emp.empCd}
                      className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40 ${
                        checked ? "bg-primary/5" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmp(emp.empCd)}
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {emp.empCd}
                      </span>
                      <span className="text-sm text-foreground">
                        {emp.fullName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  bulkAssignMutation.mutate({
                    empCds: bulk.selectedEmps,
                    shiftId: bulk.shiftId,
                    effectiveFrom: bulk.effectiveFrom,
                    weekdayMask: bulk.weekdayMask,
                  })
                }
                disabled={
                  !bulk.shiftId ||
                  !bulk.selectedEmps.length ||
                  bulkAssignMutation.isPending
                }
              >
                {bulkAssignMutation.isPending
                  ? "جاري التعيين"
                  : `تعيين ${bulk.selectedEmps.length} موظف`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBulk(false)}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "assignments" && (
        <Card className="attendance-section">
          <CardHeader>
            <CardTitle>التعيينات الحالية ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                لا توجد تعيينات
              </div>
            ) : isMobile ? (
              <div className="space-y-2 md:grid md:grid-cols-2 md:items-start md:gap-2 md:space-y-0">
                {assignments.map((assignment: any) => {
                  const isEditing = editingId === assignment.id;
                  const isExpired = assignment.isExpired;
                  return (
                    <div
                      key={assignment.id}
                      className={`rounded-xl border border-border bg-background p-3 shadow-xs ${
                        isEditing
                          ? "bg-primary/5"
                          : isExpired
                            ? "opacity-60"
                            : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {assignment.empName}
                            {isExpired && (
                              <span className="ms-2 text-xs text-muted-foreground">
                                (منتهي)
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {assignment.empCd}
                          </div>
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(assignment)}
                              aria-label={`تعديل تعيين الوردية للموظف ${assignment.empName}`}
                              className="h-9 w-9 p-0"
                            >
                              <Pencil size={15} className="text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteAssignmentMutation.mutate({
                                  id: assignment.id,
                                })
                              }
                              aria-label={`حذف تعيين الوردية للموظف ${assignment.empName}`}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 size={15} className="text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-3 space-y-2 border-t border-border/60 pt-2">
                          <select
                            value={editRow.shiftId || ""}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                shiftId: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full bg-background text-sm text-foreground rounded-md border border-border px-3 py-2"
                          >
                            {shifts.map((shift) => (
                              <option key={shift.id} value={shift.id}>
                                {shift.name}
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <DateInput
                              value={editRow.effectiveFrom}
                              onChange={(e) =>
                                setEditRow({
                                  ...editRow,
                                  effectiveFrom: e.target.value,
                                })
                              }
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0"
                            />
                            <DateInput
                              value={editRow.effectiveTo ?? ""}
                              onChange={(e) =>
                                setEditRow({
                                  ...editRow,
                                  effectiveTo: e.target.value || undefined,
                                })
                              }
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0"
                            />
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateAssignmentMutation.mutate({
                                  id: assignment.id,
                                  ...editRow,
                                })
                              }
                              disabled={updateAssignmentMutation.isPending}
                              aria-label={`حفظ تعديل الوردية للموظف ${assignment.empName}`}
                              className="h-9 w-9 p-0"
                            >
                              <Check size={15} className="text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              aria-label={`إلغاء تعديل الوردية للموظف ${assignment.empName}`}
                              className="h-9 w-9 p-0"
                            >
                              <X size={15} className="text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-center text-xs">
                          <div>
                            <div className="text-muted-foreground">الوردية</div>
                            <div className="font-medium text-foreground">
                              {assignment.shiftName}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">من</div>
                            <div className="font-mono font-medium text-foreground">
                              {assignment.effectiveFrom}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">حتى</div>
                            <div className="font-mono font-medium text-foreground">
                              {assignment.effectiveTo ?? "-"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto" dir="rtl">
                <table
                  aria-label="التعيينات الحالية"
                  dir="rtl"
                  className="min-w-[58rem] w-full text-sm"
                >
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th scope="col" className="px-4 py-3 text-start">
                        الكود
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        الاسم
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        الوردية
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        من
                      </th>
                      <th scope="col" className="px-4 py-3 text-start">
                        حتى
                      </th>
                      <th scope="col" className="px-4 py-3 text-start"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment: any) => {
                      const isEditing = editingId === assignment.id;
                      const isExpired = assignment.isExpired;

                      return (
                        <tr
                          key={assignment.id}
                          className={`border-b transition-colors ${
                            isEditing
                              ? "bg-primary/5"
                              : isExpired
                                ? "bg-muted/20 opacity-60"
                                : "hover:bg-muted/40"
                          }`}
                        >
                          <td className="px-4 py-2 font-mono text-xs text-foreground">
                            {assignment.empCd}
                          </td>
                          <td className="px-4 py-2 text-foreground">
                            {assignment.empName}
                            {isExpired && (
                              <span className="ms-2 text-xs text-muted-foreground">
                                (منتهي)
                              </span>
                            )}
                          </td>
                          {isEditing ? (
                            <>
                              <td className="px-2 py-2">
                                <select
                                  value={editRow.shiftId || ""}
                                  onChange={(e) =>
                                    setEditRow({
                                      ...editRow,
                                      shiftId: parseInt(e.target.value, 10),
                                    })
                                  }
                                  className="w-full bg-background text-sm text-foreground rounded-md border border-border px-3 py-2"
                                >
                                  {shifts.map((shift) => (
                                    <option key={shift.id} value={shift.id}>
                                      {shift.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                <DateInput
                                  value={editRow.effectiveFrom}
                                  onChange={(e) =>
                                    setEditRow({
                                      ...editRow,
                                      effectiveFrom: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <DateInput
                                  value={editRow.effectiveTo ?? ""}
                                  onChange={(e) =>
                                    setEditRow({
                                      ...editRow,
                                      effectiveTo: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-11 w-full sm:w-[11rem] shrink-0"
                                />
                              </td>

                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateAssignmentMutation.mutate({
                                        id: assignment.id,
                                        ...editRow,
                                      })
                                    }
                                    disabled={
                                      updateAssignmentMutation.isPending
                                    }
                                    aria-label={`حفظ تعديل الوردية للموظف ${assignment.empName}`}
                                    className="h-10 w-10 p-0"
                                  >
                                    <Check size={15} className="text-success" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingId(null)}
                                    aria-label={`إلغاء تعديل الوردية للموظف ${assignment.empName}`}
                                    className="h-10 w-10 p-0"
                                  >
                                    <X
                                      size={15}
                                      className="text-muted-foreground"
                                    />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2 text-foreground">
                                {assignment.shiftName}
                              </td>
                              <td className="px-4 py-2 text-foreground">
                                {assignment.effectiveFrom}
                              </td>
                              <td className="px-4 py-2 text-foreground">
                                {assignment.effectiveTo ?? "-"}
                              </td>

                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(assignment)}
                                    aria-label={`تعديل تعيين الوردية للموظف ${assignment.empName}`}
                                    className="h-10 w-10 p-0"
                                  >
                                    <Pencil
                                      size={15}
                                      className="text-primary"
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      deleteAssignmentMutation.mutate({
                                        id: assignment.id,
                                      })
                                    }
                                    aria-label={`حذف تعيين الوردية للموظف ${assignment.empName}`}
                                    className="h-10 w-10 p-0"
                                  >
                                    <Trash2
                                      size={15}
                                      className="text-destructive"
                                    />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cycles tab */}
      {tab === "cycles" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowCycleForm(!showCycleForm)}
              className="min-h-11 gap-2 px-4"
            >
              <Plus size={16} /> دورة جديدة
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCycleAssignForm(!showCycleAssignForm)}
              className="min-h-11 gap-2 px-4"
            >
              <Users size={16} /> تعيين موظف لدورة
            </Button>
          </div>

          {showCycleForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingCycleId ? "تعديل الدورة" : "دورة وردية جديدة"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">
                      اسم الدورة
                    </label>
                    <Input bare
                      aria-label="اسم الدورة"
                      value={cycleForm.name}
                      onChange={(e) =>
                        setCycleForm({ ...cycleForm, name: e.target.value })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="مثال: دوام دوري"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">الفترة</label>
                    <select
                      aria-label="الفترة"
                      value={cycleForm.period}
                      onChange={(e) =>
                        setCycleForm({
                          ...cycleForm,
                          period: e.target.value as any,
                          slots: {},
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="rotation">
                        تتابع متكرر: يبدأ من تاريخ البداية
                      </option>
                      <option value="week">
                        أسبوعي: وردية حسب يوم الأسبوع
                      </option>
                      <option value="month">
                        شهري: وردية لكل يوم من الشهر
                      </option>
                    </select>
                  </div>
                </div>

                {cycleForm.period === "rotation" && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">
                      تاريخ بداية تتابع الورديات
                    </label>
                    <DateInput
                      value={cycleForm.anchorDate}
                      onChange={(event) =>
                        setCycleForm({
                          ...cycleForm,
                          anchorDate: event.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      اليوم الأول يبدأ من هذا التاريخ، ثم تتكرر الورديات المسجلة
                      بالترتيب.
                    </p>
                  </div>
                )}

                {/* Day / Week: seven ordered slots or weekday slots */}
                {(cycleForm.period === "rotation" ||
                  cycleForm.period === "week") && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      {cycleForm.period === "rotation"
                        ? "ترتيب تتابع الورديات (حتى 7 أيام)"
                        : "الوردية حسب يوم الأسبوع"}
                    </label>
                    <div className="space-y-1.5">
                      {(cycleForm.period === "rotation"
                        ? [...WEEK_CYCLE_DAYS].sort(
                            (a, b) => a.slotIndex - b.slotIndex,
                          )
                        : WEEK_CYCLE_DAYS
                      ).map(({ slotIndex, label }) => (
                        <div
                          key={slotIndex}
                          className="flex items-center gap-3"
                        >
                          <span className="w-20 shrink-0 text-sm font-medium text-foreground">
                            {cycleForm.period === "rotation"
                              ? `اليوم ${WEEK_CYCLE_DAYS.findIndex((d) => d.slotIndex === slotIndex) + 1}`
                              : label}
                          </span>
                          <select
                            value={
                              cycleForm.slots[slotIndex] ??
                              (cycleForm.period === "rotation" ? "" : 0)
                            }
                            onChange={(e) => {
                              const slots = { ...cycleForm.slots };
                              if (e.target.value === "")
                                delete slots[slotIndex];
                              else slots[slotIndex] = Number(e.target.value);
                              setCycleForm({ ...cycleForm, slots });
                            }}
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {cycleForm.period === "rotation" && (
                              <option value="">
                                غير مستخدم (بعد نهاية التتابع)
                              </option>
                            )}
                            <option value={0}>راحة / لا وردية</option>
                            {shifts.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.startTime}–{s.endTime})
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Month: 31 date cells */}
                {cycleForm.period === "month" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      وردية كل يوم من الشهر
                    </label>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (date) => (
                          <div key={date} className="flex items-center gap-2">
                            <span className="w-8 shrink-0 text-center text-sm font-mono text-muted-foreground">
                              {date}
                            </span>
                            <select
                              value={cycleForm.slots[date] ?? 0}
                              onChange={(e) =>
                                setCycleForm({
                                  ...cycleForm,
                                  slots: {
                                    ...cycleForm.slots,
                                    [date]: Number(e.target.value),
                                  },
                                })
                              }
                              className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                            >
                              <option value={0}>-</option>
                              {shifts.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {(() => {
                    // Rotation keeps explicit rest days (0) so the pattern
                    // length is preserved; other periods drop empty days.
                    const slotsToSubmit = Object.entries(cycleForm.slots)
                      .filter(([, v]) =>
                        cycleForm.period === "rotation"
                          ? Number(v) >= 0
                          : Number(v) > 0,
                      )
                      .map(([k, v]) => ({
                        slotIndex: Number(k),
                        shiftId: Number(v),
                      }));
                    const valid =
                      !!cycleForm.name &&
                      slotsToSubmit.some((slot) => slot.shiftId > 0);
                    const isPending =
                      createCycleMutation.isPending ||
                      updateCycleMutation.isPending;
                    return (
                      <Button
                        disabled={!valid || isPending}
                        onClick={() =>
                          editingCycleId
                            ? updateCycleMutation.mutate({
                                id: editingCycleId,
                                name: cycleForm.name,
                                period: cycleForm.period,
                                anchorDate: cycleForm.anchorDate,
                                slots: slotsToSubmit,
                              })
                            : createCycleMutation.mutate({
                                name: cycleForm.name,
                                period: cycleForm.period,
                                anchorDate: cycleForm.anchorDate,
                                slots: slotsToSubmit,
                              })
                        }
                      >
                        {editingCycleId ? "حفظ التعديل" : "حفظ"}
                      </Button>
                    );
                  })()}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCycleForm(false);
                      setEditingCycleId(null);
                      setCycleForm({
                        name: "",
                        period: "week",
                        anchorDate: today,
                        slots: {},
                      });
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showCycleAssignForm && (
            <Card>
              <CardHeader>
                <CardTitle>تعيين موظفين لدورة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">الدورة</label>
                    <select
                      aria-label="الدورة"
                      value={cycleAssignForm.cycleId || ""}
                      onChange={(e) =>
                        setCycleAssignForm({
                          ...cycleAssignForm,
                          cycleId: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">اختر دورة</option>
                      {cycles.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({PERIOD_LABEL[c.period]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">
                      من تاريخ
                    </label>
                    <DateInput
                      value={cycleAssignForm.effectiveFrom}
                      onChange={(e) =>
                        setCycleAssignForm({
                          ...cycleAssignForm,
                          effectiveFrom: e.target.value,
                        })
                      }
                      className="h-11 w-full sm:w-[11rem] shrink-0 bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-lg border border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">
                      حتى تاريخ (اختياري)
                    </label>
                    <DateInput
                      value={cycleAssignForm.effectiveTo}
                      onChange={(e) =>
                        setCycleAssignForm({
                          ...cycleAssignForm,
                          effectiveTo: e.target.value,
                        })
                      }
                      className="h-11 w-full sm:w-[11rem] shrink-0 bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-lg border border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-medium">
                      اختر الموظفين ({cycleAssignForm.empCds.length} مختار)
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-9 px-3"
                        onClick={() =>
                          setCycleAssignForm({
                            ...cycleAssignForm,
                            empCds: employees.map((e: any) => e.empCd),
                          })
                        }
                      >
                        تحديد الكل
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-9 px-3"
                        onClick={() =>
                          setCycleAssignForm({ ...cycleAssignForm, empCds: [] })
                        }
                      >
                        إلغاء الكل
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border bg-background">
                    {employees.map((emp: any) => {
                      const checked = cycleAssignForm.empCds.includes(
                        emp.empCd,
                      );
                      return (
                        <label
                          key={emp.empCd}
                          className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40 ${checked ? "bg-primary/5" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCycleAssignForm({
                                ...cycleAssignForm,
                                empCds: checked
                                  ? cycleAssignForm.empCds.filter(
                                      (c) => c !== emp.empCd,
                                    )
                                  : [...cycleAssignForm.empCds, emp.empCd],
                              })
                            }
                            className="h-4 w-4 rounded border-border text-primary"
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {emp.empCd}
                          </span>
                          <span className="text-sm text-foreground">
                            {emp.fullName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      !cycleAssignForm.empCds.length ||
                      !cycleAssignForm.cycleId ||
                      assignCycleMutation.isPending
                    }
                    onClick={() =>
                      assignCycleMutation.mutate({
                        empCds: cycleAssignForm.empCds,
                        cycleId: cycleAssignForm.cycleId,
                        effectiveFrom: cycleAssignForm.effectiveFrom,
                        effectiveTo: cycleAssignForm.effectiveTo || undefined,
                      })
                    }
                  >
                    {assignCycleMutation.isPending
                      ? "جاري التعيين"
                      : `تعيين ${cycleAssignForm.empCds.length || ""} موظف`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCycleAssignForm(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="attendance-section">
            <CardHeader>
              <CardTitle>الدورات ({cycles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cycles.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  لا توجد دورات
                </div>
              ) : (
                <div className="space-y-3">
                  {cycles.map((c: any) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">
                            {c.name}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {PERIOD_LABEL[c.period]}
                            {c.period === "rotation"
                              ? ` · بداية من ${c.anchorDate}`
                              : ""}{" "}
                            · {c.slots.length}{" "}
                            {c.slots.length === 1 ? "وردية" : "ورديات"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.slots.map((s: any) => {
                              const shift = shifts.find(
                                (sh: any) => sh.id === s.shiftId,
                              );
                              return (
                                <span
                                  key={s.slotIndex}
                                  className="rounded border border-border bg-muted px-2 py-0.5 text-xs"
                                >
                                  <span className="font-mono text-muted-foreground me-1">
                                    {getCycleSlotLabel(c.period, s.slotIndex)}
                                  </span>
                                  {shift
                                    ? `${shift.name} (${shift.startTime}–${shift.endTime})`
                                    : s.shiftId === 0
                                      ? "راحة"
                                      : `وردية ${s.shiftId}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            aria-label="تعديل"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={() => startEditCycle(c)}
                          >
                            <Pencil size={14} className="text-primary" />
                          </Button>
                          <Button
                            aria-label="حذف"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={() =>
                              deleteCycleMutation.mutate({ id: c.id })
                            }
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="attendance-section">
            <CardHeader>
              <CardTitle>تعيينات الدورات ({cycleAssignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cycleAssignments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  لا توجد تعيينات
                </div>
              ) : isMobile ? (
                <div className="space-y-2 md:grid md:grid-cols-2 md:items-start md:gap-2 md:space-y-0">
                  {cycleAssignments.map((a: any) => {
                    const isEditing = editingCycleAssignId === a.id;
                    const cycle = cycles.find((c: any) => c.id === a.cycleId);
                    const todaySlotIdx = getCycleSlotIndexForDate(
                      cycle,
                      new Date(),
                    );
                    const todaySlot = cycle?.slots?.find(
                      (s: any) => s.slotIndex === todaySlotIdx,
                    );
                    const todayShift = todaySlot
                      ? shifts.find((s: any) => s.id === todaySlot.shiftId)
                      : null;
                    return (
                      <div
                        key={a.id}
                        className={`rounded-xl border border-border bg-background p-3 shadow-xs ${isEditing ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {a.empName ?? a.empCd}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {a.empCd}
                            </div>
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <Button
                                aria-label="تعديل"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => {
                                  setEditingCycleAssignId(a.id);
                                  setEditCycleAssignRow({
                                    cycleId: a.cycleId,
                                    effectiveFrom: a.effectiveFrom,
                                    effectiveTo: a.effectiveTo ?? "",
                                  });
                                }}
                              >
                                <Pencil size={14} className="text-primary" />
                              </Button>
                              <Button
                                aria-label="حذف"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() =>
                                  removeCycleAssignmentMutation.mutate({
                                    id: a.id,
                                  })
                                }
                              >
                                <Trash2
                                  size={14}
                                  className="text-destructive"
                                />
                              </Button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="mt-3 space-y-2 border-t border-border/60 pt-2">
                            <select
                              value={editCycleAssignRow.cycleId}
                              onChange={(e) =>
                                setEditCycleAssignRow({
                                  ...editCycleAssignRow,
                                  cycleId: Number(e.target.value),
                                })
                              }
                              className="w-full bg-background text-sm rounded-md border border-border px-3 py-2"
                            >
                              {cycles.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({PERIOD_LABEL[c.period]})
                                </option>
                              ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <DateInput
                                value={editCycleAssignRow.effectiveFrom}
                                onChange={(e) =>
                                  setEditCycleAssignRow({
                                    ...editCycleAssignRow,
                                    effectiveFrom: e.target.value,
                                  })
                                }
                                className="h-11 w-full sm:w-[11rem] shrink-0 rounded-lg border border-input bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                              />
                              <DateInput
                                value={editCycleAssignRow.effectiveTo}
                                onChange={(e) =>
                                  setEditCycleAssignRow({
                                    ...editCycleAssignRow,
                                    effectiveTo: e.target.value,
                                  })
                                }
                                className="h-11 w-full sm:w-[11rem] shrink-0 rounded-lg border border-input bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                              />
                            </div>
                            <div className="flex justify-end gap-1">
                              <Button aria-label="حفظ التعديل" title="حفظ التعديل"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() =>
                                  updateCycleAssignmentMutation.mutate({
                                    id: a.id,
                                    cycleId: editCycleAssignRow.cycleId,
                                    effectiveFrom:
                                      editCycleAssignRow.effectiveFrom,
                                    effectiveTo:
                                      editCycleAssignRow.effectiveTo || null,
                                  })
                                }
                                disabled={
                                  updateCycleAssignmentMutation.isPending
                                }
                              >
                                <Check size={15} className="text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => setEditingCycleAssignId(null)}
                              >
                                <X
                                  size={15}
                                  className="text-muted-foreground"
                                />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-center text-xs">
                            <div>
                              <div className="text-muted-foreground">
                                الدورة
                              </div>
                              <div className="font-medium text-foreground">
                                {a.cycleName}
                              </div>
                              {todayShift ? (
                                <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                                  {todayShift.name}
                                </span>
                              ) : (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  راحة
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-muted-foreground">من</div>
                              <div className="font-mono font-medium text-foreground">
                                {a.effectiveFrom}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">حتى</div>
                              <div className="font-mono font-medium text-foreground">
                                {a.effectiveTo ?? "-"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto" dir="rtl">
                  <table
                    aria-label="تعيينات الدورات"
                    dir="rtl"
                    className="min-w-[52rem] w-full text-sm"
                  >
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th scope="col" className="px-4 py-3 text-start">
                          الموظف
                        </th>
                        <th scope="col" className="px-4 py-3 text-start">
                          الدورة
                        </th>
                        <th scope="col" className="px-4 py-3 text-start">
                          وردية اليوم
                        </th>
                        <th scope="col" className="px-4 py-3 text-start">
                          من
                        </th>
                        <th scope="col" className="px-4 py-3 text-start">
                          حتى
                        </th>
                        <th scope="col" className="px-4 py-3 text-start"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycleAssignments.map((a: any) => {
                        const isEditing = editingCycleAssignId === a.id;
                        const cycle = cycles.find(
                          (c: any) => c.id === a.cycleId,
                        );
                        const todaySlotIdx = getCycleSlotIndexForDate(
                          cycle,
                          new Date(),
                        );
                        const todaySlot = cycle?.slots?.find(
                          (s: any) => s.slotIndex === todaySlotIdx,
                        );
                        const todayShift = todaySlot
                          ? shifts.find((s: any) => s.id === todaySlot.shiftId)
                          : null;
                        return (
                          <tr
                            key={a.id}
                            className={`border-b transition-colors ${isEditing ? "bg-primary/5" : "hover:bg-muted/40"}`}
                          >
                            <td className="px-4 py-2">
                              <div className="font-medium">
                                {a.empName ?? a.empCd}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {a.empCd}
                              </div>
                            </td>
                            {isEditing ? (
                              <>
                                <td className="px-2 py-2">
                                  <select
                                    value={editCycleAssignRow.cycleId}
                                    onChange={(e) =>
                                      setEditCycleAssignRow({
                                        ...editCycleAssignRow,
                                        cycleId: Number(e.target.value),
                                      })
                                    }
                                    className="w-full bg-background text-sm rounded-md border border-border px-3 py-2"
                                  >
                                    {cycles.map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} ({PERIOD_LABEL[c.period]})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-2 text-muted-foreground text-xs">
                                  -
                                </td>
                                <td className="px-2 py-2">
                                  <DateInput
                                    value={editCycleAssignRow.effectiveFrom}
                                    onChange={(e) =>
                                      setEditCycleAssignRow({
                                        ...editCycleAssignRow,
                                        effectiveFrom: e.target.value,
                                      })
                                    }
                                    className="h-11 w-full sm:w-[11rem] shrink-0 rounded-lg border border-input bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <DateInput
                                    value={editCycleAssignRow.effectiveTo}
                                    onChange={(e) =>
                                      setEditCycleAssignRow({
                                        ...editCycleAssignRow,
                                        effectiveTo: e.target.value,
                                      })
                                    }
                                    className="h-11 w-full sm:w-[11rem] shrink-0 rounded-lg border border-input bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() =>
                                        updateCycleAssignmentMutation.mutate({
                                          id: a.id,
                                          cycleId: editCycleAssignRow.cycleId,
                                          effectiveFrom:
                                            editCycleAssignRow.effectiveFrom,
                                          effectiveTo:
                                            editCycleAssignRow.effectiveTo ||
                                            null,
                                        })
                                      }
                                      disabled={
                                        updateCycleAssignmentMutation.isPending
                                      }
                                    >
                                      <Check
                                        size={15}
                                        className="text-success"
                                      />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() =>
                                        setEditingCycleAssignId(null)
                                      }
                                    >
                                      <X
                                        size={15}
                                        className="text-muted-foreground"
                                      />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2">
                                  <div>{a.cycleName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {PERIOD_LABEL[a.period] ?? a.period}
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  {todayShift ? (
                                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                      {todayShift.name}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      راحة
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">{a.effectiveFrom}</td>
                                <td className="px-4 py-2">
                                  {a.effectiveTo ?? "-"}
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      aria-label="تعديل"
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() => {
                                        setEditingCycleAssignId(a.id);
                                        setEditCycleAssignRow({
                                          cycleId: a.cycleId,
                                          effectiveFrom: a.effectiveFrom,
                                          effectiveTo: a.effectiveTo ?? "",
                                        });
                                      }}
                                    >
                                      <Pencil
                                        size={14}
                                        className="text-primary"
                                      />
                                    </Button>
                                    <Button
                                      aria-label="حذف"
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() =>
                                        removeCycleAssignmentMutation.mutate({
                                          id: a.id,
                                        })
                                      }
                                    >
                                      <Trash2
                                        size={14}
                                        className="text-destructive"
                                      />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Swap tab */}
      {tab === "swap" && (
        <Card>
          <CardHeader>
            <CardTitle>تبادل وردية مؤقت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">من تاريخ</label>
                <DateInput
                  value={swap.dateFrom}
                  onChange={(e) =>
                    setSwap({
                      ...swap,
                      dateFrom: e.target.value,
                      dateTo:
                        e.target.value > swap.dateTo
                          ? e.target.value
                          : swap.dateTo,
                    })
                  }
                  className="w-full bg-background text-sm rounded-md border border-border px-3 py-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">حتى تاريخ</label>
                <DateInput
                  value={swap.dateTo}
                  min={swap.dateFrom}
                  onChange={(e) => setSwap({ ...swap, dateTo: e.target.value })}
                  className="h-11 w-full sm:w-[11rem] shrink-0 bg-background text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-lg border border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const key = side === "A" ? "empCdA" : "empCdB";
                const label = side === "A" ? "الموظف الأول" : "الموظف الثاني";
                const val = swap[key];
                const assignment = assignments.find(
                  (a: any) =>
                    a.empCd === val &&
                    a.effectiveFrom <= swap.dateFrom &&
                    (!a.effectiveTo || a.effectiveTo >= swap.dateFrom),
                );
                return (
                  <div key={side} className="space-y-1.5">
                    <label className="block text-sm font-medium">{label}</label>
                    <select
                      value={val}
                      onChange={(e) =>
                        setSwap({ ...swap, [key]: e.target.value })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">اختر موظف</option>
                      {employees.map((emp: any) => (
                        <option key={emp.empCd} value={emp.empCd}>
                          {emp.fullName} ({emp.empCd})
                        </option>
                      ))}
                    </select>
                    {val && assignment && (
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        <div className="font-semibold">
                          {assignment.shiftName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {WEEKDAYS.filter(
                            ({ bit }) =>
                              (assignment.weekdayMask ?? 127) & (1 << bit),
                          )
                            .map(({ label: l }) => l)
                            .join(" ")}
                        </div>
                      </div>
                    )}
                    {val && !assignment && (
                      <p className="text-xs text-destructive">
                        لا توجد وردية نشطة
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {swap.empCdA &&
              swap.empCdB &&
              swap.empCdA !== swap.empCdB &&
              (() => {
                const aAssign = assignments.find(
                  (a: any) => a.empCd === swap.empCdA,
                );
                const bAssign = assignments.find(
                  (a: any) => a.empCd === swap.empCdB,
                );
                if (!aAssign || !bAssign) return null;
                const days =
                  Math.round(
                    (new Date(swap.dateTo).getTime() -
                      new Date(swap.dateFrom).getTime()) /
                      86400000,
                  ) + 1;
                return (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1.5">
                    <div className="font-medium text-foreground mb-2">
                      ملخص التبادل ({days} {days === 1 ? "يوم" : "أيام"})
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {aAssign.empName}
                      </span>
                      <ArrowLeftRight size={13} />
                      <span className="text-primary">{bAssign.shiftName}</span>
                      <span className="text-xs">
                        ({swap.dateFrom} → {swap.dateTo})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {bAssign.empName}
                      </span>
                      <ArrowLeftRight size={13} />
                      <span className="text-primary">{aAssign.shiftName}</span>
                      <span className="text-xs">
                        ({swap.dateFrom} → {swap.dateTo})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1">
                      بعد {swap.dateTo} يعودان تلقائياً للورديات الأصلية
                    </div>
                  </div>
                );
              })()}

            <Button
              onClick={() =>
                swapShiftsMutation.mutate({
                  empCdA: swap.empCdA,
                  empCdB: swap.empCdB,
                  dateFrom: swap.dateFrom,
                  dateTo: swap.dateTo,
                })
              }
              disabled={
                !swap.empCdA ||
                !swap.empCdB ||
                swap.empCdA === swap.empCdB ||
                !swap.dateFrom ||
                !swap.dateTo ||
                swapShiftsMutation.isPending
              }
              className="gap-2"
            >
              <ArrowLeftRight size={15} />
              {swapShiftsMutation.isPending ? "جاري التبادل" : "تأكيد التبادل"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
