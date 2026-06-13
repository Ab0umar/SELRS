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
import { ChevronRight, Save, Loader2, ClipboardList } from "lucide-react";

export default function KfOperationForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId/operations/new");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Form State
  const [opDate, setOpDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [opType, setOpType] = useState("");
  const [eye, setEye] = useState<"right" | "left" | "both" | "">("");
  const [doctorName, setDoctorName] = useState("");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled">("scheduled");
  const [notes, setNotes] = useState("");
  const [kfVisitId, setKfVisitId] = useState<string>("none");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query patient info
  const { data: patient, isLoading: loadingPatient } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  // Query visits
  const { data: visits = [] } = trpc.kf.listVisits.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const createMutation = trpc.kf.createOperation.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!opDate) {
      newErrors.opDate = "تاريخ العملية مطلوب";
    }
    if (!opType.trim()) {
      newErrors.opType = "نوع العملية مطلوب";
    }
    if (!eye) {
      newErrors.eye = "يجب اختيار العين محل العملية";
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

    try {
      await createMutation.mutateAsync({
        kfPatientId,
        kfVisitId: kfVisitId === "none" ? null : Number(kfVisitId),
        opDate,
        opType: opType.trim(),
        eye: eye || null,
        doctorName: doctorName.trim() || null,
        status,
        notes: notes.trim() || null,
      });
      toast.success("تم حجز وجدولة العملية بنجاح");
      setLocation(`/kf/patients/${kfPatientId}`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ بيانات العملية");
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
    <section dir="rtl" className="space-y-4 max-w-2xl mx-auto">
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
        <h1 className="text-2xl font-bold tracking-tight">حجز وجدولة عملية جراحية</h1>
        <p className="text-muted-foreground text-sm">
          تسجيل موعد إجراء عملية للمريض: <strong>{patient.fullName}</strong> ({patient.kfCode})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">بيانات العملية الجراحية</CardTitle>
            <CardDescription>أدخل تفاصيل الإجراء الجراحي المقرر للعين وموعد التنفيذ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Op Date */}
              <div className="space-y-2">
                <Label htmlFor="opDate" className="after:content-['*'] after:text-destructive after:mr-1">
                  تاريخ العملية
                </Label>
                <Input
                  id="opDate"
                  type="date"
                  value={opDate}
                  onChange={(e) => {
                    setOpDate(e.target.value);
                    if (errors.opDate) setErrors({});
                  }}
                  className={errors.opDate ? "border-destructive" : ""}
                />
                {errors.opDate && <p className="text-xs text-destructive">{errors.opDate}</p>}
              </div>

              {/* Eye selection */}
              <div className="space-y-2">
                <Label htmlFor="eye" className="after:content-['*'] after:text-destructive after:mr-1">
                  العين المعنية
                </Label>
                <Select
                  value={eye}
                  onValueChange={(val: any) => {
                    setEye(val);
                    if (errors.eye) setErrors({});
                  }}
                >
                  <SelectTrigger id="eye" className={errors.eye ? "border-destructive" : ""}>
                    <SelectValue placeholder="اختر العين..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">العين اليمنى (OD)</SelectItem>
                    <SelectItem value="left">العين اليسرى (OS)</SelectItem>
                    <SelectItem value="both">العينين (OU)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.eye && <p className="text-xs text-destructive">{errors.eye}</p>}
              </div>

              {/* Op Type */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="opType" className="after:content-['*'] after:text-destructive after:mr-1">
                  نوع العملية الجراحية / الإجراء
                </Label>
                <Input
                  id="opType"
                  type="text"
                  placeholder="مثال: إزالة مياه بيضاء وزرع عدسة"
                  value={opType}
                  onChange={(e) => {
                    setOpType(e.target.value);
                    if (errors.opType) setErrors({});
                  }}
                  className={errors.opType ? "border-destructive" : ""}
                />
                {errors.opType && <p className="text-xs text-destructive">{errors.opType}</p>}
              </div>

              {/* Doctor Surgeon */}
              <div className="space-y-2">
                <Label htmlFor="doctorName">الطبيب الجراح</Label>
                <Input
                  id="doctorName"
                  type="text"
                  placeholder="اسم الطبيب القائم بالعملية"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
              </div>

              {/* Link to visit */}
              <div className="space-y-2">
                <Label htmlFor="kfVisitId">ربط بزيارة مجدولة</Label>
                <Select value={kfVisitId} onValueChange={setKfVisitId}>
                  <SelectTrigger id="kfVisitId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">عدم الربط بزيارة</SelectItem>
                    {visits.map((v: any) => (
                      <SelectItem key={v.kfVisitId} value={String(v.kfVisitId)}>
                        {new Date(v.visitDate).toLocaleDateString("ar-EG")} - {v.visitType === "operation" ? "زيارة عملية" : "كشف"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">حالة العملية</Label>
                <Select
                  value={status}
                  onValueChange={(val: any) => setStatus(val)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">مجدولة</SelectItem>
                    <SelectItem value="completed">اكتملت</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">ملاحظات التحضير والتجهيز</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="ملاحظات حول التحضير للعملية، قياسات العدسات، التوصيات الطبية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
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
            <span>جدولة وحفظ العملية</span>
          </Button>
        </div>
      </form>
    </section>
  );
}
