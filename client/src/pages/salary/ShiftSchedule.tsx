import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(n: number) {
  return n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface AddForm { staffId: string; workDate: string; shiftName: string; }
const EMPTY_ADD: AddForm = { staffId: "", workDate: "", shiftName: "" };

export default function ShiftSchedule() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);

  const schedQ = (trpc as any).shiftStaff.getSchedule.useQuery({ year, month });
  const payrollQ = (trpc as any).shiftStaff.computePayroll.useQuery({ year, month });

  const staff: any[] = schedQ.data?.staff ?? [];
  const attendance: any[] = schedQ.data?.attendance ?? [];
  const payroll: any[] = payrollQ.data ?? [];

  const addMut = (trpc as any).shiftStaff.addShift.useMutation({
    onSuccess: () => { schedQ.refetch(); payrollQ.refetch(); setShowAdd(false); setAddForm(EMPTY_ADD); toast.success("Shift added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = (trpc as any).shiftStaff.togglePresent.useMutation({
    onSuccess: () => { schedQ.refetch(); payrollQ.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = (trpc as any).shiftStaff.deleteShift.useMutation({
    onSuccess: () => { schedQ.refetch(); payrollQ.refetch(); toast.success("Removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  function submitAdd() {
    if (!addForm.staffId || !addForm.workDate || !addForm.shiftName.trim()) {
      toast.error("Fill all fields"); return;
    }
    const d = new Date(addForm.workDate);
    addMut.mutate({
      staffId: parseInt(addForm.staffId),
      year,
      month,
      workDate: addForm.workDate,
      shiftName: addForm.shiftName.trim(),
      present: true,
    });
  }

  // Group attendance by staffId
  const byStaff = new Map<number, any[]>();
  for (const row of attendance) {
    if (!byStaff.has(row.staffId)) byStaff.set(row.staffId, []);
    byStaff.get(row.staffId)!.push(row);
  }

  const totalPay = payroll.reduce((s: number, r: any) => s + r.totalPay, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Shift Schedule</h2>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="rounded border border-input bg-background px-3 py-1.5 text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="rounded border border-input bg-background px-3 py-1.5 text-sm">
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => setShowAdd(v => !v)}>
          <Plus size={15} className="mr-1" /> Add shift
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-md border p-4 bg-muted/10 space-y-3">
          <h3 className="text-sm font-semibold">Add shift entry</h3>
          <div className="flex flex-wrap gap-3">
            <select value={addForm.staffId} onChange={e => setAddForm(f => ({ ...f, staffId: e.target.value }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm min-w-40">
              <option value="">-- Select staff --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.type === "doctor" ? "Dr" : "Tech"})</option>
              ))}
            </select>
            <input type="date" value={addForm.workDate}
              min={`${year}-${String(month).padStart(2,"0")}-01`}
              max={`${year}-${String(month).padStart(2,"0")}-${String(daysInMonth(year,month)).padStart(2,"0")}`}
              onChange={e => setAddForm(f => ({ ...f, workDate: e.target.value }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm"
            />
            <input placeholder="Shift name (e.g. Morning)" value={addForm.shiftName}
              onChange={e => setAddForm(f => ({ ...f, shiftName: e.target.value }))}
              className="flex-1 min-w-36 rounded border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submitAdd} disabled={addMut.isPending}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddForm(EMPTY_ADD); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Per-staff attendance */}
      {schedQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active staff. Add staff in the Staff tab first.</p>
      ) : (
        <div className="space-y-4">
          {staff.map(s => {
            const rows = (byStaff.get(s.id) ?? []).sort((a: any, b: any) => String(a.workDate).localeCompare(String(b.workDate)));
            const attended = rows.filter((r: any) => r.present).length;
            const pay = payroll.find((p: any) => p.id === s.id);
            return (
              <div key={s.id} className="rounded-md border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.type === "doctor" ? "Doctor" : "Technician"}</span>
                  </div>
                  <div className="text-sm tabular-nums">
                    <span className="text-muted-foreground">{attended}/{rows.length} shifts</span>
                    {pay && <span className="ml-3 font-semibold text-primary">{fmt(pay.totalPay)} EGP</span>}
                  </div>
                </div>
                {rows.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No shifts scheduled.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10 border-b border-border/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Shift</th>
                        <th className="px-4 py-2 text-center font-medium">Present</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r: any) => (
                        <tr key={r.id} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-4 py-2 tabular-nums">{String(r.workDate).slice(0, 10)}</td>
                          <td className="px-4 py-2">{r.shiftName}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => toggleMut.mutate({ id: r.id, present: !r.present })}
                              disabled={toggleMut.isPending}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                                r.present ? "bg-green-500/15 text-green-600 hover:bg-green-500/25" : "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                              }`}
                            >
                              {r.present ? <Check size={13} /> : <X size={13} />}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMut.mutate({ id: r.id })} disabled={deleteMut.isPending}>
                              <Trash2 size={13} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Total */}
      {payroll.length > 0 && (
        <div className="flex justify-end pt-2">
          <div className="rounded-md border px-6 py-3 bg-muted/20 text-sm">
            Total payroll: <span className="font-bold text-primary ml-2">{fmt(totalPay)} EGP</span>
          </div>
        </div>
      )}
    </div>
  );
}
