import React, { useState } from "react";
import { ArrowLeftRight, Check, Pencil, Plus, RefreshCw, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const PERIOD_LABEL: Record<string, string> = { day: "يومي", week: "أسبوعي", month: "شهري" };

// Week cycle: slotIndex = getDay() value (0=Sun…6=Sat), displayed Sat→Fri
const WEEK_CYCLE_DAYS = [
  { slotIndex: 6, label: "السبت" },
  { slotIndex: 0, label: "الأحد" },
  { slotIndex: 1, label: "الاثنين" },
  { slotIndex: 2, label: "الثلاثاء" },
  { slotIndex: 3, label: "الأربعاء" },
  { slotIndex: 4, label: "الخميس" },
  { slotIndex: 5, label: "الجمعة" },
];
const WEEK_DAY_BY_INDEX: Record<number, string> = Object.fromEntries(WEEK_CYCLE_DAYS.map(d => [d.slotIndex, d.label]));

function getCycleSlotLabel(period: string, slotIndex: number): string {
  if (period === "week") return WEEK_DAY_BY_INDEX[slotIndex] ?? `يوم ${slotIndex}`;
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

const today = new Date().toISOString().split("T")[0];

const WEEKDAYS = [
  { bit: 0, label: "أح", fullLabel: "الأحد" },
  { bit: 1, label: "إث", fullLabel: "الاثنين" },
  { bit: 2, label: "ث", fullLabel: "الثلاثاء" },
  { bit: 3, label: "أر", fullLabel: "الأربعاء" },
  { bit: 4, label: "خ", fullLabel: "الخميس" },
  { bit: 5, label: "ج", fullLabel: "الجمعة" },
  { bit: 6, label: "س", fullLabel: "السبت" },
];

export default function ShiftAssignments() {
  const [tab, setTab] = useState<"assignments" | "cycles" | "swap">("assignments");
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swap, setSwap] = useState<SwapForm>({ empCdA: "", empCdB: "", dateFrom: today, dateTo: today });

  // Cycle state
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: "",
    period: "week" as "day" | "week" | "month",
    anchorDate: today,
    slots: {} as Record<number, number>,   // slotIndex → shiftId (0 = none)
  });
  const [editingCycleId, setEditingCycleId] = useState<number | null>(null);
  const [editingCycleAssignId, setEditingCycleAssignId] = useState<number | null>(null);
  const [editCycleAssignRow, setEditCycleAssignRow] = useState<{ cycleId: number; effectiveFrom: string; effectiveTo: string }>({ cycleId: 0, effectiveFrom: today, effectiveTo: "" });
  const [showCycleAssignForm, setShowCycleAssignForm] = useState(false);
  const [cycleAssignForm, setCycleAssignForm] = useState({ empCds: [] as string[], cycleId: 0, effectiveFrom: today, effectiveTo: "" });
  const [form, setForm] = useState<AssignmentForm>({
    empCd: "",
    shiftId: 0,
    effectiveFrom: today,
  });
  const [bulk, setBulk] = useState<BulkForm>({
    shiftId: 0,
    effectiveFrom: today,
    weekdayMask: 62,
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
  const listCycleAssignmentsQuery = trpc.attendance.listCycleAssignments.useQuery();

  const employees: any[] = (listEmployeesQuery.data?.employees ?? []) as any;
  const shifts: any[] = (listShiftsQuery.data ?? []) as any;
  const assignments: any[] = (listAssignmentsQuery.data ?? []) as any;
  const cycles: any[] = (listCyclesQuery.data ?? []) as any;
  const cycleAssignments: any[] = (listCycleAssignmentsQuery.data ?? []) as any;

  const resetSingleForm = () =>
    setForm({
      empCd: "",
      shiftId: 0,
      effectiveFrom: today,
    });

  const resetBulkForm = () =>
    setBulk({
      shiftId: 0,
      effectiveFrom: today,
      weekdayMask: 62,
      selectedEmps: [],
    });

  const assignShiftMutation = trpc.attendance.assignShift.useMutation({
    onSuccess: () => {
      setShowForm(false);
      resetSingleForm();
      listAssignmentsQuery.refetch();
      toast.success("تم تعيين الوردية");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const bulkAssignMutation = trpc.attendance.bulkAssignShift.useMutation({
    onSuccess: (res) => {
      setShowBulk(false);
      resetBulkForm();
      listAssignmentsQuery.refetch();
      toast.success(`تم تعيين الوردية لـ ${res.inserted} موظف`);
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const updateAssignmentMutation = trpc.attendance.updateAssignment.useMutation(
    {
      onSuccess: () => {
        setEditingId(null);
        listAssignmentsQuery.refetch();
        toast.success("تم التعديل");
      },
      onError: (e) => toast.error("خطأ: " + e.message),
    },
  );

  const swapShiftsMutation = trpc.attendance.swapShifts.useMutation({
    onSuccess: () => {
      setSwap({ empCdA: "", empCdB: "", dateFrom: today, dateTo: today });
      listAssignmentsQuery.refetch();
      toast.success("تم تبادل الورديات");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const createCycleMutation = trpc.attendance.createShiftCycle.useMutation({
    onSuccess: () => { setShowCycleForm(false); setCycleForm({ name: "", period: "week", anchorDate: today, slots: {} }); listCyclesQuery.refetch(); toast.success("تم إنشاء الدورة"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const updateCycleMutation = trpc.attendance.updateShiftCycle.useMutation({
    onSuccess: () => { setEditingCycleId(null); setShowCycleForm(false); setCycleForm({ name: "", period: "week", anchorDate: today, slots: {} }); listCyclesQuery.refetch(); toast.success("تم التعديل"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const updateCycleAssignmentMutation = trpc.attendance.updateCycleAssignment.useMutation({
    onSuccess: () => { setEditingCycleAssignId(null); listCycleAssignmentsQuery.refetch(); toast.success("تم التعديل"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteCycleMutation = trpc.attendance.deleteShiftCycle.useMutation({
    onSuccess: () => { listCyclesQuery.refetch(); listCycleAssignmentsQuery.refetch(); toast.success("تم الحذف"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const assignCycleMutation = trpc.attendance.assignCycle.useMutation({
    onSuccess: (res) => { setShowCycleAssignForm(false); setCycleAssignForm({ empCds: [], cycleId: 0, effectiveFrom: today, effectiveTo: "" }); listCycleAssignmentsQuery.refetch(); toast.success(`تم تعيين الدورة لـ ${res.inserted} موظف`); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const removeCycleAssignmentMutation = trpc.attendance.removeCycleAssignment.useMutation({
    onSuccess: () => { listCycleAssignmentsQuery.refetch(); toast.success("تم الإلغاء"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const deleteAssignmentMutation = trpc.attendance.deleteAssignment.useMutation(
    {
      onSuccess: () => {
        listAssignmentsQuery.refetch();
        toast.success("تم الحذف");
      },
      onError: (e) => toast.error("خطأ: " + e.message),
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
    setCycleForm({ name: c.name, period: c.period, anchorDate: c.anchorDate ?? today, slots: slotMap });
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

  const toggleWeekday = (bit: number, forBulk = false) => {
    if (forBulk) {
      setBulk((prev) => ({
        ...prev,
        weekdayMask: prev.weekdayMask ^ (1 << bit),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      weekdayMask: (prev.weekdayMask ?? 127) ^ (1 << bit),
    }));
  };

  const weekdayIds = {
    single: "attendance-shift-weekdays",
    bulk: "attendance-shift-bulk-weekdays",
    edit: (id: number) => `attendance-shift-edit-weekdays-${id}`,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">الورديات</h1>
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          {(["assignments", "cycles", "swap"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "assignments" ? "التعيينات" : t === "cycles" ? "الدورات" : "التبادل"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Assignments tab ── */}
      {tab === "assignments" && (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { setShowBulk(!showBulk); setShowForm(false); }} className="min-h-11 gap-2 px-4">
          <Users size={16} /> تعيين جماعي
        </Button>
        <Button onClick={() => { setShowForm(!showForm); setShowBulk(false); }} className="min-h-11 gap-2 px-4">
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
                const assignment = assignments.find((a: any) => a.empCd === val);
                return (
                  <div key={side} className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">{label}</label>
                    <select
                      value={val}
                      onChange={(e) => setSwap({ ...swap, [key]: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                        الوردية الحالية: <span className="font-medium text-foreground">{assignment.shiftName}</span>
                      </p>
                    )}
                    {val && !assignment && (
                      <p className="text-xs text-destructive">لا توجد وردية نشطة</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => swapShiftsMutation.mutate({ empCdA: swap.empCdA, empCdB: swap.empCdB, dateFrom: swap.dateFrom, dateTo: swap.dateTo })}
                disabled={!swap.empCdA || !swap.empCdB || swap.empCdA === swap.empCdB || swapShiftsMutation.isPending}
              >
                <ArrowLeftRight size={15} className="ml-1.5" />
                {swapShiftsMutation.isPending ? "جاري التبادل..." : "تبادل"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowSwap(false)}>إلغاء</Button>
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                  <input
                    id="attendance-shift-from"
                    type="date"
                    value={form.effectiveFrom}
                    onChange={(e) =>
                      setForm({ ...form, effectiveFrom: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                  <input
                    id="attendance-shift-to"
                    type="date"
                    value={form.effectiveTo || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        effectiveTo: e.target.value || undefined,
                      })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  id={weekdayIds.single}
                  className="block text-sm font-medium text-foreground"
                >
                  أيام العمل
                </label>
                <div
                  className="flex flex-wrap gap-2"
                  aria-labelledby={weekdayIds.single}
                >
                  {WEEKDAYS.map(({ bit, label, fullLabel }) => (
                    <button
                      key={bit}
                      type="button"
                      onClick={() => toggleWeekday(bit)}
                      aria-label={`تبديل ${fullLabel}`}
                      aria-pressed={Boolean(
                        (form.weekdayMask ?? 127) & (1 << bit),
                      )}
                      title={fullLabel}
                      className={`h-11 w-11 rounded-full border text-sm font-medium transition-colors ${
                        (form.weekdayMask ?? 127) & (1 << bit)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
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
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                <input
                  id="attendance-shift-bulk-from"
                  type="date"
                  value={bulk.effectiveFrom}
                  onChange={(e) =>
                    setBulk({ ...bulk, effectiveFrom: e.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                id={weekdayIds.bulk}
                className="block text-sm font-medium text-foreground"
              >
                أيام العمل
              </label>
              <div
                className="flex flex-wrap gap-2"
                aria-labelledby={weekdayIds.bulk}
              >
                {WEEKDAYS.map(({ bit, label, fullLabel }) => (
                  <button
                    key={bit}
                    type="button"
                    onClick={() => toggleWeekday(bit, true)}
                    aria-label={`تبديل ${fullLabel}`}
                    aria-pressed={Boolean(bulk.weekdayMask & (1 << bit))}
                    title={fullLabel}
                    className={`h-11 w-11 rounded-full border text-sm font-medium transition-colors ${
                      bulk.weekdayMask & (1 << bit)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                أح=الأحد، إث=الاثنين، ث=الثلاثاء، أر=الأربعاء، خ=الخميس،
                ج=الجمعة، س=السبت. الافتراضي: الاثنين إلى الجمعة.
              </p>
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
                  ? "جاري التعيين..."
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

      {tab === "assignments" && <Card>
        <CardHeader>
          <CardTitle>التعيينات الحالية ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد تعيينات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[58rem] w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-right">الكود</th>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    <th className="px-4 py-3 text-right">الوردية</th>
                    <th className="px-4 py-3 text-right">من</th>
                    <th className="px-4 py-3 text-right">حتى</th>
                    <th className="px-4 py-3 text-right">أيام</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment: any) => {
                    const isEditing = editingId === assignment.id;

                    return (
                      <tr
                        key={assignment.id}
                        className={`border-b transition-colors ${
                          isEditing ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-xs text-foreground">
                          {assignment.empCd}
                        </td>
                        <td className="px-4 py-2 text-foreground">
                          {assignment.empName}
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
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              >
                                {shifts.map((shift) => (
                                  <option key={shift.id} value={shift.id}>
                                    {shift.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="date"
                                value={editRow.effectiveFrom}
                                onChange={(e) =>
                                  setEditRow({
                                    ...editRow,
                                    effectiveFrom: e.target.value,
                                  })
                                }
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="date"
                                value={editRow.effectiveTo ?? ""}
                                onChange={(e) =>
                                  setEditRow({
                                    ...editRow,
                                    effectiveTo: e.target.value || undefined,
                                  })
                                }
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div
                                id={weekdayIds.edit(assignment.id)}
                                className="flex flex-wrap gap-1"
                                aria-label="أيام العمل القابلة للتعديل"
                              >
                                {WEEKDAYS.map(({ bit, label, fullLabel }) => (
                                  <button
                                    key={bit}
                                    type="button"
                                    onClick={() =>
                                      setEditRow((prev) => ({
                                        ...prev,
                                        weekdayMask:
                                          prev.weekdayMask ^ (1 << bit),
                                      }))
                                    }
                                    aria-label={`تبديل ${fullLabel}`}
                                    aria-pressed={Boolean(
                                      editRow.weekdayMask & (1 << bit),
                                    )}
                                    title={fullLabel}
                                    className={`h-10 w-10 rounded-full border text-xs font-medium transition-colors ${
                                      editRow.weekdayMask & (1 << bit)
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-muted-foreground"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
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
                                  disabled={updateAssignmentMutation.isPending}
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
                              {assignment.effectiveTo ?? "—"}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {WEEKDAYS.filter(
                                ({ bit }) =>
                                  (assignment.weekdayMask ?? 127) & (1 << bit),
                              )
                                .map(({ label }) => label)
                                .join(" ")}
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
      </Card>}

      {/* ── Cycles tab ── */}
      {tab === "cycles" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowCycleForm(!showCycleForm)} className="min-h-11 gap-2 px-4">
              <Plus size={16} /> دورة جديدة
            </Button>
            <Button variant="outline" onClick={() => setShowCycleAssignForm(!showCycleAssignForm)} className="min-h-11 gap-2 px-4">
              <Users size={16} /> تعيين موظف لدورة
            </Button>
          </div>

          {showCycleForm && (
            <Card>
              <CardHeader><CardTitle>{editingCycleId ? "تعديل الدورة" : "دورة وردية جديدة"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">اسم الدورة</label>
                    <input value={cycleForm.name} onChange={e => setCycleForm({...cycleForm, name: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="مثال: دوام دوري" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">الفترة</label>
                    <select value={cycleForm.period}
                      onChange={e => setCycleForm({...cycleForm, period: e.target.value as any, slots: {}})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <option value="day">يومي — وردية لكل يوم من الأسبوع</option>
                      <option value="week">أسبوعي — وردية لكل يوم من الأسبوع</option>
                      <option value="month">شهري — وردية لكل يوم من الشهر</option>
                    </select>
                  </div>
                </div>

                {/* Day / Week: 7 named weekday rows */}
                {(cycleForm.period === "day" || cycleForm.period === "week") && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">وردية كل يوم من الأسبوع</label>
                    <div className="space-y-1.5">
                      {WEEK_CYCLE_DAYS.map(({ slotIndex, label }) => (
                        <div key={slotIndex} className="flex items-center gap-3">
                          <span className="w-20 shrink-0 text-sm font-medium text-foreground">{label}</span>
                          <select
                            value={cycleForm.slots[slotIndex] ?? 0}
                            onChange={e => setCycleForm({...cycleForm, slots: {...cycleForm.slots, [slotIndex]: Number(e.target.value)}})}
                            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value={0}>— راحة / لا وردية —</option>
                            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Month: 31 date cells */}
                {cycleForm.period === "month" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">وردية كل يوم من الشهر</label>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                        <div key={date} className="flex items-center gap-2">
                          <span className="w-8 shrink-0 text-center text-sm font-mono text-muted-foreground">{date}</span>
                          <select
                            value={cycleForm.slots[date] ?? 0}
                            onChange={e => setCycleForm({...cycleForm, slots: {...cycleForm.slots, [date]: Number(e.target.value)}})}
                            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                          >
                            <option value={0}>—</option>
                            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {(() => {
                    const slotsToSubmit = Object.entries(cycleForm.slots)
                      .filter(([, v]) => Number(v) > 0)
                      .map(([k, v]) => ({ slotIndex: Number(k), shiftId: Number(v) }));
                    const valid = !!cycleForm.name && slotsToSubmit.length > 0;
                    const isPending = createCycleMutation.isPending || updateCycleMutation.isPending;
                    return (
                      <Button disabled={!valid || isPending}
                        onClick={() => editingCycleId
                          ? updateCycleMutation.mutate({ id: editingCycleId, name: cycleForm.name, period: cycleForm.period, anchorDate: cycleForm.anchorDate, slots: slotsToSubmit })
                          : createCycleMutation.mutate({ name: cycleForm.name, period: cycleForm.period, anchorDate: cycleForm.anchorDate, slots: slotsToSubmit })}>
                        {editingCycleId ? "حفظ التعديل" : "حفظ"}
                      </Button>
                    );
                  })()}
                  <Button variant="outline" onClick={() => { setShowCycleForm(false); setEditingCycleId(null); setCycleForm({ name: "", period: "week", anchorDate: today, slots: {} }); }}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showCycleAssignForm && (
            <Card>
              <CardHeader><CardTitle>تعيين موظفين لدورة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">الدورة</label>
                    <select value={cycleAssignForm.cycleId || ""} onChange={e => setCycleAssignForm({...cycleAssignForm, cycleId: Number(e.target.value)})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <option value="">اختر دورة</option>
                      {cycles.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({PERIOD_LABEL[c.period]})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">من تاريخ</label>
                    <input type="date" value={cycleAssignForm.effectiveFrom} onChange={e => setCycleAssignForm({...cycleAssignForm, effectiveFrom: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">حتى تاريخ (اختياري)</label>
                    <input type="date" value={cycleAssignForm.effectiveTo} onChange={e => setCycleAssignForm({...cycleAssignForm, effectiveTo: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-medium">اختر الموظفين ({cycleAssignForm.empCds.length} مختار)</label>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" className="min-h-9 px-3"
                        onClick={() => setCycleAssignForm({...cycleAssignForm, empCds: employees.map((e: any) => e.empCd)})}>
                        تحديد الكل
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="min-h-9 px-3"
                        onClick={() => setCycleAssignForm({...cycleAssignForm, empCds: []})}>
                        إلغاء الكل
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border bg-background">
                    {employees.map((emp: any) => {
                      const checked = cycleAssignForm.empCds.includes(emp.empCd);
                      return (
                        <label key={emp.empCd} className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40 ${checked ? "bg-primary/5" : ""}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setCycleAssignForm({...cycleAssignForm, empCds: checked ? cycleAssignForm.empCds.filter(c => c !== emp.empCd) : [...cycleAssignForm.empCds, emp.empCd]})}
                            className="h-4 w-4 rounded border-border text-primary" />
                          <span className="font-mono text-xs text-muted-foreground">{emp.empCd}</span>
                          <span className="text-sm text-foreground">{emp.fullName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={!cycleAssignForm.empCds.length || !cycleAssignForm.cycleId || assignCycleMutation.isPending}
                    onClick={() => assignCycleMutation.mutate({ empCds: cycleAssignForm.empCds, cycleId: cycleAssignForm.cycleId, effectiveFrom: cycleAssignForm.effectiveFrom, effectiveTo: cycleAssignForm.effectiveTo || undefined })}>
                    {assignCycleMutation.isPending ? "جاري التعيين..." : `تعيين ${cycleAssignForm.empCds.length || ""} موظف`}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCycleAssignForm(false)}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>الدورات ({cycles.length})</CardTitle></CardHeader>
            <CardContent>
              {cycles.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">لا توجد دورات</div>
              ) : (
                <div className="space-y-3">
                  {cycles.map((c: any) => (
                    <div key={c.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {PERIOD_LABEL[c.period]} · بداية من {c.anchorDate} · {c.slots.length} {c.slots.length === 1 ? "وردية" : "ورديات"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.slots.map((s: any) => {
                              const shift = shifts.find((sh: any) => sh.id === s.shiftId);
                              return (
                                <span key={s.slotIndex} className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
                                  <span className="font-mono text-muted-foreground ml-1">{getCycleSlotLabel(c.period, s.slotIndex)}</span>
                                  {shift ? `${shift.name} (${shift.startTime}–${shift.endTime})` : `وردية ${s.shiftId}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => startEditCycle(c)}>
                            <Pencil size={14} className="text-primary" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => deleteCycleMutation.mutate({ id: c.id })}>
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

          <Card>
            <CardHeader><CardTitle>تعيينات الدورات ({cycleAssignments.length})</CardTitle></CardHeader>
            <CardContent>
              {cycleAssignments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">لا توجد تعيينات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[52rem] w-full text-sm" dir="rtl">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-right">الموظف</th>
                        <th className="px-4 py-3 text-right">الدورة</th>
                        <th className="px-4 py-3 text-right">وردية اليوم</th>
                        <th className="px-4 py-3 text-right">من</th>
                        <th className="px-4 py-3 text-right">حتى</th>
                        <th className="px-4 py-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycleAssignments.map((a: any) => {
                        const isEditing = editingCycleAssignId === a.id;
                        // Compute today's shift for this cycle assignment
                        const cycle = cycles.find((c: any) => c.id === a.cycleId);
                        const todaySlotIdx = cycle?.period === "month" ? new Date().getDate() : new Date().getDay();
                        const todaySlot = cycle?.slots?.find((s: any) => s.slotIndex === todaySlotIdx);
                        const todayShift = todaySlot ? shifts.find((s: any) => s.id === todaySlot.shiftId) : null;
                        return (
                          <tr key={a.id} className={`border-b transition-colors ${isEditing ? "bg-primary/5" : "hover:bg-muted/40"}`}>
                            <td className="px-4 py-2">
                              <div className="font-medium">{a.empName ?? a.empCd}</div>
                              <div className="text-xs text-muted-foreground font-mono">{a.empCd}</div>
                            </td>
                            {isEditing ? (
                              <>
                                <td className="px-2 py-2">
                                  <select value={editCycleAssignRow.cycleId}
                                    onChange={e => setEditCycleAssignRow({...editCycleAssignRow, cycleId: Number(e.target.value)})}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                                    {cycles.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({PERIOD_LABEL[c.period]})</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-2 text-muted-foreground text-xs">—</td>
                                <td className="px-2 py-2">
                                  <input type="date" value={editCycleAssignRow.effectiveFrom}
                                    onChange={e => setEditCycleAssignRow({...editCycleAssignRow, effectiveFrom: e.target.value})}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                                </td>
                                <td className="px-2 py-2">
                                  <input type="date" value={editCycleAssignRow.effectiveTo}
                                    onChange={e => setEditCycleAssignRow({...editCycleAssignRow, effectiveTo: e.target.value})}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0"
                                      onClick={() => updateCycleAssignmentMutation.mutate({ id: a.id, cycleId: editCycleAssignRow.cycleId, effectiveFrom: editCycleAssignRow.effectiveFrom, effectiveTo: editCycleAssignRow.effectiveTo || null })}
                                      disabled={updateCycleAssignmentMutation.isPending}>
                                      <Check size={15} className="text-success" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setEditingCycleAssignId(null)}>
                                      <X size={15} className="text-muted-foreground" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2">
                                  <div>{a.cycleName}</div>
                                  <div className="text-xs text-muted-foreground">{PERIOD_LABEL[a.period] ?? a.period}</div>
                                </td>
                                <td className="px-4 py-2">
                                  {todayShift
                                    ? <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">{todayShift.name}</span>
                                    : <span className="text-xs text-muted-foreground">راحة</span>}
                                </td>
                                <td className="px-4 py-2">{a.effectiveFrom}</td>
                                <td className="px-4 py-2">{a.effectiveTo ?? "—"}</td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0"
                                      onClick={() => { setEditingCycleAssignId(a.id); setEditCycleAssignRow({ cycleId: a.cycleId, effectiveFrom: a.effectiveFrom, effectiveTo: a.effectiveTo ?? "" }); }}>
                                      <Pencil size={14} className="text-primary" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => removeCycleAssignmentMutation.mutate({ id: a.id })}>
                                      <Trash2 size={14} className="text-destructive" />
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

      {/* ── Swap tab ── */}
      {tab === "swap" && (
        <Card>
          <CardHeader><CardTitle>تبادل وردية مؤقت</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">من تاريخ</label>
                <input type="date" value={swap.dateFrom}
                  onChange={e => setSwap({...swap, dateFrom: e.target.value, dateTo: e.target.value > swap.dateTo ? e.target.value : swap.dateTo})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">حتى تاريخ</label>
                <input type="date" value={swap.dateTo} min={swap.dateFrom}
                  onChange={e => setSwap({...swap, dateTo: e.target.value})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Employees */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const key = side === "A" ? "empCdA" : "empCdB";
                const label = side === "A" ? "الموظف الأول" : "الموظف الثاني";
                const val = swap[key];
                const assignment = assignments.find((a: any) => a.empCd === val);
                return (
                  <div key={side} className="space-y-1.5">
                    <label className="block text-sm font-medium">{label}</label>
                    <select value={val} onChange={e => setSwap({...swap, [key]: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <option value="">اختر موظف</option>
                      {employees.map((emp: any) => <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>)}
                    </select>
                    {val && assignment && (
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        <div className="font-semibold">{assignment.shiftName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {WEEKDAYS.filter(({bit}) => (assignment.weekdayMask ?? 127) & (1 << bit)).map(({label: l}) => l).join(" ")}
                        </div>
                      </div>
                    )}
                    {val && !assignment && <p className="text-xs text-destructive">لا توجد وردية نشطة</p>}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {swap.empCdA && swap.empCdB && swap.empCdA !== swap.empCdB && (() => {
              const aAssign = assignments.find((a: any) => a.empCd === swap.empCdA);
              const bAssign = assignments.find((a: any) => a.empCd === swap.empCdB);
              if (!aAssign || !bAssign) return null;
              const days = Math.round((new Date(swap.dateTo).getTime() - new Date(swap.dateFrom).getTime()) / 86400000) + 1;
              return (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1.5">
                  <div className="font-medium text-foreground mb-2">ملخص التبادل ({days} {days === 1 ? "يوم" : "أيام"})</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{aAssign.empName}</span>
                    <ArrowLeftRight size={13} />
                    <span className="text-primary">{bAssign.shiftName}</span>
                    <span className="text-xs">({swap.dateFrom} → {swap.dateTo})</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{bAssign.empName}</span>
                    <ArrowLeftRight size={13} />
                    <span className="text-primary">{aAssign.shiftName}</span>
                    <span className="text-xs">({swap.dateFrom} → {swap.dateTo})</span>
                  </div>
                  <div className="text-xs text-muted-foreground pt-1">بعد {swap.dateTo} يعودان تلقائياً للورديات الأصلية</div>
                </div>
              );
            })()}

            <Button
              onClick={() => swapShiftsMutation.mutate({ empCdA: swap.empCdA, empCdB: swap.empCdB, dateFrom: swap.dateFrom, dateTo: swap.dateTo })}
              disabled={!swap.empCdA || !swap.empCdB || swap.empCdA === swap.empCdB || !swap.dateFrom || !swap.dateTo || swapShiftsMutation.isPending}
              className="gap-2"
            >
              <ArrowLeftRight size={15} />
              {swapShiftsMutation.isPending ? "جاري التبادل..." : "تأكيد التبادل"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
