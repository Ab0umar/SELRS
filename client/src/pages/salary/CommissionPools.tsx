import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const now = new Date();
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const TIERS = [
  { key: "cases450" as const, price: 450, deduction: 123.75, empPct: 0.455 },
  { key: "cases400" as const, price: 400, deduction: 110,    empPct: 0.455 },
  { key: "cases350" as const, price: 350, deduction: 85,     empPct: 0.47  },
  { key: "cases250" as const, price: 250, deduction: 60,     empPct: 0.50  },
];

const XRAY_TIERS = [
  { key: "xray450" as const, price: 450, deduction: 123.75, docPct: 0.545, empPct: 0.455 },
  { key: "xray400" as const, price: 400, deduction: 110,    docPct: 0.545, empPct: 0.455 },
  { key: "xray350" as const, price: 350, deduction: 85,     docPct: 0.53,  empPct: 0.47  },
  { key: "xray250" as const, price: 250, deduction: 60,     docPct: 0.50,  empPct: 0.50  },
];

const EXAM_PRICE = 50;
const EXAM_EMP_PCT = 0.40;

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
  const [form, setForm] = useState<FormState>(BLANK);

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [consultantRate, setConsultantRate] = useState("15");
  const [specialistRate, setSpecialistRate] = useState("15");

  const poolQ = (trpc as any).salary.getCommissionPool.useQuery({ year, month, section });
  const pool = poolQ.data;
  const allPoolsQ = (trpc as any).salary.listCommissionPools.useQuery({ year, section });
  const allPools = allPoolsQ.data || [];
  
  // Fetch clinic doctors' salaries for commission distribution
  const doctorsQ = (trpc as any).salary.listBasics.useQuery({ section: "عيادة" });
  const clinicDoctors = doctorsQ.data?.filter((d: any) => d.type === "استشاري" || d.type === "أخصائي") || [];
  const totalDoctorSalary = clinicDoctors.reduce((sum: number, d: any) => sum + (parseFloat(d.basicSalary) || 0), 0);

  useEffect(() => {
    if (pool) {
      const cCount = parseInt(pool.examCountConsultant) || 0;
      const sCount = parseInt(pool.examCountSpecialist) || 0;
      setForm({
        examCount: String(pool.examCount ?? 0),
        xrayCount: String(pool.xrayCount ?? 0),
        consultantCount: String(cCount),
        specialistCount: String(sCount),
        consultantRate: "0",
        specialistRate: "0",
        costOfLivingAllowanceAmount: String(pool.costOfLivingAllowanceAmount ?? 0),
        costOfLivingAllowanceCount: String(pool.costOfLivingAllowanceCount ?? 0),
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

      } else {
        setForm(BLANK);
        setConsultantRate("15");
        setSpecialistRate("15");
      }
  }, [pool, section]);

  const saveMut = (trpc as any).salary.setCommissionPool.useMutation({
    onSuccess: () => { poolQ.refetch(); allPoolsQ.refetch(); toast.success("تم الحفظ"); setEditingMonth(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const calcExamEmpPool = (count: number) => Math.round(count * EXAM_PRICE * EXAM_EMP_PCT * 100) / 100;
  const calcPentacamPool = (cn: any) => {
    const p450 = (cn.cases450 || 0) * TIERS[0].deduction * TIERS[0].empPct;
    const p400 = (cn.cases400 || 0) * TIERS[1].deduction * TIERS[1].empPct;
    const p350 = (cn.cases350 || 0) * TIERS[2].deduction * TIERS[2].empPct;
    const p250 = (cn.cases250 || 0) * TIERS[3].deduction * TIERS[3].empPct;
    return Math.round((p450 + p400 + p350 + p250) * 100) / 100;
  };

  const isMarkaz = section === "مركز";
  const examCount = parseInt(form.examCount) || 0;
  const xrayCount = parseInt(form.xrayCount) || 0;
  const consultantCount = parseInt(form.consultantCount) || 0;
  const specialistCount = parseInt(form.specialistCount) || 0;
  const consultantRateNum = parseFloat(consultantRate) || 0;
  const specialistRateNum = parseFloat(specialistRate) || 0;
  const costOfLivingAllowanceAmount = parseFloat(form.costOfLivingAllowanceAmount) || 0;
  const costOfLivingAllowanceCount = parseInt(form.costOfLivingAllowanceCount) || 0;
  const transportAllowanceAmount = parseFloat(form.transportAllowanceAmount) || 0;
  const transportAllowanceCount = parseInt(form.transportAllowanceCount) || 0;
  // For clinic: consultant and specialist pools split equally among their respective counts
  const consultantPool = Math.round(consultantCount * consultantRateNum * 100) / 100;
  const specialistPool = Math.round(specialistCount * specialistRateNum * 100) / 100;
  const consultantPerEmp = consultantCount > 0 ? Math.round((consultantPool / consultantCount) * 100) / 100 : 0;
  const specialistPerEmp = specialistCount > 0 ? Math.round((specialistPool / specialistCount) * 100) / 100 : 0;
  const costOfLivingAllowanceTotal = Math.round(costOfLivingAllowanceAmount * costOfLivingAllowanceCount * 100) / 100;
  const transportAllowanceTotal = Math.round(transportAllowanceAmount * transportAllowanceCount * 100) / 100;
  
  // For center: exam commission split by percentage
  const examTotal = examCount * EXAM_PRICE;
  const examDrPool = isMarkaz ? Math.round(examTotal * 0.60 * 100) / 100 : 0;
  const examEmpPool = isMarkaz ? calcExamEmpPool(examCount) : 0;
  
  // X-ray calculations (same as exam: 50 ج per xray)
  const xrayTotal = xrayCount * EXAM_PRICE;
  const xrayDrPool = isMarkaz ? Math.round(xrayTotal * 0.60 * 100) / 100 : 0;
  const xrayEmpPool = isMarkaz ? Math.round(xrayCount * EXAM_PRICE * EXAM_EMP_PCT * 100) / 100 : 0;
  
  // Clinic exam totals (for display)
  const clinicExamDrPool = !isMarkaz ? Math.round(examCount * EXAM_PRICE * 0.60 * 100) / 100 : 0;
  const clinicExamEmpPool = !isMarkaz ? Math.round(examCount * EXAM_PRICE * 0.40 * 100) / 100 : 0;
  
  // Clinic xray totals (for display)
  const clinicXrayDrPool = !isMarkaz ? Math.round(xrayCount * EXAM_PRICE * 0.60 * 100) / 100 : 0;
  const clinicXrayEmpPool = !isMarkaz ? Math.round(xrayCount * EXAM_PRICE * 0.40 * 100) / 100 : 0;
  
  const pentacamPool = isMarkaz ? calcPentacamPool({ cases450: parseInt(form.xray450) || 0, cases400: parseInt(form.xray400) || 0, cases350: parseInt(form.xray350) || 0, cases250: parseInt(form.xray250) || 0 }) : 0;
  const totalCases = (parseInt(form.xray450) || 0) + (parseInt(form.xray400) || 0) + (parseInt(form.xray350) || 0) + (parseInt(form.xray250) || 0);
  const totalXrayCases = (parseInt(form.xray450) || 0) + (parseInt(form.xray400) || 0) + (parseInt(form.xray350) || 0) + (parseInt(form.xray250) || 0);

  // X-ray tier calculations (using X-ray specific percentages)
  const casesNum = { cases450: parseInt(form.cases450) || 0, cases400: parseInt(form.cases400) || 0, cases350: parseInt(form.cases350) || 0, cases250: parseInt(form.cases250) || 0, xray450: parseInt(form.xray450) || 0, xray400: parseInt(form.xray400) || 0, xray350: parseInt(form.xray350) || 0, xray250: parseInt(form.xray250) || 0 };
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
  const xrayTotalCount = casesNum.xray450 + casesNum.xray400 + casesNum.xray350 + casesNum.xray250;
  const xrayGrandTotal = Math.round((xrayTierTotals[450] + xrayTierTotals[400] + xrayTierTotals[350] + xrayTierTotals[250]) * 100) / 100;
  const xrayDoctorsTotal = Math.round((xrayTierDoctors[450] + xrayTierDoctors[400] + xrayTierDoctors[350] + xrayTierDoctors[250]) * 100) / 100;
  const xrayStaffTotal = Math.round((xrayTierStaff[450] + xrayTierStaff[400] + xrayTierStaff[350] + xrayTierStaff[250]) * 100) / 100;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      year, month, section,
      examCount: isMarkaz ? examCount : consultantCount + specialistCount,
      xrayCount: xrayTotalCount,
      cases450: parseInt(form.xray450) || 0,
      cases400: parseInt(form.xray400) || 0,
      cases350: parseInt(form.xray350) || 0,
      cases250: parseInt(form.xray250) || 0,
      ...(!isMarkaz ? {
        examCountConsultant: consultantCount,
        examCountSpecialist: specialistCount,
        examPoolConsultant: consultantPool,
        examPoolSpecialist: specialistPool,
      } : {}),
      costOfLivingAllowanceAmount,
      costOfLivingAllowanceCount,
      transportAllowanceAmount,
      transportAllowanceCount,
      notes: form.notes,
    });
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">مسار المتغيرات الشهرية</p>
          <h1 className="text-2xl font-bold text-foreground">العمولات الشهرية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أدخل متغيرات العمولات للشهر قبل احتساب كشف الرواتب.
          </p>
        </div>
        <div className="flex gap-3">
          <select value={section} onChange={e => setSection(e.target.value as Section)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="مركز">مركز</option>
            <option value="عيادة">عيادة</option>
          </select>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>



      {/* Form as Editable Table */}
      <Card>
        <CardHeader>
          <CardTitle>إضافة/تعديل عمولات {MONTHS[month - 1]}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {isMarkaz ? (
              <>
                {/* Exams Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">الكشوفات</h3>
                  <div className="overflow-x-auto" dir="rtl">
                    <table className="w-full text-sm border border-border rounded-lg" dir="rtl">
                      <thead>
                        <tr className="bg-blue-50/50 border-b">
                          <th className="px-4 py-3 text-right font-semibold">البيان</th>
                          <th className="px-4 py-3 text-center font-semibold">القيمة</th>
                          <th className="px-4 py-3 text-center font-semibold">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">الكشوفات - العدد</td>
                          <td className="px-4 py-3 text-center">
                            <input type="number" value={form.examCount} min={0} step="1" onChange={set("examCount")} className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{examCount}</td>
                        </tr>
                        <tr className="bg-blue-50/30 hover:bg-blue-50/50">
                          <td className="px-4 py-3 font-medium">الإجمالي</td>
                          <td className="px-4 py-3 text-center"></td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{examTotal.toLocaleString("ar-EG")} ج</td>
                        </tr>
                        <tr className="bg-blue-50/30 hover:bg-blue-50/50">
                          <td className="px-4 py-3 font-medium">الأطباء (60%)</td>
                          <td className="px-4 py-3 text-center"></td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{examDrPool.toLocaleString("ar-EG")} ج</td>
                        </tr>
                        <tr className="bg-green-50/30 hover:bg-green-50/50">
                          <td className="px-4 py-3 font-medium">الموظفين (40%)</td>
                          <td className="px-4 py-3 text-center"></td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{examEmpPool.toLocaleString("ar-EG")} ج</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* X-ray Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">الأشعة</h3>
                  <div className="overflow-x-auto" dir="rtl">
                    <table className="w-full text-sm border border-border rounded-lg" dir="rtl">
                      <thead>
                        <tr className="bg-orange-50/50 border-b">
                          <th className="px-4 py-3 text-right font-semibold">البيان</th>
                          <th className="px-4 py-3 text-center font-semibold">450</th>
                          <th className="px-4 py-3 text-center font-semibold">400</th>
                          <th className="px-4 py-3 text-center font-semibold">350</th>
                          <th className="px-4 py-3 text-center font-semibold">250</th>
                          <th className="px-4 py-3 text-center font-semibold">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">العدد</td>
                          <td className="px-4 py-3 text-center">
                            <input type="number" value={form.xray450} min={0} step="1" onChange={set("xray450")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="number" value={form.xray400} min={0} step="1" onChange={set("xray400")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="number" value={form.xray350} min={0} step="1" onChange={set("xray350")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="number" value={form.xray250} min={0} step="1" onChange={set("xray250")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{xrayTotalCount.toLocaleString("ar-EG")}</td>
                        </tr>
                        <tr className="border-b bg-blue-50/30 hover:bg-blue-50/50">
                          <td className="px-4 py-3 font-medium">الإجمالي</td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{xrayTierTotals[450].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{xrayTierTotals[400].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{xrayTierTotals[350].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{xrayTierTotals[250].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{xrayGrandTotal.toLocaleString("ar-EG")} ج</td>
                        </tr>
                        <tr className="border-b bg-blue-50/30 hover:bg-blue-50/50">
                          <td className="px-4 py-3 font-medium">الأطباء</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{xrayTierDoctors[450].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{xrayTierDoctors[400].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{xrayTierDoctors[350].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{xrayTierDoctors[250].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{xrayDoctorsTotal.toLocaleString("ar-EG")} ج</td>
                        </tr>
                        <tr className="bg-green-50/30 hover:bg-green-50/50">
                          <td className="px-4 py-3 font-medium">الموظفين</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{xrayTierStaff[450].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{xrayTierStaff[400].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{xrayTierStaff[350].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{xrayTierStaff[250].toLocaleString("ar-EG")} ج</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{xrayStaffTotal.toLocaleString("ar-EG")} ج</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-base">الكشوفات</h3>
                <div className="overflow-x-auto" dir="rtl">
                  <table className="w-full text-sm border border-border rounded-lg" dir="rtl">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-4 py-3 text-right font-semibold">الكشف</th>
                        <th className="px-4 py-3 text-center font-semibold">العدد</th>
                        <th className="px-4 py-3 text-center font-semibold">المبلغ</th>
                        <th className="px-4 py-3 text-center font-semibold">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">استشاري</td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" value={form.consultantCount} min={0} step="1" onChange={set("consultantCount")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" value={consultantRate} min={0} step="0.5" onChange={e => setConsultantRate(e.target.value)} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-primary">{consultantPool.toLocaleString("ar-EG")} ج</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">أخصائي</td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" value={form.specialistCount} min={0} step="1" onChange={set("specialistCount")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" value={specialistRate} min={0} step="0.5" onChange={e => setSpecialistRate(e.target.value)} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-primary">{specialistPool.toLocaleString("ar-EG")} ج</td>
                      </tr>
                      <tr className="bg-primary/10 font-bold">
                        <td className="px-4 py-3">إجمالي نسب الكشف</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center text-primary">{(consultantPool + specialistPool).toLocaleString("ar-EG")} ج</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Day-10 Allowances */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">بدلات يوم 10</h3>
              <div className="overflow-x-auto" dir="rtl">
                <table className="w-full text-sm border border-border rounded-lg" dir="rtl">
                  <thead>
                    <tr className="bg-emerald-50/50 border-b">
                      <th className="px-4 py-3 text-right font-semibold">البيان</th>
                      <th className="px-4 py-3 text-center font-semibold">المبلغ</th>
                      <th className="px-4 py-3 text-center font-semibold">العدد</th>
                      <th className="px-4 py-3 text-center font-semibold">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">غلاء معيشه</td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" value={form.costOfLivingAllowanceAmount} min={0} step="0.01" onChange={set("costOfLivingAllowanceAmount")} className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" value={form.costOfLivingAllowanceCount} min={0} step="1" onChange={set("costOfLivingAllowanceCount")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-primary">{costOfLivingAllowanceTotal.toLocaleString("ar-EG")} ج</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">بدل مواصلات</td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" value={form.transportAllowanceAmount} min={0} step="0.01" onChange={set("transportAllowanceAmount")} className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" value={form.transportAllowanceCount} min={0} step="1" onChange={set("transportAllowanceCount")} className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-primary">{transportAllowanceTotal.toLocaleString("ar-EG")} ج</td>
                    </tr>
                    <tr className="bg-emerald-50/30 font-bold">
                      <td className="px-4 py-3">إجمالي بدلات يوم 10</td>
                      <td className="px-4 py-3 text-center">-</td>
                      <td className="px-4 py-3 text-center">-</td>
                      <td className="px-4 py-3 text-center text-primary">{(costOfLivingAllowanceTotal + transportAllowanceTotal).toLocaleString("ar-EG")} ج</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={3} placeholder="أي ملاحظات إضافية..." />
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
