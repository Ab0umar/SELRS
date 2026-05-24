import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = { doctor: "Doctor", tech: "Technician" };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SHIFTS = ["Morning","Night"];

interface StaffForm { name: string; type: "doctor" | "tech"; ratePerShift: string; active: boolean; }
const EMPTY: StaffForm = { name: "", type: "doctor", ratePerShift: "", active: true };

// dayOfWeek → shiftName | "" (off)
type CycleMap = Record<number, string>;

function CycleEditor({ staffId, cycles, onSaved }: { staffId: number; cycles: any[]; onSaved: () => void }) {
  const staffCycles = cycles.filter((c: any) => c.staffId === staffId);
  const initial: CycleMap = {};
  for (const c of staffCycles) initial[c.dayOfWeek] = c.shiftName;
  const [local, setLocal] = useState<CycleMap>(initial);

  useEffect(() => {
    const m: CycleMap = {};
    for (const c of staffCycles) m[c.dayOfWeek] = c.shiftName;
    setLocal(m);
  }, [cycles, staffId]);

  const saveMut = (trpc as any).salary.setStaffCycle.useMutation({
    onSuccess: () => { onSaved(); toast.success("Cycle saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  function save() {
    const cycle = Object.entries(local)
      .filter(([, s]) => s)
      .map(([d, s]) => ({ dayOfWeek: parseInt(d), shiftName: s }));
    saveMut.mutate({ staffId, cycle });
  }

  return (
    <div className="px-4 pb-3 pt-1 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weekly cycle</p>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day, dow) => (
          <div key={dow} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{day}</span>
            <select
              value={local[dow] ?? ""}
              onChange={e => setLocal(m => ({ ...m, [dow]: e.target.value }))}
              className="rounded border border-input bg-background px-1.5 py-1 text-xs w-20"
            >
              <option value="">Off</option>
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
      <Button size="sm" onClick={save} disabled={saveMut.isPending}>
        {saveMut.isPending ? "Saving…" : "Save cycle"}
      </Button>
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
  const staff: any[] = staffQ.data ?? [];
  const cycles: any[] = cyclesQ.data ?? [];

  const addMut = (trpc as any).salary.addShiftStaff.useMutation({
    onSuccess: () => { staffQ.refetch(); setAdding(false); setAddForm(EMPTY); toast.success("Staff added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = (trpc as any).salary.updateShiftStaff.useMutation({
    onSuccess: () => { staffQ.refetch(); setEditId(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  function submitAdd() {
    const rate = parseFloat(addForm.ratePerShift);
    if (!addForm.name.trim() || isNaN(rate)) { toast.error("Fill all fields"); return; }
    addMut.mutate({ name: addForm.name.trim(), type: addForm.type, ratePerShift: rate });
  }

  function startEdit(s: any) {
    setEditId(s.id); setCycleId(null);
    setEditForm({ name: s.name, type: s.type, ratePerShift: String(s.ratePerShift), active: s.active });
  }

  function submitEdit(id: number) {
    const rate = parseFloat(editForm.ratePerShift);
    if (!editForm.name.trim() || isNaN(rate)) { toast.error("Fill all fields"); return; }
    updateMut.mutate({ id, name: editForm.name.trim(), type: editForm.type, ratePerShift: rate, active: editForm.active });
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
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-right font-medium">Name</th>
                <th className="px-4 py-2 text-right font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Rate / Shift</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
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
        <h2 className="text-lg font-semibold">Doctors & Technicians</h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} className="mr-1" /> Add
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-md border p-4 space-y-3 bg-muted/10">
          <h3 className="text-sm font-semibold">New staff member</h3>
          <div className="flex flex-wrap gap-3">
            <input placeholder="Full name" value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 min-w-40 rounded border border-input bg-background px-3 py-1.5 text-sm" />
            <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value as any }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm">
              <option value="doctor">Doctor</option>
              <option value="tech">Technician</option>
            </select>
            <div className="relative">
              <input type="number" min={0} step={0.01} placeholder="Rate per shift"
                value={addForm.ratePerShift}
                onChange={e => setAddForm(f => ({ ...f, ratePerShift: e.target.value }))}
                className="w-40 rounded border border-input bg-background px-3 py-1.5 text-sm pr-12" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">EGP</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submitAdd} disabled={addMut.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setAddForm(EMPTY); }}>Cancel</Button>
          </div>
        </div>
      )}

      {staffQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-6">
          {renderTable(doctors, "Doctors")}
          {renderTable(techs, "Technicians")}
          {staff.length === 0 && <p className="text-sm text-muted-foreground">No staff added yet.</p>}
        </div>
      )}
    </div>
  );
}
