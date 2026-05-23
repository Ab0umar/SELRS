import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const now = new Date();

export default function SalaryPenalties() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empCd: "", amount: "", reason: "" });

  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const penaltiesQ = (trpc as any).salary.listPenalties.useQuery({ year, month });
  const penalties: any[] = penaltiesQ.data ?? [];
  const employees: any[] = empsQ.data ?? [];

  const addMut = (trpc as any).salary.addPenalty.useMutation({
    onSuccess: () => { penaltiesQ.refetch(); setShowForm(false); setForm({ empCd: "", amount: "", reason: "" }); toast.success("تم إضافة الجزاء"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = (trpc as any).salary.deletePenalty.useMutation({
    onSuccess: () => { penaltiesQ.refetch(); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    addMut.mutate({ empCd: form.empCd, year, month, amount, reason: form.reason });
  };

  const totalPenalties = penalties.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الجزاءات</p>
          <h2 className="text-2xl font-bold text-foreground">جزاءات الشهر</h2>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2"><Plus size={16} /> إضافة جزاء</Button>
        </div>
      </div>

      {showForm && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">جزاء جديد — {MONTHS[month-1]} {year}</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 px-4 py-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium">الموظف</label>
              <select value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required>
                <option value="">-- اختر موظفاً --</option>
                {employees.map((emp: any) => (
                  <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">المبلغ</label>
              <input type="number" value={form.amount} min={0} step="0.01"
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">السبب</label>
              <input type="text" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="اختياري"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" disabled={addMut.isPending}>إضافة</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">الجزاءات — {MONTHS[month-1]} {year}</h3>
          {penalties.length > 0 && (
            <span className="text-sm font-bold text-destructive">
              الإجمالي: {totalPenalties.toLocaleString("ar-EG")} ج.م
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">القسم</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">السبب</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {penalties.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{p.fullName ?? p.empCd}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.department ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-destructive">{Number(p.amount).toLocaleString("ar-EG")} ج.م</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("حذف هذا الجزاء؟")) deleteMut.mutate({ id: p.id }); }}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {penalties.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">لا توجد جزاءات لهذا الشهر</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
