import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, Save, Loader2, Activity } from "lucide-react";
import {
  CYLINDER_COMBOBOX_OPTIONS,
  IOP_OPTIONS,
  SPHERE_COMBOBOX_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { DateInput } from "@/components/ui/date-input";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;

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
  const [odSph, setOdSph] = useState("--");
  const [odCyl, setOdCyl] = useState("--");
  const [odAxis, setOdAxis] = useState("");

  // Refraction OS (Left Eye)
  const [osSph, setOsSph] = useState("--");
  const [osCyl, setOsCyl] = useState("--");
  const [osAxis, setOsAxis] = useState("");
  const [osPd, setOsPd] = useState("");
  const [nearAdd, setNearAdd] = useState("");

  // Clinical records
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");

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

  const createMutation = trpc.kf.createExamination.useMutation();

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
    };

    const leftRefraction = {
      ucva: ucvaOS.trim() || undefined,
      bcva: bcvaOS.trim() || undefined,
      iop: iopOS.trim() || undefined,
      sph: osSph.trim() || undefined,
      cyl: osCyl.trim() || undefined,
      axis: osAxis.trim() || undefined,
      add: nearAdd.trim() || undefined,
    };

    try {
      await createMutation.mutateAsync({
        kfPatientId,
        kfVisitId: kfVisitId === "none" ? null : Number(kfVisitId),
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
      });
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

  const isSaving = createMutation.isPending;

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
        <Card>
          <CardHeader className="py-4">
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
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">جدول حدة الإبصار والانكسار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm" dir="ltr">
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

            <table
              className="w-full table-fixed border-collapse text-center text-sm"
              dir="ltr"
            >
                <thead>
                  <tr className="bg-muted/70">
                    <th className="border px-3 py-3 w-32 text-left">Eye</th>
                    <th className="border px-3 py-3" colSpan={3}>
                      -OD
                    </th>
                    <th className="border px-3 py-3" colSpan={4}>
                      -OS
                    </th>
                  </tr>
                  <tr className="bg-muted/40">
                    <th className="border px-3 py-3 text-left">Distance</th>
                    <th className="border px-3 py-3">S</th>
                    <th className="border px-3 py-3">C</th>
                    <th className="border px-3 py-3">Axis</th>
                    <th className="border px-3 py-3">S</th>
                    <th className="border px-3 py-3">C</th>
                    <th className="border px-3 py-3">Axis</th>
                    <th className="border px-3 py-3">PD</th>
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
        <Card>
          <CardHeader className="py-4">
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
