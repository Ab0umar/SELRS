import { Fragment, useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
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
import { useIsCompact } from "@/hooks/useMobile";

import { askConfirm } from "./askConfirm";
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
  if (!mask) return "-";
  return Array.from(maskToDays(mask))
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAYS_SH[d])
    .join(" ");
}

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
    onError: (e: any) => toast.error("تعذر حفظ توزيع الورديات: " + e.message),
  });

  const addMut = (trpc as any).attendance.addShiftAssignment.useMutation({
    onSuccess: () => {
      onSaved();
      setAddShiftId(0);
      toast.success("تمت إضافة الوردية");
    },
    onError: (e: any) => toast.error("تعذر إضافة التعيين: " + e.message),
  });

  const deleteMut = (trpc as any).attendance.deleteAssignment.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success("تم حذف الوردية");
    },
    onError: (e: any) => toast.error("تعذر حذف التعيين: " + e.message),
  });

  async function save() {
    // The day map holds one shift per weekday; saving replaces all open
    // assignments, so a day that currently has two shifts would lose one.
    const multiShiftDay = [0, 1, 2, 3, 4, 5, 6].some(
      (bit) => assignments.filter((a) => (a.weekdayMask >> bit) & 1).length > 1,
    );
    if (
      multiShiftDay &&
      !(await askConfirm(
        "هذا الموظف لديه أكثر من وردية في نفس اليوم. الحفظ سيبقي وردية واحدة لكل يوم ويحذف الإضافية. متابعة؟",
      ))
    )
      return;
    const payload = Object.entries(dayShifts)
      .filter(([, shiftId]) => shiftId > 0)
      .map(([dow, shiftId]) => ({ dayOfWeek: parseInt(dow), shiftId }));
    saveMut.mutate({ empCd, dayShifts: payload });
  }

  function addExtra() {
    if (!addShiftId) {
      toast.error("اختر الوردية");
      return;
    }
    addMut.mutate({
      empCd,
      shiftId: addShiftId,
      effectiveFrom: localDateKey(new Date()),
      weekdayMask: addMask,
    });
  }

  return (
    <tr className="border-b border-primary/20 bg-primary/5">
      <td colSpan={8} className="px-5 py-4" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              توزيع الوردية: <span className="text-primary">{empName}</span>
            </p>
            <Button variant="bare"
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X size={14} />
            </Button>
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
                  className="flex-1 bg-background text-sm rounded-md border border-border px-2 py-1.5"
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
              <p className="text-xs font-semibold text-muted-foreground">
                الورديات الحالية
              </p>
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-1.5 text-xs"
                >
                  <span className="font-medium">
                    {a.shiftName}: {maskLabel(a.weekdayMask)}
                  </span>
                  <Button variant="bare"
                    aria-label="حذف"
                    type="button"
                    onClick={() => deleteMut.mutate({ id: a.id })}
                    disabled={deleteMut.isPending}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add extra assignment without overwriting */}
          <div className="space-y-2 pt-1 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground">
              إضافة وردية إضافية
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                value={addShiftId}
                onChange={(e) => setAddShiftId(parseInt(e.target.value))}
                className="bg-background text-sm rounded-md border border-border px-2 py-1.5"
              >
                <option value={0}>-- اختر الوردية --</option>
                {shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1">
                {WORKING_DAYS.map(({ dow }) => (
                  <Button variant="bare"
                    key={dow}
                    type="button"
                    onClick={() => setAddMask((m) => m ^ (1 << dow))}
                    className={`rounded px-2 py-1 text-xs font-semibold border transition-colors ${(addMask >> dow) & 1 ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
                  >
                    {DAYS_SH[dow]}
                  </Button>
                ))}
              </div>
              <Button variant="bare"
                type="button"
                onClick={addExtra}
                disabled={addMut.isPending}
                className="rounded-lg border border-success bg-success/10 px-4 py-1.5 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
              >
                إضافة
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t border-border/30">
            <Button variant="bare"
              type="button"
              onClick={save}
              disabled={saveMut.isPending}
              className="rounded-lg border border-primary bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saveMut.isPending ? "جاري الحفظ" : "حفظ التوزيع"}
            </Button>
            <Button variant="bare"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

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
  const today = localDateKey(new Date());
  const [newShiftId, setNewShiftId] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const tempMut = (trpc as any).attendance.tempChangeShift.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success("تم تبديل الوردية مؤقتاً");
    },
    onError: (e: any) => toast.error("تعذر تبديل الوردية مؤقتاً: " + e.message),
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">
                تبديل مؤقت: <span className="text-primary">{empName}</span>
              </p>
            </div>
            <Button variant="bare"
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X size={14} />
            </Button>
          </div>

          {!assignment ? (
            <p className="text-sm text-destructive">
              لا توجد وردية أساسية. عيّن وردية أولاً من زر ⚙
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* New shift */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  الوردية الجديدة (مؤقتاً)
                </label>
                <select
                  aria-label="الوردية الجديدة (مؤقتاً)"
                  value={newShiftId || ""}
                  onChange={(e) =>
                    setNewShiftId(e.target.value ? parseInt(e.target.value) : 0)
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">اختر وردية</option>
                  {otherShifts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  الوردية الحالية:{" "}
                  <span className="font-semibold">
                    {currentShiftName ?? "-"}
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
                  className="w-full bg-background text-sm h-11 w-full sm:w-[11rem] shrink-0 rounded-lg border border-border px-3 py-2"
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
                  className="w-full bg-background text-sm rounded-lg border border-border px-3 py-2"
                />
              </div>
            </div>
          )}

          {assignment && (
            <div className="flex gap-2 pt-1 border-t border-border/30">
              <Button variant="bare"
                type="button"
                onClick={save}
                disabled={tempMut.isPending}
                className="rounded-lg border border-secondary bg-secondary px-5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {tempMut.isPending ? "جاري التبديل" : "تأكيد التبديل"}
              </Button>
              <Button variant="bare"
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                إلغاء
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function EmployeesList() {
  const isMobile = useIsCompact();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"center" | "clinic" | "other">(
    "center",
  );
  const [editingCd, setEditingCd] = useState<string | null>(null);
  const [panelCd, setPanelCd] = useState<string | null>(null);
  const [swapCd, setSwapCd] = useState<string | null>(null);
  const [terminationCd, setTerminationCd] = useState<string | null>(null);
  const [terminationDate, setTerminationDate] = useState(() =>
    localDateKey(new Date()),
  );
  const [editRow, setEditRow] = useState<{
    fullName: string;
    department: string;
    salaryType: string;
    jobTitle: string;
    active: boolean;
  }>({
    fullName: "",
    department: "",
    salaryType: "",
    jobTitle: "",
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
    onError: (e: any) => toast.error("تعذر حفظ بيانات الموظف: " + e.message),
  });
  const deleteMutation = trpc.attendance.deleteEmployee.useMutation({
    onSuccess: () => {
      employeesQuery.refetch();
      toast.success("تم إيقاف الموظف (ترك العمل)");
    },
    onError: (e: any) => toast.error("تعذر حذف الموظف: " + e.message),
  });
  const terminateMutation = trpc.attendance.terminateEmployee.useMutation({
    onSuccess: () => {
      setTerminationCd(null);
      employeesQuery.refetch();
      toast.success("تم تسجيل ترك العمل وإخفاء الموظف من النظام");
    },
    onError: (e: any) => toast.error("تعذر تسجيل ترك العمل: " + e.message),
  });

  const startTermination = (empCd: string) => {
    setTerminationCd(empCd);
    setTerminationDate(localDateKey(new Date()));
    setEditingCd(null);
    setPanelCd(null);
    setSwapCd(null);
  };

  const confirmTermination = async (emp: any) => {
    if (!terminationDate) {
      toast.error("اختر تاريخ ترك العمل");
      return;
    }
    if (
      await askConfirm(
        `تأكيد أن ${emp.fullName} ترك العمل بتاريخ ${terminationDate}؟ سيختفي من جميع القوائم والاختيارات مع الاحتفاظ بسجلاته القديمة.`,
      )
    ) {
      terminateMutation.mutate({ empCd: emp.empCd, terminationDate });
    }
  };

  const startEdit = (emp: any) => {
    setEditingCd(emp.empCd);
    setPanelCd(null);
    setSwapCd(null);
    setEditRow({
      fullName: emp.fullName,
      department: emp.department ?? "",
      salaryType: emp.salaryType ?? "",
      jobTitle: emp.jobTitle ?? "",
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
  const latestBranchWeekday = new Map<string, string>();
  const shiftBranches = new Map(
    allShifts.map((shift) => [shift.id, shift.branch ?? "__unassigned"]),
  );
  const orderedAssignments = [...allAssignments].sort((left, right) =>
    String(right.effectiveFrom).localeCompare(String(left.effectiveFrom)),
  );
  for (const a of orderedAssignments) {
    // Only current schedules describe the employee's working days.
    if (
      a.isExpired ||
      String(a.effectiveFrom).slice(0, 10) > localDateKey(new Date())
    )
      continue;
    let visibleMask = 0;
    for (let weekday = 0; weekday < 7; weekday++) {
      if (!((a.weekdayMask ?? 127) & (1 << weekday))) continue;
      const branchDay = `${a.empCd}|${shiftBranches.get(a.shiftId) ?? "__unassigned"}|${weekday}`;
      const newest = latestBranchWeekday.get(branchDay);
      if (newest && newest > a.effectiveFrom) continue;
      latestBranchWeekday.set(branchDay, a.effectiveFrom);
      visibleMask |= 1 << weekday;
    }
    if (!visibleMask) continue;
    if (!assignmentsMap.has(a.empCd)) assignmentsMap.set(a.empCd, []);
    assignmentsMap.get(a.empCd)!.push({
      id: a.id,
      shiftId: a.shiftId,
      shiftName: a.shiftName,
      weekdayMask: visibleMask,
    });
  }

  const centerEmployees = allEmployees.filter(
    (e: any) =>
      e.department === "مركز" ||
      e.department === "المركز" ||
      e.department === "center" ||
      e.department === "المركز والعيادة",
  );
  const clinicEmployees = allEmployees.filter(
    (e: any) =>
      e.department === "عيادة" ||
      e.department === "العيادة" ||
      e.department === "clinic" ||
      e.department === "المركز والعيادة",
  );
  const knownDepartments = new Set([
    "مركز",
    "المركز",
    "center",
    "عيادة",
    "العيادة",
    "clinic",
    "المركز والعيادة",
  ]);
  const otherEmployees = allEmployees.filter(
    (employee: any) => !knownDepartments.has(employee.department ?? ""),
  );
  const displayEmployees =
    activeTab === "center"
      ? centerEmployees
      : activeTab === "clinic"
        ? clinicEmployees
        : otherEmployees;
  const filteredEmployees = displayEmployees.filter(
    (e: any) =>
      e.empCd.toLowerCase().includes(search.toLowerCase()) ||
      e.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const renderEmployeeTable = ({
    employees,
    isLoading,
    isError,
    isFiltered,
  }: any) => {
    if (isLoading)
      return (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">جارٍ تحميل الموظفين…</p>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <div className="space-y-3 py-8 text-center" role="alert">
          <p className="text-destructive">تعذر تحميل الموظفين. حاول مرة أخرى.</p>
          <Button variant="outline" onClick={() => employeesQuery.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      );
    if (!employees.length)
      return (
        <div className="py-8 text-center text-muted-foreground">
          {isFiltered
            ? "لا توجد نتائج تطابق البحث في هذا القسم. جرّب اسماً أو كوداً آخر."
            : "لا يوجد موظفون في هذا القسم حالياً."}
        </div>
      );

    if (isMobile) {
      return (
        <div
          className="attendance-employee-cards space-y-2 md:grid md:grid-cols-2 md:items-start md:gap-2 md:space-y-0"
          dir="rtl"
        >
          {employees.map((emp: any) => {
            const isEditing = editingCd === emp.empCd;
            const showPanel = panelCd === emp.empCd;
            const showSwap = swapCd === emp.empCd;
            const showTermination = terminationCd === emp.empCd;
            const isClinic =
              emp.department === "عيادة" ||
              emp.department === "العيادة" ||
              emp.department === "clinic" ||
              emp.department === "المركز والعيادة";
            const empAssignments = assignmentsMap.get(emp.empCd) ?? [];
            const assignment = empAssignments[0] ?? null;
            const combinedMask = empAssignments.reduce(
              (m, a) => m | a.weekdayMask,
              0,
            );
            const shiftNames = Array.from(
              new Map(
                empAssignments.map((a) => [a.shiftId, a.shiftName]),
              ).values(),
            );

            return (
              <div
                key={emp.empCd}
                className={`attendance-employee-card attendance-flat-record ${isEditing ? "bg-primary/5" : showPanel ? "bg-muted/20" : ""}`}
              >
                <div className="attendance-employee-identity flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-muted-foreground">
                      {emp.empCd}
                    </div>
                    {isEditing ? (
                      <Input bare
                        aria-label="اسم الموظف"
                        value={editRow.fullName}
                        onChange={(e) =>
                          setEditRow({ ...editRow, fullName: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    ) : (
                      <Link href={`/attendance/employees/${emp.empCd}`} className="font-semibold text-primary hover:underline">
                        {emp.fullName}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="attendance-summary-facts attendance-balance-facts">
                  <div>
                    <div className="text-muted-foreground">القسم</div>
                    {isEditing ? (
                      <select
                        aria-label="قسم الموظف"
                        value={editRow.department}
                        onChange={(e) =>
                          setEditRow({ ...editRow, department: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-1 py-1 text-xs"
                      >
                        <option value="">-</option>
                        <option value="مركز">مركز</option>
                        <option value="عيادة">عيادة</option>
                        <option value="المركز والعيادة">المركز والعيادة</option>
                      </select>
                    ) : (
                      <div className="font-medium text-foreground">
                        {emp.department || "-"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-muted-foreground">النوع</div>
                    {isEditing && isClinic ? (
                      <select
                        value={editRow.salaryType}
                        onChange={(e) =>
                          setEditRow({ ...editRow, salaryType: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-1 py-1 text-xs"
                      >
                        <option value="">-</option>
                        <option value="استشاري">استشاري</option>
                        <option value="أخصائي">أخصائي</option>
                        <option value="الاثنين">الاثنين</option>
                      </select>
                    ) : (
                      <div className="font-medium text-foreground">
                        {isClinic ? emp.salaryType || "-" : "-"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-muted-foreground">الوظيفة</div>
                    {isEditing ? (
                      <Input bare
                        aria-label="وظيفة الموظف"
                        value={editRow.jobTitle}
                        onChange={(e) =>
                          setEditRow({ ...editRow, jobTitle: e.target.value })
                        }
                        placeholder="طبيب أو محاسب"
                        className="mt-1 w-full rounded-md border border-input bg-background px-1 py-1 text-xs"
                      />
                    ) : (
                      <div className="font-medium text-foreground">
                        {emp.jobTitle || "-"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="attendance-employee-assignment mt-2 flex flex-wrap items-center gap-2">
                  {shiftNames.length > 0 ? (
                    shiftNames.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold text-foreground"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-destructive-text">
                      غير معيّن
                    </span>
                  )}
                  {combinedMask > 0 && (
                    <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                      {maskLabel(combinedMask)}
                    </span>
                  )}
                </div>

                <div className="attendance-employee-actions mt-1 flex flex-wrap justify-end gap-1">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startTermination(emp.empCd)}
                      title="تسجيل ترك العمل"
                      aria-pressed={showTermination}
                      className="h-11 gap-1 px-2 text-xs text-destructive"
                    >
                      ترك عمل
                    </Button>
                  )}
                  {isEditing ? (
                    <>
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
                            active: editRow.active,
                          })
                        }
                        aria-label="حفظ بيانات الموظف"
                        className="h-10 w-10 p-0"
                      >
                        <Check size={16} className="text-success" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCd(null)}
                        aria-label="إلغاء التعديل"
                        className="h-10 w-10 p-0"
                      >
                        <X size={16} className="text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(emp)}
                        title="تعديل بيانات الموظف"
                        aria-label="تعديل بيانات الموظف"
                        className="h-10 w-10 p-0"
                      >
                        <Pencil size={15} className="text-primary" />
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
                        aria-label="توزيع الوردية وأيام الدوام"
                        className={`h-10 w-10 p-0 ${showPanel ? "text-primary" : "text-muted-foreground"}`}
                      >
                        <Settings2 size={15} />
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
                        aria-label="تبديل مؤقت للوردية"
                        className={`h-10 w-10 p-0 ${showSwap ? "text-primary" : "text-muted-foreground"}`}
                      >
                        <ArrowLeftRight size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={async () => {
                          if (
                            await askConfirm(
                              `إيقاف ${emp.fullName} وتسجيل ترك العمل بتاريخ اليوم؟ ستبقى سجلاته القديمة.`,
                            )
                          )
                            deleteMutation.mutate({ empCd: emp.empCd });
                        }}
                        title="إيقاف الموظف"
                        aria-label="إيقاف الموظف"
                        className="h-10 w-10 p-0"
                      >
                        <Trash2 size={15} className="text-destructive" />
                      </Button>
                    </>
                  )}
                </div>

                {showTermination && (
                  <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <label className="mb-2 block text-xs font-semibold text-destructive">
                      تاريخ ترك العمل
                    </label>
                    <div className="flex items-center gap-2">
                      <DateInput
                        value={terminationDate}
                        onChange={(e) => setTerminationDate(e.target.value)}
                        className="min-w-0 flex-1 h-11 w-full sm:w-[11rem] shrink-0"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={terminateMutation.isPending}
                        onClick={() => confirmTermination(emp)}
                      >
                        تأكيد
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTerminationCd(null)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}

                {showPanel && (
                  <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <table>
                      <tbody>
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
                      </tbody>
                    </table>
                  </div>
                )}

                {showSwap && (
                  <div className="mt-2 rounded-xl border border-secondary/20 bg-secondary/5 p-3">
                    <table>
                      <tbody>
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
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto" dir="rtl">
        <table aria-label="قائمة الموظفين" className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/50">
              <th
                scope="col"
                className="px-4 py-3 text-center font-semibold w-16"
              >
                الكود
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                الاسم
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center font-semibold w-20"
              >
                القسم
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center font-semibold w-20"
              >
                النوع
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center font-semibold w-24"
              >
                الوظيفة
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                الوردية
              </th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">
                أيام الدوام
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center font-semibold w-28"
              >
                ترك العمل
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center font-semibold w-24"
              >
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => {
              const isEditing = editingCd === emp.empCd;
              const showPanel = panelCd === emp.empCd;
              const showSwap = swapCd === emp.empCd;
              const showTermination = terminationCd === emp.empCd;
              const isClinic =
                emp.department === "عيادة" ||
                emp.department === "العيادة" ||
                emp.department === "clinic" ||
                emp.department === "المركز والعيادة";
              const empAssignments = assignmentsMap.get(emp.empCd) ?? [];
              const assignment = empAssignments[0] ?? null;
              const combinedMask = empAssignments.reduce(
                (m, a) => m | a.weekdayMask,
                0,
              );

              return (
                <Fragment key={emp.empCd}>
                  <tr
                    className={`border-b transition-colors ${isEditing ? "bg-primary/5" : showPanel ? "bg-muted/20" : "hover:bg-muted/30"}`}
                  >
                    {/* Code */}
                    <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                      {emp.empCd}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 text-start">
                      {isEditing ? (
                        <Input bare
                          aria-label="اسم الموظف"
                          value={editRow.fullName}
                          onChange={(e) =>
                            setEditRow({ ...editRow, fullName: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      ) : (
                        <Link href={`/attendance/employees/${emp.empCd}`} className="text-primary hover:underline font-medium">
                          {emp.fullName}
                        </Link>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select
                          aria-label="قسم الموظف"
                          value={editRow.department}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              department: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">-</option>
                          <option value="مركز">مركز</option>
                          <option value="عيادة">عيادة</option>
                          <option value="المركز والعيادة">
                            المركز والعيادة
                          </option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {emp.department || "-"}
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
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="">-</option>
                          <option value="استشاري">استشاري</option>
                          <option value="أخصائي">أخصائي</option>
                          <option value="الاثنين">الاثنين</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {isClinic ? emp.salaryType || "-" : "-"}
                        </span>
                      )}
                    </td>

                    {/* Job title */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <Input bare
                          aria-label="وظيفة الموظف"
                          value={editRow.jobTitle}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              jobTitle: e.target.value,
                            })
                          }
                          placeholder="طبيب، محاسب، تمريض"
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {emp.jobTitle || "-"}
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
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
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
                        <span className="text-xs italic text-destructive-text">
                          غير معيّن
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {combinedMask > 0 ? (
                        <span
                          className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-mono border ${
                            showPanel
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {maskLabel(combinedMask)}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          -
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {showTermination ? (
                        <div className="flex min-w-48 items-center gap-1">
                          <DateInput
                            value={terminationDate}
                            onChange={(e) => setTerminationDate(e.target.value)}
                            className="h-8 min-w-32 text-xs h-11 w-full sm:w-[11rem] shrink-0"
                          />
                          <Button aria-label="تأكيد إنهاء الخدمة" title="تأكيد إنهاء الخدمة"
                            size="sm"
                            variant="destructive"
                            disabled={terminateMutation.isPending}
                            onClick={() => confirmTermination(emp)}
                            className="h-8 px-2"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTerminationCd(null)}
                            className="h-8 w-8 p-0"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-destructive">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => startTermination(emp.empCd)}
                            className="h-4 w-4 accent-destructive"
                          />
                          ترك عمل
                        </label>
                      )}
                    </td>

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
                                active: editRow.active,
                              })
                            }
                            aria-label="حفظ بيانات الموظف"
                            className="h-8 w-8 p-0"
                          >
                            <Check size={15} className="text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCd(null)}
                            aria-label="إلغاء التعديل"
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
                            aria-label="تعديل بيانات الموظف"
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
                            aria-label="توزيع الوردية وأيام الدوام"
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
                            aria-label="تبديل مؤقت للوردية"
                            className={`h-8 w-8 p-0 ${showSwap ? "text-primary" : "text-muted-foreground"}`}
                          >
                            <ArrowLeftRight size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={async () => {
                              if (
                                await askConfirm(
                                  `إيقاف ${emp.fullName} وتسجيل ترك العمل بتاريخ اليوم؟ ستبقى سجلاته القديمة.`,
                                )
                              )
                                deleteMutation.mutate({ empCd: emp.empCd });
                            }}
                            title="إيقاف الموظف"
                            aria-label="إيقاف الموظف"
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
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="attendance-employees space-y-4" dir="rtl">
      <div className="attendance-employee-toolbar">
        <div className="attendance-employee-filters" role="group" aria-label="قسم الموظفين">
          {(["center", "clinic", "other"] as const).map((t) => (
            <Button variant="bare"
              key={t}
              type="button"
              aria-pressed={activeTab === t}
              onClick={() => setActiveTab(t)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "center"
                ? `المركز (${centerEmployees.length})`
                : t === "clinic"
                  ? `العيادة (${clinicEmployees.length})`
                  : `غير مصنف (${otherEmployees.length})`}
            </Button>
          ))}
        </div>
        <div className="attendance-employee-search">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            id="attendance-employee-search"
            aria-label="بحث بالكود أو الاسم"
            placeholder="بحث بالكود أو الاسم"
            enterKeyHint="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <span className="whitespace-nowrap text-sm text-muted-foreground" role="status" aria-live="polite">
            {filteredEmployees.length} نتيجة
          </span>
        </div>
      </div>

      <Card className="attendance-section">
        <CardContent>
          {renderEmployeeTable({
            employees: filteredEmployees,
            isLoading: employeesQuery.isLoading,
            isError: employeesQuery.isError,
            isFiltered: Boolean(search.trim()),
          })}
        </CardContent>
      </Card>
    </div>
  );
}
