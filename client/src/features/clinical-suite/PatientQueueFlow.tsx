import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  useTodayQueuePatientsMerged,
  type TodayQueuePatient,
} from "@/hooks/useTodayQueuePatientsMerged";

const STAGES = [
  { id: 1, title: "الاستقبال والانتظار", icon: UserCheck },
  { id: 2, title: "فحص البنتكام", icon: Layers },
  { id: 3, title: "العيادة والفحص", icon: Activity },
  { id: 4, title: "اكتمل الفحص", icon: CheckCircle2 },
] as const;
const stageForStatus: Record<TodayQueuePatient["queueStatus"], number> = {
  checkedIn: 1,
  next: 1,
  pentacam: 2,
  clinic1: 3,
  clinic2: 3,
  treated: 4,
};
const nextStatus: Partial<
  Record<TodayQueuePatient["queueStatus"], TodayQueuePatient["queueStatus"]>
> = {
  checkedIn: "next",
  next: "pentacam",
  pentacam: "clinic1",
  clinic1: "clinic2",
};
const statusLabel: Record<TodayQueuePatient["queueStatus"], string> = {
  checkedIn: "تم التسجيل",
  next: "في الانتظار",
  pentacam: "في البنتكام",
  clinic1: "عيادة 1",
  clinic2: "عيادة 2",
  treated: "اكتمل الفحص",
};

export function PatientQueueFlow() {
  const queue = useTodayQueuePatientsMerged();
  const utils = trpc.useUtils();
  const [selectedPatientId, setSelectedPatientId] = useState<
    string | undefined
  >();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const patients = queue.merged;
  const activePatient = useMemo(
    () =>
      patients.find((patient) => String(patient.id) === selectedPatientId) ??
      patients[0],
    [patients, selectedPatientId],
  );
  const moveMutation = trpc.medical.updateVisitQueueStatus.useMutation({
    onSuccess: async () => {
      toast.success("تم حفظ مرحلة المريض.");
      setConfirmOpen(false);
      await utils.medical.getTodayPatientsByQueueStatus.invalidate();
    },
    onError: (error) =>
      toast.error(error.message || "تعذر تحديث مرحلة المريض."),
  });
  const stageId = activePatient ? stageForStatus[activePatient.queueStatus] : 0;
  const targetStatus = activePatient
    ? nextStatus[activePatient.queueStatus]
    : undefined;
  const counts = queue.byStatus;
  const advance = () => {
    if (!activePatient?.visitId || !targetStatus) return;
    moveMutation.mutate({
      visitId: activePatient.visitId,
      patientId: activePatient.id,
      date: queue.todayIso,
      queueStatus: targetStatus,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            مسار حركة المرضى وغرف العمليات
          </h2>
          <p className="text-xs text-muted-foreground">
            يعكس حالات طابور اليوم المحفوظة فعليًا، ولا يعرض مريضًا أو أرقامًا
            تجريبية.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Database className="h-3 w-3" aria-hidden="true" />
            طابور اليوم
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => void queue.refetch()}
            disabled={queue.isFetching}
            aria-label="تحديث طابور اليوم"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${queue.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
      {queue.isError && (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          تعذر تحميل طابور اليوم. حدّث الصفحة أو راجع اتصال قاعدة البيانات.
        </p>
      )}
      {!queue.isLoading && !queue.isError && patients.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          لا يوجد مرضى في طابور اليوم.
        </Card>
      )}
      {activePatient && (
        <>
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <span className="shrink-0 text-xs font-semibold">اختيار مريض:</span>
            <Select
              value={String(activePatient.id)}
              onValueChange={setSelectedPatientId}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem
                    dir="auto"
                    key={patient.id}
                    value={String(patient.id)}
                  >
                    {patient.fullName || "غير مسمى"} (
                    {patient.patientCode || patient.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card className="space-y-4 border-primary/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span dir="auto" className="font-bold">
                    {activePatient.fullName || "غير مسمى"}
                  </span>
                  <Badge variant="outline" className="font-mono">
                    #{activePatient.patientCode || activePatient.id}
                  </Badge>
                </div>
                <p dir="auto" className="mt-1 text-xs text-muted-foreground">
                  {activePatient.serviceType || "الخدمة غير محددة"} •{" "}
                  {activePatient.doctorName || "الطبيب غير محدد"}
                </p>
              </div>
              <Badge variant="outline">
                {statusLabel[activePatient.queueStatus]}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {STAGES.map((stage) => {
                const Icon = stage.icon;
                const done = stage.id < stageId;
                const current = stage.id === stageId;
                return (
                  <div
                    key={stage.id}
                    className={`rounded-lg border p-3 ${current ? "border-primary bg-primary/10 text-primary" : done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20 text-muted-foreground"}`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {stage.title}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                التغيير يُحفظ في سجل الزيارة ويظهر لجميع المستخدمين.
              </p>
              {targetStatus ? (
                <Button
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!activePatient.visitId || moveMutation.isPending}
                >
                  {moveMutation.isPending
                    ? "جارٍ الحفظ…"
                    : "نقل إلى المرحلة التالية"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  لا يمكن نقل هذه الحالة من هنا. أكمل الفحص من سير العمل الطبي.
                </p>
              )}
            </div>
          </Card>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد نقل المريض</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم تغيير حالة {activePatient.fullName || "المريض"} إلى{" "}
                  {targetStatus ? statusLabel[targetStatus] : "المرحلة التالية"}{" "}
                  وحفظها في سجل الزيارة.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={advance}>
                  تأكيد النقل
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[
          ["الاستقبال والانتظار", counts.checkedIn.length + counts.next.length],
          ["غرفة البنتكام", counts.pentacam.length],
          ["غرف الفحص", counts.clinic1.length + counts.clinic2.length],
          ["تم الفحص", counts.treated.length],
        ].map(([label, count]) => (
          <Card key={String(label)} className="p-3">
            <span className="block text-[10px] text-muted-foreground">
              {label}
            </span>
            <span className="mt-1 block font-mono text-lg font-bold">
              {count} مرضى
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
