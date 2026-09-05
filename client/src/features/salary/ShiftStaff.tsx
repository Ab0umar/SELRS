import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Check,
  X,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = { doctor: "طبيب", tech: "فني" };
const DAYS_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const DAYS_SHORT = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
// dow: 0=Sunday … 6=Saturday

interface StaffForm {
  name: string;
  type: "doctor" | "tech";
  ratePerShift: string;
  rateSmallShift: string;
  mainShiftHours: string;
  active: boolean;
  empCd: string;
  userId: number | null;
}
const EMPTY: StaffForm = {
  name: "",
  type: "doctor",
  ratePerShift: "",
  rateSmallShift: "",
  mainShiftHours: "6",
  active: true,
  empCd: "",
  userId: null,
};

function calculatedFourHourShiftRate(ratePerShift: number, mainShiftHours: string) {
  const mainMinutes = (parseFloat(mainShiftHours) || 6) * 60;
  return Math.round((ratePerShift / mainMinutes) * 240 * 100) / 100;
}

function buildDayShifts(sc: any[]): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const c of sc) {
    if (!map.has(c.dayOfWeek)) map.set(c.dayOfWeek, new Set());
    map.get(c.dayOfWeek)!.add(c.shiftName);
  }
  return map;
}

function CycleEditor({
  staffId,
  cycles,
  onSaved,
}: {
  staffId: number;
  cycles: any[];
  onSaved: () => void;
}) {
  const staffCycles = cycles.filter((c: any) => c.staffId === staffId);
  const shiftDefsQ = (trpc as any).attendance.listShifts.useQuery();
  const shiftDefs: { name: string }[] = shiftDefsQ.data ?? [];

  const [dayShifts, setDayShifts] = useState<Map<number, Set<string>>>(() =>
    buildDayShifts(staffCycles),
  );

  useEffect(() => {
    setDayShifts(
      buildDayShifts(cycles.filter((c: any) => c.staffId === staffId)),
    );
  }, [cycles, staffId]);

  const saveMut = (trpc as any).salary.setStaffCycle.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success("تم حفظ أيام الدوام");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const now = new Date();
  const [resetYear, setResetYear] = useState(now.getFullYear());
  const [resetMonth, setResetMonth] = useState(now.getMonth() + 1);
  const clearGeneratedMut = (
    trpc as any
  ).salary.clearGeneratedShiftAttendance.useMutation({
    onSuccess: () => {
      toast.success("تم مسح الشفتات المولّدة لهذا الشهر");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function save() {
    const cycle: { dayOfWeek: number; shiftName: string }[] = [];
    for (const [dow, shifts] of dayShifts) {
      for (const sh of shifts) cycle.push({ dayOfWeek: dow, shiftName: sh });
    }
    saveMut.mutate({ staffId, cycle });
  }

  const totalAssignments = Array.from(dayShifts.values()).reduce(
    (s, set) => s + set.size,
    0,
  );

  return (
    <div className="px-4 pb-4 pt-2 space-y-3" dir="rtl">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            توزيع الورديات
          </p>
          <div className="flex gap-1 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setDayShifts(new Map())}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-border bg-background hover:bg-muted/60 text-destructive transition-colors"
            >
              مسح
            </button>
          </div>
        </div>

        <div className="grid w-full grid-cols-7 gap-1.5">
          {DAYS_AR.map((name, dow) => {
            const isFri = dow === 5;
            const shifts = dayShifts.get(dow) ?? new Set<string>();
            const hasAny = shifts.size > 0;
            const availableToAdd = shiftDefs.filter(
              (sd) => !shifts.has(sd.name),
            );

            function removeShift(shiftName: string) {
              setDayShifts((prev) => {
                const next = new Map(prev);
                const set = new Set(next.get(dow) ?? []);
                set.delete(shiftName);
                if (set.size === 0) next.delete(dow);
                else next.set(dow, set);
                return next;
              });
            }

            function addShift(shiftName: string) {
              if (!shiftName) return;
              setDayShifts((prev) => {
                const next = new Map(prev);
                const set = new Set(next.get(dow) ?? []);
                set.add(shiftName);
                next.set(dow, set);
                return next;
              });
            }

            return (
              <div
                key={dow}
                className={`flex min-h-[110px] flex-col gap-1 rounded-lg border p-1.5 ${
                  isFri
                    ? "border-dashed border-border/40 bg-muted/20 opacity-40"
                    : hasAny
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-background"
                }`}
              >
                <span className="text-center text-[11px] font-bold">
                  {name}
                </span>
                {!isFri && (
                  <>
                    <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                      {[...shifts].map((sh) => (
                        <span
                          key={sh}
                          className="flex items-center justify-between gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                        >
                          <span className="truncate">{sh}</span>
                          <button
                            type="button"
                            onClick={() => removeShift(sh)}
                            className="shrink-0 text-primary/70 hover:text-destructive"
                            title="إزالة"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    {availableToAdd.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => addShift(e.target.value)}
                        className="w-full rounded border border-input bg-background px-1 py-0.5 text-[10px]"
                      >
                        <option value="">+ إضافة وردية</option>
                        {availableToAdd.map((sd) => (
                          <option key={sd.name} value={sd.name}>
                            {sd.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {totalAssignments > 0 && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {totalAssignments} وردية على {dayShifts.size} أيام
          </p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/80">
        اختياري — اتركه فارغًا إذا يتم إضافة الطبيب في الروستر وإدخال المرتب
        يدويًا في الشفتات.
      </p>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saveMut.isPending}
          className="flex-1 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saveMut.isPending
            ? "جاري الحفظ…"
            : totalAssignments === 0
              ? "حفظ (بدون جدول)"
              : "حفظ"}
        </button>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 space-y-2">
        <p className="text-[10px] font-semibold text-destructive">
          مسح الشفتات المولّدة مسبقًا لهذا الطبيب (لا يمسحها مجرد حفظ جدول فارغ)
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={resetMonth}
            onChange={(e) => setResetMonth(Number(e.target.value))}
            className="rounded border border-input bg-background px-1.5 py-1 text-[10px]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={resetYear}
            onChange={(e) => setResetYear(Number(e.target.value))}
            className="rounded border border-input bg-background px-1.5 py-1 text-[10px]"
          >
            {[
              now.getFullYear() - 1,
              now.getFullYear(),
              now.getFullYear() + 1,
            ].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={clearGeneratedMut.isPending}
            onClick={() => {
              if (
                confirm(
                  `مسح كل الشفتات المولّدة لهذا الطبيب في ${resetMonth}/${resetYear}؟`,
                )
              ) {
                clearGeneratedMut.mutate({
                  staffId,
                  year: resetYear,
                  month: resetMonth,
                });
              }
            }}
            className="rounded border border-destructive bg-background px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
          >
            {clearGeneratedMut.isPending
              ? "جاري المسح…"
              : "مسح الشفتات المولّدة"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftStaff() {
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<StaffForm>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<StaffForm>(EMPTY);
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const staffQ = (trpc as any).salary.listShiftStaff.useQuery();
  const cyclesQ = (trpc as any).salary.getStaffCycles.useQuery();
  const employeesQ = (trpc as any).salary.listEmployees.useQuery();
  const usersQ = (trpc as any).salary.listUsersForShiftLink.useQuery();
  const usersList: any[] = usersQ.data ?? [];
  const staff: any[] = staffQ.data ?? [];
  const cycles: any[] = cyclesQ.data ?? [];
  const employees: any[] = employeesQ.data ?? [];

  const addMut = (trpc as any).salary.addShiftStaff.useMutation({
    onSuccess: () => {
      staffQ.refetch();
      setAdding(false);
      setAddForm(EMPTY);
      toast.success("Staff added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = (trpc as any).salary.updateShiftStaff.useMutation({
    onSuccess: () => {
      staffQ.refetch();
      setEditId(null);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = (trpc as any).salary.deleteShiftStaff.useMutation({
    onSuccess: () => {
      staffQ.refetch();
      cyclesQ.refetch();
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function submitAdd() {
    const rate = parseFloat(addForm.ratePerShift);
    if (!addForm.name.trim() || isNaN(rate)) {
      toast.error("Fill all fields");
      return;
    }
    addMut.mutate({
      name: addForm.name.trim(),
      type: addForm.type,
      ratePerShift: rate,
      rateSmallShift: calculatedFourHourShiftRate(
        rate,
        addForm.mainShiftHours,
      ),
      mainShiftMinutes: Math.round(
        (parseFloat(addForm.mainShiftHours) || 6) * 60,
      ),
      empCd: addForm.empCd || undefined,
    });
  }

  function startEdit(s: any) {
    setEditId(s.id);
    setCycleId(null);
    setEditForm({
      name: s.name,
      type: s.type,
      ratePerShift: String(s.ratePerShift),
      rateSmallShift: String(s.rateSmallShift ?? ""),
      mainShiftHours: String(Number(s.mainShiftMinutes ?? 360) / 60),
      active: s.active,
      empCd: s.empCd ?? "",
      userId: s.userId ?? null,
    });
  }

  function submitEdit(id: number) {
    const rate = parseFloat(editForm.ratePerShift);
    if (!editForm.name.trim() || isNaN(rate)) {
      toast.error("Fill all fields");
      return;
    }
    updateMut.mutate({
      id,
      name: editForm.name.trim(),
      type: editForm.type,
      ratePerShift: rate,
      rateSmallShift: calculatedFourHourShiftRate(
        rate,
        editForm.mainShiftHours,
      ),
      mainShiftMinutes: Math.round(
        (parseFloat(editForm.mainShiftHours) || 6) * 60,
      ),
      active: editForm.active,
      empCd: editForm.empCd || undefined,
      userId: editForm.userId,
    });
  }

  function hasCycle(id: number) {
    return cycles.some((c: any) => c.staffId === id);
  }

  const doctors = staff.filter((s) => s.type === "doctor");
  const techs = staff.filter((s) => s.type === "tech");

  function renderRow(s: any) {
    const isEditing = editId === s.id;
    const showCycle = cycleId === s.id;

    return (
      <tbody key={s.id}>
        {isEditing ? (
          <tr className="border-b border-border/50 bg-muted/10">
            <td className="px-4 py-2">
              <input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
              />
            </td>
            <td className="px-4 py-2">
              <select
                value={editForm.type}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, type: e.target.value as any }))
                }
                className="rounded border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="doctor">Doctor</option>
                <option value="tech">Technician</option>
              </select>
            </td>
            <td className="px-4 py-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={editForm.ratePerShift}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, ratePerShift: e.target.value }))
                }
                className="w-24 rounded border border-input bg-background px-2 py-1 text-sm text-right"
                placeholder="قيمة شفت 6 ساعات"
              />
            </td>
            <td className="px-4 py-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={calculatedFourHourShiftRate(
                  parseFloat(editForm.ratePerShift) || 0,
                  editForm.mainShiftHours,
                )}
                readOnly
                className="w-24 rounded border border-input bg-muted px-2 py-1 text-sm text-right"
                aria-label="قيمة شفت الأربع ساعات محسوبة تلقائيًا"
              />
            </td>
            <td className="px-4 py-2">
              <select
                value={editForm.empCd}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, empCd: e.target.value }))
                }
                className="rounded border border-input bg-background px-2 py-1 text-sm w-40"
              >
                <option value="">— None —</option>
                {employees.map((e: any) => (
                  <option key={e.empCd} value={e.empCd}>
                    {e.fullName} ({e.empCd})
                  </option>
                ))}
              </select>
            </td>
            <td className="px-4 py-2">
              <select
                value={editForm.userId ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    userId: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="rounded border border-input bg-background px-2 py-1 text-sm w-40"
              >
                <option value="">— No account —</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.username} ({u.role})
                  </option>
                ))}
              </select>
            </td>
            <td className="px-4 py-2">
              <select
                value={editForm.active ? "1" : "0"}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, active: e.target.value === "1" }))
                }
                className="rounded border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </td>
            <td className="px-4 py-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => submitEdit(s.id)}
                  disabled={updateMut.isPending}
                >
                  <Check size={14} className="text-success" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditId(null)}
                >
                  <X size={14} />
                </Button>
              </div>
            </td>
          </tr>
        ) : (
          <tr
            className={`border-b border-border/50 hover:bg-muted/20 ${!s.active ? "opacity-50" : ""}`}
          >
            <td className="px-4 py-3 font-medium">{s.name}</td>
            <td className="px-4 py-3 text-muted-foreground text-sm">
              {TYPE_LABEL[s.type]}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {Number(s.ratePerShift).toLocaleString("en-EG", {
                minimumFractionDigits: 2,
              })}{" "}
              EGP
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
              {Number(s.rateSmallShift ?? 0).toLocaleString("en-EG", {
                minimumFractionDigits: 2,
              })}{" "}
              EGP
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">
              {s.empCd ? (
                (employees.find((e: any) => e.empCd === s.empCd)?.fullName ??
                s.empCd)
              ) : (
                <span className="text-xs italic">Manual</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">
              {s.userId ? (
                (usersList.find((u: any) => u.id === s.userId)?.name ??
                `#${s.userId}`)
              ) : (
                <span className="text-xs italic text-muted-foreground/50">
                  —
                </span>
              )}
            </td>
            <td className="px-4 py-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${s.active ? "bg-success/100/10 text-success" : "bg-muted text-muted-foreground"}`}
              >
                {s.active ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => startEdit(s)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${hasCycle(s.id) ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => setCycleId(showCycle ? null : s.id)}
                  title="Set shift cycle"
                >
                  <RefreshCw size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (confirm(`Delete ${s.name}?`))
                      deleteMut.mutate({ id: s.id });
                  }}
                >
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            </td>
          </tr>
        )}
        {showCycle && (
          <tr className="border-b border-border/50 bg-primary/5">
            <td colSpan={8} className="p-0">
              <CycleEditor
                staffId={s.id}
                cycles={cycles}
                onSaved={() => {
                  cyclesQ.refetch();
                  setCycleId(null);
                }}
              />
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  function renderMobileCard(s: any) {
    const isEditing = editId === s.id;
    const isExpanded = !!expandedRows[s.id];
    const showCycle = cycleId === s.id;

    if (isEditing) {
      return (
        <div
          key={s.id}
          className="p-4 bg-card hover:bg-muted/20 transition-colors space-y-3"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              الاسم
            </label>
            <input
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              النوع
            </label>
            <select
              value={editForm.type}
              onChange={(e) =>
                setEditForm({ ...editForm, type: e.target.value as any })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="doctor">طبيب</option>
              <option value="tech">فني</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              قيمة شفت 6 ساعات (ج.م)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={editForm.ratePerShift}
              onChange={(e) =>
                setEditForm({ ...editForm, ratePerShift: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              شفت 4 ساعات، محسوب تلقائيًا (ج.م)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={calculatedFourHourShiftRate(
                parseFloat(editForm.ratePerShift) || 0,
                editForm.mainShiftHours,
              )}
              readOnly
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              ربط الحضور
            </label>
            <select
              value={editForm.empCd}
              onChange={(e) =>
                setEditForm({ ...editForm, empCd: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Manual</option>
              {employees.map((e: any) => (
                <option key={e.empCd} value={e.empCd}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground">
              حساب المستخدم
            </label>
            <select
              value={editForm.userId ?? ""}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  userId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">—</option>
              {usersList.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.username}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`edit-active-${s.id}`}
              checked={editForm.active}
              onChange={(e) =>
                setEditForm({ ...editForm, active: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label
              htmlFor={`edit-active-${s.id}`}
              className="text-xs font-bold text-foreground"
            >
              نشط ومتاح في الشفتات
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={updateMut.isPending}
              onClick={() => submitEdit(s.id)}
              className="h-9 px-3 border-border text-success gap-1 flex-1 font-semibold"
            >
              <Check size={14} />
              <span>حفظ</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditId(null)}
              className="h-9 px-3 border-border gap-1 flex-1 font-semibold"
            >
              <X size={14} />
              <span>إلغاء</span>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={s.id}
        className={`p-4 bg-card hover:bg-muted/20 transition-colors ${!s.active ? "opacity-50" : ""}`}
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleRow(s.id)}
        >
          <div className="space-y-1">
            <div className="font-bold text-sm text-foreground">{s.name}</div>
            <div className="text-xs text-muted-foreground">
              النوع: {TYPE_LABEL[s.type]}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">
                قيمة الشفت
              </div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {Number(s.ratePerShift).toLocaleString("en-EG", {
                  minimumFractionDigits: 2,
                })}{" "}
                EGP
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-border/20 pb-1">
                <span className="text-muted-foreground">ربط الحضور:</span>
                <span className="font-semibold text-foreground">
                  {s.empCd ? (
                    (employees.find((e: any) => e.empCd === s.empCd)
                      ?.fullName ?? s.empCd)
                  ) : (
                    <span className="text-xs italic text-muted-foreground/50">
                      Manual
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-1">
                <span className="text-muted-foreground">حساب المستخدم:</span>
                <span className="font-semibold text-foreground">
                  {s.userId ? (
                    (usersList.find((u: any) => u.id === s.userId)?.name ??
                    `#${s.userId}`)
                  ) : (
                    <span className="text-xs italic text-muted-foreground/50">
                      —
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-1">
                <span className="text-muted-foreground">الحالة:</span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${s.active ? "bg-success/10 text-success ring-1 ring-success/20" : "bg-muted/40 text-muted-foreground ring-1 ring-border/40"}`}
                >
                  {s.active ? "نشط" : "غير نشط"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startEdit(s)}
                className="h-9 px-3 border-border hover:bg-primary/10 text-primary gap-1"
              >
                <Pencil size={14} />
                <span>تعديل</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCycleId(showCycle ? null : s.id)}
                className={`h-9 px-3 border-border gap-1 ${hasCycle(s.id) ? "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/30"}`}
              >
                <RefreshCw size={14} />
                <span>الدورة</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${s.name}?`))
                    deleteMut.mutate({ id: s.id });
                }}
                className="h-9 px-3 border-border hover:bg-destructive/10 text-destructive gap-1"
              >
                <Trash2 size={14} className="text-destructive" />
                <span>حذف</span>
              </Button>
            </div>

            {showCycle && (
              <div className="mt-4 pt-4 border-t border-border/40 bg-primary/5 rounded-lg p-3">
                <CycleEditor
                  staffId={s.id}
                  cycles={cycles}
                  onSaved={() => {
                    cyclesQ.refetch();
                    setCycleId(null);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderTable(rows: any[], title: string) {
    if (rows.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>

        {/* Desktop Table View */}
        <div className="hidden lg:block rounded-md border overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-right font-medium">الاسم</th>
                <th className="px-4 py-2 text-right font-medium">النوع</th>
                <th className="px-4 py-2 text-right font-medium">شفت 6 ساعات</th>
                <th className="px-4 py-2 text-right font-medium">شفت 4 ساعات</th>
                <th className="px-4 py-2 text-right font-medium">ربط الحضور</th>
                <th className="px-4 py-2 text-right font-medium">
                  حساب المستخدم
                </th>
                <th className="px-4 py-2 text-right font-medium">الحالة</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            {rows.map(renderRow)}
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden rounded-md border overflow-hidden divide-y divide-border/65">
          {rows.map(renderMobileCard)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">الأطباء والفنيون</h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} className="mr-1" /> إضافة
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-md border p-4 space-y-3 bg-muted/10">
          <h3 className="text-sm font-semibold">عضو شفت جديد</h3>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="الاسم الكامل"
              value={addForm.name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, name: e.target.value }))
              }
              className="flex-1 min-w-40 rounded border border-input bg-background px-3 py-1.5 text-sm"
            />
            <select
              value={addForm.type}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, type: e.target.value as any }))
              }
              className="rounded border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="doctor">طبيب</option>
              <option value="tech">فني</option>
            </select>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="قيمة شفت 6 ساعات"
                value={addForm.ratePerShift}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, ratePerShift: e.target.value }))
                }
                className="w-36 rounded border border-input bg-background px-3 py-1.5 text-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ج.م
              </span>
            </div>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>مدة الشفت الأساسي بالساعات</span>
              <input
                type="number"
                min={0.25}
                max={24}
                step={0.25}
                value={addForm.mainShiftHours}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, mainShiftHours: e.target.value }))
                }
                className="w-36 rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              />
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="قيمة شفت 4 ساعات"
                value={calculatedFourHourShiftRate(
                  parseFloat(addForm.ratePerShift) || 0,
                  addForm.mainShiftHours,
                )}
                readOnly
                className="w-36 rounded border border-input bg-muted px-3 py-1.5 text-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ج.م
              </span>
            </div>
            <select
              value={addForm.empCd}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, empCd: e.target.value }))
              }
              className="rounded border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">ربط الحضور (اختياري)</option>
              {employees.map((e: any) => (
                <option key={e.empCd} value={e.empCd}>
                  {e.fullName} ({e.empCd})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submitAdd} disabled={addMut.isPending}>
              حفظ
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setAddForm(EMPTY);
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {staffQ.isLoading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : (
        <div className="space-y-6">
          {renderTable(doctors, "الأطباء")}
          {renderTable(techs, "الفنيون")}
          {staff.length === 0 && (
            <p className="text-sm text-muted-foreground">لا يوجد طاقم بعد.</p>
          )}
        </div>
      )}
    </div>
  );
}
