import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type QuickPatientEntryFormProps = {
  /** من مسار `/quick-entry/:id` */
  initialPatientId?: number;
  /** إخفاء عنوان الصفحة الكبير (داخل نافذة منبثقة) */
  embedded?: boolean;
};

export function QuickPatientEntryForm({ initialPatientId = 0, embedded = false }: QuickPatientEntryFormProps) {
  const [patientId, setPatientId] = useState(initialPatientId);

  useEffect(() => {
    if (initialPatientId > 0) setPatientId(initialPatientId);
  }, [initialPatientId]);

  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId),
    refetchOnWindowFocus: false,
  });

  const [visitDate, setVisitDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (patientQuery.data?.lastVisit) {
      const examDate = new Date(patientQuery.data.lastVisit);
      const examDateStr = `${examDate.getFullYear()}-${String(examDate.getMonth() + 1).padStart(2, "0")}-${String(examDate.getDate()).padStart(2, "0")}`;
      setVisitDate(examDateStr);
    } else {
      const today = new Date();
      setVisitDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
      );
    }
  }, [patientQuery.data]);

  const [ucvaOD, setUcvaOD] = useState("");
  const [ucvaOS, setUcvaOS] = useState("");
  const [bcvaOD, setBcvaOD] = useState("");
  const [bcvaOS, setBcvaOS] = useState("");
  const [sphereOD, setSphereOD] = useState("");
  const [sphereOS, setSphereOS] = useState("");
  const [cylinderOD, setCylinderOD] = useState("");
  const [cylinderOS, setCylinderOS] = useState("");
  const [axisOD, setAxisOD] = useState("");
  const [axisOS, setAxisOS] = useState("");
  const [iopOD, setIopOD] = useState("");
  const [iopOS, setIopOS] = useState("");
  const [airPuffOD, setAirPuffOD] = useState("");
  const [airPuffOS, setAirPuffOS] = useState("");
  const [prescription, setPrescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const createExamMutation = trpc.medical.saveExaminationForm.useMutation();

  const handleSave = async () => {
    if (!patientId) {
      toast.error("اختر مريض أولاً");
      return;
    }

    try {
      await createExamMutation.mutateAsync({
        patientId,
        visitDate,
        visitType: "examination",
        data: {
          ucvaOD,
          ucvaOS,
          bcvaOD,
          bcvaOS,
          sphereOD: sphereOD ? parseFloat(sphereOD) : null,
          sphereOS: sphereOS ? parseFloat(sphereOS) : null,
          cylinderOD: cylinderOD ? parseFloat(cylinderOD) : null,
          cylinderOS: cylinderOS ? parseFloat(cylinderOS) : null,
          axisOD: axisOD ? parseFloat(axisOD) : null,
          axisOS: axisOS ? parseFloat(axisOS) : null,
          iopOD: iopOD ? parseFloat(iopOD) : null,
          iopOS: iopOS ? parseFloat(iopOS) : null,
          airPuffOD: airPuffOD ? parseFloat(airPuffOD) : null,
          airPuffOS: airPuffOS ? parseFloat(airPuffOS) : null,
          diagnosis: diagnosis || undefined,
          prescription: prescription || undefined,
        },
      });

      toast.success("تم حفظ الفحص");
      setUcvaOD("");
      setUcvaOS("");
      setBcvaOD("");
      setBcvaOS("");
      setSphereOD("");
      setSphereOS("");
      setCylinderOD("");
      setCylinderOS("");
      setAxisOD("");
      setAxisOS("");
      setIopOD("");
      setIopOS("");
      setAirPuffOD("");
      setAirPuffOS("");
      setPrescription("");
      setDiagnosis("");
    } catch {
      toast.error("خطأ في حفظ الفحص");
    }
  };

  return (
    <div className={embedded ? "space-y-4" : "max-w-4xl mx-auto space-y-6"}>
      {!embedded ? (
        <div>
          <h1 className="text-3xl font-bold">الفحص السريع</h1>
          <p className="text-muted-foreground">إدخال سريع لبيانات فحص العين</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>اختر المريض والتاريخ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>المريض</Label>
            <PatientPicker onSelect={(patient) => setPatientId(patient.id)} />
          </div>
          <div>
            <Label>تاريخ الزيارة</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="text-right" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="border border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">العين اليمنى (OD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>UCVA</Label>
              <Input value={ucvaOD} onChange={(e) => setUcvaOD(e.target.value)} placeholder="6/6" />
            </div>
            <div>
              <Label>BCVA</Label>
              <Input value={bcvaOD} onChange={(e) => setBcvaOD(e.target.value)} placeholder="6/6" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>S</Label>
                <Input value={sphereOD} onChange={(e) => setSphereOD(e.target.value)} />
              </div>
              <div>
                <Label>C</Label>
                <Input value={cylinderOD} onChange={(e) => setCylinderOD(e.target.value)} />
              </div>
              <div>
                <Label>Axis</Label>
                <Input value={axisOD} onChange={(e) => setAxisOD(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>IOP</Label>
                <Input value={iopOD} onChange={(e) => setIopOD(e.target.value)} />
              </div>
              <div>
                <Label>Air Puff</Label>
                <Input value={airPuffOD} onChange={(e) => setAirPuffOD(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-success/40 bg-success/5">
          <CardHeader>
            <CardTitle className="text-success">العين اليسرى (OS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>UCVA</Label>
              <Input value={ucvaOS} onChange={(e) => setUcvaOS(e.target.value)} placeholder="6/6" />
            </div>
            <div>
              <Label>BCVA</Label>
              <Input value={bcvaOS} onChange={(e) => setBcvaOS(e.target.value)} placeholder="6/6" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>S</Label>
                <Input value={sphereOS} onChange={(e) => setSphereOS(e.target.value)} />
              </div>
              <div>
                <Label>C</Label>
                <Input value={cylinderOS} onChange={(e) => setCylinderOS(e.target.value)} />
              </div>
              <div>
                <Label>Axis</Label>
                <Input value={axisOS} onChange={(e) => setAxisOS(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>IOP</Label>
                <Input value={iopOS} onChange={(e) => setIopOS(e.target.value)} />
              </div>
              <div>
                <Label>Air Puff</Label>
                <Input value={airPuffOS} onChange={(e) => setAirPuffOS(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الروشتة والتشخيص</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>الروشتة</Label>
            <Input value={prescription} onChange={(e) => setPrescription(e.target.value)} placeholder="الروشتة" />
          </div>
          <div>
            <Label>التشخيص</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="التشخيص" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={createExamMutation.isPending} className="w-full h-10 text-lg" size="lg">
        {createExamMutation.isPending ? "جاري الحفظ..." : "حفظ الفحص"}
      </Button>
    </div>
  );
}
