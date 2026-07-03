import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Settings2,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";

// weekdayMask: bit 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAYS_SH = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
const WORKING_DAYS = [
  { dow: 6, label: "السبت" },
  { dow: 0, label: "الأحد" },
  { dow: 1, label: "الاثنين" },
  { dow: 2, label: "الثلاثاء" },
  { dow: 3, label: "الأربعاء" },
  { dow: 4, label: "الخميس" },
];

function maskToDays(mask: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < 7; i++) if ((mask >> i) & 1) s.add(i);
  return s;
}

function maskLabel(mask: number): string {
  if (!mask) return "—";
  return Array.from(maskToDays(mask))
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAYS_SH[d])
    .join(" ");
}

// ── Assignment + Working Days Panel ─────────────────────────────────────────
function AssignmentPanel({
  empCd,
  empName,
  assignments,
  shifts,
  onSaved,
  onClose,
}: {
  empCd: string;
  empName: string;
  assignments: {
    id: number;
    shiftId: number;
    shiftName: string;
    weekdayMask: number;
  }[];
  shifts: any[];
  onSaved: () => void;
  onClose: () => void;
}) {
  function buildDayShifts(asgns: typeof assignments): Record<number, number> {
    const map: Record<number, number> = {};
    for (const a of asgns) {
      for (let bit = 0; bit < 7; bit++) {
        if ((a.weekdayMask >> bit) & 1) map[bit] = a.shiftId;
      }
    }
    return map;
  }

  const [dayShifts, setDayShifts] = useState<Record<number, number>>(() =>
    buildDayShifts(assignments),
  );
  const [addShiftId, setAddShiftId] = useState<number>(0);
  const [addMask, setAddMask] = useState<number>(
    WORKING_DAYS.reduce((m, { dow }) => m | (1 << dow), 0),
  );

  useEffect(() => {
    setDayShifts(buildDayShifts(assignments));
  }, [assignments]);

  const saveMut = (trpc as any).attendance.saveDayShiftAssignments.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success("تم حفظ توزيع الورديات");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const addMut = (trpc as any).attendance.addShiftAssignment.useMutation({
    onSuccess: () => {
      onSaved();
      setAddShiftId(0);
      toast.success("تم إضافة الوردية");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = (trpc as any).attendance.deleteAssignment.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success("تم حذف الوردية");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  function save() {
    const payload = Object.entries(dayShifts)
      .filter(([, shiftId]) => shiftId > 0)
      .map(([dow, shiftId]) => ({ dayOfWeek: parseInt(dow), shiftId }));
    saveMut.mutate({ empCd, dayShifts: payload });
  }

  function addExtra() {
    if (!addShiftId) { toast.error("اختر الوردية"); return; }
    addMut.mutate({
      empCd,
      shiftId: addShiftId,
      effectiveFrom: new Date().toISOString().split("T")[0],
      weekdayMask: addMask,
    });
  }

  return (
    <tr className="border-b border-primary/20 bg-primary/5">
      <td colSpan={8} className="px-5 py-4" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              توزيع الوردية — <span className="text-primary">{empName}</span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {WORKING_DAYS.map(({ dow, label }) => (
              <div key={dow} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm font-medium">
                  {label}
                </span>
                <select
                  value={dayShifts[dow] ?? 0}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setDayShifts((s) => {
                      const next = { ...s };
                      if (v === 0) delete next[dow];
                      else next[dow] = v;
                      return next;
                    });
                  }}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value={0}>إجازة</option>
                  {shifts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Existing assignments list with delete */}
          {assignments.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/30">
              <p className="text-xs font-semibold text-muted-foreground">الورديات الحالية</p>
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-1.5 text-xs">
                  <span className="font-medium">{a.shiftName} — {maskLabel(a.weekdayMask)}</span>
                  <button
                    type="button"
                    onClick={() => deleteMut.mutate({ id: a.id })}
                    disabled={deleteMut.isPending}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add extra assignment without overwriting */}
          <div className="space-y-2 pt-1 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground">إضافة وردية إضافية</p>
            <div className="flex flex-wrap gap-2">
              <select
                value={addShiftId}
                onChange={(e) => setAddShiftId(parseInt(e.target.value))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value={0}>-- اختر الوردية --</option>
                {shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1">
                {WORKING_DAYS.map(({ dow }) => (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => setAddMask((m) => m ^ (1 << dow))}
                    className={`rounded px-2 py-1 text-[11px] font-semibold border transition-colors ${(addMask >> dow) & 1 ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
                  >
                    {DAYS_SH[dow]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addExtra}
                disabled={addMut.isPending}
                className="rounded-lg border border-success bg-success/10 px-4 py-1.5 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
              >
                إضافة
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t border-border/30">
            <button
              type="button"
              onClick={save}
              disabled={saveMut.isPending}
              className="rounded-lg border border-primary bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saveMut.isPending ? "جاري الحفظ…" : "حفظ التوزيع"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Temporary Shift Change Panel ────────────────────────────────────────────
function TempSwapPanel({
  empCd,
  empName,
  currentShiftName,
  assignment,
  shifts,
  onSaved,
  onClose,
}: {
  empCd: string;
  empName: string;
  currentShiftName: string | null;
  assignment: { id: number; shiftId: number } | null;
  shifts: any[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [newShiftId, setNewShiftId] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const tempMut = (trpc as any).attendance.tempChangeShift.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success("تم تبديل الوردية مؤقتاً");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  function save() {
    if (!newShiftId) {
      toast.error("اختر الوردية الجديدة");
      return;
    }
    if (!assignment) {
      toast.error("لا توجد وردية أساسية للموظف");
      return;
    }
    if (dateTo < dateFrom) {
      toast.error("تاريخ النهاية قبل البداية");
      return;
    }
    tempMut.mutate({ empCd, newShiftId, dateFrom, dateTo });
  }

  const otherShifts = shifts.filter((s: any) => s.id !== assignment?.shiftId);

  return (
    <tr className="border-b border-secondary/20 bg-secondary/5">
      <td colSpan={8} className="px-5 py-4" dir="rtl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-secondary" />
              <p className="text-sm font-semibold text-foreground">
                تبديل مؤقت — <span className="text-secondary">{empName}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {!assignment ? (
            <p className="text-sm text-destructive">
              ⚠️ لا توجد وردية أساسية — عيّن وردية أولاً من زر ⚙
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* New shift */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  الوردية الجديدة (مؤقتاً)
                </label>
                <select
                  value={newShiftId || ""}
                  onChange={(e) =>
                    setNewShiftId(e.target.value ? parseInt(e.target.value) : 0)
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— اختر وردية —</option>
                  {otherShifts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  الوردية الحالية:{" "}
                  <span className="font-semibold">
                    {currentShiftName ?? "—"}
                  </span>
                </p>
              </div>

              {/* Date from */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  من تاريخ
                </label>
                <DateInput
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    if (dateTo < e.target.value) setDateTo(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Date to */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  حتى تاريخ (شامل)
                </label>
                <DateInput
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {assignment && (
            <div className="flex gap-2 pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={save}
                disabled={tempMut.isPending}
                className="rounded-lg border border-secondary bg-secondary px-5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {tempMut.isPending ? "جاري التبديل…" : "تأكيد التبديل"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function EmployeesList() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"center" | "clinic">("center");
  const [editingCd, setEditingCd] = useState<string | null>(null);
  const [panelCd, setPanelCd] = useState<string | null>(null);
  const [swapCd, setSwapCd] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<{
    fullName: string;
    department: string;
    salaryType: string;
    jobTitle: string;
    attendanceCommissionRate: string;
    active: boolean;
  }>({
    fullName: "",
    department: "",
    salaryType: "",
    jobTitle: "",
    attendanceCommissionRate: "",
    active: true,
  });

  const employeesQuery = (trpc as any).attendance.employeesList.useQuery();
  const assignmentsQuery = (trpc as any).attendance.listAssignments.useQuery(
    {},
  );
  const shiftsQuery = (trpc as any).attendance.listShifts.useQuery();

  const updateMutation = trpc.attendance.updateEmployee.useMutation({
    onSuccess: () => {
      setEditingCd(null);
      employeesQuery.refetch();
      toast.success("تم التعديل");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.attendance.deleteEmployee.useMutation({
    onSuccess: () => {
      employeesQuery.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const startEdit = (emp: any) => {
    setEditingCd(emp.empCd);
    setPanelCd(null);
    setSwapCd(null);
    setEditRow({
      fullName: emp.fullName,
      department: emp.department ?? "",
      salaryType: emp.salaryType ?? "",
      jobTitle: emp.jobTitle ?? "",
      attendanceCommissionRate:
        emp.attendanceCommissionRate != null
          ? String(Math.round(Number(emp.attendanceCommissionRate) * 100))
          : "",
      active: emp.active,
    });
  };

  const allEmployees = employeesQuery.data?.employees ?? [];
  const allAssignments: any[] = assignmentsQuery.data ?? [];
  const allShifts: any[] = shiftsQuery.data ?? [];

  const assignmentsMap = new Map<
    string,
    { id: number; shiftId: number; shiftName: string; weekdayMask: number }[]
  >();
  for (const a of allAssignments) {
    if (!assignmentsMap.has(a.empCd)) assignmentsMap.set(a.empCd, []);
    assignmentsMap
      .get(a.empCd)!
      .push({
        id: a.id,
        shiftId: a.shiftId,
        shiftName: a.shiftName,
        weekdayMask: a.weekdayMask ?? 127,
      });
  }

  const centerEmployees = allEmployees.filter(
    (e: any) => e.department === "مركز" || e.department === "center",
  );
  const clinicEmployees = allEmployees.filter(
    (e: any) => e.department === "عيادة" || e.department === "clinic",
  );
  const displayEmployees =
    activeTab === "center" ? centerEmployees : clinicEmployees;
  const filteredEmployees = displayEmployees.filter(
    (e: any) =>
      e.empCd.toLowerCase().includes(search.toLowerCase()) ||
      e.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const EmployeeTable = ({ employees, isLoading, isError }: any) => {
    if (isLoading)
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <div className="py-8 text-center text-destructive">
          خطأ في تحميل الموظفين.
        </div>
      );
    if (!employees.length)
      return (
        <div className="py-8 text-center text-muted-foreground">
          لا توجد موظفين في هذا القسم
        </div>
      );

    return (
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-center font-semibold w-16">
                الكود
              </th>
              <th className="px-4 py-3 text-right font-semibold">الاسم</th>
              <th className="px-4 py-3 text-center font-semibold w-20">
                القسم
              </th>
              <th className="px-4 py-3 text-center font-semibold w-20">
                النوع
              </th>
              <th className="px-4 py-3 text-center font-semibold w-24">
                الوظيفة
              </th>
              <th className="px-4 py-3 text-right font-semibold">الوردية</th>
              <th className="px-4 py-3 text-center font-semibold">
                أيام الدوام
              </th>
              <th className="px-4 py-3 text-center font-semibold w-24">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => {
              const isEditing = editingCd === emp.empCd;
              const showPanel = panelCd === emp.empCd;
              const showSwap = swapCd === emp.empCd;
              const isClinic = emp.department === "عيادة";
              const empAssignments = assignmentsMap.get(emp.empCd) ?? [];
              const assignment = empAssignments[0] ?? null;
              const combinedMask = empAssignments.reduce(
                (m, a) => m | a.weekdayMask,
                0,
              );

              return (
                <>
                  <tr
                    key={emp.empCd}
                    className={`border-b transition-colors ${isEditing ? "bg-primary/5" : showPanel ? "bg-muted/20" : "hover:bg-muted/30"}`}
                  >
                    {/* Code */}
                    <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                      {emp.empCd}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          value={editRow.fullName}
                          onChange={(e) =>
                            setEditRow({ ...editRow, fullName: e.target.value })
                          }
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        />
                      ) : (
                        <Link href={`/attendance/employees/${emp.empCd}`}>
                          <a className="text-primary hover:underline font-medium">
                            {emp.fullName}
                          </a>
                        </Link>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select
                          value={editRow.department}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              department: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">—</option>
                          <option value="مركز">مركز</option>
                          <option value="عيادة">عيادة</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {emp.department || "—"}
                        </span>
                      )}
                    </td>

                    {/* Salary type (clinic only) */}
                    <td className="px-4 py-3 text-center">
                      {isEditing && isClinic ? (
                        <select
                          value={editRow.salaryType}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              salaryType: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">—</option>
                          <option value="استشاري">استشاري</option>
                          <option value="أخصائي">أخصائي</option>
                          <option value="الاثنين">الاثنين</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {isClinic ? emp.salaryType || "—" : "—"}
                        </span>
                      )}
                    </td>

                    {/* Job title */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          value={editRow.jobTitle}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              jobTitle: e.target.value,
                            })
                          }
                          placeholder="طبيب، محاسب، تمريض..."
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {emp.jobTitle || "—"}
                        </span>
                      )}
                    </td>

                    {/* Shift */}
                    <td className="px-4 py-3">
                      {empAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.from(
                            new Map(
                              empAssignments.map((a) => [
                                a.shiftId,
                                a.shiftName,
                              ]),
                            ).values(),
                          ).map((name, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                                showPanel
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-muted/40 text-foreground"
                              }`}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-destructive/60">
                          غير معيّن
                        </span>
                      )}
                    </td>

                    {/* Working days */}
                    <td className="px-4 py-3 text-center">
                      {combinedMask > 0 ? (
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono border ${
                            showPanel
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {maskLabel(combinedMask)}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground/50">
                          —
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                empCd: emp.empCd,
                                fullName: editRow.fullName,
                                department: editRow.department || undefined,
                                salaryType: editRow.salaryType || undefined,
                                jobTitle: editRow.jobTitle || undefined,
                                attendanceCommissionRate:
                                  editRow.attendanceCommissionRate !== ""
                                    ? parseFloat(
                                        editRow.attendanceCommissionRate,
                                      ) / 100
                                    : null,
                                active: editRow.active,
                              })
                            }
                            className="h-8 w-8 p-0"
                          >
                            <Check size={15} className="text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCd(null)}
                            className="h-8 w-8 p-0"
                          >
                            <X size={15} className="text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(emp)}
                            title="تعديل بيانات الموظف"
                            className="h-8 w-8 p-0"
                          >
                            <Pencil size={14} className="text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPanelCd(showPanel ? null : emp.empCd);
                              setEditingCd(null);
                              setSwapCd(null);
                            }}
                            title="توزيع الوردية وأيام الدوام"
                            className={`h-8 w-8 p-0 ${showPanel ? "text-primary" : "text-muted-foreground"}`}
                          >
                            <Settings2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSwapCd(showSwap ? null : emp.empCd);
                              setEditingCd(null);
                              setPanelCd(null);
                            }}
                            title="تبديل مؤقت للوردية"
                            className={`h-8 w-8 p-0 ${showSwap ? "text-secondary" : "text-muted-foreground"}`}
                          >
                            <ArrowLeftRight size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`هل تريد حذف ${emp.fullName}؟`))
                                deleteMutation.mutate({ empCd: emp.empCd });
                            }}
                            title="حذف الموظف"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {showPanel && (
                    <AssignmentPanel
                      key={`panel-${emp.empCd}`}
                      empCd={emp.empCd}
                      empName={emp.fullName}
                      assignments={empAssignments}
                      shifts={allShifts}
                      onSaved={() => {
                        assignmentsQuery.refetch();
                        setPanelCd(null);
                      }}
                      onClose={() => setPanelCd(null)}
                    />
                  )}

                  {showSwap && (
                    <TempSwapPanel
                      key={`swap-${emp.empCd}`}
                      empCd={emp.empCd}
                      empName={emp.fullName}
                      currentShiftName={assignment?.shiftName ?? null}
                      assignment={assignment}
                      shifts={allShifts}
                      onSaved={() => {
                        assignmentsQuery.refetch();
                        setSwapCd(null);
                      }}
                      onClose={() => setSwapCd(null)}
                    />
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">الموظفون</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "center" ? "موظفو المركز" : "موظفو العيادة"}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          عدد الموظفين:{" "}
          <span className="font-semibold text-foreground">
            {displayEmployees.length}
          </span>
        </span>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex gap-1 border-b border-border bg-background/95 px-1 pt-1">
        {(["center", "clinic"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "center"
              ? `المركز (${centerEmployees.length})`
              : `العيادة (${clinicEmployees.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-center">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              id="attendance-employee-search"
              placeholder="بحث بالكود أو الاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {filteredEmployees.length} نتيجة
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "center" ? "موظفو المركز" : "موظفو العيادة"} (
            {displayEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeTable
            employees={filteredEmployees}
            isLoading={employeesQuery.isLoading}
            isError={employeesQuery.isError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
