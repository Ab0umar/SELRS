import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const TIERS = [
  { key: "cases450" as const, price: 450, deduction: 123.75, empPct: 0.455 },
  { key: "cases400" as const, price: 400, deduction: 110,    empPct: 0.455 },
  { key: "cases350" as const, price: 350, deduction: 85,     empPct: 0.47  },
  { key: "cases250" as const, price: 250, deduction: 60,     empPct: 0.50  },
];

const EXAM_PRICE = 50;
const EXAM_EMP_PCT = 0.40;

function calcPentacamPool(cases: Record<string, number>): number {
  return Math.round(TIERS.reduce((sum, t) => sum + (cases[t.key] || 0) * t.deduction * t.empPct, 0) * 100) / 100;
}

function calcExamEmpPool(examCount: number): number {
  return Math.round(examCount * EXAM_PRICE * EXAM_EMP_PCT * 100) / 100;
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

interface FormState {
  examCount: string;
  cases450: string;
  cases400: string;
  cases350: string;
  cases250: string;
  notes: string;
}

const BLANK: FormState = { examCount: "0", cases450: "0", cases400: "0", cases350: "0", cases250: "0", notes: "" };
const BLANK_RATE = "15";

const SECTIONS = ["مركز", "عيادة"] as const;
type Section = typeof SECTIONS[number];

export default function CommissionPools() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [section, setSection] = useState<Section>("مركز");
  const [form, setForm] = useState<FormState>(BLANK);
  const [examRate, setExamRate] = useState(BLANK_RATE); // عيادة per-exam rate

  const poolQ = (trpc as any).salary.getCommissionPool.useQuery({ year, month, section });
  const pool = poolQ.data;

  useEffect(() => {
    if (pool) {
      const count = pool.examCount ?? 0;
      setForm({
        examCount: String(count),
        cases450: String(pool.cases450 ?? 0),
        cases400: String(pool.cases400 ?? 0),
        cases350: String(pool.cases350 ?? 0),
        cases250: String(pool.cases250 ?? 0),
        notes: pool.notes ?? "",
      });
      // reverse-calculate per-exam rate for عيادة
      if (section === "عيادة" && count > 0 && pool.examPool) {
        setExamRate(String(Math.round((Number(pool.examPool) / count) * 100) / 100));
      }
    } else {
      setForm(BLANK);
      setExamRate(BLANK_RATE);
    }
  }, [pool, section]);

  const saveMut = (trpc as any).salary.setCommissionPool.useMutation({
    onSuccess: () => { poolQ.refetch(); toast.success("تم الحفظ"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const isMarkaz = section === "مركز";
  const casesNum = {
    cases450: parseInt(form.cases450) || 0,
    cases400: parseInt(form.cases400) || 0,
    cases350: parseInt(form.cases350) || 0,
    cases250: parseInt(form.cases250) || 0,
  };
  const examCount = parseInt(form.examCount) || 0;
  const examRateNum = parseFloat(examRate) || 0;
  // مركز: 50ج × count × 40% | عيادة: rate × count (يوزع على الموظفين)
  const examEmpPool = isMarkaz ? calcExamEmpPool(examCount) : Math.round(examCount * examRateNum * 100) / 100;
  const examTotal = examCount * EXAM_PRICE;
  const examDrPool = Math.round(examTotal * 0.60 * 100) / 100;
  const pentacamPool = isMarkaz ? calcPentacamPool(casesNum) : 0;
  const totalCases = casesNum.cases450 + casesNum.cases400 + casesNum.cases350 + casesNum.cases250;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      year, month, section, examCount,
      ...(isMarkaz ? casesNum : { cases450: 0, cases400: 0, cases350: 0, cases250: 0 }),
      ...(!isMarkaz ? { examPoolOverride: examEmpPool } : {}),
      notes: form.notes,
    });
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">العمولات</p>
          <h2 className="text-2xl font-bold text-foreground">العمولات الشهرية</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {SECTIONS.map(s => (
              <button key={s} type="button" onClick={() => setSection(s)}
                className={`px-4 py-2 transition-colors ${section === s ? "bg-primary text-primary-foreground font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Exam pool */}
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">نسبة الكشف</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isMarkaz ? "50 ج × عدد الكشوفات — 60% للأطباء، 40% للموظفين بالتساوي" : "سعر الكشف × عدد الكشوفات — يوزع بالتساوي على موظفي العيادة"}
            </p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className={`grid gap-4 ${isMarkaz ? "max-w-xs" : "sm:grid-cols-2 max-w-sm"}`}>
              <div className="space-y-1">
                <label className="block text-sm font-medium">عدد الكشوفات</label>
                <input type="number" value={form.examCount} min={0} step="1"
                  onChange={set("examCount")} className={inputCls} />
              </div>
              {!isMarkaz && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium">سعر الكشف (ج)</label>
                  <input type="number" value={examRate} min={0} step="0.5"
                    onChange={e => setExamRate(e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
            <div className={`grid gap-3 text-sm ${isMarkaz ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {isMarkaz && (
                <>
                  <div className="rounded-lg bg-muted/30 border border-border px-4 py-3">
                    <div className="text-xs text-muted-foreground mb-1">إجمالي الكشف</div>
                    <div className="font-bold text-foreground">
                      {examCount} × 50 = <span className="text-primary">{examTotal.toLocaleString("ar-EG")} ج</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 border border-border px-4 py-3">
                    <div className="text-xs text-muted-foreground mb-1">نصيب الأطباء (60%)</div>
                    <div className="font-bold text-orange-600">{examDrPool.toLocaleString("ar-EG")} ج</div>
                  </div>
                </>
              )}
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <div className="text-xs text-muted-foreground mb-1">{isMarkaz ? "مجمع الموظفين (40%)" : "مجمع موظفي العيادة"}</div>
                <div className="font-bold text-primary">{examEmpPool.toLocaleString("ar-EG")} ج</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pentacam cases — مركز only */}
        {isMarkaz && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">نسبة الاشعة (بنتاكام)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">أدخل عدد الحالات لكل فئة سعرية — يُحسب مجمع الموظفين تلقائياً</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {TIERS.map(t => (
                <div key={t.key} className="space-y-1">
                  <label className="block text-sm font-medium">
                    حالات {t.price} ج
                    <span className="block text-xs text-muted-foreground font-normal">خصم {t.deduction} ج × {(t.empPct*100)}% موظفين</span>
                  </label>
                  <input type="number" value={(form as any)[t.key]} min={0} step="1"
                    onChange={set(t.key)} className={inputCls} />
                  <p className="text-xs text-muted-foreground">
                    = {((parseInt((form as any)[t.key])||0) * t.deduction * t.empPct).toLocaleString("ar-EG")} ج
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">إجمالي الحالات: <span className="font-bold text-foreground">{totalCases}</span></div>
              <div className="text-sm">
                مجمع الموظفين المحسوب:
                <span className="mr-2 text-base font-bold text-primary">{pentacamPool.toLocaleString("ar-EG")} ج.م</span>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Notes + save */}
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-medium">ملاحظات</label>
            <input type="text" value={form.notes} onChange={set("notes")} className={inputCls} />
          </div>
          <Button type="submit" disabled={saveMut.isPending} className="gap-2">
            <Save size={15} /> حفظ
          </Button>
        </div>

        {/* Summary */}
        <section className="rounded-xl border border-border bg-muted/20 px-4 py-4">
          <h4 className="text-sm font-semibold mb-2">ملخص العمولات لهذا الشهر</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• <span className="font-medium text-foreground">حافز الحضور</span>: 25% من الراتب (≤3 أيام) | 15% (≤5) | 10% (≤7) | 5% (≤10) | 0%</li>
            <li>• <span className="font-medium text-foreground">نسبة الكشف</span>: {examEmpPool.toLocaleString("ar-EG")} ج ÷ عدد الموظفين (بالتساوي){!isMarkaz && examRateNum > 0 && <span className="mr-1 text-xs">({examRateNum} ج/كشف)</span>}</li>
            {isMarkaz && (
              <li>• <span className="font-medium text-foreground">نسبة الاشعة</span>: {pentacamPool.toLocaleString("ar-EG")} ج (بنسبة الراتب الأساسي)</li>
            )}
          </ul>
        </section>
      </form>
    </div>
  );
}
