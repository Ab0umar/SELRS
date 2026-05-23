import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function CommissionPools() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [examPool, setExamPool] = useState("");
  const [pentacamPool, setPentacamPool] = useState("");
  const [notes, setNotes] = useState("");

  const poolQ = (trpc as any).salary.getCommissionPool.useQuery({ year, month });
  const pool = poolQ.data;

  useEffect(() => {
    if (pool) {
      setExamPool(String(Number(pool.examPool)));
      setPentacamPool(String(Number(pool.pentacamPool)));
      setNotes(pool.notes ?? "");
    } else {
      setExamPool("");
      setPentacamPool("");
      setNotes("");
    }
  }, [pool]);

  const saveMut = (trpc as any).salary.setCommissionPool.useMutation({
    onSuccess: () => { poolQ.refetch(); toast.success("تم الحفظ"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      year,
      month,
      examPool: parseFloat(examPool) || 0,
      pentacamPool: parseFloat(pentacamPool) || 0,
      notes,
    });
  };

  const totalPool = (parseFloat(examPool) || 0) + (parseFloat(pentacamPool) || 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">العمولات</p>
          <h2 className="text-2xl font-bold text-foreground">العمولات الشهرية</h2>
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
        </div>
      </div>

      <section className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">مجمع العمولات — {MONTHS[month-1]} {year}</h3>
        </div>
        <form onSubmit={handleSave} className="space-y-5 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                عمولة الفحص الإجمالية
                <span className="mr-2 text-xs text-muted-foreground">(تُوزّع بالتساوي على جميع الموظفين)</span>
              </label>
              <input type="number" value={examPool} min={0} step="0.01"
                onChange={(e) => setExamPool(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                عمولة البنتاكام الإجمالية
                <span className="mr-2 text-xs text-muted-foreground">(تُوزّع بنسبة الراتب الأساسي)</span>
              </label>
              <input type="number" value={pentacamPool} min={0} step="0.01"
                onChange={(e) => setPentacamPool(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">ملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          {totalPool > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-foreground">
                إجمالي العمولات: <span className="font-bold text-primary">{totalPool.toLocaleString("ar-EG")} ج.م</span>
                <span className="mr-3 text-xs text-muted-foreground">
                  فحص: {(parseFloat(examPool)||0).toLocaleString("ar-EG")} + بنتاكام: {(parseFloat(pentacamPool)||0).toLocaleString("ar-EG")}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saveMut.isPending} className="gap-2">
              <Save size={15} /> حفظ
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-muted/20 px-4 py-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">طريقة الاحتساب</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• <span className="font-medium text-foreground">عمولة الحضور</span>: 25% من الراتب الأساسي</li>
          <li>• <span className="font-medium text-foreground">عمولة الفحص</span>: المجمع ÷ عدد الموظفين النشطين</li>
          <li>• <span className="font-medium text-foreground">عمولة البنتاكام</span>: (راتبك ÷ مجموع كل الرواتب) × المجمع</li>
          <li>• <span className="font-medium text-foreground">معامل الإجازة</span>: ≤3 أيام = 100%، ≤5 = 75%، ≤7 = 50%، ≤10 = 25%، أكثر = 0%</li>
          <li>• <span className="font-medium text-foreground">معامل الخصومات</span>: (1 − نسبة الخصم من الراتب) يؤثر على جميع العمولات</li>
        </ul>
      </section>
    </div>
  );
}
