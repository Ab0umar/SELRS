import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const now = new Date();
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_AR = ["الاحد","الاثنين","الثلاثاء","الاربعاء","الخميس","الجمعة","السبت"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function monthDates(y: number, m: number) {
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
}
function weekDates(anchor: string, y: number, m: number) {
  const d = new Date(anchor); const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const c = new Date(mon); c.setDate(mon.getDate() + i); return c; })
    .filter(c => c.getFullYear() === y && c.getMonth() + 1 === m)
    .map(c => `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`);
}
function fmtDate(ds: string) {
  const d = new Date(ds + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// Safe date-key — handles both string "YYYY-MM-DD" and Date objects returned by mysql2
function toDateKey(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const s = String(v);
  // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Date.toString() fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return s.slice(0, 10);
}

type Period = "day" | "week" | "month";
interface AddForm { staffId: string; shiftName: string; period: Period; anchorDate: string; }
const EMPTY_ADD: AddForm = { staffId: "", shiftName: "", period: "day", anchorDate: "" };

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 8px; color: #000; direction: rtl; }
  h1 { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; }
  th { background: #f0f0f0; font-weight: bold; font-size: 7.5px; }
  .day-col { font-weight: bold; white-space: nowrap; }
  .fri-row td { background: #f8f8f8; color: #aaa; }
  .shift-m { color: #b45309; }
  .shift-n { color: #1d4ed8; }
  .diag-cell { position: relative; min-width: 70px; height: 36px; }
`;

export default function ShiftSchedule() {
  const { user } = useAuth();
  const isManager = ["admin", "manager"].includes(user?.role ?? "");

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);

  // Manager uses manager-only procedure; others use protectedProcedure version
  const schedQ = isManager
    ? (trpc as any).salary.getShiftSchedule.useQuery({ year, month })
    : (trpc as any).salary.getShiftScheduleForStaff.useQuery({ year, month });
  const payrollQ = (trpc as any).salary.computeShiftPayroll.useQuery(
    { year, month },
    { enabled: isManager }
  );
  // Self-service: get the logged-in user's shift staff ID
  const myStaffIdQ = (trpc as any).salary.getMyShiftStaffId.useQuery(
    undefined,
    { enabled: !isManager }
  );
  const myStaffId: number | null = isManager ? null : (myStaffIdQ.data ?? null);

  const staff: any[] = schedQ.data?.staff ?? [];
  const attendance: any[] = schedQ.data?.attendance ?? [];

  const doctors = staff.filter((s: any) => s.type === "doctor");
  const techs = staff.filter((s: any) => s.type === "tech");
  const displayStaff = [...doctors, ...techs];

  const generateMut = (trpc as any).salary.generateFromCycles.useMutation({
    onSuccess: (res: any) => { schedQ.refetch(); payrollQ.refetch(); toast.success(`تم توليد ${res.inserted} وردية`); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkMut = (trpc as any).salary.addShiftsBulk.useMutation({
    onSuccess: (res: any) => { schedQ.refetch(); payrollQ.refetch(); setShowAdd(false); setAddForm(EMPTY_ADD); toast.success(`تم إضافة ${res.inserted} وردية`); },
    onError: (e: any) => toast.error(e.message),
  });
  // Manager toggle
  const toggleMut = (trpc as any).salary.toggleShiftPresent.useMutation({
    onSuccess: () => schedQ.refetch(),
    onError: (e: any) => toast.error(e.message),
  });
  // Self-service: doctor/tech adds own shift for a single day
  const addMyShiftMut = (trpc as any).salary.addMyShiftEntry.useMutation({
    onSuccess: () => { schedQ.refetch(); toast.success("تم تسجيل الوردية"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  // Self-service toggle
  const toggleMyMut = (trpc as any).salary.toggleMyShiftEntry.useMutation({
    onSuccess: () => schedQ.refetch(),
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  function submitAdd() {
    if (!addForm.staffId || !addForm.shiftName) { toast.error("اختر الموظف والوردية"); return; }
    if (addForm.period !== "month" && !addForm.anchorDate) { toast.error("اختر تاريخاً"); return; }
    const dates =
      addForm.period === "day" ? [addForm.anchorDate] :
      addForm.period === "week" ? weekDates(addForm.anchorDate, year, month) :
      monthDates(year, month);
    if (dates.length === 0) { toast.error("لا يوجد أيام في هذه الفترة"); return; }
    bulkMut.mutate({ staffId: parseInt(addForm.staffId), shiftName: addForm.shiftName, dates });
  }

  // attendance map: staffId_dateStr → [entries]
  const attendMap = new Map<string, any[]>();
  for (const row of attendance) {
    const key = `${row.staffId}_${toDateKey(row.workDate)}`;
    if (!attendMap.has(key)) attendMap.set(key, []);
    attendMap.get(key)!.push(row);
  }

  const allDates = monthDates(year, month).filter(ds => new Date(ds + "T00:00:00").getDay() !== 5);
  const monthMin = `${year}-${pad(month)}-01`;
  const monthMax = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;

  function handlePrint() {
    const mid = Math.ceil(allDates.length / 2);
    const halves = [allDates.slice(0, mid), allDates.slice(mid)];

    function buildTable(dates: string[]) {
      const cols = dates.map(ds => {
        const dow = new Date(ds + "T00:00:00").getDay();
        return `<th><div style="font-weight:bold">${DAYS_AR[dow]}</div><div style="color:#555">${fmtDate(ds)}</div></th>`;
      }).join("");
      const rows = displayStaff.map((s: any) => {
        const cells = dates.map(ds => {
          const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
          const text = entries.map((e: any) => {
            const cls = e.shiftName === "Morning" ? "shift-m" : "shift-n";
            const lbl = e.shiftName === "Morning" ? "ص" : "م";
            return `<span class="${cls}">${e.present ? lbl : `(${lbl})`}</span>`;
          }).join("");
          return `<td>${text}</td>`;
        }).join("");
        return `<tr><td class="day-col">${s.type === "doctor" ? "د/" : "ف/"}${s.name}</td>${cells}</tr>`;
      }).join("");
      return `<table>
        <thead><tr>
          <th style="position:relative;min-width:80px;height:40px;">
            <svg style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="#000" stroke-width="1"/>
            </svg>
            <span style="position:absolute;top:2px;left:4px;font-size:7px;">التاريخ</span>
            <span style="position:absolute;bottom:2px;right:4px;font-size:7px;">الاسم</span>
          </th>${cols}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
      <style>${PRINT_CSS} table{margin-bottom:14px}</style></head><body>
      <h1>روستر شهر ${MONTHS_AR[month - 1]} ${year}</h1>
      ${halves.map(h => buildTable(h)).join("")}
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open(); doc.write(html); doc.close();
    const cleanup = () => { iframe.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الروستر الشهري</p>
          <h2 className="text-2xl font-bold text-foreground">روستر شهر {MONTHS_AR[month - 1]} {year}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isManager && (
            <>
              <Button size="sm" variant="outline" onClick={() => generateMut.mutate({ year, month })} disabled={generateMut.isPending} className="gap-1.5">
                <RefreshCw size={14} className={generateMut.isPending ? "animate-spin" : ""} /> توليد من الدورات
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(v => !v)} className="gap-1.5">
                <Plus size={14} /> إضافة ورديات
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer size={14} /> طباعة
          </Button>
        </div>
      </div>

      {/* Non-manager hint */}
      {!isManager && myStaffId === null && !myStaffIdQ.isLoading && (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          حسابك غير مرتبط بسجل وردية — تواصل مع المدير لربط حسابك.
        </div>
      )}
      {!isManager && myStaffId !== null && (
        <div className="rounded-xl border border-border bg-primary/5 px-4 py-3 text-sm">
          مررّ على خانتك لإضافة وردية. ورديات الأعضاء الآخرين للعرض فقط.
        </div>
      )}

      {/* Add form — manager only */}
      {showAdd && isManager && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <h3 className="text-sm font-semibold">إضافة ورديات</h3>
          <div className="flex flex-wrap gap-3">
            <select value={addForm.staffId} onChange={e => setAddForm(f => ({ ...f, staffId: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm min-w-44">
              <option value="">-- اختر الموظف --</option>
              {displayStaff.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.type === "doctor" ? "د" : "ف"})</option>
              ))}
            </select>
            <select value={addForm.shiftName} onChange={e => setAddForm(f => ({ ...f, shiftName: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
              <option value="">-- الوردية --</option>
              <option value="Morning">صباح</option>
              <option value="Night">مساء</option>
            </select>
            <div className="flex rounded-md border border-border overflow-hidden text-sm">
              {([["day","يوم"],["week","أسبوع"],["month","شهر"]] as [Period,string][]).map(([p, lbl]) => (
                <button key={p} onClick={() => setAddForm(f => ({ ...f, period: p }))}
                  className={`px-3 py-1.5 transition-colors ${addForm.period === p ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                  {lbl}
                </button>
              ))}
            </div>
            {addForm.period !== "month" && (
              <input type="date" value={addForm.anchorDate} min={monthMin} max={monthMax}
                onChange={e => setAddForm(f => ({ ...f, anchorDate: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submitAdd} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? "جاري الإضافة…" : "إضافة"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setAddForm(EMPTY_ADD); }}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Roster grid */}
      {schedQ.isLoading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا يوجد موظفون. أضف موظفين في تبويب الشفتات أولاً.</p>
      ) : (
        <>
        {attendance.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            لا توجد ورديات لهذا الشهر — اضغط <strong>توليد من الدورات</strong> أو <strong>إضافة ورديات</strong> لبدء الجدولة.
          </div>
        )}
        {[allDates.slice(0, Math.ceil(allDates.length / 2)), allDates.slice(Math.ceil(allDates.length / 2))].map((half, hi) => (
          <div key={hi} className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 110 }} />
                {half.map(ds => <col key={ds} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="relative border-l border-border p-0" style={{ height: 56 }}>
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" className="text-border" />
                    </svg>
                    <span className="absolute top-1 right-2 text-[10px] font-semibold text-muted-foreground">التاريخ</span>
                    <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-muted-foreground">الاسم</span>
                  </th>
                  {half.map(ds => {
                    const dow = new Date(ds + "T00:00:00").getDay();
                    return (
                      <th key={ds} className="border-l border-border text-center p-0" style={{ height: 56 }}>
                        <div className="text-[11px] font-semibold text-foreground leading-tight pt-2">{DAYS_AR[dow]}</div>
                        <div className="text-[11px] tabular-nums text-muted-foreground pb-2">{fmtDate(ds)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayStaff.map((s: any, idx: number) => (
                  <tr key={s.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/10"}`} style={{ height: 40 }}>
                    <td className="border-l border-border px-2 font-semibold text-xs truncate" style={{ height: 40 }}>
                      <span className="text-muted-foreground">{s.type === "doctor" ? "د/" : "ف/"}</span>{s.name}
                    </td>
                    {half.map(ds => {
                      const entries = attendMap.get(`${s.id}_${ds}`) ?? [];
                      const isMyRow = !isManager && myStaffId === s.id;
                      const canEdit = isManager || isMyRow;
                      return (
                        <td key={ds} className="border-l border-border text-center p-1 group/cell" style={{ height: 40 }}>
                          <div className="flex flex-col gap-0.5 items-center">
                            {entries.map((e: any) => (
                              <button
                                key={e.id}
                                onClick={() => canEdit
                                  ? (isManager
                                      ? toggleMut.mutate({ id: e.id, present: !e.present })
                                      : toggleMyMut.mutate({ id: e.id, present: !e.present }))
                                  : undefined
                                }
                                disabled={!canEdit || toggleMut.isPending || toggleMyMut.isPending}
                                className={`rounded px-1.5 py-0.5 text-xs font-bold w-full transition-colors ${
                                  e.present
                                    ? e.shiftName === "Morning"
                                      ? "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25"
                                      : "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25"
                                    : "bg-muted text-muted-foreground line-through"
                                } ${!canEdit ? "cursor-default" : ""}`}
                              >
                                {e.shiftName === "Morning" ? "ص" : "م"}
                              </button>
                            ))}
                            {/* Self-service add button for own row */}
                            {isMyRow && entries.length === 0 && (
                              <div className="hidden group-hover/cell:flex gap-0.5">
                                {["Morning","Night"].map(sn => (
                                  <button key={sn}
                                    onClick={() => addMyShiftMut.mutate({ year, month, workDate: ds, shiftName: sn })}
                                    disabled={addMyShiftMut.isPending}
                                    className="rounded px-1 py-0.5 text-[10px] font-bold bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary"
                                    title={sn === "Morning" ? "إضافة صباح" : "إضافة مساء"}
                                  >
                                    {sn === "Morning" ? "+ص" : "+م"}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        </>
      )}
    </div>
  );
}
