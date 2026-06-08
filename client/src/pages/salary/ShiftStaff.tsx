import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Check, X, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = { doctor: "طبيب", tech: "فني" };
const DAYS_AR = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const DAYS_SHORT = ["ح","ن","ث","ر","خ","ج","س"];
// dow: 0=Sunday … 6=Saturday
const PRESET_SAT_WED = [6, 0, 1, 2, 3]; // السبت→الأربعاء
const PRESET_SUN_THU = [0, 1, 2, 3, 4]; // الأحد→الخميس

interface StaffForm { name: string; type: "doctor" | "tech"; ratePerShift: string; active: boolean; empCd: string; userId: number | null; }
const EMPTY: StaffForm = { name: "", type: "doctor", ratePerShift: "", active: true, empCd: "", userId: null };

// dayOfWeek → set of active shiftNames (kept for reference)
type CycleMap = Record<number, string[]>;


function CycleEditor({ staffId, cycles, onSaved }: { staffId: number; cycles: any[]; onSaved: () => void }) {
  const staffCycles = cycles.filter((c: any) => c.staffId === staffId);

  // Derive initial shift type from saved data (default Morning)
  const savedShift = staffCycles[0]?.shiftName === "Night" ? "Night" : "Morning";
  const savedDays = new Set<number>(staffCycles.map((c: any) => c.dayOfWeek));

  const [shiftType, setShiftType] = useState<"Morning" | "Night">(savedShift);
  const [days, setDays] = useState<Set<number>>(savedDays);

  useEffect(() => {
    const sc = cycles.filter((c: any) => c.staffId === staffId);
    setShiftType(sc[0]?.shiftName === "Night" ? "Night" : "Morning");
    setDays(new Set<number>(sc.map((c: any) => c.dayOfWeek)));
  }, [cycles, staffId]);

  const saveMut = (trpc as any).salary.setStaffCycle.useMutation({
    onSuccess: () => { onSaved(); toast.success("تم حفظ أيام الدوام"); },
    onError: (e: any) => toast.error(e.message),
  });

  function toggleDay(dow: number) {
    setDays(d => {
      const n = new Set(d);
      n.has(dow) ? n.delete(dow) : n.add(dow);
      return n;
    });
  }

  function applyPreset(preset: number[]) {
    setDays(new Set(preset));
  }

  function save() {
    const cycle = Array.from(days).map(dow => ({ dayOfWeek: dow, shiftName: shiftType }));
    saveMut.mutate({ staffId, cycle });
  }

  return (
    <div className="px-4 pb-4 pt-2 space-y-3" dir="rtl">
      {/* Shift type */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">نوع الوردية</p>
        <div className="flex gap-2">
          {(["Morning", "Night"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setShiftType(s)}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                shiftType === s
                  ? s === "Morning"
                    ? "border-orange-400 bg-orange-500/10 text-orange-700"
                    : "border-blue-400 bg-blue-500/10 text-blue-700"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s === "Morning" ? "☀ صباحي" : "🌙 مسائي"}
            </button>
          ))}
        </div>
      </div>

      {/* Day selection */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">أيام الدوام</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => applyPreset(PRESET_SAT_WED)}
              className="rounded px-2 py-0.5 text-[10px] font-medium border border-border bg-background hover:bg-muted/60 transition-colors">
              س→ر
            </button>
            <button type="button" onClick={() => applyPreset(PRESET_SUN_THU)}
              className="rounded px-2 py-0.5 text-[10px] font-medium border border-border bg-background hover:bg-muted/60 transition-colors">
              ح→خ
            </button>
            <button type="button" onClick={() => setDays(new Set())}
              className="rounded px-2 py-0.5 text-[10px] font-medium border border-border bg-background hover:bg-muted/60 text-destructive transition-colors">
              مسح
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS_AR.map((name, dow) => {
            const active = days.has(dow);
            const isFri = dow === 5;
            return (
              <button
                key={dow}
                type="button"
                onClick={() => !isFri && toggleDay(dow)}
                title={isFri ? "الجمعة إجازة" : name}
                className={`flex flex-col items-center rounded-lg border px-2.5 py-2 text-center transition-colors ${
                  isFri
                    ? "border-dashed border-border/40 bg-muted/20 cursor-not-allowed opacity-40"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="text-xs font-bold">{DAYS_SHORT[dow]}</span>
                <span className="text-[9px] leading-tight mt-0.5 opacity-70">{name}</span>
              </button>
            );
          })}
        </div>
        {days.size > 0 && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {Array.from(days).sort((a,b)=>a-b).map(d => DAYS_AR[d]).join(" ، ")} — {days.size} أيام
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saveMut.isPending || days.size === 0}
          className="flex-1 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saveMut.isPending ? "جاري الحفظ…" : "حفظ"}
        </button>
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

  const staffQ = (trpc as any).salary.listShiftStaff.useQuery();
  const cyclesQ = (trpc as any).salary.getStaffCycles.useQuery();
  const employeesQ = (trpc as any).salary.listEmployees.useQuery();
  const usersQ = (trpc as any).salary.listUsersForShiftLink.useQuery();
  const usersList: any[] = usersQ.data ?? [];
  const staff: any[] = staffQ.data ?? [];
  const cycles: any[] = cyclesQ.data ?? [];
  const employees: any[] = employeesQ.data ?? [];

  const addMut = (trpc as any).salary.addShiftStaff.useMutation({
    onSuccess: () => { staffQ.refetch(); setAdding(false); setAddForm(EMPTY); toast.success("Staff added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = (trpc as any).salary.updateShiftStaff.useMutation({
    onSuccess: () => { staffQ.refetch(); setEditId(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = (trpc as any).salary.deleteShiftStaff.useMutation({
    onSuccess: () => { staffQ.refetch(); cyclesQ.refetch(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  function submitAdd() {
    const rate = parseFloat(addForm.ratePerShift);
    if (!addForm.name.trim() || isNaN(rate)) { toast.error("Fill all fields"); return; }
    addMut.mutate({ name: addForm.name.trim(), type: addForm.type, ratePerShift: rate, empCd: addForm.empCd || undefined });
  }

  function startEdit(s: any) {
    setEditId(s.id); setCycleId(null);
    setEditForm({ name: s.name, type: s.type, ratePerShift: String(s.ratePerShift), active: s.active, empCd: s.empCd ?? "", userId: s.userId ?? null });
  }

  function submitEdit(id: number) {
    const rate = parseFloat(editForm.ratePerShift);
    if (!editForm.name.trim() || isNaN(rate)) { toast.error("Fill all fields"); return; }
    updateMut.mutate({ id, name: editForm.name.trim(), type: editForm.type, ratePerShift: rate, active: editForm.active, empCd: editForm.empCd || undefined, userId: editForm.userId });
  }

  function hasCycle(id: number) {
    return cycles.some((c: any) => c.staffId === id);
  }

  const doctors = staff.filter(s => s.type === "doctor");
  const techs = staff.filter(s => s.type === "tech");

  function renderRow(s: any) {
    const isEditing = editId === s.id;
    const showCycle = cycleId === s.id;

    return (
      <tbody key={s.id}>
        {isEditing ? (
          <tr className="border-b border-border/50 bg-muted/10">
            <td className="px-4 py-2">
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-input bg-background px-2 py-1 text-sm" />
            </td>
            <td className="px-4 py-2">
              <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value as any }))}
                className="rounded border border-input bg-background px-2 py-1 text-sm">
                <option value="doctor">Doctor</option>
                <option value="tech">Technician</option>
              </select>
            </td>
            <td className="px-4 py-2">
              <input type="number" min={0} step={0.01} value={editForm.ratePerShift}
                onChange={e => setEditForm(f => ({ ...f, ratePerShift: e.target.value }))}
                className="w-28 rounded border border-input bg-background px-2 py-1 text-sm text-right" />
            </td>
            <td className="px-4 py-2">
              <select value={editForm.empCd} onChange={e => setEditForm(f => ({ ...f, empCd: e.target.value }))}
                className="rounded border border-input bg-background px-2 py-1 text-sm w-40">
                <option value="">— None —</option>
                {employees.map((e: any) => (
                  <option key={e.empCd} value={e.empCd}>{e.fullName} ({e.empCd})</option>
                ))}
              </select>
            </td>
            <td className="px-4 py-2">
              <select value={editForm.userId ?? ""} onChange={e => setEditForm(f => ({ ...f, userId: e.target.value ? parseInt(e.target.value) : null }))}
                className="rounded border border-input bg-background px-2 py-1 text-sm w-40">
                <option value="">— No account —</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.username} ({u.role})</option>
                ))}
              </select>
            </td>
            <td className="px-4 py-2">
              <select value={editForm.active ? "1" : "0"} onChange={e => setEditForm(f => ({ ...f, active: e.target.value === "1" }))}
                className="rounded border border-input bg-background px-2 py-1 text-sm">
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </td>
            <td className="px-4 py-2">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => submitEdit(s.id)} disabled={updateMut.isPending}>
                  <Check size={14} className="text-green-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditId(null)}>
                  <X size={14} />
                </Button>
              </div>
            </td>
          </tr>
        ) : (
          <tr className={`border-b border-border/50 hover:bg-muted/20 ${!s.active ? "opacity-50" : ""}`}>
            <td className="px-4 py-3 font-medium">{s.name}</td>
            <td className="px-4 py-3 text-muted-foreground text-sm">{TYPE_LABEL[s.type]}</td>
            <td className="px-4 py-3 text-right tabular-nums">{Number(s.ratePerShift).toLocaleString("en-EG", { minimumFractionDigits: 2 })} EGP</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">
              {s.empCd
                ? (employees.find((e: any) => e.empCd === s.empCd)?.fullName ?? s.empCd)
                : <span className="text-xs italic">Manual</span>}
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">
              {s.userId
                ? (usersList.find((u: any) => u.id === s.userId)?.name ?? `#${s.userId}`)
                : <span className="text-xs italic text-muted-foreground/50">—</span>}
            </td>
            <td className="px-4 py-3">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${s.active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                {s.active ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-2">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(s)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${hasCycle(s.id) ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => setCycleId(showCycle ? null : s.id)} title="Set shift cycle">
                  <RefreshCw size={14} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                  onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteMut.mutate({ id: s.id }); }}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            </td>
          </tr>
        )}
        {showCycle && (
          <tr className="border-b border-border/50 bg-primary/5">
            <td colSpan={5} className="p-0">
              <CycleEditor staffId={s.id} cycles={cycles} onSaved={() => { cyclesQ.refetch(); setCycleId(null); }} />
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  function renderTable(rows: any[], title: string) {
    if (rows.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-right font-medium">الاسم</th>
                <th className="px-4 py-2 text-right font-medium">النوع</th>
                <th className="px-4 py-2 text-right font-medium">قيمة الشفت</th>
                <th className="px-4 py-2 text-right font-medium">ربط الحضور</th>
                <th className="px-4 py-2 text-right font-medium">حساب المستخدم</th>
                <th className="px-4 py-2 text-right font-medium">الحالة</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            {rows.map(renderRow)}
          </table>
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
            <input placeholder="الاسم الكامل" value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 min-w-40 rounded border border-input bg-background px-3 py-1.5 text-sm" />
            <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value as any }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm">
              <option value="doctor">طبيب</option>
              <option value="tech">فني</option>
            </select>
            <div className="relative">
              <input type="number" min={0} step={0.01} placeholder="قيمة الشفت"
                value={addForm.ratePerShift}
                onChange={e => setAddForm(f => ({ ...f, ratePerShift: e.target.value }))}
                className="w-40 rounded border border-input bg-background px-3 py-1.5 text-sm pr-12" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ج.م</span>
            </div>
            <select value={addForm.empCd} onChange={e => setAddForm(f => ({ ...f, empCd: e.target.value }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm">
              <option value="">ربط الحضور (اختياري)</option>
              {employees.map((e: any) => (
                <option key={e.empCd} value={e.empCd}>{e.fullName} ({e.empCd})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submitAdd} disabled={addMut.isPending}>حفظ</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setAddForm(EMPTY); }}>إلغاء</Button>
          </div>
        </div>
      )}

      {staffQ.isLoading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : (
        <div className="space-y-6">
          {renderTable(doctors, "الأطباء")}
          {renderTable(techs, "الفنيون")}
          {staff.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد طاقم بعد.</p>}
        </div>
      )}
    </div>
  );
}
