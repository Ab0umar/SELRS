import { useEffect, useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserRound,
  HeartPulse,
  Stethoscope,
  ClipboardCheck,
  Save,
  Loader2,
  Calendar,
  User,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowRight,
  Pill,
  FlaskConical,
  Sparkles,
  Printer,
  FileText
} from "lucide-react";
import KfPatientPicker, { type KfPatientOption } from "./KfPatientPicker";

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
const ADD_OPTIONS = [
  "---",
  ...Array.from({ length: 17 }, (_, i) => {
    const v = (0.5 + i * 0.25).toFixed(2);
    return "+" + v;
  }),
];

interface PrescriptionItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface TestItem {
  id: number;
  name: string;
  notes: string;
}

export default function KfWorkflow() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  const [selectedDate, setSelectedDate] = useState(localISODate);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [visitType, setVisitType] = useState<string>("consultation");

  // Load workflow data
  const { data: workflowData, isLoading, refetch } = trpc.kf.getPatientWorkflowData.useQuery(
    { kfPatientId: kfPatientId ?? 0, date: selectedDate },
    { enabled: !!kfPatientId }
  );

  // Queries for templates and catalog
  const allTestsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    enabled: !!kfPatientId
  });
  const presTemplatesQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "prescription" },
    { enabled: !!kfPatientId }
  );
  const testTemplatesQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "tests" },
    { enabled: !!kfPatientId }
  );

  // Reception State
  const [patientForm, setPatientForm] = useState({
    fullName: "",
    dateOfBirth: "",
    age: "",
    gender: "" as "male" | "female" | "",
    phone: "",
    occupation: "",
    medicalHistory: "",
    allergies: "",
    notes: "",
  });

  // Nursing State
  const [nursingForm, setNursingForm] = useState({
    ucvaOd: "",
    ucvaOs: "",
    iopOd: "",
    iopOs: "",
    arOdSph: "---",
    arOdCyl: "---",
    arOdAxis: "",
    arOsSph: "---",
    arOsCyl: "---",
    arOsAxis: "",
    afterOdSph: "---",
    afterOdCyl: "---",
    afterOdAxis: "",
    afterOsSph: "---",
    afterOsCyl: "---",
    afterOsAxis: "",
  });

  // Specialist State
  const [specialistForm, setSpecialistForm] = useState({
    bcvaOd: "",
    bcvaOs: "",
    odSph: "---",
    odCyl: "---",
    odAxis: "",
    osSph: "---",
    osCyl: "---",
    osAxis: "",
    add: "---",
    pd: "",
    diagnosis: "",
    plan: "",
  });

  // Consultant States: Prescription Items & Test Requests
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [newMed, setNewMed] = useState<PrescriptionItem>({
    medicationName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });

  const [selectedTests, setSelectedTests] = useState<TestItem[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [testRequestNotes, setTestRequestNotes] = useState("");

  // Images State
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const updatePatient = trpc.kf.updatePatient.useMutation();
  const createVisit = trpc.kf.createVisit.useMutation();
  const updateVisit = trpc.kf.updateVisit.useMutation();
  const createExam = trpc.kf.createExamination.useMutation();
  const updateExam = trpc.kf.updateExamination.useMutation();
  const uploadImage = trpc.kf.uploadExamImage.useMutation();
  const createPrescription = trpc.kf.createPrescription.useMutation();
  const createTestRequest = trpc.kf.createTestRequest.useMutation();

  const [saving, setSaving] = useState(false);
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [savingTests, setSavingTests] = useState(false);

  // Sync loaded data to forms
  useEffect(() => {
    if (workflowData) {
      const { patient, visit, examination, prescription, testRequest } = workflowData;
      setPatientForm({
        fullName: patient.fullName || "",
        dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).split("T")[0] : "",
        age: patient.age ? String(patient.age) : "",
        gender: patient.gender || "",
        phone: patient.phone || "",
        occupation: patient.occupation || "",
        medicalHistory: patient.medicalHistory || "",
        allergies: patient.allergies || "",
        notes: patient.notes || "",
      });

      if (visit) {
        setSelectedDoctor(visit.doctorName || "");
        setVisitType(visit.visitType || "consultation");
      }

      if (examination) {
        const rightRef = (examination.rightRefraction as any) || {};
        const leftRef = (examination.leftRefraction as any) || {};

        setNursingForm({
          ucvaOd: examination.rightVa || rightRef.ucva || "",
          ucvaOs: examination.leftVa || leftRef.ucva || "",
          iopOd: examination.iopRight || rightRef.iop || "",
          iopOs: examination.iopLeft || leftRef.iop || "",
          arOdSph: rightRef.sph || "---",
          arOdCyl: rightRef.cyl || "---",
          arOdAxis: rightRef.axis || "",
          arOsSph: leftRef.sph || "---",
          arOsCyl: leftRef.cyl || "---",
          arOsAxis: leftRef.axis || "",
          afterOdSph: rightRef.afterSph || "---",
          afterOdCyl: rightRef.afterCyl || "---",
          afterOdAxis: rightRef.afterAxis || "",
          afterOsSph: leftRef.afterSph || "---",
          afterOsCyl: leftRef.afterCyl || "---",
          afterOsAxis: leftRef.afterAxis || "",
        });

        setSpecialistForm({
          bcvaOd: rightRef.bcva || "",
          bcvaOs: leftRef.bcva || "",
          odSph: rightRef.finalSph || "---",
          odCyl: rightRef.finalCyl || "---",
          odAxis: rightRef.finalAxis || "",
          osSph: leftRef.finalSph || "---",
          osCyl: leftRef.finalCyl || "---",
          osAxis: leftRef.finalAxis || "",
          add: rightRef.add || "---",
          pd: rightRef.pd || "",
          diagnosis: examination.diagnosis || "",
          plan: examination.plan || "",
        });
      } else {
        setNursingForm({
          ucvaOd: "",
          ucvaOs: "",
          iopOd: "",
          iopOs: "",
          arOdSph: "---",
          arOdCyl: "---",
          arOdAxis: "",
          arOsSph: "---",
          arOsCyl: "---",
          arOsAxis: "",
          afterOdSph: "---",
          afterOdCyl: "---",
          afterOdAxis: "",
          afterOsSph: "---",
          afterOsCyl: "---",
          afterOsAxis: "",
        });
        setSpecialistForm({
          bcvaOd: "",
          bcvaOs: "",
          odSph: "---",
          odCyl: "---",
          odAxis: "",
          osSph: "---",
          osCyl: "---",
          osAxis: "",
          add: "---",
          pd: "",
          diagnosis: "",
          plan: "",
        });
      }

      // Sync existing Prescription items if loaded
      if (prescription) {
        setPrescriptionItems(
          (prescription.items || []).map((i: any) => ({
            medicationName: i.medicationName || "",
            dosage: i.dosage || "",
            frequency: i.frequency || "",
            duration: i.duration || "",
            instructions: i.instructions || "",
          }))
        );
        setPrescriptionNotes(prescription.notes || "");
      } else {
        setPrescriptionItems([]);
        setPrescriptionNotes("");
      }

      // Sync existing Test Requests if loaded
      if (testRequest) {
        setSelectedTests(
          (testRequest.items || []).map((i: any) => ({
            id: i.testId,
            name: i.testName || "",
            notes: i.result || "",
          }))
        );
        setTestRequestNotes(testRequest.notes || "");
      } else {
        setSelectedTests([]);
        setTestRequestNotes("");
      }
    }
  }, [workflowData]);

  const handlePatientSelect = (p: KfPatientOption) => {
    setLocation(`/kf/patients/${p.kfId}`);
  };

  const handleSaveReception = async () => {
    if (!kfPatientId) return;
    setSaving(true);
    try {
      await updatePatient.mutateAsync({
        kfId: kfPatientId,
        fullName: patientForm.fullName,
        dateOfBirth: patientForm.dateOfBirth || null,
        age: patientForm.age ? Number(patientForm.age) : null,
        gender: patientForm.gender || null,
        phone: patientForm.phone || null,
        occupation: patientForm.occupation || null,
        medicalHistory: patientForm.medicalHistory || null,
        allergies: patientForm.allergies || null,
        notes: patientForm.notes || null,
      });
      toast.success("تم حفظ بيانات الاستقبال بنجاح");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisitAndExam = async (section: "nursing" | "specialist") => {
    if (!kfPatientId) return;
    setSaving(true);
    try {
      let visitId = workflowData?.visit?.kfVisitId;
      if (!visitId) {
        const vRes = await createVisit.mutateAsync({
          kfPatientId,
          visitDate: selectedDate,
          visitType: visitType as any,
          doctorName: selectedDoctor || null,
          status: "in_progress",
        });
        visitId = (vRes as any).kfVisitId;
      } else {
        await updateVisit.mutateAsync({
          kfVisitId: visitId,
          visitType: visitType as any,
          doctorName: selectedDoctor || null,
        });
      }

      const rightRefraction = {
        sph: nursingForm.arOdSph,
        cyl: nursingForm.arOdCyl,
        axis: nursingForm.arOdAxis,
        ucva: nursingForm.ucvaOd,
        bcva: specialistForm.bcvaOd,
        iop: nursingForm.iopOd,
        afterSph: nursingForm.afterOdSph,
        afterCyl: nursingForm.afterOdCyl,
        afterAxis: nursingForm.afterOdAxis,
        finalSph: specialistForm.odSph,
        finalCyl: specialistForm.odCyl,
        finalAxis: specialistForm.odAxis,
        add: specialistForm.add,
        pd: specialistForm.pd,
      };

      const leftRefraction = {
        sph: nursingForm.arOsSph,
        cyl: nursingForm.arOsCyl,
        axis: nursingForm.arOsAxis,
        ucva: nursingForm.ucvaOs,
        bcva: specialistForm.bcvaOs,
        iop: nursingForm.iopOs,
        afterSph: nursingForm.afterOsSph,
        afterCyl: nursingForm.afterOsCyl,
        afterAxis: nursingForm.afterOsAxis,
        finalSph: specialistForm.osSph,
        finalCyl: specialistForm.osCyl,
        finalAxis: specialistForm.osAxis,
        add: specialistForm.add,
        pd: specialistForm.pd,
      };

      if (!workflowData?.examination) {
        await createExam.mutateAsync({
          kfPatientId,
          kfVisitId: visitId,
          examDate: selectedDate,
          doctorName: selectedDoctor || null,
          rightVa: nursingForm.ucvaOd || null,
          leftVa: nursingForm.ucvaOs || null,
          iopRight: nursingForm.iopOd || null,
          iopLeft: nursingForm.iopOs || null,
          rightRefraction,
          leftRefraction,
          diagnosis: specialistForm.diagnosis || null,
          plan: specialistForm.plan || null,
        });
      } else {
        await updateExam.mutateAsync({
          kfExamId: workflowData.examination.kfExamId,
          kfPatientId,
          kfVisitId: visitId,
          examDate: selectedDate,
          doctorName: selectedDoctor || null,
          rightVa: nursingForm.ucvaOd || null,
          leftVa: nursingForm.ucvaOs || null,
          iopRight: nursingForm.iopOd || null,
          iopLeft: nursingForm.iopOs || null,
          rightRefraction,
          leftRefraction,
          diagnosis: specialistForm.diagnosis || null,
          plan: specialistForm.plan || null,
        });
      }

      if (section === "specialist" && images.length > 0) {
        for (const img of images) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(img.file);
          });
          await uploadImage.mutateAsync({
            kfPatientId,
            fileName: img.file.name,
            mimeType: img.file.type,
            fileDataBase64: base64,
          });
        }
        setImages([]);
      }

      toast.success("تم الحفظ بنجاح");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // Prescription Handlers
  const handleAddMedication = () => {
    if (!newMed.medicationName.trim()) {
      toast.error("يرجى إدخال اسم الدواء");
      return;
    }
    setPrescriptionItems([...prescriptionItems, newMed]);
    setNewMed({ medicationName: "", dosage: "", frequency: "", duration: "", instructions: "" });
  };

  const handleRemoveMedication = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const handleApplyPresTemplate = (template: any) => {
    const rawItems = template?.prescriptionItems ?? template?.items ?? [];
    if (!Array.isArray(rawItems)) return;
    const formatted = rawItems.map((item: any) => ({
      medicationName: item.medicationName || "",
      dosage: item.dosage || "",
      frequency: item.frequency || "",
      duration: item.duration || "",
      instructions: item.instructions || "",
    }));
    setPrescriptionItems([...prescriptionItems, ...formatted]);
    toast.success(`تم تطبيق قالب: ${template.name || "روشتة جاهزة"}`);
  };

  const handleSavePrescription = async () => {
    if (!kfPatientId) return;
    if (prescriptionItems.length === 0) {
      toast.error("يرجى إضافة دواء واحد على الأقل قبل الحفظ");
      return;
    }
    setSavingPrescription(true);
    try {
      const visitId = workflowData?.visit?.kfVisitId || null;
      const examId = workflowData?.examination?.kfExamId || null;

      await createPrescription.mutateAsync({
        kfPatientId,
        kfVisitId: visitId,
        kfExamId: examId,
        doctorName: selectedDoctor || null,
        notes: prescriptionNotes || null,
        items: prescriptionItems,
      });

      toast.success("تم حفظ الروشتة الطبية بنجاح");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ الروشتة");
    } finally {
      setSavingPrescription(false);
    }
  };

  // Test Request Handlers
  const handleAddTest = (testIdRaw: string) => {
    const testId = Number(testIdRaw);
    if (!testId || isNaN(testId)) return;
    if (selectedTests.some((t) => t.id === testId)) {
      toast.error("هذا الفحص مضاف بالفعل");
      return;
    }
    const testInfo = allTestsQuery.data?.find((t: any) => t.id === testId);
    if (!testInfo) return;

    setSelectedTests([...selectedTests, { id: testId, name: testInfo.name || "", notes: "" }]);
  };

  const handleRemoveTest = (id: number) => {
    setSelectedTests(selectedTests.filter((t) => t.id !== id));
  };

  const handleApplyTestTemplate = (template: any) => {
    const rawItems = template?.testItems ?? template?.items ?? [];
    if (!Array.isArray(rawItems)) return;
    const formatted = rawItems
      .map((item: any) => {
        const testId = item.testId || item.id;
        const testInfo = allTestsQuery.data?.find((t: any) => t.id === testId);
        return {
          id: testId,
          name: testInfo?.name || item.testName || "",
          notes: item.notes || "",
        };
      })
      .filter((t) => t.id);

    setSelectedTests([...selectedTests, ...formatted]);
    toast.success(`تم تطبيق قالب: ${template.name || "فحوصات جاهزة"}`);
  };

  const handleSaveTestRequest = async () => {
    if (!kfPatientId) return;
    if (selectedTests.length === 0) {
      toast.error("يرجى اختيار فحص واحد على الأقل قبل الحفظ");
      return;
    }
    setSavingTests(true);
    try {
      const visitId = workflowData?.visit?.kfVisitId || null;
      const examId = workflowData?.examination?.kfExamId || null;

      await createTestRequest.mutateAsync({
        kfPatientId,
        kfVisitId: visitId,
        kfExamId: examId,
        requestDate: selectedDate,
        notes: testRequestNotes || null,
        items: selectedTests.map((t) => ({ testId: t.id, result: t.notes || null })),
      });

      toast.success("تم حفظ طلب الفحوصات بنجاح");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ الفحوصات");
    } finally {
      setSavingTests(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files).map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
      }));
      setImages((prev) => [...prev, ...arr]);
    }
  };

  const handlePrintRefraction = () => {
    window.print();
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 p-3 md:p-6" dir="rtl">
      {/* Print Overrides CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .refraction-print-only, .refraction-print-only * {
            visibility: visible;
          }
          .refraction-print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: ltr;
            text-align: left;
            padding: 20px;
          }
          .refraction-print-only table {
            direction: ltr;
          }
        }
      `}</style>

      {/* Printable Refraction prescription overlay */}
      <div className="hidden refraction-print-only max-w-2xl mx-auto border-2 border-double border-slate-400 p-8 rounded-3xl space-y-6" dir="ltr">
        <div className="text-center border-b-2 border-slate-900 pb-3" dir="rtl">
          <h2 className="text-xl font-bold text-slate-800">وحدة كفرالشيخ — مركز ساعدني لجراحة وتقويم الإبصار</h2>
          <p className="text-xs text-muted-foreground mt-1">كارت مقاس النظارة الطبي / Optical Refraction Card</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-semibold" dir="rtl">
          <div>الاسم: <span className="font-bold">{patientForm.fullName}</span></div>
          <div>التاريخ: <span className="font-bold">{selectedDate}</span></div>
          <div>السن: <span className="font-bold">{patientForm.age || "—"} سنة</span></div>
          <div>الطبيب المعالج: <span className="font-bold">{selectedDoctor || "—"}</span></div>
        </div>

        <table className="w-full text-center border border-slate-300 text-xs mt-4">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-slate-300">
              <th className="p-2 border-r border-slate-300">Eye</th>
              <th className="p-2 border-r border-slate-300">Sphere (SPH)</th>
              <th className="p-2 border-r border-slate-300">Cylinder (CYL)</th>
              <th className="p-2 border-r border-slate-300">Axis (AXIS)</th>
              <th className="p-2">BCVA</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="p-2 border-r border-slate-300 font-bold">OD (Right Eye)</td>
              <td className="p-2 border-r border-slate-300 font-mono font-bold">{specialistForm.odSph}</td>
              <td className="p-2 border-r border-slate-300 font-mono font-bold">{specialistForm.odCyl}</td>
              <td className="p-2 border-r border-slate-300 font-mono font-bold">{specialistForm.odAxis || "—"}</td>
              <td className="p-2 font-mono font-bold">{specialistForm.bcvaOd || "—"}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300 font-bold">OS (Left Eye)</td>
              <td className="p-2 border-r border-slate-300 font-mono font-bold">{specialistForm.osSph}</td>
              <td className="p-2 border-r border-slate-300 font-mono font-bold">{specialistForm.osCyl}</td>
              <td className="p-2 border-r border-slate-300 font-mono font-bold">{specialistForm.osAxis || "—"}</td>
              <td className="p-2 font-mono font-bold">{specialistForm.bcvaOs || "—"}</td>
            </tr>
            {specialistForm.add !== "---" && (
              <tr className="bg-slate-50 border-t border-slate-300">
                <td className="p-2 border-r border-slate-300 font-bold">Reading (+Add)</td>
                <td colSpan={4} className="p-2 text-left pl-6 font-bold">
                  Add: {specialistForm.add}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-between items-end pt-8 text-[10px] text-muted-foreground" dir="rtl">
          <div>العنوان: كفر الشيخ - أمام مستشفى الرمد</div>
          <div className="text-center font-bold text-xs text-slate-800">توقيع الطبيب: .............................</div>
        </div>
      </div>

      {/* Screen Layout Controls */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={() => setLocation("/kf/patients")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">سير العمل العيادي</h1>
            <p className="text-xs text-muted-foreground">ملف متكامل ومبسط لإجراءات المريض</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3">
          {/* Patient Selector */}
          <div className="w-full md:w-64">
            <KfPatientPicker
              initialKfPatientId={kfPatientId || undefined}
              onSelect={handlePatientSelect}
              placeholder="ابحث واختر المريض..."
            />
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 border border-border rounded-2xl px-3 py-1.5 bg-background h-11 w-full md:w-auto">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DateInput
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || localISODate())}
              className="border-0 bg-transparent p-0 text-xs w-full md:w-28 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Doctor Selector */}
          <div className="w-full md:w-44">
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="اختر الطبيب" />
              </SelectTrigger>
              <SelectContent>
                {KF_DOCTORS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visit Type */}
          <div className="w-full md:w-36">
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="نوع الزيارة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">كشف</SelectItem>
                <SelectItem value="examination">فحص</SelectItem>
                <SelectItem value="followup">متابعة</SelectItem>
                <SelectItem value="operation">عملية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!kfPatientId ? (
        <Card className="rounded-3xl border border-dashed border-border py-20 text-center print:hidden">
          <CardContent className="space-y-4">
            <div className="mx-auto rounded-full bg-muted p-4 w-16 h-16 flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">لم يتم اختيار مريض بعد</h2>
              <p className="text-sm text-muted-foreground">الرجاء اختيار مريض من قائمة البحث في الأعلى لبدء الفحص وسير العمل</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4 print:hidden">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <Tabs defaultValue="reception" dir="rtl" className="space-y-6 print:hidden">
          <TabsList className="flex w-full overflow-x-auto h-14 bg-muted rounded-2xl p-1 gap-1 whitespace-nowrap scrollbar-none md:grid md:grid-cols-5">
            <TabsTrigger value="reception" className="flex-1 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold px-2 min-w-[80px] shrink-0">
              <UserRound className="h-3.5 w-3.5" /> الاستقبال
            </TabsTrigger>
            <TabsTrigger value="nursing" className="flex-1 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold px-2 min-w-[80px] shrink-0">
              <HeartPulse className="h-3.5 w-3.5" /> التمريض
            </TabsTrigger>
            <TabsTrigger value="specialist" className="flex-1 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold px-2 min-w-[110px] shrink-0">
              <Stethoscope className="h-3.5 w-3.5" /> الأخصائي
            </TabsTrigger>
            <TabsTrigger value="consultant" className="flex-1 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold px-2 min-w-[80px] shrink-0">
              <ClipboardCheck className="h-3.5 w-3.5" /> الاستشاري
            </TabsTrigger>
            <TabsTrigger value="final-report" className="flex-1 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold px-2 min-w-[110px] shrink-0">
              <FileText className="h-3.5 w-3.5" /> الشيت النهائي
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: RECEPTION */}
          <TabsContent value="reception">
            <Card className="rounded-3xl shadow-sm border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold">بيانات المريض الأساسية</CardTitle>
                <CardDescription>البيانات الشخصية المسجلة وتاريخ المريض المرضي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم بالكامل</Label>
                    <Input
                      value={patientForm.fullName}
                      onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ الميلاد</Label>
                    <DateInput
                      value={patientForm.dateOfBirth}
                      onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value || "" })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السن</Label>
                    <Input
                      type="number"
                      value={patientForm.age}
                      onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنس</Label>
                    <Select
                      value={patientForm.gender}
                      onValueChange={(val: any) => setPatientForm({ ...patientForm, gender: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المهنة</Label>
                    <Input
                      value={patientForm.occupation}
                      onChange={(e) => setPatientForm({ ...patientForm, occupation: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>التاريخ المرضي العام</Label>
                    <Textarea
                      rows={3}
                      value={patientForm.medicalHistory}
                      onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الحساسية</Label>
                    <Textarea
                      rows={3}
                      value={patientForm.allergies}
                      onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات الاستقبال</Label>
                  <Textarea
                    rows={2}
                    value={patientForm.notes}
                    onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveReception}
                    disabled={saving}
                    className="h-11 w-full sm:w-auto px-6 rounded-2xl gap-2 font-bold"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ بيانات المريض
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: NURSING */}
          <TabsContent value="nursing" className="space-y-6">
            {/* UCVA & IOP Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-5 rounded-3xl border border-border shadow-sm">
              {/* UCVA */}
              <div className="space-y-2">
                <Label className="font-bold text-sm text-foreground">AUTOREF | IOP</Label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">UCVA</span>
                  <div className="flex items-center gap-2 flex-1" dir="ltr">
                    <Select value={nursingForm.ucvaOd} onValueChange={(val) => setNursingForm({ ...nursingForm, ucvaOd: val })}>
                      <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder="----" /></SelectTrigger>
                      <SelectContent className="max-h-48">{UCVA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-muted-foreground">/</span>
                    <Select value={nursingForm.ucvaOs} onValueChange={(val) => setNursingForm({ ...nursingForm, ucvaOs: val })}>
                      <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder="----" /></SelectTrigger>
                      <SelectContent className="max-h-48">{UCVA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* IOP */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">IOP</span>
                  <div className="flex items-center gap-2 flex-1" dir="ltr">
                    <Select value={nursingForm.iopOd} onValueChange={(val) => setNursingForm({ ...nursingForm, iopOd: val })}>
                      <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder="----" /></SelectTrigger>
                      <SelectContent className="max-h-48">{IOP_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-muted-foreground">/</span>
                    <Select value={nursingForm.iopOs} onValueChange={(val) => setNursingForm({ ...nursingForm, iopOs: val })}>
                      <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder="----" /></SelectTrigger>
                      <SelectContent className="max-h-48">{IOP_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Autoref Card container */}
            <Card className="rounded-3xl shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">قياس الكمبيوتر (Autoref)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Desktop Autoref Table */}
                <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-background" dir="ltr">
                  <table className="w-full text-center border-collapse text-sm">
                    <thead className="bg-muted">
                      <tr className="border-b border-border">
                        <th className="p-2 border-r border-border font-bold text-slate-700" rowSpan={2}>Type</th>
                        <th colSpan={3} className="p-2 border-r border-border font-bold text-amber-800">OD (Right Eye)</th>
                        <th colSpan={3} className="p-2 font-bold text-blue-800">OS (Left Eye)</th>
                      </tr>
                      <tr className="border-b border-border text-[11px] text-muted-foreground bg-muted/30">
                        <th className="p-1.5 border-r border-border">S (Sph)</th>
                        <th className="p-1.5 border-r border-border">C (Cyl)</th>
                        <th className="p-1.5 border-r border-border">Ax</th>
                        <th className="p-1.5 border-r border-border">S (Sph)</th>
                        <th className="p-1.5 border-r border-border">C (Cyl)</th>
                        <th className="p-1.5">Ax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-3 font-bold border-r border-border bg-muted/5">Autoref</td>
                        {/* OD */}
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.arOdSph} onValueChange={(val) => setNursingForm({ ...nursingForm, arOdSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.arOdCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, arOdCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Input type="number" placeholder="Axis" value={nursingForm.arOdAxis} onChange={(e) => setNursingForm({ ...nursingForm, arOdAxis: e.target.value })} className="h-9 rounded-lg" />
                        </td>
                        {/* OS */}
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.arOsSph} onValueChange={(val) => setNursingForm({ ...nursingForm, arOsSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.arOsCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, arOsCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5">
                          <Input type="number" placeholder="Axis" value={nursingForm.arOsAxis} onChange={(e) => setNursingForm({ ...nursingForm, arOsAxis: e.target.value })} className="h-9 rounded-lg" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards Autoref (As requested in screenshot layout) */}
                <div className="block md:hidden space-y-4" dir="ltr">
                  {/* OD Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-primary/5 text-primary text-[11px] font-bold px-3 py-1.5 border-b border-border/50 text-left">
                      OD (Right)
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">S</span>
                          <Select value={nursingForm.arOdSph} onValueChange={(val) => setNursingForm({ ...nursingForm, arOdSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">C</span>
                          <Select value={nursingForm.arOdCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, arOdCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <Input type="number" placeholder="Axis" value={nursingForm.arOdAxis} onChange={(e) => setNursingForm({ ...nursingForm, arOdAxis: e.target.value })} className="h-9 rounded-lg text-center" />
                        <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">Axis</span>
                      </div>
                    </div>
                  </div>

                  {/* OS Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-primary/5 text-primary text-[11px] font-bold px-3 py-1.5 border-b border-border/50 text-left">
                      OS (Left)
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">S</span>
                          <Select value={nursingForm.arOsSph} onValueChange={(val) => setNursingForm({ ...nursingForm, arOsSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">C</span>
                          <Select value={nursingForm.arOsCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, arOsCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <Input type="number" placeholder="Axis" value={nursingForm.arOsAxis} onChange={(e) => setNursingForm({ ...nursingForm, arOsAxis: e.target.value })} className="h-9 rounded-lg text-center" />
                        <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">Axis</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* After Card container */}
            <Card className="rounded-3xl shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">قياس النظارة الحالية (After Refraction)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Desktop Table View */}
                <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-background" dir="ltr">
                  <table className="w-full text-center border-collapse text-sm">
                    <thead className="bg-muted">
                      <tr className="border-b border-border">
                        <th className="p-2 border-r border-border font-bold text-slate-700" rowSpan={2}>Type</th>
                        <th colSpan={3} className="p-2 border-r border-border font-bold text-amber-800">OD (Right Eye)</th>
                        <th colSpan={3} className="p-2 font-bold text-blue-800">OS (Left Eye)</th>
                      </tr>
                      <tr className="border-b border-border text-[11px] text-muted-foreground bg-muted/30">
                        <th className="p-1.5 border-r border-border">S (Sph)</th>
                        <th className="p-1.5 border-r border-border">C (Cyl)</th>
                        <th className="p-1.5 border-r border-border">Ax</th>
                        <th className="p-1.5 border-r border-border">S (Sph)</th>
                        <th className="p-1.5 border-r border-border">C (Cyl)</th>
                        <th className="p-1.5">Ax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-3 font-bold border-r border-border bg-muted/5">After</td>
                        {/* OD */}
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.afterOdSph} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOdSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.afterOdCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOdCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Input type="number" placeholder="Axis" value={nursingForm.afterOdAxis} onChange={(e) => setNursingForm({ ...nursingForm, afterOdAxis: e.target.value })} className="h-9 rounded-lg" />
                        </td>
                        {/* OS */}
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.afterOsSph} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOsSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Select value={nursingForm.afterOsCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOsCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5">
                          <Input type="number" placeholder="Axis" value={nursingForm.afterOsAxis} onChange={(e) => setNursingForm({ ...nursingForm, afterOsAxis: e.target.value })} className="h-9 rounded-lg" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards After (As requested in screenshot layout) */}
                <div className="block md:hidden space-y-4" dir="ltr">
                  {/* OD Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-primary/5 text-primary text-[11px] font-bold px-3 py-1.5 border-b border-border/50 text-left">
                      OD (Right)
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">S</span>
                          <Select value={nursingForm.afterOdSph} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOdSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">C</span>
                          <Select value={nursingForm.afterOdCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOdCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <Input type="number" placeholder="Axis" value={nursingForm.afterOdAxis} onChange={(e) => setNursingForm({ ...nursingForm, afterOdAxis: e.target.value })} className="h-9 rounded-lg text-center" />
                        <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">Axis</span>
                      </div>
                    </div>
                  </div>

                  {/* OS Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-primary/5 text-primary text-[11px] font-bold px-3 py-1.5 border-b border-border/50 text-left">
                      OS (Left)
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">S</span>
                          <Select value={nursingForm.afterOsSph} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOsSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">C</span>
                          <Select value={nursingForm.afterOsCyl} onValueChange={(val) => setNursingForm({ ...nursingForm, afterOsCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <Input type="number" placeholder="Axis" value={nursingForm.afterOsAxis} onChange={(e) => setNursingForm({ ...nursingForm, afterOsAxis: e.target.value })} className="h-9 rounded-lg text-center" />
                        <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">Axis</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSaveVisitAndExam("nursing")}
                disabled={saving}
                className="h-11 w-full sm:w-auto px-6 rounded-2xl gap-2 font-bold"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ قياسات التمريض
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: SPECIALIST */}
          <TabsContent value="specialist" className="space-y-6">
            {/* BCVA & PD Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-5 rounded-3xl border border-border shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-sm text-foreground">REFRACTION | BCVA & PD</Label>
                  <Button
                    variant="outline"
                    onClick={handlePrintRefraction}
                    className="rounded-xl h-8 border-primary text-primary hover:bg-primary/5 gap-2 text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5" /> طباعة كارت مقاس النظر
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">BCVA</span>
                    <div className="flex items-center gap-2 flex-1" dir="ltr">
                      <Select value={specialistForm.bcvaOd} onValueChange={(val) => setSpecialistForm({ ...specialistForm, bcvaOd: val })}>
                        <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder="----" /></SelectTrigger>
                        <SelectContent className="max-h-48">{UCVA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      <span className="text-muted-foreground">/</span>
                      <Select value={specialistForm.bcvaOs} onValueChange={(val) => setSpecialistForm({ ...specialistForm, bcvaOs: val })}>
                        <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder="----" /></SelectTrigger>
                        <SelectContent className="max-h-48">{UCVA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-44">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">PD</span>
                    <Input
                      placeholder="PD"
                      value={specialistForm.pd}
                      onChange={(e) => setSpecialistForm({ ...specialistForm, pd: e.target.value })}
                      className="h-9 rounded-xl text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Final Refraction Card */}
            <Card className="rounded-3xl shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">جدول المقاس النهائي للنظارة (Refraction)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Desktop Table View */}
                <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-background" dir="ltr">
                  <table className="w-full text-center border-collapse text-sm">
                    <thead className="bg-muted">
                      <tr className="border-b border-border">
                        <th className="p-2 border-r border-border font-bold text-slate-700" rowSpan={2}>Type</th>
                        <th colSpan={3} className="p-2 border-r border-border font-bold text-amber-800">OD (Right Eye)</th>
                        <th colSpan={3} className="p-2 font-bold text-blue-800">OS (Left Eye)</th>
                      </tr>
                      <tr className="border-b border-border text-[11px] text-muted-foreground bg-muted/30">
                        <th className="p-1.5 border-r border-border">S (Sph)</th>
                        <th className="p-1.5 border-r border-border">C (Cyl)</th>
                        <th className="p-1.5 border-r border-border">Ax</th>
                        <th className="p-1.5 border-r border-border">S (Sph)</th>
                        <th className="p-1.5 border-r border-border">C (Cyl)</th>
                        <th className="p-1.5">Ax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Distance */}
                      <tr className="border-b border-border">
                        <td className="p-3 font-bold border-r border-border bg-muted/5">Distance</td>
                        {/* OD */}
                        <td className="p-1.5 border-r border-border">
                          <Select value={specialistForm.odSph} onValueChange={(val) => setSpecialistForm({ ...specialistForm, odSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Select value={specialistForm.odCyl} onValueChange={(val) => setSpecialistForm({ ...specialistForm, odCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Input type="number" placeholder="Axis" value={specialistForm.odAxis} onChange={(e) => setSpecialistForm({ ...specialistForm, odAxis: e.target.value })} className="h-9 rounded-lg" />
                        </td>
                        {/* OS */}
                        <td className="p-1.5 border-r border-border">
                          <Select value={specialistForm.osSph} onValueChange={(val) => setSpecialistForm({ ...specialistForm, osSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 border-r border-border">
                          <Select value={specialistForm.osCyl} onValueChange={(val) => setSpecialistForm({ ...specialistForm, osCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5">
                          <Input type="number" placeholder="Axis" value={specialistForm.osAxis} onChange={(e) => setSpecialistForm({ ...specialistForm, osAxis: e.target.value })} className="h-9 rounded-lg" />
                        </td>
                      </tr>
                      {/* Reading */}
                      <tr className="border-b border-border bg-muted/10">
                        <td className="p-3 font-bold border-r border-border bg-muted/5">Reading</td>
                        <td colSpan={6} className="p-2 text-right">
                          <div className="flex items-center gap-3 justify-end px-4">
                            <Label className="text-xs font-bold text-foreground">إضافة القراءة (+Add):</Label>
                            <div className="w-40">
                              <Select value={specialistForm.add} onValueChange={(val) => setSpecialistForm({ ...specialistForm, add: val })}>
                                <SelectTrigger className="h-9 rounded-lg bg-background">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48">
                                  {ADD_OPTIONS.map((o) => (
                                    <SelectItem key={o} value={o}>
                                      {o}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View Refraction (As requested in screenshot layout) */}
                <div className="block md:hidden space-y-4" dir="ltr">
                  {/* OD Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-primary/5 text-primary text-[11px] font-bold px-3 py-1.5 border-b border-border/50 text-left">
                      OD (Right)
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">S</span>
                          <Select value={specialistForm.odSph} onValueChange={(val) => setSpecialistForm({ ...specialistForm, odSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">C</span>
                          <Select value={specialistForm.odCyl} onValueChange={(val) => setSpecialistForm({ ...specialistForm, odCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <Input type="number" placeholder="Axis" value={specialistForm.odAxis} onChange={(e) => setSpecialistForm({ ...specialistForm, odAxis: e.target.value })} className="h-9 rounded-lg text-center" />
                        <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">Axis</span>
                      </div>
                    </div>
                  </div>

                  {/* OS Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-primary/5 text-primary text-[11px] font-bold px-3 py-1.5 border-b border-border/50 text-left">
                      OS (Left)
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">S</span>
                          <Select value={specialistForm.osSph} onValueChange={(val) => setSpecialistForm({ ...specialistForm, osSph: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{SPH_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">C</span>
                          <Select value={specialistForm.osCyl} onValueChange={(val) => setSpecialistForm({ ...specialistForm, osCyl: val })}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent className="max-h-48">{CYL_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <Input type="number" placeholder="Axis" value={specialistForm.osAxis} onChange={(e) => setSpecialistForm({ ...specialistForm, osAxis: e.target.value })} className="h-9 rounded-lg text-center" />
                        <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">Axis</span>
                      </div>
                    </div>
                  </div>

                  {/* Reading / Add + Card */}
                  <div className="bg-[#f8fafc] border border-border/80 rounded-2xl p-3.5 flex items-center justify-between gap-4">
                    <span className="font-bold text-xs text-muted-foreground">Reading / Add +</span>
                    <div className="w-32">
                      <Select value={specialistForm.add} onValueChange={(val) => setSpecialistForm({ ...specialistForm, add: val })}>
                        <SelectTrigger className="h-9 rounded-xl bg-background">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {ADD_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis & Recommendations Section */}
            <div className="space-y-6">
              <div className="space-y-2 bg-card p-5 rounded-3xl border border-border shadow-sm">
                <Label className="font-bold text-sm text-[#2563eb]">Diagnosis:</Label>
                <Textarea
                  rows={3}
                  value={specialistForm.diagnosis}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, diagnosis: e.target.value })}
                  placeholder="...اكتب الشكوى يدوياً أو ابحث من الأعراض بالأسفل"
                  className="rounded-xl mt-1 text-right"
                />
              </div>

              <div className="space-y-2 bg-card p-5 rounded-3xl border border-border shadow-sm">
                <Label className="font-bold text-sm text-[#2563eb]">Recommendations:</Label>
                <Textarea
                  rows={3}
                  value={specialistForm.plan}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, plan: e.target.value })}
                  placeholder="...اكتب التوصيات هنا"
                  className="rounded-xl mt-1 text-right"
                />
              </div>

              {/* Upload Exam Images */}
              <div className="space-y-4 bg-card p-5 rounded-3xl border border-border shadow-sm">
                <h3 className="text-sm font-bold text-foreground">صور التشخيص</h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="outline" className="h-14 px-4 rounded-xl flex items-center gap-2 border border-border/80 hover:bg-muted/30" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">معرض الصور / كاميرا</span>
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />

                  {images.map((img, i) => (
                    <div key={i} className="relative h-14 w-14 rounded-xl overflow-hidden border border-border group">
                      <img src={img.preview} className="h-full w-full object-cover" />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                {images.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">لا توجد صور مرفقة بعد</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => handleSaveVisitAndExam("specialist")}
                disabled={saving}
                className="h-11 w-full sm:w-auto px-6 rounded-2xl gap-2 font-bold"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ بيانات الأخصائي
              </Button>
            </div>
          </TabsContent>

          {/* TAB 4: CONSULTANT */}
          <TabsContent value="consultant" className="space-y-6">
            {/* Review Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-2">
                <h4 className="text-sm font-bold text-primary">التشخيص الحالي (Diagnosis):</h4>
                <p className="text-sm text-foreground">
                  {specialistForm.diagnosis || "لم يتم تسجيل تشخيص بواسطة الأخصائي بعد."}
                </p>
              </div>

              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-2">
                <h4 className="text-sm font-bold text-amber-800">الخطة العلاجية الحالية (Plan):</h4>
                <p className="text-sm text-foreground">
                  {specialistForm.plan || "لم يتم تسجيل خطة علاجية بواسطة الأخصائي بعد."}
                </p>
              </div>
            </div>

            {/* INLINE PRESCRIPTION MANAGER */}
            <Card className="rounded-3xl shadow-sm border border-border">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" /> الروشتة الطبية (Prescription)
                  </CardTitle>
                  <CardDescription>إدخال الأدوية والجرعات أو استخدام القوالب الجاهزة</CardDescription>
                </div>
                {/* Prescription Templates Selection */}
                {presTemplatesQuery.data && Object.keys(presTemplatesQuery.data).length > 0 && (
                  <Select onValueChange={(templateId) => {
                    const template = (presTemplatesQuery.data as any)[templateId];
                    if (template) handleApplyPresTemplate(template);
                  }}>
                    <SelectTrigger className="w-56 h-10 rounded-xl bg-primary/5 text-primary border-primary/20">
                      <Sparkles className="h-4 w-4 ml-2" />
                      <SelectValue placeholder="اختر من القوالب الجاهزة" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(presTemplatesQuery.data as Record<string, any>).map(([id, t]) => (
                        <SelectItem key={id} value={id}>
                          {t.name || id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Added Prescription Items Table */}
                {prescriptionItems.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden bg-background">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3">اسم الدواء</th>
                          <th className="p-3">الجرعة</th>
                          <th className="p-3">التكرار</th>
                          <th className="p-3">المدة</th>
                          <th className="p-3">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptionItems.map((item, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="p-3 font-semibold">{item.medicationName}</td>
                            <td className="p-3">{item.dosage || "—"}</td>
                            <td className="p-3">{item.frequency || "—"}</td>
                            <td className="p-3">{item.duration || "—"}</td>
                            <td className="p-3">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveMedication(idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-xl bg-muted/10">
                    لا توجد أدوية مضافة للروشتة حالياً
                  </div>
                )}

                {/* Add Medication Inline Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-muted/20 p-4 rounded-2xl border border-border">
                  <div className="space-y-1">
                    <Label className="text-xs">اسم الدواء</Label>
                    <Input
                      placeholder="اسم الدواء..."
                      value={newMed.medicationName}
                      onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الجرعة (Dosage)</Label>
                    <Input
                      placeholder="مثال: قرص، ملعقة..."
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">التكرار (Frequency)</Label>
                    <Input
                      placeholder="مثال: 3 مرات يومياً..."
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">المدة (Duration)</Label>
                    <Input
                      placeholder="مثال: 5 أيام..."
                      value={newMed.duration}
                      onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1 flex items-end">
                    <Button onClick={handleAddMedication} className="w-full h-10 rounded-xl gap-2 font-bold bg-primary">
                      <Plus className="h-4 w-4" /> إضافة للروشتة
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>ملاحظات عامة على الروشتة</Label>
                  <Textarea
                    rows={2}
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    placeholder="تعليمات إضافية للمريض..."
                    className="rounded-xl"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSavePrescription}
                    disabled={savingPrescription}
                    className="h-11 w-full sm:w-auto px-6 rounded-2xl gap-2 font-bold bg-primary text-primary-foreground"
                  >
                    {savingPrescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الروشتة المكتوبة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* INLINE TEST REQUESTS MANAGER */}
            <Card className="rounded-3xl shadow-sm border border-border">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-primary" /> طلب الفحوصات والتحاليل
                  </CardTitle>
                  <CardDescription>تحديد الفحوصات المطلوبة للمريض أو استخدام القوالب الجاهزة</CardDescription>
                </div>
                {/* Test Templates Selection */}
                {testTemplatesQuery.data && Object.keys(testTemplatesQuery.data).length > 0 && (
                  <Select onValueChange={(templateId) => {
                    const template = (testTemplatesQuery.data as any)[templateId];
                    if (template) handleApplyTestTemplate(template);
                  }}>
                    <SelectTrigger className="w-56 h-10 rounded-xl bg-primary/5 text-primary border-primary/20">
                      <Sparkles className="h-4 w-4 ml-2" />
                      <SelectValue placeholder="اختر من القوالب الجاهزة" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(testTemplatesQuery.data as Record<string, any>).map(([id, t]) => (
                        <SelectItem key={id} value={id}>
                          {t.name || id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Test Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-4 rounded-2xl border border-border">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">اختر الفحص من القائمة للتحميل</Label>
                    <Select onValueChange={handleAddTest}>
                      <SelectTrigger className="h-10 rounded-xl bg-background border border-border">
                        <SelectValue placeholder="بحث واختيار فحص..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {allTestsQuery.data?.map((test: any) => (
                          <SelectItem key={test.id} value={String(test.id)}>
                            {test.name} ({test.category || "فحص"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* List of Selected Tests */}
                {selectedTests.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="font-bold text-sm">الفحوصات المطلوبة حالياً:</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedTests.map((test, index) => (
                        <div key={test.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-background border border-border rounded-xl">
                          <div className="flex-1">
                            <span className="font-bold text-sm text-foreground">{index + 1}. {test.name}</span>
                          </div>
                          <div className="w-full sm:w-80">
                            <Input
                              placeholder="ملاحظات أو توجيهات لهذا الفحص..."
                              value={test.notes}
                              onChange={(e) => {
                                const next = [...selectedTests];
                                next[index].notes = e.target.value;
                                setSelectedTests(next);
                              }}
                              className="h-9 rounded-lg text-xs"
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleRemoveTest(test.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-xl bg-muted/10">
                    لم يتم اختيار أي فحوصات بعد
                  </div>
                )}

                <div className="space-y-2">
                  <Label>توجيهات عامة لطلب الفحص</Label>
                  <Textarea
                    rows={2}
                    value={testRequestNotes}
                    onChange={(e) => setTestRequestNotes(e.target.value)}
                    placeholder="مثال: يرجى إحضار النتائج للاستشارة القادمة..."
                    className="rounded-xl"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveTestRequest}
                    disabled={savingTests}
                    className="h-11 w-full sm:w-auto px-6 rounded-2xl gap-2 font-bold bg-primary text-primary-foreground"
                  >
                    {savingTests ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الفحوصات الطبية
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Approval / Complete Action */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                onClick={() => handleSaveVisitAndExam("specialist")}
                disabled={saving}
                className="h-12 w-full sm:w-auto px-8 rounded-2xl gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-base"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-5 w-5" />} اعتماد ومزامنة الملف كاملاً
              </Button>
            </div>
          </TabsContent>

          {/* TAB 5: FINAL REPORT (الشيت النهائي) */}
          <TabsContent value="final-report" className="space-y-6">
            <Card className="rounded-3xl shadow-md border border-border p-6 space-y-8 bg-white max-w-2xl mx-auto">
              {/* Header */}
              <div className="flex flex-col items-center border-b border-slate-200 pb-5 text-center">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Selrs Eye Center</span>
                <h2 className="text-xl font-extrabold text-slate-800 mt-1">FINAL MEDICAL REPORT</h2>
                <span className="text-xs text-primary font-semibold mt-1">Digital Visit Summary</span>

                <div className="flex gap-3 mt-4">
                  <Button onClick={() => handleSaveVisitAndExam("specialist")} disabled={saving} className="h-9 px-4 rounded-xl gap-2 text-xs font-bold bg-[#1e3a8a] text-white">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />} حفظ التقرير
                  </Button>
                  <Button variant="outline" onClick={handlePrintReport} className="h-9 px-4 rounded-xl gap-2 text-xs font-bold border-slate-200 hover:bg-slate-50">
                    <Printer className="h-3.5 w-3.5" /> Print Report
                  </Button>
                </div>
              </div>

              {/* Report Information */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Report Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>Patient Name: <span className="font-bold text-slate-900">{patientForm.fullName}</span></div>
                  <div>Date of Birth: <span className="font-mono text-slate-900">{patientForm.dateOfBirth || "—"}</span></div>
                  <div>Age: <span className="font-bold text-slate-900">{patientForm.age || "—"}</span></div>
                  <div>Occupation: <span className="font-bold text-slate-900">{patientForm.occupation || "—"}</span></div>
                </div>
              </div>

              {/* History & Complaints */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">History & Complaints</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <div>Medical History: <span className="font-semibold text-slate-900">{patientForm.medicalHistory || "—"}</span></div>
                  <div>Previous Operations: <span className="font-semibold text-slate-900">—</span></div>
                  <div>Allergies: <span className="font-semibold text-slate-900">{patientForm.allergies || "—"}</span></div>
                  <div>Complaint: <span className="font-semibold text-slate-900">{specialistForm.diagnosis || "—"}</span></div>
                </div>
              </div>

              {/* Measurements Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Measurements</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200">Eye</th>
                        <th className="p-2.5 border-r border-slate-200">OD (Right)</th>
                        <th className="p-2.5">OS (Left)</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">UCVA</td>
                        <td className="p-2 border-r border-slate-200 font-mono">{nursingForm.ucvaOd || "—"}</td>
                        <td className="p-2 font-mono">{nursingForm.ucvaOs || "—"}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">BCVA</td>
                        <td className="p-2 border-r border-slate-200 font-mono">{specialistForm.bcvaOd || "—"}</td>
                        <td className="p-2 font-mono">{specialistForm.bcvaOs || "—"}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">IOP</td>
                        <td className="p-2 border-r border-slate-200 font-mono">{nursingForm.iopOd || "—"}</td>
                        <td className="p-2 font-mono">{nursingForm.iopOs || "—"}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">Autoref (S/C/A)</td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {nursingForm.arOdSph} / {nursingForm.arOdCyl} / {nursingForm.arOdAxis || "0"}
                        </td>
                        <td className="p-2 font-mono">
                          {nursingForm.arOsSph} / {nursingForm.arOsCyl} / {nursingForm.arOsAxis || "0"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">Final Refraction</td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {specialistForm.odSph} / {specialistForm.odCyl} / {specialistForm.odAxis || "0"}
                        </td>
                        <td className="p-2 font-mono">
                          {specialistForm.osSph} / {specialistForm.osCyl} / {specialistForm.osAxis || "0"}
                        </td>
                      </tr>
                      {specialistForm.add !== "---" && (
                        <tr className="border-b border-slate-200">
                          <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">Reading Addition (+Add)</td>
                          <td colSpan={2} className="p-2 font-bold text-primary font-mono">{specialistForm.add}</td>
                        </tr>
                      )}
                      {specialistForm.pd && (
                        <tr>
                          <td className="p-2 border-r border-slate-200 font-semibold bg-slate-50/50">PD</td>
                          <td colSpan={2} className="p-2 font-bold font-mono">{specialistForm.pd} mm</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Treatment Plans / Prescription review */}
              {prescriptionItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Prescribed Treatment</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Medication Name</th>
                          <th className="p-2.5">Dosage</th>
                          <th className="p-2.5">Frequency</th>
                          <th className="p-2.5">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptionItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-200 text-slate-800 last:border-b-0">
                            <td className="p-2.5 font-bold">{item.medicationName}</td>
                            <td className="p-2.5">{item.dosage || "—"}</td>
                            <td className="p-2.5">{item.frequency || "—"}</td>
                            <td className="p-2.5">{item.duration || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
