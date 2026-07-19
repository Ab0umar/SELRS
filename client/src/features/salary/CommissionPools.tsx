import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
const now = new Date();
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const TIERS = [
  { key: "cases450" as const, price: 450, deduction: 123.75, empPct: 0.455 },
  { key: "cases400" as const, price: 400, deduction: 110, empPct: 0.455 },
  { key: "cases350" as const, price: 350, deduction: 85, empPct: 0.47 },
  { key: "cases250" as const, price: 250, deduction: 60, empPct: 0.5 },
];

const XRAY_TIERS = [
  {
    key: "xray450" as const,
    price: 450,
    deduction: 123.75,
    docPct: 0.545,
    empPct: 0.455,
  },
  {
    key: "xray400" as const,
    price: 400,
    deduction: 110,
    docPct: 0.545,
    empPct: 0.455,
  },
  {
    key: "xray350" as const,
    price: 350,
    deduction: 85,
    docPct: 0.53,
    empPct: 0.47,
  },
  {
    key: "xray250" as const,
    price: 250,
    deduction: 60,
    docPct: 0.5,
    empPct: 0.5,
  },
];

const EXAM_PRICE = 50;
const EXAM_EMP_PCT = 0.4;

type Section = "مركز" | "عيادة";
type FormState = {
  examCount: string;
  xrayCount: string;
  consultantCount: string;
  specialistCount: string;
  consultantRate: string;
  specialistRate: string;
  costOfLivingAllowanceAmount: string;
  costOfLivingAllowanceCount: string;
  transportAllowanceAmount: string;
  transportAllowanceCount: string;
  cases450: string;
  cases400: string;
  cases350: string;
  cases250: string;
  xray450: string;
  xray400: string;
  xray350: string;
  xray250: string;
  notes: string;
};

const BLANK: FormState = {
  examCount: "0",
  xrayCount: "0",
  consultantCount: "0",
  specialistCount: "0",
  consultantRate: "0",
  specialistRate: "0",
  costOfLivingAllowanceAmount: "0",
  costOfLivingAllowanceCount: "0",
  transportAllowanceAmount: "0",
  transportAllowanceCount: "0",
  cases450: "0",
  cases400: "0",
  cases350: "0",
  cases250: "0",
  xray450: "0",
  xray400: "0",
  xray350: "0",
  xray250: "0",
  notes: "",
};

