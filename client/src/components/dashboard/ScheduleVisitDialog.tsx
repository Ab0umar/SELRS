import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serviceTypeLabels } from "@/lib/dashboard-data";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";

const SERVICE_KEYS = ["consultant", "specialist", "lasik", "surgery", "external"] as const;

export function ScheduleVisitDialog({
  open,
  onOpenChange,
  /** عند فتحها من مريض محدد في الطابور — تعبئة أولية */
  prefilledPatientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledPatientId?: number;
}) {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>("consultant");

  const patientQuery = trpc.patient.getPatient.useQuery(prefilledPatientId ?? 0, {
    enabled: open && Boolean(prefilledPatientId && prefilledPatientId > 0),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open) return;
    if (!prefilledPatientId || prefilledPatientId <= 0) {
      setFullName("");
      setAge("");
      setPhone("");
      setVisitDate(new Date().toISOString().split("T")[0]);
      setService("consultant");
      return;
    }
    const p = patientQuery.data;
    if (!p) return;
    setFullName(p.fullName ?? "");
    setPhone(p.phone ?? "");
    if (p.age != null && Number.isFinite(p.age)) setAge(String(p.age));
    else setAge("");
    const st = String(p.serviceType ?? "");
    if ((SERVICE_KEYS as readonly string[]).includes(st)) setService(st);
  }, [open, prefilledPatientId, patientQuery.data]);

  const createMutation = trpc.patient.createVisitScheduleRequest.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الموعد");
      onOpenChange(false);
    },
    onError: (e) => toast.error(getTrpcErrorMessage(e, "تعذر الحفظ")),
  });

  const submit = () => {
    const name = fullName.trim();
    if (!name) {
      toast.error("أدخل الاسم");
      return;
    }
    const ageNum = age.trim() === "" ? null : parseInt(age, 10);
    if (
      age.trim() !== "" &&
      (ageNum === null || !Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130)
    ) {
      toast.error("السن غير صالح");
      return;
    }
    createMutation.mutate({
      fullName: name,
      age: ageNum,
      visitDate,
      phone: phone.trim() || null,
      service,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">تحديد موعد / كشف</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            اسم المريض، السن، تاريخ الزيارة أو الكشف، الجوال، والخدمة — يُحفظ في سجل الاستقبال
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>الاسم</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-right" dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label>السن</Label>
            <Input
              type="number"
              min={0}
              max={130}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="text-right"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>تاريخ الزيارة أو الكشف</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="font-mono" dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>الموبايل</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="text-right" dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>الخدمة</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر الخدمة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {SERVICE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {serviceTypeLabels[k] ?? k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="button" onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "جاري الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
