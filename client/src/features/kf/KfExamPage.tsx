import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { localISODate } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ChevronRight, Save, History, User, Phone } from "lucide-react";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;

const UCVA_OPTIONS = ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "3/60", "2/60", "1/60", "HM", "PL", "NLP"];
const IOP_OPTS = Array.from({ length: 30 }, (_, i) => String(i + 1));
const SPH_OPTS = [
  "---",
  ...Array.from({ length: 241 }, (_, i) => {
    const v = (-30 + i * 0.25).toFixed(2);
    return (Number(v) >= 0 ? "+" : "") + v;
  }),
];
const CYL_OPTS = [
  "---",
  ...Array.from({ length: 97 }, (_, i) => {
    const v = (-12 + i * 0.25).toFixed(2);
    return (Number(v) >= 0 ? "+" : "") + v;
  }),
];

function EyeSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder ?? "—"} />
      </SelectTrigger>
      <SelectContent className="max-h-48">
        {options.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-bold text-primary">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function KfExamPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Visit fields
  const [visitDate, setVisitDate] = useState(localISODate);
  const [doctorName, setDoctorName] = useState("");
  const [visitType, setVisitType] = useState("consultation");

  // Auto-refraction
  const [arOdSph, setArOdSph] = useState("---");
  const [arOdCyl, setArOdCyl] = useState("---");
  const [arOdAxis, setArOdAxis] = useState("");
  const [arOsSph, setArOsSph] = useState("---");
  const [arOsCyl, setArOsCyl] = useState("---");
  const [arOsAxis, setArOsAxis] = useState("");

  // VA + IOP
  const [ucvaOd, setUcvaOd] = useState("");
  const [ucvaOs, setUcvaOs] = useState("");
  const [bcvaOd, setBcvaOd] = useState("");
  const [bcvaOs, setBcvaOs] = useState("");
  const [iopOd, setIopOd] = useState("");
  const [iopOs, setIopOs] = useState("");

  // Refraction (final)
  const [odSph, setOdSph] = useState("---");
  const [odCyl, setOdCyl] = useState("---");
  const [odAxis, setOdAxis] = useState("");
  const [osSph, setOsSph] = useState("---");
  const [osCyl, setOsCyl] = useState("---");
  const [osAxis, setOsAxis] = useState("");

  // Diagnosis + Plan
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");

  const [saving, setSaving] = useState(false);

  const { data: patient, isLoading } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const utils = trpc.useUtils();
  const createVisit = trpc.kf.createVisit.useMutation();
  const createExam = trpc.kf.createExamination.useMutation();

  const handleSave = async () => {
    if (!kfPatientId || !visitDate) { toast.error("التاريخ مطلوب"); return; }
    setSaving(true);
    try {
      const visit = await createVisit.mutateAsync({
        kfPatientId,
        visitDate,
        visitType: visitType as any,
        doctorName: doctorName || null,
        status: "completed",
        notes: null,
      });

      const rightRefraction = { sph: arOdSph, cyl: arOdCyl, axis: arOdAxis, ucva: ucvaOd, bcva: bcvaOd, iop: iopOd };
      const leftRefraction  = { sph: arOsSph, cyl: arOsCyl, axis: arOsAxis, ucva: ucvaOs, bcva: bcvaOs, iop: iopOs };
      const rightFinal = { sph: odSph, cyl: odCyl, axis: odAxis };
      const leftFinal  = { sph: osSph, cyl: osCyl, axis: osAxis };

      await createExam.mutateAsync({
        kfPatientId,
        kfVisitId: (visit as any).kfVisitId ?? null,
        examDate: visitDate,
        doctorName: doctorName || null,
        rightVa: ucvaOd || null,
        leftVa: ucvaOs || null,
        iopRight: iopOd || null,
        iopLeft: iopOs || null,
        rightRefraction: { ...rightRefraction, ...rightFinal },
        leftRefraction:  { ...leftRefraction,  ...leftFinal  },
        diagnosis: diagnosis || null,
        plan: plan || null,
        notes: null,
      });

      utils.kf.listVisits.invalidate();
      utils.kf.listExaminations.invalidate();
      toast.success("تم حفظ الكشف بنجاح");

      // Reset exam fields for next patient
      setArOdSph("---"); setArOdCyl("---"); setArOdAxis("");
      setArOsSph("---"); setArOsCyl("---"); setArOsAxis("");
      setUcvaOd(""); setUcvaOs(""); setBcvaOd(""); setBcvaOs("");
      setIopOd(""); setIopOs("");
      setOdSph("---"); setOdCyl("---"); setOdAxis("");
      setOsSph("---"); setOsCyl("---"); setOsAxis("");
      setDiagnosis(""); setPlan("");
      setVisitDate(localISODate());
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-40 w-full" /></div>;
  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-destructive font-semibold">المريض غير موجود</p>
      <Button onClick={() => setLocation("/kf/patients")} className="mt-4">الرجوع للقائمة</Button>
    </div>
  );

  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setLocation("/kf/patients")}>
          <ChevronRight className="h-4 w-4" />
          <span>المرضى</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setLocation(`/kf/patients/${kfPatientId}/history`)}>
          <History className="h-4 w-4" />
          <span>السجل السابق</span>
        </Button>
      </div>

      {/* Patient card */}
      <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-base">{patient.fullName}</div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="font-mono text-primary font-bold">{patient.kfCode}</span>
            {patient.age && <span>{patient.age} سنة</span>}
            {patient.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{patient.phone}</span>}
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">التاريخ</Label>
            <DateInput value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="h-8 text-xs w-32" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الطبيب</Label>
            <Select value={doctorName} onValueChange={setDoctorName}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {KF_DOCTORS.map((dr) => <SelectItem key={dr} value={dr} className="text-xs">{dr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">نوع الزيارة</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation" className="text-xs">كشف استشاري</SelectItem>
                <SelectItem value="examination" className="text-xs">كشف أخصائي</SelectItem>
                <SelectItem value="followup" className="text-xs">متابعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Auto-Refraction */}
      <div className="rounded-lg border p-4">
        <SectionTitle>Auto-Refraction</SectionTitle>
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-xs items-center">
          <div />
          <div className="text-center font-semibold text-muted-foreground">Sph</div>
          <div className="text-center font-semibold text-muted-foreground">Cyl</div>
          <div className="text-center font-semibold text-muted-foreground">Axis</div>

          <div className="font-bold text-sm text-primary">OD</div>
          <EyeSelect value={arOdSph} onChange={setArOdSph} options={SPH_OPTS} />
          <EyeSelect value={arOdCyl} onChange={setArOdCyl} options={CYL_OPTS} />
          <Input className="h-8 text-xs" placeholder="0-180" value={arOdAxis} onChange={(e) => setArOdAxis(e.target.value)} />

          <div className="font-bold text-sm text-primary">OS</div>
          <EyeSelect value={arOsSph} onChange={setArOsSph} options={SPH_OPTS} />
          <EyeSelect value={arOsCyl} onChange={setArOsCyl} options={CYL_OPTS} />
          <Input className="h-8 text-xs" placeholder="0-180" value={arOsAxis} onChange={(e) => setArOsAxis(e.target.value)} />
        </div>
      </div>

      {/* VA + IOP */}
      <div className="rounded-lg border p-4">
        <SectionTitle>VA / IOP</SectionTitle>
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 text-xs items-center">
          <div />
          <div className="text-center font-semibold text-muted-foreground">UCVA</div>
          <div className="text-center font-semibold text-muted-foreground">BCVA</div>
          <div className="text-center font-semibold text-muted-foreground">IOP</div>
          <div />

          <div className="font-bold text-sm text-primary">OD</div>
          <EyeSelect value={ucvaOd} onChange={setUcvaOd} options={UCVA_OPTIONS} />
          <EyeSelect value={bcvaOd} onChange={setBcvaOd} options={UCVA_OPTIONS} />
          <EyeSelect value={iopOd} onChange={setIopOd} options={IOP_OPTS} />
          <div />

          <div className="font-bold text-sm text-primary">OS</div>
          <EyeSelect value={ucvaOs} onChange={setUcvaOs} options={UCVA_OPTIONS} />
          <EyeSelect value={bcvaOs} onChange={setBcvaOs} options={UCVA_OPTIONS} />
          <EyeSelect value={iopOs} onChange={setIopOs} options={IOP_OPTS} />
          <div />
        </div>
      </div>

      {/* Refraction */}
      <div className="rounded-lg border p-4">
        <SectionTitle>Refraction</SectionTitle>
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-xs items-center">
          <div />
          <div className="text-center font-semibold text-muted-foreground">Sph</div>
          <div className="text-center font-semibold text-muted-foreground">Cyl</div>
          <div className="text-center font-semibold text-muted-foreground">Axis</div>

          <div className="font-bold text-sm text-primary">OD</div>
          <EyeSelect value={odSph} onChange={setOdSph} options={SPH_OPTS} />
          <EyeSelect value={odCyl} onChange={setOdCyl} options={CYL_OPTS} />
          <Input className="h-8 text-xs" placeholder="0-180" value={odAxis} onChange={(e) => setOdAxis(e.target.value)} />

          <div className="font-bold text-sm text-primary">OS</div>
          <EyeSelect value={osSph} onChange={setOsSph} options={SPH_OPTS} />
          <EyeSelect value={osCyl} onChange={setOsCyl} options={CYL_OPTS} />
          <Input className="h-8 text-xs" placeholder="0-180" value={osAxis} onChange={(e) => setOsAxis(e.target.value)} />
        </div>
      </div>

      {/* Diagnosis + Plan */}
      <div className="rounded-lg border p-4 space-y-3">
        <SectionTitle>التشخيص والعلاج</SectionTitle>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">التشخيص</Label>
          <Textarea rows={2} placeholder="أدخل التشخيص..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">العلاج / الروشتة</Label>
          <Textarea rows={3} placeholder="أدخل العلاج والتوصيات..." value={plan} onChange={(e) => setPlan(e.target.value)} />
        </div>
      </div>

      {/* Save */}
      <Button size="lg" className="w-full gap-2" disabled={saving} onClick={handleSave}>
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        <span>حفظ الكشف</span>
      </Button>
    </div>
  );
}
