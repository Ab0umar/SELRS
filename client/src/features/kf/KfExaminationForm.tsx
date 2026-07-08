import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, Save, Loader2, Activity, Camera, FlaskConical, Pill, Plus, Trash2 } from "lucide-react";
import {
  ADD_OPTIONS,
  AIR_PUFF_OPTIONS,
  CYLINDER_COMBOBOX_OPTIONS,
  CYLINDER_OPTIONS,
  IOP_OPTIONS,
  SPHERE_COMBOBOX_OPTIONS,
  SPHERE_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { DateInput } from "@/components/ui/date-input";
import { KfExamImagesPanel } from "./KfExamImagesPanel";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;

const MEDICAL_HISTORY_QUESTIONS: {
  key: keyof MedicalHistoryState;
  label: string;
}[] = [
  { key: "generalDiseases", label: "أمراض عامة؟ (ضغط / سكر / غدة)" },
  { key: "pregnancyOrLactation", label: "حمل أو رضاعة؟" },
  {
    key: "usesAllergySupplementsSteroidsOrPressureMeds",
    label: "هل تستخدم مضادات حساسية أو مكملات غذائية/كورتيزون/أدوية ضغط؟",
  },
  { key: "acneTreatment", label: "هل تستخدم علاج لحب الشباب؟ (اسم العلاج)" },
  {
    key: "familyKeratoconus",
    label: "هل سمعت عن مرض القرنية المخروطية في أحد أفراد العائلة؟",
  },
  {
    key: "usesTearSubstituteOrExcessTearsOrSandySensation",
    label: "هل تستخدم بديل دموع / زيادة في إفراز الدموع / إحساس بالرمل؟",
  },
  {
    key: "symptomsWorseWithAirOrAC",
    label: "هل تزيد هذه الأعراض عند وجود هواء أو تكييف؟",
  },
  { key: "glaucomaTreatment", label: "هل تعالج من ماء زرقاء؟" },
];

type MedicalHistoryState = {
  generalDiseases: boolean;
  pregnancyOrLactation: boolean;
  usesAllergySupplementsSteroidsOrPressureMeds: boolean;
  acneTreatment: boolean;
  familyKeratoconus: boolean;
  usesTearSubstituteOrExcessTearsOrSandySensation: boolean;
  symptomsWorseWithAirOrAC: boolean;
  glaucomaTreatment: boolean;
};

const EMPTY_MEDICAL_HISTORY: MedicalHistoryState = {
  generalDiseases: false,
  pregnancyOrLactation: false,
  usesAllergySupplementsSteroidsOrPressureMeds: false,
  acneTreatment: false,
  familyKeratoconus: false,
  usesTearSubstituteOrExcessTearsOrSandySensation: false,
  symptomsWorseWithAirOrAC: false,
  glaucomaTreatment: false,
};

export default function KfExaminationForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId/examinations/new");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Form State
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [kfVisitId, setKfVisitId] = useState<string>("none");
  const [doctorName, setDoctorName] = useState("");

  // Visual Acuity
  const [ucvaOD, setUcvaOD] = useState("");
  const [ucvaOS, setUcvaOS] = useState("");
  const [bcvaOD, setBcvaOD] = useState("");
  const [bcvaOS, setBcvaOS] = useState("");
  const [iopOD, setIopOD] = useState("");
  const [iopOS, setIopOS] = useState("");

  // Refraction OD (Right Eye)
  const [odSph, setOdSph] = useState("---");
  const [odCyl, setOdCyl] = useState("---");
  const [odAxis, setOdAxis] = useState("");

  // Refraction OS (Left Eye)
  const [osSph, setOsSph] = useState("---");
  const [osCyl, setOsCyl] = useState("---");
  const [osAxis, setOsAxis] = useState("");
  const [osPd, setOsPd] = useState("");
  const [nearAdd, setNearAdd] = useState("");

  // Autorefraction raw reading (S1/C1/A1)
  const [autoOdS1, setAutoOdS1] = useState("");
  const [autoOdC1, setAutoOdC1] = useState("");
  const [autoOdA1, setAutoOdA1] = useState("");
  const [autoOsS1, setAutoOsS1] = useState("");
  const [autoOsC1, setAutoOsC1] = useState("");
  const [autoOsA1, setAutoOsA1] = useState("");

  // After-refraction (post-cycloplegia)
  const [afterOdS, setAfterOdS] = useState("");
  const [afterOdC, setAfterOdC] = useState("");
  const [afterOdA, setAfterOdA] = useState("");
  const [afterOsS, setAfterOsS] = useState("");
  const [afterOsC, setAfterOsC] = useState("");
  const [afterOsA, setAfterOsA] = useState("");

  // Air puff IOP
  const [airPuffOD, setAirPuffOD] = useState("");
  const [airPuffOS, setAirPuffOS] = useState("");

  // Clinical records
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");

  // Medical history checklist
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryState>(
    EMPTY_MEDICAL_HISTORY,
  );

  // Test/rays request items
  const [testItems, setTestItems] = useState<
    { testId: string; result: string }[]
  >([]);

  // Prescription items
  const [rxItems, setRxItems] = useState<
    {
      medicationId: string;
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }[]
  >([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query patient info
  const { data: patient, isLoading: loadingPatient } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  // Query visits to link
  const { data: visits = [], isLoading: loadingVisits } = trpc.kf.listVisits.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const testsQuery = trpc.medical.getTests.useQuery();
  const medicationsQuery = trpc.medical.getMedications.useQuery();
  const testsCatalog: any[] = testsQuery.data ?? [];
  const medicationsCatalog: any[] = medicationsQuery.data ?? [];

  const createMutation = trpc.kf.createExamination.useMutation();
  const createTestRequestMutation = trpc.kf.createTestRequest.useMutation();
  const createPrescriptionMutation = trpc.kf.createPrescription.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!examDate) {
      newErrors.examDate = "تاريخ الفحص مطلوب";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kfPatientId) return;

    if (!validate()) {
      toast.error("يرجى مراجعة الحقول المطلوبة");
      return;
    }

    const rightRefraction = {
      ucva: ucvaOD.trim() || undefined,
      bcva: bcvaOD.trim() || undefined,
      iop: iopOD.trim() || undefined,
      sph: odSph.trim() || undefined,
      cyl: odCyl.trim() || undefined,
      axis: odAxis.trim() || undefined,
      add: nearAdd.trim() || undefined,
      s1: autoOdS1.trim() || undefined,
      c1: autoOdC1.trim() || undefined,
      a1: autoOdA1.trim() || undefined,
      afterS: afterOdS.trim() || undefined,
      afterC: afterOdC.trim() || undefined,
      afterA: afterOdA.trim() || undefined,
      airPuff1: airPuffOD.trim() || undefined,
    };

    const leftRefraction = {
      ucva: ucvaOS.trim() || undefined,
      bcva: bcvaOS.trim() || undefined,
      iop: iopOS.trim() || undefined,
      sph: osSph.trim() || undefined,
      cyl: osCyl.trim() || undefined,
      axis: osAxis.trim() || undefined,
      add: nearAdd.trim() || undefined,
      s1: autoOsS1.trim() || undefined,
      c1: autoOsC1.trim() || undefined,
      a1: autoOsA1.trim() || undefined,
      afterS: afterOsS.trim() || undefined,
      afterC: afterOsC.trim() || undefined,
      afterA: afterOsA.trim() || undefined,
      airPuff1: airPuffOS.trim() || undefined,
    };

    try {
      const resolvedKfVisitId = kfVisitId === "none" ? null : Number(kfVisitId);
      const { kfExamId } = await createMutation.mutateAsync({
        kfPatientId,
        kfVisitId: resolvedKfVisitId,
        examDate,
        rightVa: ucvaOD.trim() || null,
        leftVa: ucvaOS.trim() || null,
        rightRefraction,
        leftRefraction,
        iopRight: iopOD.trim() || null,
        iopLeft: iopOS.trim() || null,
        diagnosis: diagnosis.trim() || null,
        plan: plan.trim() || null,
        notes: notes.trim() || null,
        doctorName: doctorName.trim() || null,
        medicalHistory,
      });

      const validTestItems = testItems.filter((t) => t.testId);
      if (validTestItems.length > 0) {
        await createTestRequestMutation.mutateAsync({
          kfPatientId,
          kfVisitId: resolvedKfVisitId,
          kfExamId,
          requestDate: examDate,
          items: validTestItems.map((t) => ({
            testId: Number(t.testId),
            result: t.result.trim() || null,
          })),
        });
      }

      const validRxItems = rxItems.filter((r) => r.medicationName.trim());
      if (validRxItems.length > 0) {
        await createPrescriptionMutation.mutateAsync({
          kfPatientId,
          kfVisitId: resolvedKfVisitId,
          kfExamId,
          doctorName: doctorName.trim() || null,
          items: validRxItems.map((r) => ({
            medicationId: r.medicationId ? Number(r.medicationId) : null,
            medicationName: r.medicationName.trim(),
            dosage: r.dosage.trim() || null,
            frequency: r.frequency.trim() || null,
            duration: r.duration.trim() || null,
            instructions: r.instructions.trim() || null,
          })),
        });
      }

      toast.success("تم تسجيل الفحص الطبي بنجاح");
      setLocation(`/kf/patients/${kfPatientId}`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ الفحص");
    }
  };

  if (loadingPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">جاري تحميل بيانات المريض...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive font-semibold">المريض غير موجود.</p>
        <Button onClick={() => setLocation("/kf/patients")} className="mt-4">
          الرجوع لقائمة المرضى
        </Button>
      </div>
    );
  }

  const isSaving =
    createMutation.isPending ||
    createTestRequestMutation.isPending ||
    createPrescriptionMutation.isPending;

  return (
    <section dir="rtl" className="space-y-4 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/kf/patients/${kfPatientId}`)}
          className="gap-1 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
          <span>الرجوع لملف المريض ({patient.kfCode})</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">تسجيل فحص طبي جديد</h1>
        <p className="text-muted-foreground text-sm">
          إدخال حدة الإبصار ومقاسات النظر للمريض: <strong>{patient.fullName}</strong> ({patient.kfCode})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Info: Date, Doctor, Visit link */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base">معلومات الفحص الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="examDate" className="after:content-['*'] after:text-destructive after:mr-1">
                تاريخ الفحص
              </Label>
              <DateInput
                id="examDate"
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  if (errors.examDate) setErrors({});
                }}
                className={errors.examDate ? "border-destructive" : ""}
              />
              {errors.examDate && <p className="text-xs text-destructive">{errors.examDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctorName">اسم الطبيب الفاحص</Label>
              <Select value={doctorName} onValueChange={setDoctorName}>
                <SelectTrigger id="doctorName">
                  <SelectValue placeholder="اختر الطبيب..." />
                </SelectTrigger>
                <SelectContent>
                  {KF_DOCTORS.map((dr) => (
                    <SelectItem key={dr} value={dr}>{dr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kfVisitId">ربط بزيارة مجدولة</Label>
              <Select value={kfVisitId} onValueChange={setKfVisitId}>
                <SelectTrigger id="kfVisitId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">عدم الربط بزيارة (فحص مستقل)</SelectItem>
                  {visits.map((v: any) => (
                    <SelectItem key={v.kfVisitId} value={String(v.kfVisitId)}>
                      {new Date(v.visitDate).toLocaleDateString("ar-EG")} - {v.visitType === "consultation" ? "كشف" : "متابعة"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vision Acuity & IOP & Refraction Tables */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base">جدول حدة الإبصار والانكسار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-3 text-sm" dir="ltr">
              <div className="flex items-center gap-2">
                <Label className="shrink-0 font-medium">UCVA:</Label>
                <RefractionValueSelect
                  value={ucvaOD}
                  onChange={setUcvaOD}
                  options={UCVA_BCVA_OPTIONS}
                  triggerClassName="w-[9rem] shrink-0"
                />
                <span className="shrink-0 text-muted-foreground">/</span>
                <RefractionValueSelect
                  value={ucvaOS}
                  onChange={setUcvaOS}
                  options={UCVA_BCVA_OPTIONS}
                  triggerClassName="w-[9rem] shrink-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 font-medium">BCVA:</Label>
                <RefractionValueSelect
                  value={bcvaOD}
                  onChange={setBcvaOD}
                  options={UCVA_BCVA_OPTIONS}
                  triggerClassName="w-[9rem] shrink-0"
                />
                <span className="shrink-0 text-muted-foreground">/</span>
                <RefractionValueSelect
                  value={bcvaOS}
                  onChange={setBcvaOS}
                  options={UCVA_BCVA_OPTIONS}
                  triggerClassName="w-[9rem] shrink-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 font-medium">IOP:</Label>
                <RefractionValueSelect
                  value={iopOD}
                  onChange={setIopOD}
                  options={IOP_OPTIONS}
                  triggerClassName="w-[7rem] shrink-0"
                />
                <span className="shrink-0 text-muted-foreground">/</span>
                <RefractionValueSelect
                  value={iopOS}
                  onChange={setIopOS}
                  options={IOP_OPTIONS}
                  triggerClassName="w-[7rem] shrink-0"
                />
              </div>
            </div>

            {/* Autorefraction — mobile (stacked cards per eye, matches main app) */}
            <div className="sm:hidden space-y-3" dir="ltr">
              {(
                [
                  {
                    label: "Right (OD)",
                    ucva: ucvaOD,
                    setUcva: setUcvaOD,
                    bcva: bcvaOD,
                    setBcva: setBcvaOD,
                    s1: autoOdS1,
                    setS1: setAutoOdS1,
                    c1: autoOdC1,
                    setC1: setAutoOdC1,
                    a1: autoOdA1,
                    setA1: setAutoOdA1,
                    afterS: afterOdS,
                    setAfterS: setAfterOdS,
                    afterC: afterOdC,
                    setAfterC: setAfterOdC,
                    afterA: afterOdA,
                    setAfterA: setAfterOdA,
                    airPuff: airPuffOD,
                    setAirPuff: setAirPuffOD,
                    refS: odSph,
                    setRefS: setOdSph,
                    refC: odCyl,
                    setRefC: setOdCyl,
                    refA: odAxis,
                    setRefA: setOdAxis,
                  },
                  {
                    label: "Left (OS)",
                    ucva: ucvaOS,
                    setUcva: setUcvaOS,
                    bcva: bcvaOS,
                    setBcva: setBcvaOS,
                    s1: autoOsS1,
                    setS1: setAutoOsS1,
                    c1: autoOsC1,
                    setC1: setAutoOsC1,
                    a1: autoOsA1,
                    setA1: setAutoOsA1,
                    afterS: afterOsS,
                    setAfterS: setAfterOsS,
                    afterC: afterOsC,
                    setAfterC: setAfterOsC,
                    afterA: afterOsA,
                    setAfterA: setAfterOsA,
                    airPuff: airPuffOS,
                    setAirPuff: setAirPuffOS,
                    refS: osSph,
                    setRefS: setOsSph,
                    refC: osCyl,
                    setRefC: setOsCyl,
                    refA: osAxis,
                    setRefA: setOsAxis,
                  },
                ] as const
              ).map((eye) => (
                <Card key={eye.label} className="border">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm text-center">
                      {eye.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                      <Label className="text-xs">UCVA</Label>
                      <RefractionValueSelect
                        value={eye.ucva}
                        onChange={eye.setUcva}
                        options={UCVA_BCVA_OPTIONS}
                        triggerClassName="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                      <Label className="text-xs">BCVA</Label>
                      <RefractionValueSelect
                        value={eye.bcva}
                        onChange={eye.setBcva}
                        options={UCVA_BCVA_OPTIONS}
                        triggerClassName="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                      <Label className="text-xs">Autoref</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <RefractionValueSelect
                          value={eye.s1}
                          onChange={eye.setS1}
                          options={SPHERE_OPTIONS}
                          triggerClassName="h-8 text-sm"
                        />
                        <RefractionValueSelect
                          value={eye.c1}
                          onChange={eye.setC1}
                          options={CYLINDER_OPTIONS}
                          triggerClassName="h-8 text-sm"
                        />
                        <Input
                          value={eye.a1}
                          onChange={(e) => eye.setA1(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Axis"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                      <Label className="text-xs">After</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <RefractionValueSelect
                          value={eye.afterS}
                          onChange={eye.setAfterS}
                          options={SPHERE_OPTIONS}
                          triggerClassName="h-8 text-sm"
                        />
                        <RefractionValueSelect
                          value={eye.afterC}
                          onChange={eye.setAfterC}
                          options={CYLINDER_OPTIONS}
                          triggerClassName="h-8 text-sm"
                        />
                        <Input
                          value={eye.afterA}
                          onChange={(e) => eye.setAfterA(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Axis"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                      <Label className="text-xs">AirPuff</Label>
                      <RefractionValueSelect
                        value={eye.airPuff}
                        onChange={eye.setAirPuff}
                        options={AIR_PUFF_OPTIONS}
                        triggerClassName="h-8 text-sm"
                      />
                    </div>
                    <div className="pt-1 border-t">
                      <div className="text-xs font-semibold mb-1">Refraction</div>
                      <div className="grid grid-cols-[40px_1fr] gap-1 items-center">
                        <Label className="text-xs">S</Label>
                        <RefractionValueSelect
                          value={eye.refS}
                          onChange={eye.setRefS}
                          options={SPHERE_COMBOBOX_OPTIONS}
                          triggerClassName="h-8 text-sm"
                        />
                        <Label className="text-xs">C</Label>
                        <RefractionValueSelect
                          value={eye.refC}
                          onChange={eye.setRefC}
                          options={CYLINDER_COMBOBOX_OPTIONS}
                          triggerClassName="h-8 text-sm"
                        />
                        <Label className="text-xs">A</Label>
                        <Input
                          value={eye.refA}
                          onChange={(e) => eye.setRefA(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Axis"
                        />
                        {eye.label === "Right (OD)" ? (
                          <>
                            <Label className="text-xs">P.D</Label>
                            <Input
                              value={osPd}
                              onChange={(e) => setOsPd(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="PD"
                            />
                            <Label className="text-xs">Add</Label>
                            <Input
                              value={nearAdd}
                              onChange={(e) => setNearAdd(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="ADD"
                            />
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Autorefraction — desktop (side-by-side grid) */}
            <div className="hidden sm:block space-y-2 overflow-x-auto" dir="ltr">
              <div className="min-w-[640px] space-y-2">
                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 text-sm font-bold">
                  <div></div>
                  <div className="text-left pl-1">Right (OD)</div>
                  <div className="text-left pl-1">Left (OS)</div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">Autoref</div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={autoOdS1}
                      onChange={setAutoOdS1}
                      options={SPHERE_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <RefractionValueSelect
                      value={autoOdC1}
                      onChange={setAutoOdC1}
                      options={CYLINDER_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <Input
                      value={autoOdA1}
                      onChange={(e) => setAutoOdA1(e.target.value)}
                      className="h-8 w-20 text-sm text-center"
                      placeholder="Axis"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={autoOsS1}
                      onChange={setAutoOsS1}
                      options={SPHERE_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <RefractionValueSelect
                      value={autoOsC1}
                      onChange={setAutoOsC1}
                      options={CYLINDER_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <Input
                      value={autoOsA1}
                      onChange={(e) => setAutoOsA1(e.target.value)}
                      className="h-8 w-20 text-sm text-center"
                      placeholder="Axis"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">After</div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={afterOdS}
                      onChange={setAfterOdS}
                      options={SPHERE_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <RefractionValueSelect
                      value={afterOdC}
                      onChange={setAfterOdC}
                      options={CYLINDER_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <Input
                      value={afterOdA}
                      onChange={(e) => setAfterOdA(e.target.value)}
                      className="h-8 w-20 text-sm text-center"
                      placeholder="Axis"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <RefractionValueSelect
                      value={afterOsS}
                      onChange={setAfterOsS}
                      options={SPHERE_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <RefractionValueSelect
                      value={afterOsC}
                      onChange={setAfterOsC}
                      options={CYLINDER_OPTIONS}
                      triggerClassName="h-8 w-20 text-sm"
                    />
                    <Input
                      value={afterOsA}
                      onChange={(e) => setAfterOsA(e.target.value)}
                      className="h-8 w-20 text-sm text-center"
                      placeholder="Axis"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <div className="text-sm font-semibold">AirPuff</div>
                  <RefractionValueSelect
                    value={airPuffOD}
                    onChange={setAirPuffOD}
                    options={AIR_PUFF_OPTIONS}
                    triggerClassName="h-8 w-20 text-sm"
                  />
                  <RefractionValueSelect
                    value={airPuffOS}
                    onChange={setAirPuffOS}
                    options={AIR_PUFF_OPTIONS}
                    triggerClassName="h-8 w-20 text-sm"
                  />
                </div>
              </div>
            </div>

            <table
              className="hidden sm:table w-full table-fixed border-collapse text-left text-sm"
              dir="ltr"
            >
                <thead>
                  <tr className="bg-muted/70">
                    <th className="border px-3 py-3 w-32 text-left">Eye</th>
                    <th className="border px-3 py-3 text-left" colSpan={3}>
                      -OD
                    </th>
                    <th className="border px-3 py-3 text-left" colSpan={4}>
                      -OS
                    </th>
                  </tr>
                  <tr className="bg-muted/40">
                    <th className="border px-3 py-3 text-left">Distance</th>
                    <th className="border px-3 py-3 text-left">S</th>
                    <th className="border px-3 py-3 text-left">C</th>
                    <th className="border px-3 py-3 text-left">Axis</th>
                    <th className="border px-3 py-3 text-left">S</th>
                    <th className="border px-3 py-3 text-left">C</th>
                    <th className="border px-3 py-3 text-left">Axis</th>
                    <th className="border px-3 py-3 text-left">PD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-3 py-3 text-left font-medium">
                      Distance
                    </td>
                    <td className="border px-2 py-2">
                      <RefractionValueSelect
                        value={odSph}
                        onChange={setOdSph}
                        options={SPHERE_COMBOBOX_OPTIONS}
                        triggerClassName="w-full"
                      />
                    </td>
                    <td className="border px-2 py-2">
                      <RefractionValueSelect
                        value={odCyl}
                        onChange={setOdCyl}
                        options={CYLINDER_COMBOBOX_OPTIONS}
                        triggerClassName="w-full"
                      />
                    </td>
                    <td className="border px-2 py-2">
                      <Input
                        id="odAxis"
                        value={odAxis}
                        onChange={(e) => setOdAxis(e.target.value)}
                        placeholder="Axis"
                      />
                    </td>
                    <td className="border px-2 py-2">
                      <RefractionValueSelect
                        value={osSph}
                        onChange={setOsSph}
                        options={SPHERE_COMBOBOX_OPTIONS}
                        triggerClassName="w-full"
                      />
                    </td>
                    <td className="border px-2 py-2">
                      <RefractionValueSelect
                        value={osCyl}
                        onChange={setOsCyl}
                        options={CYLINDER_COMBOBOX_OPTIONS}
                        triggerClassName="w-full"
                      />
                    </td>
                    <td className="border px-2 py-2">
                      <Input
                        id="osAxis"
                        value={osAxis}
                        onChange={(e) => setOsAxis(e.target.value)}
                        placeholder="Axis"
                      />
                    </td>
                    <td className="border px-2 py-2">
                      <Input
                        value={osPd}
                        onChange={(e) => setOsPd(e.target.value)}
                        placeholder="PD"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border px-3 py-3 text-left font-medium">
                      Near
                    </td>
                    <td className="border px-2 py-2" colSpan={7}>
                      <Input
                        value={nearAdd}
                        onChange={(e) => setNearAdd(e.target.value)}
                        placeholder="ADD"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
          </CardContent>
        </Card>

        {/* Section 3: Diagnosis & Treatment Plan */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>التشخيص والقرار الطبي</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis">التشخيص (Diagnosis)</Label>
              <Textarea
                id="diagnosis"
                rows={3}
                placeholder="التشخيص الطبي لحالة العين والقرنية والشبكية..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">الخطة العلاجية والقرار (Treatment Plan / Decision)</Label>
              <Textarea
                id="plan"
                rows={3}
                placeholder="الخطة الطبية المقررة، النظارة الطبية، الأدوية، أو حجز عملية جراحية..."
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات الفحص العامة</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="أي تفاصيل أو ملاحظات سريرية أخرى..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Medical History Checklist */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base">التاريخ المرضي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" dir="rtl">
              {MEDICAL_HISTORY_QUESTIONS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 border-b pb-1"
                >
                  <span className="text-right flex-1">{label}</span>
                  <Checkbox
                    checked={medicalHistory[key]}
                    onCheckedChange={(checked) =>
                      setMedicalHistory((prev) => ({
                        ...prev,
                        [key]: Boolean(checked),
                      }))
                    }
                    className="border-2 border-gray-700"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Exam Images */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <span>صور الفحص</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kfPatientId ? (
              <KfExamImagesPanel kfPatientId={kfPatientId} />
            ) : null}
          </CardContent>
        </Card>

        {/* Section 6: Tests / Rays Request */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <span>طلب تحاليل / أشعة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testItems.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <Select
                  value={item.testId}
                  onValueChange={(v) =>
                    setTestItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, testId: v } : it)),
                    )
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="اختر التحليل / الأشعة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {testsCatalog.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="ملاحظات (اختياري)"
                  value={item.result}
                  onChange={(e) =>
                    setTestItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, result: e.target.value } : it,
                      ),
                    )
                  }
                  className="flex-1 min-w-40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setTestItems((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 cursor-pointer"
              onClick={() =>
                setTestItems((prev) => [...prev, { testId: "", result: "" }])
              }
            >
              <Plus className="h-4 w-4" />
              إضافة تحليل / أشعة
            </Button>
          </CardContent>
        </Card>

        {/* Section 7: Prescription */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="py-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              <span>روشتة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rxItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center border-b pb-3 last:border-b-0 last:pb-0"
              >
                <Select
                  value={item.medicationId}
                  onValueChange={(v) => {
                    const med = medicationsCatalog.find(
                      (m: any) => String(m.id) === v,
                    );
                    setRxItems((prev) =>
                      prev.map((it, i) =>
                        i === idx
                          ? {
                              ...it,
                              medicationId: v,
                              medicationName: med?.name ?? it.medicationName,
                            }
                          : it,
                      ),
                    );
                  }}
                >
                  <SelectTrigger className="sm:col-span-2">
                    <SelectValue placeholder="اختر دواء..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicationsCatalog.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="اسم الدواء (إن لم يوجد بالقائمة)"
                  value={item.medicationName}
                  onChange={(e) =>
                    setRxItems((prev) =>
                      prev.map((it, i) =>
                        i === idx
                          ? { ...it, medicationName: e.target.value }
                          : it,
                      ),
                    )
                  }
                  className="sm:col-span-2"
                />
                <Input
                  placeholder="الجرعة"
                  value={item.dosage}
                  onChange={(e) =>
                    setRxItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, dosage: e.target.value } : it,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="عدد المرات"
                  value={item.frequency}
                  onChange={(e) =>
                    setRxItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, frequency: e.target.value } : it,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="المدة"
                  value={item.duration}
                  onChange={(e) =>
                    setRxItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, duration: e.target.value } : it,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="تعليمات إضافية"
                  value={item.instructions}
                  onChange={(e) =>
                    setRxItems((prev) =>
                      prev.map((it, i) =>
                        i === idx
                          ? { ...it, instructions: e.target.value }
                          : it,
                      ),
                    )
                  }
                  className="sm:col-span-4"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setRxItems((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="sm:col-span-2 justify-self-start"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  حذف
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 cursor-pointer"
              onClick={() =>
                setRxItems((prev) => [
                  ...prev,
                  {
                    medicationId: "",
                    medicationName: "",
                    dosage: "",
                    frequency: "",
                    duration: "",
                    instructions: "",
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              إضافة دواء
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(`/kf/patients/${kfPatientId}`)}
            disabled={isSaving}
            className="cursor-pointer"
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isSaving} className="gap-2 cursor-pointer">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>حفظ الفحص الطبي</span>
          </Button>
        </div>
      </form>
    </section>
  );
}
