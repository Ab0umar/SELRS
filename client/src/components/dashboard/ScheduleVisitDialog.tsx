import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { serviceTypeLabels } from "@/lib/dashboard-data";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import PatientPicker from "@/components/PatientPicker";
import { cairoDateIso, visitScheduleSchema } from "../../../../shared/visitSchedule";

function localDateIso() {
  return cairoDateIso();
}

const SERVICE_KEYS = [
  "consultant",
  "specialist",
  "lasik",
  "surgery",
  "external",
  "followup",
] as const;

export function ScheduleVisitDialog({
  open,
  onOpenChange,
  /** عند فتحها من مريض محدد في المرضى — تعبئة أولية */
  prefilledPatientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledPatientId?: number;
}) {
  const [fullName, setFullName] = useState("");
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientCode, setPatientCode] = useState("");
  const [age, setAge] = useState<string>("");
  const [visitDate, setVisitDate] = useState(() => localDateIso());
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>("consultant");
  const [patientType, setPatientType] = useState<"existing" | "new" | "guest">("existing");
  const [moveToCheckedIn, setMoveToCheckedIn] = useState(false);
  const [cancelPreviousAppointment, setCancelPreviousAppointment] =
    useState(false);

  useEffect(() => {
    if (!open) return;
    setPatientId(prefilledPatientId ?? null);
    setPatientCode("");
    setFullName("");
    setAge("");
    setPhone("");
    setMoveToCheckedIn(false);
    setCancelPreviousAppointment(false);
    setVisitDate(localDateIso());
    setService("consultant");
    setPatientType("existing");
  }, [open, prefilledPatientId]);

  const patientQuery = trpc.patient.getPatient.useQuery(
    prefilledPatientId ?? 0,
    {
      enabled: open && Boolean(prefilledPatientId && prefilledPatientId > 0),
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!open || !prefilledPatientId || patientId !== prefilledPatientId || patientType !== "existing") return;
    const p = patientQuery.data;
    if (!p) return;
    setFullName(p.fullName ?? "");
    setPatientCode(p.patientCode ?? "");
    setPhone(p.phone ?? "");
    if (p.age != null && Number.isFinite(p.age)) setAge(String(p.age));
    else setAge("");
    const st = String(p.serviceType ?? "");
    if ((SERVICE_KEYS as readonly string[]).includes(st)) setService(st);
  }, [open, prefilledPatientId, patientQuery.data, patientId, patientType]);

  const utils = trpc.useUtils();
  const createMutation = trpc.patient.createVisitScheduleRequest.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.patient.getVisitScheduleRequests.invalidate(),
        utils.medical.getTodayPatientsByQueueStatus.invalidate(),
      ]);
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
    const ageNum = age.trim() === "" ? null : Number(age);
    if (
      age.trim() !== "" &&
      (ageNum === null ||
        !Number.isFinite(ageNum) ||
        !Number.isInteger(ageNum) ||
        ageNum < 0 ||
        ageNum > 130)
    ) {
      toast.error("السن غير صالح");
      return;
    }
    const parsed = visitScheduleSchema.safeParse({
      fullName: name,
      age: ageNum,
      visitDate,
      phone: phone.trim() || null,
      service,
      patientType,
      patientId,
      moveToCheckedIn,
      cancelPreviousAppointment,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "راجع بيانات الموعد");
      return;
    }
    createMutation.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-3xl border-none shadow-2xl p-0"
        dir="rtl"
      >
        <DialogHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="size-4 text-primary" aria-hidden />
            </div>
            <div className="text-start">
              <DialogTitle className="text-lg font-bold">
                تحديد موعد / كشف
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                أدخل بيانات المريض والخدمة المطلوبة لإدراجها في جدول المواعيد
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 bg-background">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Right Column: Patient Basic Info */}
            <div className="space-y-4">
              {/* Patient Type */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-[13px] block text-muted-foreground">
                  نوع الزيارة
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { value: "existing", label: "مريض مسجل" },
                      { value: "new", label: "مريض جديد" },
                    ] as const
                  ).map((opt) => (
                    <Button variant="bare"
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPatientType(opt.value);
                        setPatientId(null);
                        setPatientCode("");
                        setFullName("");
                        setAge("");
                        setPhone("");
                        setMoveToCheckedIn(false);
                        setCancelPreviousAppointment(false);
                      }}
                      className={[
                        "h-8 px-3.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        patientType === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {patientType === "existing" && (
                  <PatientPicker
                    initialPatientId={patientId ?? undefined}
                    readOnly={Boolean(patientId)}
                    onSelect={(patient) => {
                      setPatientId(patient.id);
                      setPatientCode(patient.patientCode ?? "");
                      setFullName(patient.fullName);
                      setPhone(patient.phone ?? "");
                      setAge(patient.age == null ? "" : String(patient.age));
                    }}
                  />
                )}
                {patientType === "existing" && patientId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setPatientId(null);
                    setPatientCode("");
                    setFullName("");
                    setAge("");
                    setPhone("");
                    setMoveToCheckedIn(false);
                    setCancelPreviousAppointment(false);
                  }}>تغيير المريض</Button>
                )}
                <div>
                  <Label className="font-semibold text-[13px] mb-1 block text-muted-foreground">
                    الاسم بالكامل
                  </Label>
                  <Input aria-label="اسم المريض الرباعي…"
                    readOnly={patientType === "existing"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 text-sm font-medium"
                    placeholder="اسم المريض الرباعي…"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-[13px] mb-1 block text-muted-foreground">
                    رقم الموبايل
                  </Label>
                  <Input aria-label="01xxxxxxxxx"
                    readOnly={patientType === "existing"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-sm font-medium"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-semibold text-[13px] mb-1 block text-muted-foreground">
                      السن
                    </Label>
                    <Input
                      type="number"
                      readOnly={patientType === "existing"}
                      min={0}
                      max={130}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="h-9 text-sm text-center font-bold"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-[13px] mb-1 block text-muted-foreground">
                      الكود
                    </Label>
                    <Input
                      value={patientCode || "—"}
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
                <Label className="font-bold text-[13px] text-primary">
                  الخدمة المطلوبة
                </Label>
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
                <Label className="font-bold text-[13px] text-primary">
                  تاريخ الزيارة
                </Label>
                <DateInput
                  value={visitDate}
                  onChange={(e) => {
                    setVisitDate(e.target.value);
                    setMoveToCheckedIn(false);
                  }}
                  className="h-9 text-sm font-mono border-primary/20 bg-background"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-primary/10">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="move-to-checkin"
                    checked={moveToCheckedIn}
                    disabled={!patientId || visitDate !== localDateIso()}
                    onCheckedChange={(checked) =>
                      setMoveToCheckedIn(Boolean(checked))
                    }
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor="move-to-checkin"
                    className="text-[13px] font-medium cursor-pointer text-primary"
                  >
                    نقل إلى التسجيل
                  </Label>
                </div>
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="cancel-previous"
                    checked={cancelPreviousAppointment}
                    disabled={!patientId}
                    onCheckedChange={(checked) =>
                      setCancelPreviousAppointment(Boolean(checked))
                    }
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor="cancel-previous"
                    className="text-[13px] font-medium cursor-pointer text-primary"
                  >
                    إلغاء آخر موعد قادم غير منفذ من جدول المواعيد
                  </Label>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  يُحفظ الموعد في جدول المواعيد. النقل للتسجيل متاح لمريض مسجل وموعد اليوم؛ المريض الجديد يحتاج التسجيل أولاً.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/10 border-t gap-2 sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-sm"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="h-9 text-sm px-8 font-bold"
            onClick={submit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "جاري الحفظ…" : "تأكيد الحجز"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