export default function CommissionPools() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [section, setSection] = useState<Section>("مركز");
  const periodLabel = MONTHS[month - 1];
  const [form, setForm] = useState<FormState>(BLANK);

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [markazExamRate, setMarkazExamRate] = useState("50");
  const [consultantRate, setConsultantRate] = useState("15");
  const [specialistRate, setSpecialistRate] = useState("15");

  const poolQ = (trpc as any).salary.getCommissionPool.useQuery({
    year,
    month,
    section,
  });
  const pool = poolQ.data;
  const isMarkaz = section === "مركز";
  const autoPoolsQ = (trpc as any).salary.getMarkazAutoCommissionPools.useQuery(
    { year, month },
    { enabled: isMarkaz },
  );
  const autoPools = autoPoolsQ.data;
  const [manualEditing, setManualEditing] = useState(false);
  const [manualExamPool, setManualExamPool] = useState("");
  const [manualPentacamDrPool, setManualPentacamDrPool] = useState("");
  const [manualPentacamPool, setManualPentacamPool] = useState("");

  useEffect(() => {
    if (!autoPools || manualEditing) return;
    setManualExamPool(String(autoPools.examPool ?? 0));
    setManualPentacamDrPool(String(autoPools.pentacamDrPool ?? 0));
    setManualPentacamPool(String(autoPools.pentacamPool ?? 0));
  }, [autoPools, manualEditing]);

  const manualPoolsMut = (trpc as any).salary.setMarkazManualCommissionPools.useMutation({
    onSuccess: () => {
      autoPoolsQ.refetch();
      setManualEditing(false);
      toast.success("تم تحديث مبالغ التوزيع وربطها بالرواتب");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveManualPools = () => {
    manualPoolsMut.mutate({
      year,
      month,
      examPool: Number(manualExamPool) || 0,
      pentacamDrPool: Number(manualPentacamDrPool) || 0,
      pentacamPool: Number(manualPentacamPool) || 0,
    });
  };

  const restoreAutomaticPools = () => {
    manualPoolsMut.mutate({
      year,
      month,
      examPool: null,
      pentacamDrPool: null,
      pentacamPool: null,
    });
  };

  const priceOverridesQ = (trpc as any).salary.getPriceOverrides.useQuery(
    undefined,
    { enabled: isMarkaz },
  );
  const [specialistPriceInput, setSpecialistPriceInput] = useState("");
  const [consultantPriceInput, setConsultantPriceInput] = useState("");
  const [xray1600PriceInput, setXray1600PriceInput] = useState("");
  const [xrayRemainingPriceInput, setXrayRemainingPriceInput] = useState("");
  const [xray1502PriceInput, setXray1502PriceInput] = useState("");
  useEffect(() => {
    if (priceOverridesQ.data) {
      setSpecialistPriceInput(priceOverridesQ.data.examSpecialist ?? "");
      setConsultantPriceInput(priceOverridesQ.data.examConsultant ?? "");
      setXray1600PriceInput(priceOverridesQ.data.xray1600 ?? "");
      setXrayRemainingPriceInput(priceOverridesQ.data.xrayRemaining ?? "");
      setXray1502PriceInput(priceOverridesQ.data.xray1502 ?? "");
    }
  }, [priceOverridesQ.data]);
  const setPriceOverridesMut = (trpc as any).salary.setPriceOverrides.useMutation({
    onSuccess: () => {
      priceOverridesQ.refetch();
      autoPoolsQ.refetch();
      toast.success("تم حفظ إعدادات حساب النسب");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const saveExamPrices = () => {
    setPriceOverridesMut.mutate({
      examSpecialist: specialistPriceInput === "" ? null : Number(specialistPriceInput),
      examConsultant: consultantPriceInput === "" ? null : Number(consultantPriceInput),
    });
  };
  const saveXrayPrices = () => {
    setPriceOverridesMut.mutate({
      xray1600: xray1600PriceInput === "" ? null : Number(xray1600PriceInput),
      xrayRemaining: xrayRemainingPriceInput === "" ? null : Number(xrayRemainingPriceInput),
      xray1502: xray1502PriceInput === "" ? null : Number(xray1502PriceInput),
    });
  };
  const fixedPercentageMode =
    priceOverridesQ.data?.calculationMode === "fixed_percentage";
  const setCalculationMode = (enabled: boolean) => {
    setPriceOverridesMut.mutate({
      calculationMode: enabled ? "fixed_percentage" : "legacy",
    });
  };

  const allPoolsQ = (trpc as any).salary.listCommissionPools.useQuery({
    year,
    section,
  });
  const allPools = allPoolsQ.data || [];

  // Fetch clinic doctors' salaries for commission distribution
  const doctorsQ = (trpc as any).salary.listBasics.useQuery({
    section: "عيادة",
  });
  const clinicDoctors =
    doctorsQ.data?.filter(
      (d: any) => d.type === "استشاري" || d.type === "أخصائي",
    ) || [];
  const totalDoctorSalary = clinicDoctors.reduce(
    (sum: number, d: any) => sum + (parseFloat(d.basicSalary) || 0),
    0,
  );

  useEffect(() => {
    if (pool) {
      const cCount = parseInt(pool.examCountConsultant) || 0;
      const sCount = parseInt(pool.examCountSpecialist) || 0;
      const totalCount = parseInt(pool.examCount) || 0;
      const totalPool = Number(pool.examPool) || 0;
      const mRate =
        totalCount > 0
          ? String(Math.round((totalPool / totalCount) * 10) / 10)
          : "50";
      setMarkazExamRate(mRate);
      const cRate =
        pool.examPoolConsultant && cCount > 0
          ? String(
              Math.round((Number(pool.examPoolConsultant) / cCount) * 10) / 10,
            )
          : "15";
      const sRate =
        pool.examPoolSpecialist && sCount > 0
          ? String(
              Math.round((Number(pool.examPoolSpecialist) / sCount) * 10) / 10,
            )
          : "15";

      setForm({
        examCount: String(pool.examCount ?? 0),
        xrayCount: String(pool.xrayCount ?? 0),
        consultantCount: String(cCount),
        specialistCount: String(sCount),
        consultantRate: "0",
        specialistRate: "0",
        costOfLivingAllowanceAmount: String(
          pool.costOfLivingAllowanceAmount ?? 0,
        ),
        costOfLivingAllowanceCount: String(
          pool.costOfLivingAllowanceCount ?? 0,
        ),
        transportAllowanceAmount: String(pool.transportAllowanceAmount ?? 0),
        transportAllowanceCount: String(pool.transportAllowanceCount ?? 0),
        cases450: "0",
        cases400: "0",
        cases350: "0",
        cases250: "0",
        xray450: String(pool.cases450 ?? 0),
        xray400: String(pool.cases400 ?? 0),
        xray350: String(pool.cases350 ?? 0),
        xray250: String(pool.cases250 ?? 0),
        notes: pool.notes ?? "",
      });

      setConsultantRate(cRate);
      setSpecialistRate(sRate);
    } else {
      setForm(BLANK);
      setMarkazExamRate("50");
      setConsultantRate("15");
      setSpecialistRate("15");
    }
  }, [pool, section]);

  const saveMut = (trpc as any).salary.setCommissionPool.useMutation({
    onSuccess: () => {
      poolQ.refetch();
      allPoolsQ.refetch();
      toast.success("تم الحفظ");
      setEditingMonth(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const calcExamEmpPool = (count: number) =>
    Math.round(count * EXAM_PRICE * EXAM_EMP_PCT * 100) / 100;
  const calcPentacamPool = (cn: any) => {
    const p450 = (cn.cases450 || 0) * TIERS[0].deduction * TIERS[0].empPct;
    const p400 = (cn.cases400 || 0) * TIERS[1].deduction * TIERS[1].empPct;
    const p350 = (cn.cases350 || 0) * TIERS[2].deduction * TIERS[2].empPct;
    const p250 = (cn.cases250 || 0) * TIERS[3].deduction * TIERS[3].empPct;
    return Math.round((p450 + p400 + p350 + p250) * 100) / 100;
  };

  const examCount = parseInt(form.examCount) || 0;
  const xrayCount = parseInt(form.xrayCount) || 0;
  const consultantCount = parseInt(form.consultantCount) || 0;
  const specialistCount = parseInt(form.specialistCount) || 0;
  const consultantRateNum = parseFloat(consultantRate) || 0;
  const specialistRateNum = parseFloat(specialistRate) || 0;
  const costOfLivingAllowanceAmount =
    parseFloat(form.costOfLivingAllowanceAmount) || 0;
  const costOfLivingAllowanceCount =
    parseInt(form.costOfLivingAllowanceCount) || 0;
  const transportAllowanceAmount =
    parseFloat(form.transportAllowanceAmount) || 0;
  const transportAllowanceCount = parseInt(form.transportAllowanceCount) || 0;
  // For both center & clinic: consultant and specialist pools split
  const consultantPool =
    Math.round(consultantCount * consultantRateNum * 100) / 100;
  const specialistPool =
    Math.round(specialistCount * specialistRateNum * 100) / 100;
  const consultantPerEmp =
    consultantCount > 0
      ? Math.round((consultantPool / consultantCount) * 100) / 100
      : 0;
  const specialistPerEmp =
    specialistCount > 0
      ? Math.round((specialistPool / specialistCount) * 100) / 100
      : 0;
  const costOfLivingAllowanceTotal =
    Math.round(costOfLivingAllowanceAmount * costOfLivingAllowanceCount * 100) /
    100;
  const transportAllowanceTotal =
    Math.round(transportAllowanceAmount * transportAllowanceCount * 100) / 100;

  // For center: exam commission split by percentage (count × user-set cost)
  const markazExamRateNum = parseFloat(markazExamRate) || 0;
  const examTotal = isMarkaz
    ? Math.round(examCount * markazExamRateNum * 100) / 100
    : examCount * EXAM_PRICE;
  const examDrPool = isMarkaz ? Math.round(examTotal * 0.6 * 100) / 100 : 0;
  const examEmpPool = isMarkaz ? Math.round(examTotal * 0.4 * 100) / 100 : 0;

  // X-ray calculations (same as exam: 50 ج per xray)
  const xrayTotal = xrayCount * EXAM_PRICE;
  const xrayDrPool = isMarkaz ? Math.round(xrayTotal * 0.6 * 100) / 100 : 0;
  const xrayEmpPool = isMarkaz
    ? Math.round(xrayCount * EXAM_PRICE * EXAM_EMP_PCT * 100) / 100
    : 0;

  // Clinic exam totals (for display)
  const clinicExamDrPool = !isMarkaz
    ? Math.round(examCount * EXAM_PRICE * 0.6 * 100) / 100
    : 0;
  const clinicExamEmpPool = !isMarkaz
    ? Math.round(examCount * EXAM_PRICE * 0.4 * 100) / 100
    : 0;

  // Clinic xray totals (for display)
  const clinicXrayDrPool = !isMarkaz
    ? Math.round(xrayCount * EXAM_PRICE * 0.6 * 100) / 100
    : 0;
  const clinicXrayEmpPool = !isMarkaz
    ? Math.round(xrayCount * EXAM_PRICE * 0.4 * 100) / 100
    : 0;

  const pentacamPool = isMarkaz
    ? calcPentacamPool({
        cases450: parseInt(form.xray450) || 0,
        cases400: parseInt(form.xray400) || 0,
        cases350: parseInt(form.xray350) || 0,
        cases250: parseInt(form.xray250) || 0,
      })
    : 0;
  const totalCases =
    (parseInt(form.xray450) || 0) +
    (parseInt(form.xray400) || 0) +
    (parseInt(form.xray350) || 0) +
    (parseInt(form.xray250) || 0);
  const totalXrayCases =
    (parseInt(form.xray450) || 0) +
    (parseInt(form.xray400) || 0) +
    (parseInt(form.xray350) || 0) +
    (parseInt(form.xray250) || 0);

  // X-ray tier calculations (using X-ray specific percentages)
  const casesNum = {
    cases450: parseInt(form.cases450) || 0,
    cases400: parseInt(form.cases400) || 0,
    cases350: parseInt(form.cases350) || 0,
    cases250: parseInt(form.cases250) || 0,
    xray450: parseInt(form.xray450) || 0,
    xray400: parseInt(form.xray400) || 0,
    xray350: parseInt(form.xray350) || 0,
    xray250: parseInt(form.xray250) || 0,
  };
  const xrayTierTotals = {
    450: casesNum.xray450 * XRAY_TIERS[0].deduction,
    400: casesNum.xray400 * XRAY_TIERS[1].deduction,
    350: casesNum.xray350 * XRAY_TIERS[2].deduction,
    250: casesNum.xray250 * XRAY_TIERS[3].deduction,
  };
  const xrayTierDoctors = {
    450: casesNum.xray450 * XRAY_TIERS[0].deduction * XRAY_TIERS[0].docPct,
    400: casesNum.xray400 * XRAY_TIERS[1].deduction * XRAY_TIERS[1].docPct,
    350: casesNum.xray350 * XRAY_TIERS[2].deduction * XRAY_TIERS[2].docPct,
    250: casesNum.xray250 * XRAY_TIERS[3].deduction * XRAY_TIERS[3].docPct,
  };
  const xrayTierStaff = {
    450: casesNum.xray450 * XRAY_TIERS[0].deduction * XRAY_TIERS[0].empPct,
    400: casesNum.xray400 * XRAY_TIERS[1].deduction * XRAY_TIERS[1].empPct,
    350: casesNum.xray350 * XRAY_TIERS[2].deduction * XRAY_TIERS[2].empPct,
    250: casesNum.xray250 * XRAY_TIERS[3].deduction * XRAY_TIERS[3].empPct,
  };
  const xrayTotalCount =
    casesNum.xray450 + casesNum.xray400 + casesNum.xray350 + casesNum.xray250;
  const xrayGrandTotal =
    Math.round(
      (xrayTierTotals[450] +
        xrayTierTotals[400] +
        xrayTierTotals[350] +
        xrayTierTotals[250]) *
        100,
    ) / 100;
  const xrayDoctorsTotal =
    Math.round(
      (xrayTierDoctors[450] +
        xrayTierDoctors[400] +
        xrayTierDoctors[350] +
        xrayTierDoctors[250]) *
        100,
    ) / 100;
  const xrayStaffTotal =
    Math.round(
      (xrayTierStaff[450] +
        xrayTierStaff[400] +
        xrayTierStaff[350] +
        xrayTierStaff[250]) *
        100,
    ) / 100;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMarkaz) {
      // exam/x-ray pools are auto-computed from MSSQL revenue — only day-10 allowances + notes are manual
      saveMut.mutate({
        year,
        month,
        section,
        costOfLivingAllowanceAmount,
        costOfLivingAllowanceCount,
        transportAllowanceAmount,
        transportAllowanceCount,
        notes: form.notes,
      });
    } else {
      saveMut.mutate({
        year,
        month,
        section,
        examCount: consultantCount + specialistCount,
        xrayCount: xrayTotalCount,
        examCountConsultant: consultantCount,
        examCountSpecialist: specialistCount,
        examPoolConsultant: consultantPool,
        examPoolSpecialist: specialistPool,
        costOfLivingAllowanceAmount,
        costOfLivingAllowanceCount,
        transportAllowanceAmount,
        transportAllowanceCount,
        notes: form.notes,
      });
    }
  };

  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            مسار المتغيرات الشهرية
          </p>
          <h1 className="text-2xl font-bold text-foreground">النسب الشهرية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أدخل النسب وعمولات الكشف للشهر قبل احتساب كشف الرواتب.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as Section)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="مركز">مركز</option>
            <option value="عيادة">عيادة</option>
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form as Editable Table */}
      <Card>
        <CardHeader>
          <CardTitle>إضافة/تعديل نسب {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {isMarkaz && autoPools && (
              <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">مصدر مبالغ التوزيع</h3>
                    <p className="text-xs text-muted-foreground">
                      {autoPools.source === "manual"
                        ? "يتم استخدام المبالغ اليدوية في النِّسب والرواتب لهذا الشهر."
                        : "يتم احتساب المبالغ تلقائيًا من الإيراد."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!manualEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setManualEditing(true)}
                      >
                        <Pencil className="ml-2 h-4 w-4" />
                        تعديل يدوي
                      </Button>
                    )}
                    {autoPools.source === "manual" && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={manualPoolsMut.isPending}
                        onClick={restoreAutomaticPools}
                      >
                        استعادة الحساب التلقائي
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "إجمالي الكشف",
                      value: manualExamPool,
                      setValue: setManualExamPool,
                      automatic: autoPools.automatic?.examPool,
                    },
                    {
                      label: "بنتاكام الأطباء",
                      value: manualPentacamDrPool,
                      setValue: setManualPentacamDrPool,
                      automatic: autoPools.automatic?.pentacamDrPool,
                    },
                    {
                      label: "بنتاكام الموظفين والفنيين",
                      value: manualPentacamPool,
                      setValue: setManualPentacamPool,
                      automatic: autoPools.automatic?.pentacamPool,
                    },
                  ].map((item) => (
                    <label key={item.label} className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.label}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.value}
                          disabled={!manualEditing}
                          onChange={(e) => item.setValue(e.target.value)}
                          className="h-11 w-full rounded-md border border-border bg-background px-3 pl-8 text-center text-base font-semibold disabled:cursor-default disabled:opacity-100"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ج
                        </span>
                      </div>
                      {autoPools.source === "manual" && (
                        <span className="block text-[11px] text-muted-foreground">
                          التلقائي: {Number(item.automatic ?? 0).toLocaleString("ar-EG")} ج
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {manualEditing && (
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setManualEditing(false);
                        setManualExamPool(String(autoPools.examPool ?? 0));
                        setManualPentacamDrPool(String(autoPools.pentacamDrPool ?? 0));
                        setManualPentacamPool(String(autoPools.pentacamPool ?? 0));
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      disabled={manualPoolsMut.isPending}
                      onClick={saveManualPools}
                    >
                      حفظ وتطبيق على الرواتب
                    </Button>
                  </div>
                )}
              </section>
            )}

            {isMarkaz ? (
              <>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">
                        تثبيت نسب الخدمات مع تغيّر الأسعار
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {fixedPercentageMode
                          ? "مفعّل: تُحسب النسب مباشرة من إجمالي التحصيل بعد الخصم بالنسب القديمة الثابتة."
                          : "غير مفعّل: الحساب الحالي يقسم الإيراد على سعر الأساس ثم يضربه في المبلغ الثابت."}
                      </div>
                    </div>
                    <Switch
                      checked={fixedPercentageMode}
                      disabled={
                        priceOverridesQ.isLoading ||
                        setPriceOverridesMut.isPending
                      }
                      onCheckedChange={setCalculationMode}
                      aria-label="تثبيت نسب خدمات المركز"
                    />
                  </div>
                  {fixedPercentageMode && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-primary sm:grid-cols-5">
                      <span>أخصائي 23.26%</span>
                      <span>استشاري 10.75%</span>
                      <span>1600: 23.91%</span>
                      <span>1502: 27.50%</span>
                      <span>المجمعة 24.29%</span>
                    </div>
                  )}
                </div>

                {/* Exams Section — auto-computed from MSSQL service revenue */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">الكشوفات (محسوبة تلقائيًا من الإيراد)</h3>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      سعر الكشف (اتركه فارغًا للقراءة التلقائية من جدول الأسعار)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">سعر كشف الأخصائي</label>
                        <input
                          type="number"
                          value={specialistPriceInput}
                          min={0}
                          step="0.5"
                          placeholder={String(autoPools?.breakdown.examSpecialistPrice ?? "")}
                          onChange={(e) => setSpecialistPriceInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">سعر كشف الاستشاري</label>
                        <input
                          type="number"
                          value={consultantPriceInput}
                          min={0}
                          step="0.5"
                          placeholder={String(autoPools?.breakdown.examConsultantPrice ?? "")}
                          onChange={(e) => setConsultantPriceInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                    </div>
                    <Button type="button" size="sm" onClick={saveExamPrices} disabled={setPriceOverridesMut.isPending}>
                      حفظ الأسعار
                    </Button>
                  </div>
                  {autoPoolsQ.isLoading ? (
                    <div className="text-sm text-muted-foreground">جاري التحميل...</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden lg:block overflow-x-auto" dir="rtl">
                        <table
                          className="w-full text-sm border border-border rounded-lg"
                          dir="rtl"
                        >
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="px-4 py-3 text-right font-semibold">الكشف</th>
                              <th className="px-4 py-3 text-center font-semibold">الإيراد</th>
                              <th className="px-4 py-3 text-center font-semibold">النسبة</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">أخصائي</td>
                              <td className="px-4 py-3 text-center">
                                {(autoPools?.breakdown.examSpecialistRevenue ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-primary">
                                {(autoPools?.breakdown.examSpecialistPool ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                            </tr>
                            <tr className="border-b bg-primary/5 hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">استشاري</td>
                              <td className="px-4 py-3 text-center">
                                {(autoPools?.breakdown.examConsultantRevenue ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-primary">
                                {(autoPools?.breakdown.examConsultantPool ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View */}
                      <div className="block lg:hidden space-y-3">
                        {[
                          { label: "أخصائي", revenue: autoPools?.breakdown.examSpecialistRevenue, pool: autoPools?.breakdown.examSpecialistPool },
                          { label: "استشاري", revenue: autoPools?.breakdown.examConsultantRevenue, pool: autoPools?.breakdown.examConsultantPool },
                        ].map((row) => (
                          <div key={row.label} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center">
                            <div>
                              <div className="text-sm font-bold text-foreground">{row.label}</div>
                              <div className="text-[10px] text-muted-foreground">{(row.revenue ?? 0).toLocaleString("ar-EG")} ج إيراد</div>
                            </div>
                            <div className="text-base font-black text-primary">{(row.pool ?? 0).toLocaleString("ar-EG")} ج</div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-border bg-card p-4 text-center">
                          <div className="text-[10px] text-muted-foreground mb-1">إجمالي الكشف</div>
                          <div className="text-lg font-black text-foreground">
                            {(autoPools?.examPool ?? 0).toLocaleString("ar-EG")} ج
                          </div>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/8 p-4 text-center">
                          <div className="text-[10px] text-primary font-semibold mb-1">الأطباء (60%)</div>
                          <div className="text-lg font-black text-primary">
                            {Math.round((autoPools?.examPool ?? 0) * 0.6 * 100) / 100} ج
                          </div>
                        </div>
                        <div className="rounded-xl border border-success/20 bg-success/8 p-4 text-center">
                          <div className="text-[10px] text-success font-semibold mb-1">الموظفين والفنيين (40%)</div>
                          <div className="text-lg font-black text-success">
                            {Math.round((autoPools?.examPool ?? 0) * 0.4 * 100) / 100} ج
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pentacam/X-ray Section — auto-computed from MSSQL service revenue */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">البنتاكام (محسوبة تلقائيًا من الإيراد)</h3>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      سعر الخدمة (اتركه فارغًا للقراءة التلقائية من جدول الأسعار)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">سعر خدمة 1600</label>
                        <input
                          type="number"
                          value={xray1600PriceInput}
                          min={0}
                          step="0.5"
                          placeholder={String(autoPools?.breakdown.xray1600Price ?? "")}
                          onChange={(e) => setXray1600PriceInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">سعر باقي الخدمات</label>
                        <input
                          type="number"
                          value={xrayRemainingPriceInput}
                          min={0}
                          step="0.5"
                          placeholder={String(autoPools?.breakdown.xrayRemainingPrice ?? "")}
                          onChange={(e) => setXrayRemainingPriceInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">سعر خدمة 1502</label>
                        <input
                          type="number"
                          value={xray1502PriceInput}
                          min={0}
                          step="0.5"
                          placeholder={String(autoPools?.breakdown.xray1502Price ?? "")}
                          onChange={(e) => setXray1502PriceInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                    </div>
                    <Button type="button" size="sm" onClick={saveXrayPrices} disabled={setPriceOverridesMut.isPending}>
                      حفظ الأسعار
                    </Button>
                  </div>
                  {autoPoolsQ.isLoading ? (
                    <div className="text-sm text-muted-foreground">جاري التحميل...</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden lg:block overflow-x-auto" dir="rtl">
                        <table
                          className="w-full text-sm border border-border rounded-lg"
                          dir="rtl"
                        >
                          <thead>
                            <tr className="bg-secondary/8 border-b">
                              <th className="px-4 py-3 text-right font-semibold">الخدمة</th>
                              <th className="px-4 py-3 text-center font-semibold">الإيراد</th>
                              <th className="px-4 py-3 text-center font-semibold">النسبة</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">خدمة 1600</td>
                              <td className="px-4 py-3 text-center">
                                {(autoPools?.breakdown.xray1600Revenue ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-primary">
                                {(autoPools?.breakdown.xray1600Pool ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">خدمة 1502</td>
                              <td className="px-4 py-3 text-center">
                                {(autoPools?.breakdown.xray1502Revenue ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-primary">
                                {(autoPools?.breakdown.xray1502Pool ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                            </tr>
                            <tr className="border-b bg-primary/5 hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">باقي الخدمات</td>
                              <td className="px-4 py-3 text-center">
                                {(autoPools?.breakdown.xrayRemainingRevenue ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-primary">
                                {(autoPools?.breakdown.xrayRemainingPool ?? 0).toLocaleString("ar-EG")} ج
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View */}
                      <div className="block lg:hidden space-y-3">
                        {[
                          { label: "خدمة 1600", revenue: autoPools?.breakdown.xray1600Revenue, pool: autoPools?.breakdown.xray1600Pool },
                          { label: "خدمة 1502", revenue: autoPools?.breakdown.xray1502Revenue, pool: autoPools?.breakdown.xray1502Pool },
                          { label: "باقي الخدمات", revenue: autoPools?.breakdown.xrayRemainingRevenue, pool: autoPools?.breakdown.xrayRemainingPool },
                        ].map((row) => (
                          <div key={row.label} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center">
                            <div>
                              <div className="text-sm font-bold text-foreground">{row.label}</div>
                              <div className="text-[10px] text-muted-foreground">{(row.revenue ?? 0).toLocaleString("ar-EG")} ج إيراد</div>
                            </div>
                            <div className="text-base font-black text-primary">{(row.pool ?? 0).toLocaleString("ar-EG")} ج</div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/8 p-4 text-center">
                          <div className="text-[10px] text-primary font-semibold mb-1">الأطباء</div>
                          <div className="text-lg font-black text-primary">
                            {(autoPools?.pentacamDrPool ?? 0).toLocaleString("ar-EG")} ج
                          </div>
                        </div>
                        <div className="rounded-xl border border-success/20 bg-success/8 p-4 text-center">
                          <div className="text-[10px] text-success font-semibold mb-1">الموظفين</div>
                          <div className="text-lg font-black text-success">
                            {(autoPools?.pentacamPool ?? 0).toLocaleString("ar-EG")} ج
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-base">الكشوفات</h3>
                <div className="hidden lg:block overflow-x-auto" dir="rtl">
                  <table
                    className="w-full text-sm border border-border rounded-lg"
                    dir="rtl"
                  >
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-4 py-3 text-right font-semibold">
                          الكشف
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          العدد
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          المبلغ
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          الإجمالي
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">استشاري</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={form.consultantCount}
                            min={0}
                            step="1"
                            onChange={set("consultantCount")}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={consultantRate}
                            min={0}
                            step="0.5"
                            onChange={(e) => setConsultantRate(e.target.value)}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-primary">
                          {consultantPool.toLocaleString("ar-EG")} ج
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">أخصائي</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={form.specialistCount}
                            min={0}
                            step="1"
                            onChange={set("specialistCount")}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={specialistRate}
                            min={0}
                            step="0.5"
                            onChange={(e) => setSpecialistRate(e.target.value)}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-primary">
                          {specialistPool.toLocaleString("ar-EG")} ج
                        </td>
                      </tr>
                      <tr className="bg-primary/10 font-bold">
                        <td className="px-4 py-3">إجمالي نسب الكشف</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center text-primary">
                          {(consultantPool + specialistPool).toLocaleString(
                            "ar-EG",
                          )}{" "}
                          ج
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Cards Layout */}
                <div className="block lg:hidden space-y-4">
                  {/* Consultant Card */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="font-bold text-sm text-foreground">استشاري</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">العدد</label>
                        <input
                          type="number"
                          value={form.consultantCount}
                          min={0}
                          step="1"
                          onChange={set("consultantCount")}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">المبلغ</label>
                        <input
                          type="number"
                          value={consultantRate}
                          min={0}
                          step="0.5"
                          onChange={(e) => setConsultantRate(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">الإجمالي:</span>
                      <span className="text-sm font-bold text-primary">{consultantPool.toLocaleString("ar-EG")} ج</span>
                    </div>
                  </div>

                  {/* Specialist Card */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="font-bold text-sm text-foreground">أخصائي</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">العدد</label>
                        <input
                          type="number"
                          value={form.specialistCount}
                          min={0}
                          step="1"
                          onChange={set("specialistCount")}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">المبلغ</label>
                        <input
                          type="number"
                          value={specialistRate}
                          min={0}
                          step="0.5"
                          onChange={(e) => setSpecialistRate(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">الإجمالي:</span>
                      <span className="text-sm font-bold text-primary">{specialistPool.toLocaleString("ar-EG")} ج</span>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="rounded-xl bg-primary/8 border border-primary/15 p-4 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-foreground">إجمالي نسب الكشف</div>
                      <div className="text-[10px] text-muted-foreground">
                        العدد: {(consultantCount + specialistCount).toLocaleString("ar-EG")}
                      </div>
                    </div>
                    <div className="text-lg font-black text-primary">
                      {(consultantPool + specialistPool).toLocaleString("ar-EG")} ج
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Totals Summary */}
            {isMarkaz && autoPools && (() => {
              const examDr = Math.round(autoPools.examPool * 0.6 * 100) / 100;
              const examEmp = Math.round(autoPools.examPool * 0.4 * 100) / 100;
              const drTotal = Math.round((examDr + autoPools.pentacamDrPool) * 100) / 100;
              const empTechTotal = Math.round((examEmp + autoPools.pentacamPool) * 100) / 100;
              return (
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">ملخص التوزيع</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/8 p-4">
                      <div className="text-xs font-semibold text-primary mb-1">إجمالي الأطباء</div>
                      <div className="text-xl font-black text-primary">
                        {drTotal.toLocaleString("ar-EG")} ج
                      </div>
                      <div className="mt-1.5 text-[10px] text-primary space-y-0.5">
                        <div>كشف: {examDr.toLocaleString("ar-EG")} ج</div>
                        <div>بنتاكام: {autoPools.pentacamDrPool.toLocaleString("ar-EG")} ج</div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-success/20 bg-success/10/40 p-4">
                      <div className="text-xs font-semibold text-success mb-1">إجمالي الموظفين والفنيين</div>
                      <div className="text-xl font-black text-success">
                        {empTechTotal.toLocaleString("ar-EG")} ج
                      </div>
                      <div className="mt-1.5 text-[10px] text-success space-y-0.5">
                        <div>كشف: {examEmp.toLocaleString("ar-EG")} ج</div>
                        <div>بنتاكام: {autoPools.pentacamPool.toLocaleString("ar-EG")} ج</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Day-10 Allowances */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">بدلات يوم 10</h3>
              <div className="hidden lg:block overflow-x-auto" dir="rtl">
                <table
                  className="w-full text-sm border border-border rounded-lg"
                  dir="rtl"
                >
                  <thead>
                    <tr className="bg-success/8 border-b">
                      <th className="px-4 py-3 text-right font-semibold">
                        البيان
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        المبلغ
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        العدد
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">غلاء معيشه</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={form.costOfLivingAllowanceAmount}
                          min={0}
                          step="0.01"
                          onChange={set("costOfLivingAllowanceAmount")}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={form.costOfLivingAllowanceCount}
                          min={0}
                          step="1"
                          onChange={set("costOfLivingAllowanceCount")}
                          className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-primary">
                        {costOfLivingAllowanceTotal.toLocaleString("ar-EG")} ج
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">بدل مواصلات</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={form.transportAllowanceAmount}
                          min={0}
                          step="0.01"
                          onChange={set("transportAllowanceAmount")}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={form.transportAllowanceCount}
                          min={0}
                          step="1"
                          onChange={set("transportAllowanceCount")}
                          className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-primary">
                        {transportAllowanceTotal.toLocaleString("ar-EG")} ج
                      </td>
                    </tr>
                    <tr className="bg-success/8 font-bold">
                      <td className="px-4 py-3">إجمالي بدلات يوم 10</td>
                      <td className="px-4 py-3 text-center">-</td>
                      <td className="px-4 py-3 text-center">-</td>
                      <td className="px-4 py-3 text-center text-primary">
                        {(
                          costOfLivingAllowanceTotal + transportAllowanceTotal
                        ).toLocaleString("ar-EG")}{" "}
                        ج
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards Layout */}
              <div className="block lg:hidden space-y-4">
                {/* Cost of Living Card */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="font-bold text-sm text-foreground">غلاء معيشة</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">المبلغ</label>
                      <input
                        type="number"
                        value={form.costOfLivingAllowanceAmount}
                        min={0}
                        step="0.01"
                        onChange={set("costOfLivingAllowanceAmount")}
                        className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">العدد</label>
                      <input
                        type="number"
                        value={form.costOfLivingAllowanceCount}
                        min={0}
                        step="1"
                        onChange={set("costOfLivingAllowanceCount")}
                        className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">الإجمالي:</span>
                    <span className="text-sm font-bold text-primary">{costOfLivingAllowanceTotal.toLocaleString("ar-EG")} ج</span>
                  </div>
                </div>

                {/* Transport Allowance Card */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="font-bold text-sm text-foreground">بدل مواصلات</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">المبلغ</label>
                      <input
                        type="number"
                        value={form.transportAllowanceAmount}
                        min={0}
                        step="0.01"
                        onChange={set("transportAllowanceAmount")}
                        className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">العدد</label>
                      <input
                        type="number"
                        value={form.transportAllowanceCount}
                        min={0}
                        step="1"
                        onChange={set("transportAllowanceCount")}
                        className="w-full rounded border border-border bg-background px-3 py-1.5 text-center text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">الإجمالي:</span>
                    <span className="text-sm font-bold text-primary">{transportAllowanceTotal.toLocaleString("ar-EG")} ج</span>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="rounded-xl bg-success/8 border border-success/15 p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-foreground">إجمالي بدلات يوم 10</div>
                  </div>
                  <div className="text-lg font-black text-primary">
                    {(costOfLivingAllowanceTotal + transportAllowanceTotal).toLocaleString("ar-EG")} ج
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={3}
                placeholder="أي ملاحظات إضافية..."
              />
            </div>

            {/* Save Button */}
            <div className="flex gap-2">
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
