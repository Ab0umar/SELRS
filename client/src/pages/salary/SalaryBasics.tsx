import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, History } from "lucide-react";
import { toast } from "sonner";

const today = new Date().toISOString().split("T")[0];
const thisYear = new Date().getFullYear();

interface BasicForm {
  empCd: string;
  basicAmount: string;
  socialAllowance: string;
  costOfLivingAllowance: string;
  transportAllowance: string;
  workNatureAllowance: string;
  receptionAllowance: string;
  yearlyRaise: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

const BLANK: BasicForm = {
  empCd: "", basicAmount: "", socialAllowance: "0", costOfLivingAllowance: "0",
  transportAllowance: "0", workNatureAllowance: "0", receptionAllowance: "0",
  yearlyRaise: "0", effectiveFrom: today, effectiveTo: "", notes: "",
};

const FIELDS: { key: keyof BasicForm; label: string }[] = [
  { key: "basicAmount",          label: "الراتب الأساسي" },
  { key: "socialAllowance",      label: "اعانة اجتماعية" },
  { key: "costOfLivingAllowance",label: "علاء معيشة" },
  { key: "transportAllowance",   label: "بدل انتقال" },
  { key: "workNatureAllowance",  label: "طبيعة عمل" },
  { key: "receptionAllowance",   label: "بدل استقبال" },
  { key: "yearlyRaise",          label: "الزيادة السنوية" },
];

function num(v: string) { return parseFloat(v) || 0; }
function fmtDate(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v.split("T")[0];
  if (v instanceof Date) return v.toISOString().split("T")[0];
  return String(v).split("T")[0];
}
function totalOf(f: BasicForm) {
  return FIELDS.reduce((s, { key }) => s + num((f as any)[key]), 0);
}
function rowTotal(b: any) {
  return Number(b.basicAmount) + Number(b.socialAllowance ?? 0) + Number(b.costOfLivingAllowance ?? 0)
    + Number(b.transportAllowance ?? 0) + Number(b.workNatureAllowance ?? 0)
    + Number(b.receptionAllowance ?? 0) + Number(b.yearlyRaise ?? 0);
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// ── Raise history panel ───────────────────────────────────
function RaiseHistoryPanel({ empCd, empName }: { empCd: string; empName: string }) {
  const [raiseAmount, setRaiseAmount] = useState("");
  const [raiseYear, setRaiseYear] = useState(String(thisYear));
  const [raiseNotes, setRaiseNotes] = useState("");

  const histQ = (trpc as any).salary.listRaiseHistory.useQuery({ empCd });
  const history: any[] = histQ.data ?? [];

  const setMut = (trpc as any).salary.setRaise.useMutation({
    onSuccess: () => { histQ.refetch(); setRaiseAmount(""); setRaiseNotes(""); toast.success("تم حفظ الزيادة"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const delMut = (trpc as any).salary.deleteRaise.useMutation({
    onSuccess: () => { histQ.refetch(); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(raiseAmount);
    if (!amt || amt <= 0) { toast.error("أدخل مبلغ الزيادة"); return; }
    setMut.mutate({ empCd, year: parseInt(raiseYear), raiseAmount: amt, notes: raiseNotes || undefined });
  };

  const totalRaises = history.reduce((s, r) => s + Number(r.raiseAmount), 0);

  return (
    <tr>
      <td colSpan={10} className="bg-muted/10 px-6 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History size={14} /> سجل الزيادات — {empName}
            </span>
            {totalRaises > 0 && (
              <span className="text-xs text-muted-foreground">
                إجمالي الزيادات: <span className="font-bold text-foreground">{totalRaises.toLocaleString("ar-EG")} ج.م</span>
              </span>
            )}
          </div>

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">السنة</label>
              <input type="number" value={raiseYear} min={2000} max={2100}
                onChange={e => setRaiseYear(e.target.value)}
                className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">مبلغ الزيادة (ج.م)</label>
              <input type="number" value={raiseAmount} min={0} step="0.01" placeholder="0.00"
                onChange={e => setRaiseAmount(e.target.value)}
                className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1 flex-1 min-w-32">
              <label className="block text-xs text-muted-foreground">ملاحظات</label>
              <input type="text" value={raiseNotes} onChange={e => setRaiseNotes(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary" />
            </div>
            <Button type="submit" size="sm" disabled={setMut.isPending} className="gap-1">
              <Plus size={13} /> إضافة
            </Button>
          </form>

          {/* History table */}
          {history.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-1.5 text-right font-medium">السنة</th>
                  <th className="py-1.5 text-right font-medium">المبلغ</th>
                  <th className="py-1.5 text-right font-medium">ملاحظات</th>
                  <th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-1.5 font-medium">{r.year}</td>
                    <td className="py-1.5 text-primary font-bold">{Number(r.raiseAmount).toLocaleString("ar-EG")} ج.م</td>
                    <td className="py-1.5 text-muted-foreground">{r.notes ?? "—"}</td>
                    <td className="py-1.5">
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("حذف هذه الزيادة؟")) delMut.mutate({ id: r.id }); }}>
                        <Trash2 size={13} className="text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground">لا توجد زيادات مسجلة بعد</p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SalaryBasics() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BasicForm>(BLANK);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

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
    const payload = {
      basicAmount: num(form.basicAmount),
      socialAllowance: num(form.socialAllowance),
      costOfLivingAllowance: num(form.costOfLivingAllowance),
      transportAllowance: num(form.transportAllowance),
      workNatureAllowance: num(form.workNatureAllowance),
      receptionAllowance: num(form.receptionAllowance),
      yearlyRaise: num(form.yearlyRaise),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      notes: form.notes,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      if (!form.empCd) { toast.error("اختر موظفاً"); return; }
      setMut.mutate({ empCd: form.empCd, ...payload });
    }
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      empCd: b.empCd,
      basicAmount: String(Number(b.basicAmount)),
      socialAllowance: String(Number(b.socialAllowance ?? 0)),
      costOfLivingAllowance: String(Number(b.costOfLivingAllowance ?? 0)),
      transportAllowance: String(Number(b.transportAllowance ?? 0)),
      workNatureAllowance: String(Number(b.workNatureAllowance ?? 0)),
      receptionAllowance: String(Number(b.receptionAllowance ?? 0)),
      yearlyRaise: String(Number(b.yearlyRaise ?? 0)),
      effectiveFrom: fmtDate(b.effectiveFrom) || today,
      effectiveTo: fmtDate(b.effectiveTo),
      notes: b.notes ?? "",
    });
    setShowForm(true);
  };

  const toggleExpand = (empCd: string) =>
    setExpandedEmp(prev => prev === empCd ? null : empCd);

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
                <select value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })} className={inputCls} required>
                  <option value="">-- اختر موظفاً --</option>
                  {employees.map((emp: any) => (
                    <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">بنود الراتب</p>
              <div className="grid gap-3 sm:grid-cols-4">
                {FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-sm font-medium">{label}</label>
                    <input type="number" value={(form as any)[key]} min={0} step="0.01"
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
                <span className="text-sm font-medium">الإجمالي</span>
                <span className="text-base font-bold text-primary">{totalOf(form).toLocaleString("ar-EG")} ج.م</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium">تاريخ السريان</label>
                <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className={inputCls} required />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">تاريخ الانتهاء (اختياري)</label>
                <input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">ملاحظات</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
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
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">أساسي</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">معيشة</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">طبيعة عمل</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">زيادة</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الإجمالي</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">من تاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">حتى تاريخ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {basics.map((b: any) => {
                const isExpanded = expandedEmp === b.empCd;
                return (
                  <>
                    <tr key={b.id} className={`border-b border-border/50 hover:bg-muted/20 ${isExpanded ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-3 font-medium">{b.fullName ?? b.empCd}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.department ?? "—"}</td>
                      <td className="px-4 py-3">{Number(b.basicAmount).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{Number(b.costOfLivingAllowance ?? 0).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{Number(b.workNatureAllowance ?? 0).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{Number(b.yearlyRaise ?? 0).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{rowTotal(b).toLocaleString("ar-EG")} ج.م</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(b.effectiveFrom)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(b.effectiveTo) || "مفتوح"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleExpand(b.empCd)}
                            title="سجل الزيادات">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm("حذف هذا الراتب؟")) deleteMut.mutate({ id: b.id }); }}>
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && <RaiseHistoryPanel key={`raise-${b.empCd}`} empCd={b.empCd} empName={b.fullName ?? b.empCd} />}
                  </>
                );
              })}
              {basics.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">لا توجد رواتب محددة بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
