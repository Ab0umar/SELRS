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
      <DialogContent className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-3xl border-none shadow-2xl p-0" dir="rtl">
        <DialogHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold">📅</span>
            </div>
            <div className="text-right">
              <DialogTitle className="text-lg font-bold">تحديد موعد / كشف</DialogTitle>
              <DialogDescription className="text-[11px]">أدخل بيانات المريض والخدمة المطلوبة لإدراجها في جدول المواعيد</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 bg-background">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Right Column: Patient Basic Info */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">الاسم بالكامل</Label>
                  <Input 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    className="h-9 text-sm font-medium" 
                    placeholder="اسم المريض الرباعي..." 
                  />
                </div>
                <div>
                  <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">رقم الموبايل</Label>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="h-9 text-sm font-medium tracking-wider" 
                    placeholder="01xxxxxxxxx" 
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">السن</Label>
                    <Input
                      type="number"
                      min={0}
                      max={130}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="h-9 text-sm text-center font-bold"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">الكود</Label>
                    <Input 
                      value={patientQuery.data?.code || "—"} 
                      readOnly 
                      className="h-9 text-sm bg-muted/50 text-center font-mono" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Left Column: Visit Details */}
            <div className="bg-primary/[0.03] p-4 rounded-xl border border-primary/10 space-y-4">
              <div className="space-y-1">
                <Label className="font-bold text-[11px] text-primary">الخدمة المطلوبة</Label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger className="h-9 bg-background border-primary/20 text-sm">
                    <SelectValue placeholder="اختر الخدمة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {SERVICE_KEYS.map((k) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {serviceTypeLabels[k] ?? k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-[11px] text-primary">تاريخ الزيارة</Label>
                <Input 
                  type="date" 
                  value={visitDate} 
                  onChange={(e) => setVisitDate(e.target.value)} 
                  className="h-9 text-sm font-mono border-primary/20 bg-background" 
                />
              </div>

              <div className="pt-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  * سيتم إضافة المريض إلى قائمة الانتظار في التاريخ المحدد.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/10 border-t gap-2 sm:justify-start">
          <Button type="button" variant="ghost" className="h-9 text-sm" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="button" className="h-9 text-sm px-8 font-bold" onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "جاري الحفظ…" : "تأكيد الحجز"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
