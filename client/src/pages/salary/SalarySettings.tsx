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

export default function SalarySettings() {
  const [form, setForm] = useState<RateForm>({ r3: "", r5: "", r7: "", r10: "" });
  const [saving, setSaving] = useState(false);

  const ratesQ = (trpc as any).salary.getAttendanceRates.useQuery();
  const setRatesMut = (trpc as any).salary.setAttendanceRates.useMutation({
    onSuccess: () => {
      ratesQ.refetch();
      toast.success("تم حفظ النسب");
    },
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
    if ([r3, r5, r7, r10].some(isNaN)) {
      toast.error("أدخل قيمًا صحيحة لجميع النسب");
      return;
    }
    setSaving(true);
    setRatesMut.mutate({ rate3: r3, rate5: r5, rate7: r7, rate10: r10 });
  }

  return (
    <div className="space-y-6 max-w-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">نسب عمولة الحضور</h2>
        <p className="text-sm text-muted-foreground">النسبة المئوية من الراتب الأساسي بحسب عدد أيام الغياب / الإجازة.</p>
      </div>

      <div className="space-y-3">
        {TIERS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-40 shrink-0 text-sm text-right">{label}</label>
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm pr-8 text-right"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">أكثر من 10 أيام = 0% (ثابت)</div>

      <Button onClick={save} disabled={saving || ratesQ.isLoading} className="w-full">
        {saving ? "جاري الحفظ…" : "حفظ النسب"}
      </Button>
    </div>
  );
}
