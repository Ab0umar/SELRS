import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, Percent, Settings, ShieldAlert, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RateForm {
  r3: string;
  r5: string;
  r7: string;
  r10: string;
}

const TIERS = [
  { key: "r3" as const, label: "≤ 3 أيام إجازة" },
  { key: "r5" as const, label: "≤ 5 أيام إجازة" },
  { key: "r7" as const, label: "≤ 7 أيام إجازة" },
  { key: "r10" as const, label: "≤ 10 أيام إجازة" },
];

function GlobalRates() {
  const [form, setForm] = useState<RateForm>({
    r3: "",
    r5: "",
    r7: "",
    r10: "",
  });
  const [saving, setSaving] = useState(false);

  const ratesQ = (trpc as any).salary.getAttendanceRates.useQuery();
  const setRatesMut = (trpc as any).salary.setAttendanceRates.useMutation({
    onSuccess: () => {
      ratesQ.refetch();
      toast.success("تم حفظ النسب العامة بنجاح");
    },
    onError: (err: any) => toast.error(err.message ?? "خطأ في حفظ النسب"),
    onSettled: () => setSaving(false),
  });

  useEffect(() => {
    if (!ratesQ.data) return;
    const d = ratesQ.data;
    setForm({
      r3: String(Math.round(d.rate3 * 100)),
      r5: String(Math.round(d.rate5 * 100)),
      r7: String(Math.round(d.rate7 * 100)),
      r10: String(Math.round(d.rate10 * 100)),
    });
  }, [ratesQ.data]);

  function save() {
    const r3 = parseFloat(form.r3) / 100;
    const r5 = parseFloat(form.r5) / 100;
    const r7 = parseFloat(form.r7) / 100;
    const r10 = parseFloat(form.r10) / 100;
    if ([r3, r5, r7, r10].some(isNaN)) {
      toast.error("أدخل قيمًا صحيحة للنسب");
      return;
    }
    setSaving(true);
    setRatesMut.mutate({ rate3: r3, rate5: r5, rate7: r7, rate10: r10 });
  }

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold">نسب الحضور العامة (المركز)</CardTitle>
            <CardDescription className="text-[11px]">
              تُطبَّق هذه النسب تلقائياً على كل موظف ليس لديه نسبة حضور خاصة.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-3 bg-muted/10">
              <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs pr-7 text-right outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <span className="text-[10px] text-muted-foreground/80">
            * الغياب الأكثر من 10 أيام يُحسب بنسبة 0% تلقائياً.
          </span>
          <Button onClick={save} disabled={saving || ratesQ.isLoading} size="sm" className="h-8 text-xs font-semibold">
            {saving ? "جاري الحفظ…" : "حفظ النسب"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeSettingsGrid() {
  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const updateMut = (trpc as any).attendance.updateEmployee.useMutation({
    onError: (err: any) => toast.error(err.message ?? "خطأ في حفظ إعدادات الموظف"),
  });
  const flagsMut = (trpc as any).salary.setCommissionFlags.useMutation({
    onError: (err: any) => toast.error(err.message ?? "خطأ في تعديل العمولات والبدلات"),
    onSuccess: () => empsQ.refetch(),
  });

  const [rates, setRates] = useState<Record<string, string>>({});
  const [multipliers, setMultipliers] = useState<Record<string, string>>({});
  const allEmps: any[] = empsQ.data ?? [];

  useEffect(() => {
    if (!empsQ.data) return;
    const initRates: Record<string, string> = {};
    const initMults: Record<string, string> = {};
    for (const emp of empsQ.data) {
      initRates[emp.empCd] =
        emp.attendanceCommissionRate != null
          ? String(Math.round(Number(emp.attendanceCommissionRate) * 100))
          : "";
      initMults[emp.empCd] =
        emp.attendanceLeaveMultiplier != null
          ? String(Math.round(Number(emp.attendanceLeaveMultiplier) * 100))
          : "";
    }
    setRates(initRates);
    setMultipliers(initMults);
  }, [empsQ.data]);

  function saveEmpSettings(emp: any) {
    const rawRate = rates[emp.empCd] ?? "";
    const rate = rawRate === "" ? null : parseFloat(rawRate) / 100;
    if (rate !== null && isNaN(rate)) {
      toast.error("قيمة نسبة الحضور غير صحيحة");
      return;
    }

    const rawMult = multipliers[emp.empCd] ?? "";
    const multiplier = rawMult === "" ? null : parseFloat(rawMult) / 100;
    if (multiplier !== null && isNaN(multiplier)) {
      toast.error("قيمة معامل الحضور غير صحيحة");
      return;
    }

    updateMut.mutate(
      {
        empCd: emp.empCd,
        fullName: emp.fullName,
        department: emp.department,
        salaryType: emp.salaryType ?? undefined,
        attendanceCommissionRate: rate,
        attendanceLeaveMultiplier: multiplier,
        active: emp.active ?? true,
      },
      {
        onSuccess: () => {
          empsQ.refetch();
          toast.success(`تم حفظ إعدادات الموظف: ${emp.fullName}`);
        },
      },
    );
  }

  function toggleFlag(
    emp: any,
    key: "commAttendance" | "commExam" | "commPentacam" | "commDay10"
  ) {
    const attendanceEnabled = emp.commAttendance !== false;
    const examEnabled = emp.commExam !== false;
    const pentacamEnabled = emp.commPentacam !== false;
    const day10Enabled = emp.commDay10 !== false;

    flagsMut.mutate({
      empCd: emp.empCd,
      commAttendance: key === "commAttendance" ? !attendanceEnabled : attendanceEnabled,
      commExam: key === "commExam" ? !examEnabled : examEnabled,
      commPentacam: key === "commPentacam" ? !pentacamEnabled : pentacamEnabled,
      commDay10: key === "commDay10" ? !day10Enabled : day10Enabled,
    });
  }

  if (empsQ.isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-1/3 animate-pulse" />
          <Skeleton className="h-20 w-full animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (allEmps.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-xs text-muted-foreground font-medium">
          لا يوجد موظفون مسجلون في النظام حالياً.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold">إعدادات الموظفين الخاصة</CardTitle>
            <CardDescription className="text-[11px]">
              تعديل نسب العمولات الخاصة ومعامل الحضور الإضافي وتفعيل عمولات الحضور، الكشف، البنتاكام، وبدلات يوم 10.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-t border-b border-border bg-muted/40 text-muted-foreground font-bold">
                <th className="px-6 py-3 font-semibold">الموظف</th>
                <th className="px-4 py-3 font-semibold text-center w-24">النوع</th>
                <th className="px-4 py-3 font-semibold text-center w-[240px]">النسب والمعاملات الخاصة</th>
                <th className="px-6 py-3 font-semibold text-center w-80">تفعيل العمولات والبدلات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {allEmps.map((emp) => {
                const attendanceEnabled = emp.commAttendance !== false;
                const examEnabled = emp.commExam !== false;
                const pentacamEnabled = emp.commPentacam !== false;
                const day10Enabled = emp.commDay10 !== false;

                return (
                  <tr key={emp.empCd} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-3 font-bold text-foreground">
                      {emp.fullName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border">
                        {emp.salaryType || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-center">
                        {/* att% Input */}
                        <div className="flex flex-col items-center gap-1 w-20">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">عمولة الحضور %</span>
                          <div className="relative w-full">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              placeholder="عام"
                              value={rates[emp.empCd] ?? ""}
                              onChange={(e) =>
                                setRates((r) => ({ ...r, [emp.empCd]: e.target.value }))
                              }
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs pr-6 text-right outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Multiplier Input */}
                        <div className="flex flex-col items-center gap-1 w-20">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">المعامل %</span>
                          <div className="relative w-full">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              placeholder="تلقائي"
                              value={multipliers[emp.empCd] ?? ""}
                              onChange={(e) =>
                                setMultipliers((m) => ({ ...m, [emp.empCd]: e.target.value }))
                              }
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs pr-6 text-right outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex flex-col items-center gap-1 pt-4 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateMut.isPending}
                            onClick={() => saveEmpSettings(emp)}
                            className="h-7 px-2 text-[10px] font-bold"
                          >
                            حفظ
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-4 justify-center">
                        {/* عمولة الحضور */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">عمولة الحضور</span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commAttendance")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${attendanceEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={attendanceEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${attendanceEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* معامل الكشف */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">معامل الكشف</span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commExam")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${examEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={examEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${examEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* معامل البنتاكام */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">البنتاكام</span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commPentacam")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${pentacamEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={pentacamEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${pentacamEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* بدلات يوم 10 */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">بدلات يوم 10</span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commDay10")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${day10Enabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={day10Enabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${day10Enabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface LateTier {
  minMin: number;
  maxMin: number | null;
  type?: "linear";
  dayFraction?: number;
}

const DEFAULT_LATE_TIERS: LateTier[] = [
  { minMin: 1, maxMin: 14, type: "linear" },
  { minMin: 15, maxMin: 29, dayFraction: 0.25 },
  { minMin: 30, maxMin: 59, dayFraction: 0.5 },
  { minMin: 60, maxMin: 119, dayFraction: 1 },
  { minMin: 120, maxMin: null, dayFraction: 2 },
];

function tierLabel(t: LateTier): string {
  if (t.type === "linear") return "خطي (دقيقة × معدل)";
  if (t.dayFraction === 0.25) return "ربع يوم (¼)";
  if (t.dayFraction === 0.5) return "نصف يوم (½)";
  if (t.dayFraction === 1) return "يوم كامل (1)";
  if (t.dayFraction === 2) return "يومان (2)";
  return String(t.dayFraction ?? "");
}

function LateTiersCard() {
  const tiersQ = (trpc as any).salary.getLateTiers.useQuery();
  const setTiersMut = (trpc as any).salary.setLateTiers.useMutation({
    onSuccess: () => { tiersQ.refetch(); toast.success("تم حفظ شرائح التأخير بنجاح"); },
    onError: (err: any) => toast.error(err.message ?? "خطأ في حفظ الشرائح"),
  });
  const [tiers, setTiers] = useState<LateTier[]>(DEFAULT_LATE_TIERS);

  useEffect(() => {
    if (tiersQ.data) setTiers(tiersQ.data);
  }, [tiersQ.data]);

  function setTierField(idx: number, field: keyof LateTier, val: string | null) {
    setTiers((prev) => {
      const next = [...prev];
      const t = { ...next[idx] };
      if (field === "maxMin") {
        t.maxMin = val === null || val === "" ? null : parseInt(val);
      } else if (field === "minMin") {
        t.minMin = parseInt(val as string) || 0;
      } else if (field === "dayFraction") {
        t.dayFraction = parseFloat(val as string);
      }
      next[idx] = t;
      return next;
    });
  }

  function save() {
    setTiersMut.mutate(tiers);
  }

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold">شرائح خصم التأخير (لكل يوم)</CardTitle>
            <CardDescription className="text-[11px]">
              تحديد الخصم المناسب لكل نطاق دقائق تأخير يومياً. الخروج المبكر يظل خطياً دائماً.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiersQ.isLoading ? (
          <Skeleton className="h-20 w-full animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">من (دقيقة)</th>
                  <th className="px-3 py-2 font-semibold">إلى (دقيقة)</th>
                  <th className="px-3 py-2 font-semibold">الخصم</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.minMin}
                        onChange={(e) => setTierField(i, "minMin", e.target.value)}
                        className="w-20 rounded border border-input bg-background px-2 py-1 text-xs text-right outline-none focus:border-primary/50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.maxMin ?? ""}
                        placeholder="∞"
                        onChange={(e) => setTierField(i, "maxMin", e.target.value)}
                        className="w-20 rounded border border-input bg-background px-2 py-1 text-xs text-right outline-none focus:border-primary/50"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-primary">{tierLabel(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end border-t border-border/40 pt-3">
          <Button onClick={save} disabled={setTiersMut.isPending || tiersQ.isLoading} size="sm" className="h-8 text-xs font-semibold">
            {setTiersMut.isPending ? "جاري الحفظ…" : "حفظ الشرائح"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SalarySettings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground">قواعد ونسب احتساب الرواتب</h2>
        <p className="text-xs text-muted-foreground">
          تعديل نسب عمولات الحضور العامة، والنسب المخصصة لكل موظف، واستحقاقات بدلات المعيشة والانتقال.
        </p>
      </div>

      <GlobalRates />
      <LateTiersCard />
      <EmployeeSettingsGrid />
    </div>
  );
}
