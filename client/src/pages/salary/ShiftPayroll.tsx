import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const now = new Date();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(n: number) {
  return Number(n).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ShiftPayroll() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery({ year, month });
  const rows: any[] = payrollQ.data ?? [];

  const doctors = rows.filter((r: any) => r.type === "doctor");
  const techs    = rows.filter((r: any) => r.type === "tech");

  const totalScheduled = rows.reduce((s: number, r: any) => s + r.scheduled, 0);
  const totalAttended  = rows.reduce((s: number, r: any) => s + r.attended, 0);
  const totalAbsent    = rows.reduce((s: number, r: any) => s + r.absent, 0);
  const totalPay       = rows.reduce((s: number, r: any) => s + r.totalPay, 0);

  function renderSection(data: any[], title: string) {
    if (data.length === 0) return null;
    const sectionPay = data.reduce((s: number, r: any) => s + r.totalPay, 0);
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          <span className="text-sm font-semibold text-primary">{fmt(sectionPay)} EGP</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate / Shift</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Scheduled</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-success">Attended</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-destructive">Absent</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground font-bold">Total Pay</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(r.ratePerShift)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.scheduled}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-600 font-medium">{r.attended}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">{r.absent}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">{fmt(r.totalPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payroll</p>
          <h2 className="text-2xl font-bold">Shift Payroll</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => payrollQ.refetch()} disabled={payrollQ.isFetching} className="gap-2">
            <RefreshCw size={15} className={payrollQ.isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Scheduled shifts", value: String(totalScheduled), tone: "text-foreground" },
            { label: "Attended",         value: String(totalAttended),  tone: "text-green-600 font-bold" },
            { label: "Absent",           value: String(totalAbsent),    tone: "text-destructive" },
            { label: "Total payroll",    value: fmt(totalPay) + " EGP", tone: "text-primary font-bold" },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className={`mt-1 text-lg ${card.tone}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tables */}
      {payrollQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-background px-4 py-16 text-center text-muted-foreground text-sm">
          No shift staff or no attendance recorded for {MONTHS[month - 1]} {year}.
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection(doctors, "Doctors")}
          {renderSection(techs, "Technicians")}

          {/* Grand total */}
          <div className="flex justify-end">
            <div className="rounded-xl border border-border bg-muted/20 px-6 py-3 text-sm">
              Grand total: <span className="font-bold text-primary ml-2">{fmt(totalPay)} EGP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
