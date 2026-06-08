import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Pencil, Trash2, Check, X, Settings2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

// weekdayMask: bit 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAYS_AR  = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const DAYS_SH  = ["ح","ن","ث","ر","خ","ج","س"];
const PRESET_SAT_WED = [6, 0, 1, 2, 3];
const PRESET_SUN_THU = [0, 1, 2, 3, 4];

function maskToDays(mask: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < 7; i++) if ((mask >> i) & 1) s.add(i);
  return s;
}
function daysToMask(days: Set<number>): number {
  return Array.from(days).reduce((m, d) => m | (1 << d), 0);
}
function maskLabel(mask: number): string {
  if (!mask) return "—";
  return Array.from(maskToDays(mask))
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => DAYS_SH[d]).join(" ");
}

// ── Assignment + Working Days Panel ─────────────────────────────────────────
function AssignmentPanel({
  empCd,
  empName,
  assignment,    // { id, shiftId, shiftName, weekdayMask } | null
  shifts,        // all available shifts
  onSaved,
  onClose,
}: {
  empCd: string;
  empName: string;
  assignment: { id: number; shiftId: number; shiftName: string; weekdayMask: number } | null;
  shifts: any[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [shiftId, setShiftId]   = useState<number>(assignment?.shiftId ?? 0);
  const [days, setDays]         = useState<Set<number>>(() => maskToDays(assignment?.weekdayMask ?? 127));
  const [effectiveFrom, setEffectiveFrom] = useState(today);

  useEffect(() => {
    setShiftId(assignment?.shiftId ?? 0);
    setDays(maskToDays(assignment?.weekdayMask ?? 127));
  }, [assignment]);

  // Mutation: update existing assignment (shift + working days)
  const updateMut = (trpc as any).attendance.updateAssignment.useMutation({
    onSuccess: () => { onSaved(); toast.success("تم الحفظ"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // Mutation: assign new shift (no existing assignment)
  const assignMut = (trpc as any).attendance.assignShift.useMutation({
    onSuccess: () => { onSaved(); toast.success("تم التعيين"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  function save() {
    const mask = daysToMask(days);
    if (!shiftId) { toast.error("اختر وردية أولاً"); return; }
    if (days.size === 0) { toast.error("اختر يوم دوام واحد على الأقل"); return; }

    if (assignment) {
      // Update existing: change shift if different, always update mask
      const updates: any = { id: assignment.id, weekdayMask: mask };
      if (shiftId !== assignment.shiftId) updates.shiftId = shiftId;
      updateMut.mutate(updates);
    } else {
      // Create new assignment
      assignMut.mutate({ empCd, shiftId, effectiveFrom, weekdayMask: mask });
    }
  }

  const isPending = updateMut.isPending || assignMut.isPending;
  const sortedDays = Array.from(days).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

  return (
    <tr className="border-b border-primary/20 bg-primary/5">
      <td colSpan={7} className="px-5 py-4" dir="rtl">
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              توزيع الوردية — <span className="text-primary">{empName}</span>
            </p>
            <button type="button" onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Shift selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">الوردية</label>
              <select
                value={shiftId || ""}
                onChange={e => setShiftId(e.target.value ? parseInt(e.target.value) : 0)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">— اختر وردية —</option>
                {shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} – {s.endTime})
                  </option>
                ))}
              </select>
              {!assignment && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">تاريخ البداية</label>
                  <input type="date" value={effectiveFrom}
                    onChange={e => setEffectiveFrom(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
                </div>
              )}
              {!assignment && (
                <p className="text-[11px] text-amber-600">⚠️ لا توجد وردية مسبقة — سيتم إنشاء تعيين جديد</p>
              )}
            </div>

            {/* Working days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">أيام الدوام</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setDays(new Set(PRESET_SAT_WED))}
                    className="rounded px-2 py-0.5 text-[10px] font-medium border border-border bg-background hover:bg-muted/60 transition-colors">
                    س→ر
                  </button>
                  <button type="button" onClick={() => setDays(new Set(PRESET_SUN_THU))}
                    className="rounded px-2 py-0.5 text-[10px] font-medium border border-border bg-background hover:bg-muted/60 transition-colors">
                    ح→خ
                  </button>
                  <button type="button" onClick={() => setDays(new Set())}
                    className="rounded px-2 py-0.5 text-[10px] font-medium border border-destructive/40 text-destructive bg-background hover:bg-destructive/10 transition-colors">
                    مسح
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_AR.map((name, dow) => {
                  const active = days.has(dow);
                  const isFri = dow === 5;
                  return (
                    <button key={dow} type="button"
                      onClick={() => !isFri && setDays(d => { const n = new Set(d); n.has(dow) ? n.delete(dow) : n.add(dow); return n; })}
                      title={isFri ? "الجمعة إجازة" : name}
                      className={`flex flex-col items-center rounded-lg border px-2.5 py-1.5 text-center transition-colors ${
                        isFri ? "border-dashed border-border/30 opacity-30 cursor-not-allowed"
                        : active ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}>
                      <span className="text-[11px] font-bold">{DAYS_SH[dow]}</span>
                      <span className="text-[8px] leading-tight opacity-60">{name}</span>
                    </button>
                  );
                })}
              </div>
              {days.size > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {sortedDays.map(d => DAYS_AR[d]).join(" ، ")} — {days.size} أيام
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t border-border/30">
            <button type="button" onClick={save} disabled={isPending}
              className="rounded-lg border border-primary bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isPending ? "جاري الحفظ…" : "حفظ"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
              إلغاء
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
  const [dateFrom, setDateFrom]     = useState(today);
  const [dateTo, setDateTo]         = useState(today);

  const tempMut = (trpc as any).attendance.tempChangeShift.useMutation({
    onSuccess: () => { onSaved(); toast.success("تم تبديل الوردية مؤقتاً"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  function save() {
    if (!newShiftId) { toast.error("اختر الوردية الجديدة"); return; }
    if (!assignment) { toast.error("لا توجد وردية أساسية للموظف"); return; }
    if (dateTo < dateFrom) { toast.error("تاريخ النهاية قبل البداية"); return; }
    tempMut.mutate({ empCd, newShiftId, dateFrom, dateTo });
  }

  const otherShifts = shifts.filter((s: any) => s.id !== assignment?.shiftId);

  return (
    <tr className="border-b border-amber-200/40 bg-amber-500/5">
      <td colSpan={7} className="px-5 py-4" dir="rtl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-amber-600" />
              <p className="text-sm font-semibold text-foreground">
                تبديل مؤقت — <span className="text-amber-600">{empName}</span>
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 transition-colors">
              <X size={14} />
            </button>
          </div>

          {!assignment ? (
            <p className="text-sm text-destructive">⚠️ لا توجد وردية أساسية — عيّن وردية أولاً من زر ⚙</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* New shift */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">الوردية الجديدة (مؤقتاً)</label>
                <select value={newShiftId || ""}
                  onChange={e => setNewShiftId(e.target.value ? parseInt(e.target.value) : 0)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">— اختر وردية —</option>
                  {otherShifts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  الوردية الحالية: <span className="font-semibold">{currentShiftName ?? "—"}</span>
                </p>
              </div>

              {/* Date from */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">من تاريخ</label>
                <input type="date" value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); if (dateTo < e.target.value) setDateTo(e.target.value); }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>

              {/* Date to */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">حتى تاريخ (شامل)</label>
                <input type="date" value={dateTo} min={dateFrom}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {assignment && (
            <div className="flex gap-2 pt-1 border-t border-border/30">
              <button type="button" onClick={save} disabled={tempMut.isPending}
                className="rounded-lg border border-amber-500 bg-amber-500 px-5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {tempMut.isPending ? "جاري التبديل…" : "تأكيد التبديل"}
              </button>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
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
  const [search, setSearch]       = useState("");
  const [activeTab, setActiveTab] = useState<"center" | "clinic">("center");
  const [editingCd, setEditingCd] = useState<string | null>(null);
  const [panelCd, setPanelCd]     = useState<string | null>(null);
  const [swapCd, setSwapCd]       = useState<string | null>(null);
  const [editRow, setEditRow] = useState<{
    fullName: string; department: string; salaryType: string;
    attendanceCommissionRate: string; active: boolean;
  }>({ fullName: "", department: "", salaryType: "", attendanceCommissionRate: "", active: true });

  const employeesQuery   = (trpc as any).attendance.employeesList.useQuery();
  const assignmentsQuery = (trpc as any).attendance.listAssignments.useQuery({});
  const shiftsQuery      = (trpc as any).attendance.listShifts.useQuery();

  const updateMutation = trpc.attendance.updateEmployee.useMutation({
    onSuccess: () => { setEditingCd(null); employeesQuery.refetch(); toast.success("تم التعديل"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.attendance.deleteEmployee.useMutation({
    onSuccess: () => { employeesQuery.refetch(); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const startEdit = (emp: any) => {
    setEditingCd(emp.empCd); setPanelCd(null); setSwapCd(null);
    setEditRow({
      fullName: emp.fullName, department: emp.department ?? "",
      salaryType: emp.salaryType ?? "",
      attendanceCommissionRate: emp.attendanceCommissionRate != null
        ? String(Math.round(Number(emp.attendanceCommissionRate) * 100)) : "",
      active: emp.active,
    });
  };

  const allEmployees  = employeesQuery.data?.employees ?? [];
  const allAssignments: any[] = assignmentsQuery.data ?? [];
  const allShifts: any[] = shiftsQuery.data ?? [];

  // empCd → assignment object (first/latest)
  const assignmentMap = new Map<string, { id: number; shiftId: number; shiftName: string; weekdayMask: number }>();
  for (const a of allAssignments) {
    if (!assignmentMap.has(a.empCd)) {
      assignmentMap.set(a.empCd, {
        id: a.id,
        shiftId: a.shiftId,
        shiftName: a.shiftName,
        weekdayMask: a.weekdayMask ?? 127,
      });
    }
  }

  const centerEmployees  = allEmployees.filter((e: any) => e.department === "مركز" || e.department === "center");
  const clinicEmployees  = allEmployees.filter((e: any) => e.department === "عيادة" || e.department === "clinic");
  const displayEmployees = activeTab === "center" ? centerEmployees : clinicEmployees;
  const filteredEmployees = displayEmployees.filter((e: any) =>
    e.empCd.toLowerCase().includes(search.toLowerCase()) ||
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const EmployeeTable = ({ employees, isLoading, isError }: any) => {
    if (isLoading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
    if (isError) return <div className="py-8 text-center text-destructive">خطأ في تحميل الموظفين.</div>;
    if (!employees.length) return <div className="py-8 text-center text-muted-foreground">لا توجد موظفين في هذا القسم</div>;

    return (
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-center font-semibold w-16">الكود</th>
              <th className="px-4 py-3 text-right font-semibold">الاسم</th>
              <th className="px-4 py-3 text-center font-semibold w-20">القسم</th>
              <th className="px-4 py-3 text-center font-semibold w-20">النوع</th>
              <th className="px-4 py-3 text-right font-semibold">الوردية</th>
              <th className="px-4 py-3 text-center font-semibold">أيام الدوام</th>
              <th className="px-4 py-3 text-center font-semibold w-24">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => {
              const isEditing  = editingCd === emp.empCd;
              const showPanel  = panelCd === emp.empCd;
              const showSwap   = swapCd === emp.empCd;
              const isClinic   = emp.department === "عيادة";
              const assignment = assignmentMap.get(emp.empCd) ?? null;
              const mask       = assignment?.weekdayMask ?? 0;

              return (
                <>
                  <tr key={emp.empCd}
                    className={`border-b transition-colors ${isEditing ? "bg-primary/5" : showPanel ? "bg-muted/20" : "hover:bg-muted/30"}`}>
                    {/* Code */}
                    <td className="px-4 py-3 text-center font-mono text-xs font-semibold">{emp.empCd}</td>

                    {/* Name */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input value={editRow.fullName}
                          onChange={e => setEditRow({ ...editRow, fullName: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
                      ) : (
                        <Link href={`/attendance/employees/${emp.empCd}`}>
                          <a className="text-primary hover:underline font-medium">{emp.fullName}</a>
                        </Link>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select value={editRow.department}
                          onChange={e => setEditRow({ ...editRow, department: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                          <option value="">—</option>
                          <option value="مركز">مركز</option>
                          <option value="عيادة">عيادة</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm">{emp.department || "—"}</span>
                      )}
                    </td>

                    {/* Salary type (clinic only) */}
                    <td className="px-4 py-3 text-center">
                      {isEditing && isClinic ? (
                        <select value={editRow.salaryType}
                          onChange={e => setEditRow({ ...editRow, salaryType: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                          <option value="">—</option>
                          <option value="استشاري">استشاري</option>
                          <option value="أخصائي">أخصائي</option>
                          <option value="الاثنين">الاثنين</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm">{isClinic ? (emp.salaryType || "—") : "—"}</span>
                      )}
                    </td>

                    {/* Shift */}
                    <td className="px-4 py-3">
                      {assignment ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                          showPanel ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/40 text-foreground"
                        }`}>
                          {assignment.shiftName}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-destructive/60">غير معيّن</span>
                      )}
                    </td>

                    {/* Working days */}
                    <td className="px-4 py-3 text-center">
                      {mask > 0 ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono border ${
                          showPanel ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground"
                        }`}>
                          {maskLabel(mask)}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" disabled={updateMutation.isPending}
                            onClick={() => updateMutation.mutate({
                              empCd: emp.empCd, fullName: editRow.fullName,
                              department: editRow.department || undefined,
                              salaryType: editRow.salaryType || undefined,
                              attendanceCommissionRate: editRow.attendanceCommissionRate !== ""
                                ? parseFloat(editRow.attendanceCommissionRate) / 100 : null,
                              active: editRow.active,
                            })} className="h-8 w-8 p-0">
                            <Check size={15} className="text-success" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingCd(null)} className="h-8 w-8 p-0">
                            <X size={15} className="text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(emp)}
                            title="تعديل بيانات الموظف" className="h-8 w-8 p-0">
                            <Pencil size={14} className="text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm"
                            onClick={() => { setPanelCd(showPanel ? null : emp.empCd); setEditingCd(null); setSwapCd(null); }}
                            title="توزيع الوردية وأيام الدوام"
                            className={`h-8 w-8 p-0 ${showPanel ? "text-primary" : "text-muted-foreground"}`}>
                            <Settings2 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm"
                            onClick={() => { setSwapCd(showSwap ? null : emp.empCd); setEditingCd(null); setPanelCd(null); }}
                            title="تبديل مؤقت للوردية"
                            className={`h-8 w-8 p-0 ${showSwap ? "text-amber-600" : "text-muted-foreground"}`}>
                            <ArrowLeftRight size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" disabled={deleteMutation.isPending}
                            onClick={() => { if (confirm(`هل تريد حذف ${emp.fullName}؟`)) deleteMutation.mutate({ empCd: emp.empCd }); }}
                            title="حذف الموظف" className="h-8 w-8 p-0">
                            <Trash2 size={14} className="text-red-500" />
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
                      assignment={assignment}
                      shifts={allShifts}
                      onSaved={() => { assignmentsQuery.refetch(); setPanelCd(null); }}
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
                      onSaved={() => { assignmentsQuery.refetch(); setSwapCd(null); }}
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
          عدد الموظفين: <span className="font-semibold text-foreground">{displayEmployees.length}</span>
        </span>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex gap-1 border-b border-border bg-background/95 px-1 pt-1">
        {(["center", "clinic"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "center" ? `المركز (${centerEmployees.length})` : `العيادة (${clinicEmployees.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-center">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input id="attendance-employee-search" placeholder="بحث بالكود أو الاسم..."
              value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            <span className="whitespace-nowrap text-sm text-muted-foreground">{filteredEmployees.length} نتيجة</span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "center" ? "موظفو المركز" : "موظفو العيادة"} ({displayEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeTable employees={filteredEmployees} isLoading={employeesQuery.isLoading} isError={employeesQuery.isError} />
        </CardContent>
      </Card>
    </div>
  );
}
