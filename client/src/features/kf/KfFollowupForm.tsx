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
import { ChevronRight, Save, Loader2 } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";

export default function KfFollowupForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/kf/patients/:kfPatientId/followups/new");
  const kfPatientId = params?.kfPatientId ? Number(params.kfPatientId) : null;

  // Form State
  const [followupDate, setFollowupDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"scheduled" | "completed" | "missed">("scheduled");
  const [notes, setNotes] = useState("");
  const [kfOpId, setKfOpId] = useState<string>("none");
  const [kfVisitId, setKfVisitId] = useState<string>("none");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query patient info
  const { data: patient, isLoading: loadingPatient } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  // Query patient operations
  const { data: operations = [] } = trpc.kf.listOperations.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  // Query patient visits
  const { data: visits = [] } = trpc.kf.listVisits.useQuery(
    { kfPatientId: kfPatientId ?? 0 },
    { enabled: !!kfPatientId }
  );

  const createMutation = trpc.kf.createFollowup.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!followupDate) {
      newErrors.followupDate = "تاريخ المتابعة مطلوب";
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
        kfOpId: kfOpId === "none" ? null : Number(kfOpId),
        followupDate,
        notes: notes.trim() || null,
        status,
      });
      toast.success("تمت جدولة المتابعة بنجاح");
      setLocation(`/kf/patients/${kfPatientId}`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء جدولة المتابعة");
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
        <h1 className="text-2xl font-bold tracking-tight">إضافة وجدولة متابعة</h1>
        <p className="text-muted-foreground text-sm">
          تحديد موعد مراجعة بعد العملية أو كشف للمريض: <strong>{patient.fullName}</strong> ({patient.kfCode})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900  hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-lg">بيانات المتابعة</CardTitle>
            <CardDescription>أدخل موعد المتابعة والحالة والعملية المرتبطة بها</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="followupDate" className="after:content-['*'] after:text-destructive after:mr-1">
                  تاريخ المتابعة
                </Label>
                <DateInput
                  id="followupDate"
                  value={followupDate}
                  onChange={(e) => {
                    setFollowupDate(e.target.value);
                    if (errors.followupDate) setErrors({});
                  }}
                  className={errors.followupDate ? "border-destructive" : ""}
                />
                {errors.followupDate && <p className="text-xs text-destructive">{errors.followupDate}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
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
                    <SelectItem value="missed">لم يحضر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Link to Operation */}
              <div className="space-y-2">
                <Label htmlFor="kfOpId">مرتبطة بعملية جراحية (اختياري)</Label>
                <Select value={kfOpId} onValueChange={setKfOpId}>
                  <SelectTrigger id="kfOpId">
                    <SelectValue placeholder="اختر عملية..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">غير مرتبطة بعملية جراحية</SelectItem>
                    {operations.map((op: any) => (
                      <SelectItem key={op.kfOpId} value={String(op.kfOpId)}>
                        {op.opType} ({new Date(op.opDate).toLocaleDateString("ar-EG")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link to Visit */}
              <div className="space-y-2">
                <Label htmlFor="kfVisitId">ربط بزيارة مجدولة (اختياري)</Label>
                <Select value={kfVisitId} onValueChange={setKfVisitId}>
                  <SelectTrigger id="kfVisitId">
                    <SelectValue placeholder="اختر زيارة..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">غير مرتبطة بزيارة</SelectItem>
                    {visits.map((v: any) => (
                      <SelectItem key={v.kfVisitId} value={String(v.kfVisitId)}>
                        {new Date(v.visitDate).toLocaleDateString("ar-EG")} - {v.visitType === "followup" ? "زيارة متابعة" : "كشف"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">ملاحظات وتوصيات المتابعة</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="ملاحظات وتوصيات للمتابعة القادمة..."
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
            <span>حفظ المتابعة</span>
          </Button>
        </div>
      </form>
    </section>
  );
}
