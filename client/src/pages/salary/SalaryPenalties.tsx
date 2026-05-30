import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Check, X, Printer } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

type Tab = "penalties" | "advances" | "insurance";

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 9px; color: #000; direction: rtl; }
  h1 { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #ddd; padding: 3px 5px; border: 1px solid #999; font-size: 8px; text-align: center; }
  td { padding: 3px 5px; border: 1px solid #ccc; font-size: 8px; text-align: center; }
  .emp-col { text-align: right; font-weight: bold; }
  .total-row { background: #eee; font-weight: bold; }
  .zero { color: #aaa; }
`;

export default function SalaryPenalties() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState<Tab>("penalties");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empCd: "", amount: "", reason: "" });
  const [editingInsurance, setEditingInsurance] = useState<{ id: number; value: string } | null>(null);

  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const employees: any[] = empsQ.data ?? [];
  const empName = (empCd: string) => employees.find((e: any) => e.empCd === empCd)?.fullName ?? empCd;
  const empDept = (empCd: string) => employees.find((e: any) => e.empCd === empCd)?.department ?? "—";

  // ── Penalties ──────────────────────────────────────────────────────────────
  const penaltiesQ = (trpc as any).salary.listPenalties.useQuery({ year, month });
  const penalties: any[] = penaltiesQ.data ?? [];

  const addPenaltyMut = (trpc as any).salary.addPenalty.useMutation({
    onSuccess: () => {
      penaltiesQ.refetch();
      setShowForm(false);
      setForm({ empCd: "", amount: "", reason: "" });
      toast.success("تم إضافة الجزاء");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deletePenaltyMut = (trpc as any).salary.deletePenalty.useMutation({
    onSuccess: () => { penaltiesQ.refetch(); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Advances ───────────────────────────────────────────────────────────────
  const advancesQ = (trpc as any).salary.listAdvances.useQuery({ year, month });
  const advances: any[] = advancesQ.data ?? [];

  const addAdvanceMut = (trpc as any).salary.addAdvance.useMutation({
    onSuccess: () => {
      advancesQ.refetch();
      setShowForm(false);
      setForm({ empCd: "", amount: "", reason: "" });
      toast.success("تم إضافة السلفة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteAdvanceMut = (trpc as any).salary.deleteAdvance.useMutation({
    onSuccess: () => { advancesQ.refetch(); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Insurance (latest salaryBasics per employee — not month-filtered) ───────
  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const basics: any[] = basicsQ.data ?? [];
  const latestByEmp: any[] = Object.values(
    basics.reduce((acc: Record<string, any>, b: any) => {
      if (!acc[b.empCd] || String(b.effectiveFrom) > String(acc[b.empCd].effectiveFrom))
        acc[b.empCd] = b;
      return acc;
    }, {})
  );

  const updateBasicMut = (trpc as any).salary.updateBasic.useMutation({
    onSuccess: () => { basicsQ.refetch(); setEditingInsurance(null); toast.success("تم التحديث"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Payroll deductions (for print layout) ─────────────────────────────────
  const deductionsQ = (trpc as any).salary.listPayrollDeductions.useQuery({ year, month });
  const payrollDeductions: any[] = deductionsQ.data ?? [];

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    // Build per-employee map from payroll deductions
    const byEmp: Record<string, any> = {};
    for (const r of payrollDeductions) {
      byEmp[r.empCd] = r;
    }

    // Collect all empCds that appear in any deduction source
    const allEmpCds = Array.from(new Set([
      ...payrollDeductions.map((r: any) => r.empCd),
      ...latestByEmp.map((b: any) => b.empCd),
    ]));

    // Build insurance map from salaryBasics
    const insuranceMap: Record<string, number> = {};
    for (const b of latestByEmp) {
      insuranceMap[b.empCd] = Number(b.insuranceDeduction ?? 0);
    }

    const fmt = (n: number) => n === 0
      ? `<span class="zero">—</span>`
      : n.toLocaleString("ar-EG", { minimumFractionDigits: 2 });

    const rows = allEmpCds.map(empCd => {
      const pr = byEmp[empCd];
      const name = pr?.fullName ?? empName(empCd);
      const dept = pr?.department ?? empDept(empCd);
      const jazaat = Number(pr?.penaltyDeduction ?? 0);
      const takhirat = Number(pr?.lateDeduction ?? 0) + Number(pr?.earlyLeaveDeduction ?? 0);
      const tameenat = insuranceMap[empCd] ?? 0;
      const ghiyab = Number(pr?.absentDeduction ?? 0);
      const total = jazaat + takhirat + tameenat + ghiyab;
      return { name, dept, jazaat, takhirat, tameenat, ghiyab, total };
    }).sort((a, b) => a.name.localeCompare(b.name, "ar"));

    const totJazaat = rows.reduce((s, r) => s + r.jazaat, 0);
    const totTakhirat = rows.reduce((s, r) => s + r.takhirat, 0);
    const totTameenat = rows.reduce((s, r) => s + r.tameenat, 0);
    const totGhiyab = rows.reduce((s, r) => s + r.ghiyab, 0);
    const totAll = rows.reduce((s, r) => s + r.total, 0);

    const bodyRows = rows.map(r => `
      <tr>
        <td class="emp-col">${r.name}</td>
        <td>${r.dept}</td>
        <td>${fmt(r.jazaat)}</td>
        <td>${fmt(r.takhirat)}</td>
        <td>${fmt(r.tameenat)}</td>
        <td>${fmt(r.ghiyab)}</td>
        <td><strong>${fmt(r.total)}</strong></td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
      <title>كشف الخصومات</title>
      <style>${PRINT_CSS}</style></head><body>
      <h1>كشف الخصومات — ${MONTHS[month - 1]} ${year}</h1>
      <table>
        <thead><tr>
          <th style="width:22%">الموظف</th>
          <th style="width:12%">القسم</th>
          <th>جزاءات</th>
          <th>تأخيرات</th>
          <th>تأمينات</th>
          <th>غياب</th>
          <th>الإجمالي</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td colspan="2">الإجمالي</td>
            <td>${totJazaat.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totTakhirat.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totTameenat.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totGhiyab.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totAll.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=600");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────
  const rows = tab === "penalties" ? penalties : advances;
  const total = rows.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const isPending = tab === "penalties" ? addPenaltyMut.isPending : addAdvanceMut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    if (tab === "penalties") {
      addPenaltyMut.mutate({ empCd: form.empCd, year, month, amount, reason: form.reason });
    } else {
      addAdvanceMut.mutate({ empCd: form.empCd, year, month, amount, reason: form.reason });
    }
  };

  const resetForm = () => { setShowForm(false); setForm({ empCd: "", amount: "", reason: "" }); };

  const tabDefs: { key: Tab; label: string }[] = [
    { key: "penalties", label: "جزاءات" },
    { key: "advances",  label: "سلف" },
    { key: "insurance", label: "تأمينات" },
  ];

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">مسار المتغيرات الشهرية</p>
          <h2 className="text-2xl font-bold text-foreground">الخصومات والسلف</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            جزاءات وسلف وتأمينات الشهر قبل توليد كشف الرواتب.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month/year only shown when not on fixed insurance tab */}
          {tab !== "insurance" && (
            <>
              <select
                value={month}
                onChange={(e) => { setMonth(Number(e.target.value)); resetForm(); }}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={(e) => { setYear(Number(e.target.value)); resetForm(); }}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus size={16} />
                {tab === "penalties" ? "إضافة جزاء" : "إضافة سلفة"}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer size={16} /> طباعة
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {tabDefs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); resetForm(); setEditingInsurance(null); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add form — penalties & advances only */}
      {showForm && tab !== "insurance" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              {tab === "penalties" ? "جزاء جديد" : "سلفة جديدة"} — {MONTHS[month - 1]} {year}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 px-4 py-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium">الموظف</label>
              <select
                value={form.empCd}
                onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">-- اختر موظفاً --</option>
                {employees.map((emp: any) => (
                  <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">المبلغ</label>
              <input
                type="number" value={form.amount} min={0} step="0.01"
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">السبب</label>
              <input
                type="text" value={form.reason} placeholder="اختياري"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" disabled={isPending}>إضافة</Button>
              <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
            </div>
          </form>
        </section>
      )}

      {/* Penalties / Advances table */}
      {tab !== "insurance" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              {tab === "penalties" ? "الجزاءات" : "السلف"} — {MONTHS[month - 1]} {year}
            </h3>
            {rows.length > 0 && (
              <span className="text-sm font-bold text-destructive">
                الإجمالي: {total.toLocaleString("ar-EG")} ج.م
              </span>
            )}
          </div>
          <div className="overflow-x-auto" dir="rtl">
        <table dir="rtl" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">القسم</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">السبب</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{r.fullName ?? empName(r.empCd)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department ?? empDept(r.empCd)}</td>
                    <td className="px-4 py-3 font-bold text-destructive">
                      {Number(r.amount).toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => {
                          if (confirm(`حذف ${tab === "penalties" ? "هذا الجزاء" : "هذه السلفة"}؟`)) {
                            tab === "penalties"
                              ? deletePenaltyMut.mutate({ id: r.id })
                              : deleteAdvanceMut.mutate({ id: r.id });
                          }
                        }}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      لا توجد {tab === "penalties" ? "جزاءات" : "سلف"} لهذا الشهر
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Insurance tab — fixed per-employee, no month filter */}
      {tab === "insurance" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">خصم التأمينات</h3>
            <p className="text-xs text-muted-foreground mt-0.5">مبلغ ثابت يُخصم شهرياً من راتب كل موظف</p>
          </div>
          <div className="overflow-x-auto" dir="rtl">
        <table dir="rtl" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">القسم</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">خصم التأمين</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {latestByEmp.map((b: any) => {
                  const editing = editingInsurance?.id === b.id ? editingInsurance : null;
                  return (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{b.fullName ?? b.empCd}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.department ?? "—"}</td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <input
                            type="number" min={0} step="0.01"
                            value={editing.value}
                            onChange={(e) => setEditingInsurance({ id: b.id, value: e.target.value })}
                            className="w-28 rounded-md border border-primary bg-background px-2 py-1 text-sm outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className={Number(b.insuranceDeduction) > 0 ? "font-bold text-destructive" : "text-muted-foreground"}>
                            {Number(b.insuranceDeduction ?? 0).toLocaleString("ar-EG")} ج.م
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              disabled={updateBasicMut.isPending}
                              onClick={() => {
                                const v = parseFloat(editing.value);
                                if (isNaN(v) || v < 0) { toast.error("أدخل مبلغ صحيح"); return; }
                                updateBasicMut.mutate({ id: b.id, insuranceDeduction: v });
                              }}
                            >
                              <Check size={14} className="text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingInsurance(null)}>
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setEditingInsurance({ id: b.id, value: String(b.insuranceDeduction ?? 0) })}
                          >
                            <Pencil size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {latestByEmp.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      لا يوجد موظفون بإعدادات راتب
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
