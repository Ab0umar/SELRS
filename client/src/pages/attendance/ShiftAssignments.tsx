import React, { useState } from "react";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface AssignmentForm {
  empCd: string;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  weekdayMask?: number;
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
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
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

  const employees: any[] = (listEmployeesQuery.data?.employees ?? []) as any;
  const shifts: any[] = (listShiftsQuery.data ?? []) as any;
  const assignments: any[] = (listAssignmentsQuery.data ?? []) as any;

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
        <h1 className="text-2xl font-bold text-foreground">تعيين الورديات</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowBulk(!showBulk);
              setShowForm(false);
            }}
            className="min-h-11 gap-2 px-4"
          >
            <Users size={16} />
            تعيين جماعي
          </Button>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setShowBulk(false);
            }}
            className="min-h-11 gap-2 px-4"
          >
            <Plus size={16} />
            تعيين فردي
          </Button>
        </div>
      </div>

      {showForm && (
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

      {showBulk && (
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

      <Card>
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
      </Card>
    </div>
  );
}
