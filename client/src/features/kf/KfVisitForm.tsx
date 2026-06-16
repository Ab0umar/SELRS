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
import { ChevronRight, Save, Loader2, Calendar } from "lucide-react";
import { localISODate } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

const KF_DOCTORS = ["د. محمد السعدني", "د. سعيد مجدي"] as const;

export default function KfVisitForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId/visits/new");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Form State
  const [visitDate, setVisitDate] = useState(() => localISODate());
  const [visitType, setVisitType] = useState<"consultation" | "examination" | "followup" | "operation">("consultation");
  const [doctorName, setDoctorName] = useState("");
  const [status, setStatus] = useState<"scheduled" | "arrived" | "in_progress" | "completed" | "cancelled">("scheduled");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query patient info
  const { data: patient, isLoading: loadingPatient } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const createMutation = trpc.kf.createVisit.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!visitDate) {
      newErrors.visitDate = "تاريخ الزيارة مطلوب";
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
        visitDate,
        visitType,
        doctorName: doctorName.trim() || null,
        status,
        notes: notes.trim() || null,
      });
      toast.success("تم تسجيل الزيارة بنجاح");
      setLocation(`/kf/patients/${kfPatientId}`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ الزيارة");
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
        <h1 className="text-2xl font-bold tracking-tight">إضافة زيارة جديدة</h1>
        <p className="text-muted-foreground text-sm">
          حجز موعد كشف أو متابعة للمريض: <strong>{patient.fullName}</strong> ({patient.kfCode})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الموعد والزيارة</CardTitle>
            <CardDescription>أدخل بيانات الحجز ونوع الخدمة الطبية المطلوبة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="visitDate" className="after:content-['*'] after:text-destructive after:mr-1">
                  تاريخ الزيارة
                </Label>
                <DateInput
                  id="visitDate"
                  value={visitDate}
                  onChange={(e) => {
                    setVisitDate(e.target.value);
                    if (errors.visitDate) setErrors({});
                  }}
                  className={errors.visitDate ? "border-destructive" : ""}
                />
                {errors.visitDate && <p className="text-xs text-destructive">{errors.visitDate}</p>}
              </div>

              {/* Visit Type */}
              <div className="space-y-2">
                <Label htmlFor="visitType">نوع الزيارة</Label>
                <Select
                  value={visitType}
                  onValueChange={(val: any) => setVisitType(val)}
                >
                  <SelectTrigger id="visitType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">كشف استشاري</SelectItem>
                    <SelectItem value="examination">كشف أخصائي</SelectItem>
                    <SelectItem value="followup">متابعة</SelectItem>
                    <SelectItem value="operation">عملية جراحية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Name */}
              <div className="space-y-2">
                <Label htmlFor="doctorName">الطبيب</Label>
                <Select
                  value={doctorName}
                  onValueChange={setDoctorName}
                >
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

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">حالة الحجز</Label>
                <Select
                  value={status}
                  onValueChange={(val: any) => setStatus(val)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">مجدول</SelectItem>
                    <SelectItem value="arrived">وصل بالعيادة</SelectItem>
                    <SelectItem value="in_progress">قيد الكشف</SelectItem>
                    <SelectItem value="completed">اكتملت الزيارة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">ملاحظات وشكوى المريض</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="اكتب أي ملاحظات أو شكوى للمريض هنا..."
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
            <span>حفظ الزيارة</span>
          </Button>
        </div>
      </form>
    </section>
  );
}
