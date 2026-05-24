import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(n: number) {
  return n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthDates(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  return Array.from({ length: total }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
}

function weekDates(anchorDate: string, year: number, month: number): string[] {
  const d = new Date(anchorDate);
  // Start from Monday of that week
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    if (cur.getFullYear() === year && cur.getMonth() + 1 === month) {
      dates.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    }
  }
  return dates;
}

type Period = "day" | "week" | "month";
interface AddForm { staffId: string; shiftName: string; period: Period; anchorDate: string; }
const EMPTY_ADD: AddForm = { staffId: "", shiftName: "", period: "day", anchorDate: "" };

export default function ShiftSchedule() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);

  const schedQ = (trpc as any).salary.getShiftSchedule.useQuery({ year, month });
  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery({ year, month });

  const staff: any[] = schedQ.data?.staff ?? [];
  const attendance: any[] = schedQ.data?.attendance ?? [];
  const payroll: any[] = payrollQ.data ?? [];

  const generateMut = (trpc as any).salary.generateFromCycles.useMutation({
    onSuccess: (res: any) => { schedQ.refetch(); payrollQ.refetch(); toast.success(`${res.inserted} shifts generated from cycles`); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkMut = (trpc as any).salary.addShiftsBulk.useMutation({
    onSuccess: (res: any) => {
      schedQ.refetch(); payrollQ.refetch();
      setShowAdd(false); setAddForm(EMPTY_ADD);
      toast.success(`${res.inserted} shift(s) added`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = (trpc as any).salary.toggleShiftPresent.useMutation({
    onSuccess: () => { schedQ.refetch(); payrollQ.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = (trpc as any).salary.deleteShiftEntry.useMutation({
    onSuccess: () => { schedQ.refetch(); payrollQ.refetch(); toast.success("Removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  function submitAdd() {
    if (!addForm.staffId || !addForm.shiftName) { toast.error("Select staff and shift"); return; }
    if (addForm.period !== "month" && !addForm.anchorDate) { toast.error("Select a date"); return; }

    let dates: string[] = [];
    if (addForm.period === "day") {
      dates = [addForm.anchorDate];
    } else if (addForm.period === "week") {
      dates = weekDates(addForm.anchorDate, year, month);
      if (dates.length === 0) { toast.error("Selected week has no days in this month"); return; }
    } else {
      dates = monthDates(year, month);
    }

    bulkMut.mutate({ staffId: parseInt(addForm.staffId), shiftName: addForm.shiftName, dates });
  }

  const byStaff = new Map<number, any[]>();
  for (const row of attendance) {
    if (!byStaff.has(row.staffId)) byStaff.set(row.staffId, []);
    byStaff.get(row.staffId)!.push(row);
  }

  const totalPay = payroll.reduce((s: number, r: any) => s + r.totalPay, 0);
  const monthMin = `${year}-${pad(month)}-01`;
  const monthMax = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;

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
        <Button size="sm" variant="outline" onClick={() => generateMut.mutate({ year, month })} disabled={generateMut.isPending}>
          <RefreshCw size={15} className="mr-1" /> Generate from cycles
        </Button>
        <Button size="sm" onClick={() => setShowAdd(v => !v)}>
          <Plus size={15} className="mr-1" /> Add shifts
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-md border p-4 bg-muted/10 space-y-3">
          <h3 className="text-sm font-semibold">Add shifts</h3>
          <div className="flex flex-wrap gap-3">
            {/* Staff */}
            <select value={addForm.staffId} onChange={e => setAddForm(f => ({ ...f, staffId: e.target.value }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm min-w-44">
              <option value="">-- Select staff --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.type === "doctor" ? "Dr" : "Tech"})</option>
              ))}
            </select>

            {/* Shift type */}
            <select value={addForm.shiftName} onChange={e => setAddForm(f => ({ ...f, shiftName: e.target.value }))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm">
              <option value="">-- Shift --</option>
              <option value="Morning">Morning</option>
              <option value="Night">Night</option>
            </select>

            {/* Period */}
            <div className="flex rounded-md border border-input overflow-hidden text-sm">
              {(["day","week","month"] as Period[]).map(p => (
                <button key={p} onClick={() => setAddForm(f => ({ ...f, period: p }))}
                  className={`px-3 py-1.5 capitalize transition-colors ${addForm.period === p ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                  {p}
                </button>
              ))}
            </div>

            {/* Date picker — hidden for month */}
            {addForm.period !== "month" && (
              <input type="date" value={addForm.anchorDate}
                min={monthMin} max={monthMax}
                onChange={e => setAddForm(f => ({ ...f, anchorDate: e.target.value }))}
                className="rounded border border-input bg-background px-3 py-1.5 text-sm"
              />
            )}
          </div>

          {/* Preview label */}
          {addForm.period === "week" && addForm.anchorDate && (
            <p className="text-xs text-muted-foreground">
              Will add: {weekDates(addForm.anchorDate, year, month).join(", ") || "no days in this month"}
            </p>
          )}
          {addForm.period === "month" && (
            <p className="text-xs text-muted-foreground">
              Will add all {daysInMonth(year, month)} days of {MONTHS[month - 1]} {year}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={submitAdd} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? "Adding…" : "Add"}
            </Button>
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
