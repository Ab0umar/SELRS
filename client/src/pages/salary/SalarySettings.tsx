import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RateForm { r3: string; r5: string; r7: string; r10: string; }

const TIERS = [
  { key: "r3"  as const, label: "≤ 3 أيام إجازة",  placeholder: "25" },
  { key: "r5"  as const, label: "≤ 5 أيام إجازة",  placeholder: "15" },
  { key: "r7"  as const, label: "≤ 7 أيام إجازة",  placeholder: "10" },
  { key: "r10" as const, label: "≤ 10 أيام إجازة", placeholder: "5"  },
];

function GlobalRates() {
  const [form, setForm] = useState<RateForm>({ r3: "", r5: "", r7: "", r10: "" });
  const [saving, setSaving] = useState(false);

  const ratesQ = (trpc as any).salary.getAttendanceRates.useQuery();
  const setRatesMut = (trpc as any).salary.setAttendanceRates.useMutation({
    onSuccess: () => { ratesQ.refetch(); toast.success("تم حفظ النسب"); },
    onError: (err: any) => toast.error(err.message ?? "خطأ في الحفظ"),
    onSettled: () => setSaving(false),
  });

  useEffect(() => {
    if (!ratesQ.data) return;
    const d = ratesQ.data;
    setForm({
      r3:  String(Math.round(d.rate3  * 100)),
      r5:  String(Math.round(d.rate5  * 100)),
      r7:  String(Math.round(d.rate7  * 100)),
      r10: String(Math.round(d.rate10 * 100)),
    });
  }, [ratesQ.data]);

  function save() {
    const r3  = parseFloat(form.r3)  / 100;
    const r5  = parseFloat(form.r5)  / 100;
    const r7  = parseFloat(form.r7)  / 100;
    const r10 = parseFloat(form.r10) / 100;
    if ([r3, r5, r7, r10].some(isNaN)) { toast.error("أدخل قيمًا صحيحة"); return; }
    setSaving(true);
    setRatesMut.mutate({ rate3: r3, rate5: r5, rate7: r7, rate10: r10 });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">نسب الحضور العامة (مركز)</h2>
        <p className="text-sm text-muted-foreground">تُطبَّق على كل موظف ليس له نسبة خاصة.</p>
      </div>
      <div className="space-y-3">
        {TIERS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-40 shrink-0 text-sm">{label}</label>
            <div className="relative w-28">
              <input
                type="number" min={0} max={100} step={1}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm pr-7 text-right"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">أكثر من 10 أيام = 0% (ثابت)</p>
      <Button onClick={save} disabled={saving || ratesQ.isLoading} size="sm">
        {saving ? "جاري الحفظ…" : "حفظ النسب"}
      </Button>
    </div>
  );
}

function EmployeeRates() {
  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const updateMut = (trpc as any).attendance.updateEmployee.useMutation({
    onError: (err: any) => toast.error(err.message ?? "خطأ في الحفظ"),
  });

  const [rates, setRates] = useState<Record<string, string>>({});

  const allEmps: any[] = empsQ.data ?? [];

  useEffect(() => {
    if (!empsQ.data) return;
    const init: Record<string, string> = {};
    for (const emp of empsQ.data) {
      init[emp.empCd] = emp.attendanceCommissionRate != null
        ? String(Math.round(Number(emp.attendanceCommissionRate) * 100))
        : "";
    }
    setRates(init);
  }, [empsQ.data]);

  function saveEmp(emp: any) {
    const raw = rates[emp.empCd] ?? "";
    const rate = raw === "" ? null : parseFloat(raw) / 100;
    if (rate !== null && isNaN(rate)) { toast.error("قيمة غير صحيحة"); return; }
    updateMut.mutate(
      {
        empCd: emp.empCd,
        fullName: emp.fullName,
        department: emp.department,
        salaryType: emp.salaryType ?? undefined,
        attendanceCommissionRate: rate,
        active: emp.active ?? true,
      },
      { onSuccess: () => { empsQ.refetch(); toast.success(`تم حفظ نسبة ${emp.fullName}`); } }
    );
  }

  if (empsQ.isLoading) return <p className="text-sm text-muted-foreground">جاري التحميل…</p>;
  if (allEmps.length === 0) return <p className="text-sm text-muted-foreground">لا يوجد موظفون.</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">نسبة الحضور لكل موظف</h2>
        <p className="text-sm text-muted-foreground">اتركها فارغة لاستخدام النسبة العامة.</p>
      </div>
      <div className="divide-y divide-border rounded-md border">
        {allEmps.map((emp: any) => (
          <div key={emp.empCd} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex-1 text-sm">{emp.fullName}</span>
            <span className="text-xs text-muted-foreground w-16 text-center">{emp.salaryType || "—"}</span>
            <div className="relative w-24">
              <input
                type="number" min={0} max={100} step={1}
                placeholder="عام"
                value={rates[emp.empCd] ?? ""}
                onChange={e => setRates(r => ({ ...r, [emp.empCd]: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm pr-7 text-right"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <Button
              size="sm" variant="outline"
              disabled={updateMut.isPending}
              onClick={() => saveEmp(emp)}
              className="shrink-0"
            >
              حفظ
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalarySettings() {
  return (
    <div className="space-y-10 max-w-lg">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">مسار الإعدادات</p>
        <h2 className="text-2xl font-bold text-foreground">إعدادات الرواتب</h2>
        <p className="text-sm text-muted-foreground">
          قواعد الحضور ونسب الموظفين التي تدخل في الحساب الشهري.
        </p>
      </div>
      <GlobalRates />
      <hr className="border-border" />
      <EmployeeRates />
    </div>
  );
}
