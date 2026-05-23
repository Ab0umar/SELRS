import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const today = new Date().toISOString().split("T")[0];

interface BasicForm {
  empCd: string;
  basicAmount: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

const BLANK: BasicForm = {
  empCd: "",
  basicAmount: "",
  effectiveFrom: today,
  effectiveTo: "",
  notes: "",
};

export default function SalaryBasics() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BasicForm>(BLANK);

  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const basics: any[] = basicsQ.data ?? [];
  const employees: any[] = empsQ.data ?? [];

  const setMut = (trpc as any).salary.setBasic.useMutation({
    onSuccess: () => { basicsQ.refetch(); setShowForm(false); setForm(BLANK); toast.success("تم الحفظ"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const updateMut = (trpc as any).salary.updateBasic.useMutation({
    onSuccess: () => { basicsQ.refetch(); setShowForm(false); setEditingId(null); setForm(BLANK); toast.success("تم التعديل"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = (trpc as any).salary.deleteBasic.useMutation({
    onSuccess: () => { basicsQ.refetch(); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.basicAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    if (editingId) {
      updateMut.mutate({ id: editingId, basicAmount: amount, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || null, notes: form.notes });
    } else {
      setMut.mutate({ empCd: form.empCd, basicAmount: amount, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || null, notes: form.notes });
    }
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setForm({ empCd: b.empCd, basicAmount: String(Number(b.basicAmount)), effectiveFrom: b.effectiveFrom?.split("T")[0] ?? today, effectiveTo: b.effectiveTo?.split("T")[0] ?? "", notes: b.notes ?? "" });
    setShowForm(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الرواتب</p>
          <h2 className="text-2xl font-bold text-foreground">الرواتب الأساسية</h2>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(BLANK); setShowForm(!showForm); }} className="gap-2">
          <Plus size={16} /> إضافة راتب
        </Button>
      </div>

      {showForm && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">{editingId ? "تعديل الراتب" : "راتب جديد"}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
            {!editingId && (
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
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium">الراتب الأساسي</label>
                <input type="number" value={form.basicAmount} min={0} step="0.01"
                  onChange={(e) => setForm({ ...form, basicAmount: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">تاريخ السريان</label>
                <input type="date" value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">تاريخ الانتهاء (اختياري)</label>
                <input type="date" value={form.effectiveTo}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">ملاحظات</label>
                <input type="text" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={setMut.isPending || updateMut.isPending}>{editingId ? "حفظ التعديل" : "إضافة"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>إلغاء</Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">قائمة الرواتب</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الموظف</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">القسم</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الراتب الأساسي</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">من تاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">حتى تاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {basics.map((b: any) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{b.fullName ?? b.empCd}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.department ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{Number(b.basicAmount).toLocaleString("ar-EG")} ج.م</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.effectiveFrom?.split("T")[0]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.effectiveTo?.split("T")[0] ?? "مفتوح"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("حذف هذا الراتب؟")) deleteMut.mutate({ id: b.id }); }}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {basics.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">لا توجد رواتب محددة بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
