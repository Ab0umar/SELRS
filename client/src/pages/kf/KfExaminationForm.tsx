import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, Save, Loader2, Eye, Activity } from "lucide-react";

export default function KfExaminationForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId/examinations/new");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Form State
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [kfVisitId, setKfVisitId] = useState<string>("none");
  const [doctorName, setDoctorName] = useState("");

  // Visual Acuity
  const [rightVa, setRightVa] = useState("");
  const [leftVa, setLeftVa] = useState("");

  // IOP
  const [iopRight, setIopRight] = useState("");
  const [iopLeft, setIopLeft] = useState("");

  // Refraction OD (Right Eye)
  const [odSph, setOdSph] = useState("");
  const [odCyl, setOdCyl] = useState("");
  const [odAxis, setOdAxis] = useState("");

  // Refraction OS (Left Eye)
  const [osSph, setOsSph] = useState("");
  const [osCyl, setOsCyl] = useState("");
  const [osAxis, setOsAxis] = useState("");

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
      sph: odSph.trim() || undefined,
      cyl: odCyl.trim() || undefined,
      axis: odAxis.trim() || undefined,
    };

    const leftRefraction = {
      sph: osSph.trim() || undefined,
      cyl: osCyl.trim() || undefined,
      axis: osAxis.trim() || undefined,
    };

    try {
      await createMutation.mutateAsync({
        kfPatientId,
        kfVisitId: kfVisitId === "none" ? null : Number(kfVisitId),
        examDate,
        rightVa: rightVa.trim() || null,
        leftVa: leftVa.trim() || null,
        rightRefraction,
        leftRefraction,
        iopRight: iopRight.trim() || null,
        iopLeft: iopLeft.trim() || null,
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
              <Input
                id="examDate"
                type="date"
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
              <Input
                id="doctorName"
                type="text"
                placeholder="اسم الطبيب"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
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

        {/* Vision Acuity & IOP & Refraction Panel (Ophthalmic side-by-side template) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Right Eye (OD) - Standard ophthalmic layout puts Right Eye on right side of sheet (from doctor perspective, but here we place it logically for reader) */}
          <Card className="border-sky-500/10">
            <CardHeader className="bg-sky-500/5 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-sky-800 dark:text-sky-300">العين اليمنى (Oculus Dexter - OD)</CardTitle>
              <Eye className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* VA & IOP */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="rightVa">حدة الإبصار (VA)</Label>
                  <Input
                    id="rightVa"
                    type="text"
                    placeholder="مثال: 6/12"
                    value={rightVa}
                    onChange={(e) => setRightVa(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="iopRight">ضغط العين (IOP)</Label>
                  <Input
                    id="iopRight"
                    type="text"
                    placeholder="مثال: 15 mmHg"
                    value={iopRight}
                    onChange={(e) => setIopRight(e.target.value)}
                  />
                </div>
              </div>

              {/* Refraction details */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-xs font-bold text-muted-foreground block">قياس الانكسار (Refraction)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="odSph" className="text-xs">Sph (Sphere)</Label>
                    <Input
                      id="odSph"
                      type="text"
                      placeholder="+1.25"
                      value={odSph}
                      onChange={(e) => setOdSph(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="odCyl" className="text-xs">Cyl (Cylinder)</Label>
                    <Input
                      id="odCyl"
                      type="text"
                      placeholder="-0.75"
                      value={odCyl}
                      onChange={(e) => setOdCyl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="odAxis" className="text-xs">Axis (المحور)</Label>
                    <Input
                      id="odAxis"
                      type="text"
                      placeholder="90"
                      value={odAxis}
                      onChange={(e) => setOdAxis(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Left Eye (OS) */}
          <Card className="border-teal-500/10">
            <CardHeader className="bg-teal-500/5 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-teal-800 dark:text-teal-300">العين اليسرى (Oculus Sinister - OS)</CardTitle>
              <Eye className="h-4 w-4 text-teal-500" />
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* VA & IOP */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="leftVa">حدة الإبصار (VA)</Label>
                  <Input
                    id="leftVa"
                    type="text"
                    placeholder="مثال: 6/6"
                    value={leftVa}
                    onChange={(e) => setLeftVa(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="iopLeft">ضغط العين (IOP)</Label>
                  <Input
                    id="iopLeft"
                    type="text"
                    placeholder="مثال: 14 mmHg"
                    value={iopLeft}
                    onChange={(e) => setIopLeft(e.target.value)}
                  />
                </div>
              </div>

              {/* Refraction details */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-xs font-bold text-muted-foreground block">قياس الانكسار (Refraction)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="osSph" className="text-xs">Sph (Sphere)</Label>
                    <Input
                      id="osSph"
                      type="text"
                      placeholder="0.00"
                      value={osSph}
                      onChange={(e) => setOsSph(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="osCyl" className="text-xs">Cyl (Cylinder)</Label>
                    <Input
                      id="osCyl"
                      type="text"
                      placeholder="-0.25"
                      value={osCyl}
                      onChange={(e) => setOsCyl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="osAxis" className="text-xs">Axis (المحور)</Label>
                    <Input
                      id="osAxis"
                      type="text"
                      placeholder="180"
                      value={osAxis}
                      onChange={(e) => setOsAxis(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
