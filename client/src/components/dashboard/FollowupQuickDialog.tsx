import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { ClipboardEdit, Plus } from "lucide-react";
import { FollowupFormDialog } from "@/components/today/FollowupFormDialog";
import { useIsMobile } from "@/hooks/useMobile";
import { cairoDateIso } from "../../../../shared/visitSchedule";

export function FollowupQuickDialog({
  open,
  onOpenChange,
  inlineOnDesktop = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inlineOnDesktop?: boolean;
}) {
  const isMobile = useIsMobile();
  const [patient, setPatient] = useState<{
    id: number;
    fullName?: string;
  } | null>(null);
  const [visitDate, setVisitDate] = useState(
    cairoDateIso(),
  );

  useEffect(() => {
    if (open) {
      setPatient(null);
      setVisitDate(cairoDateIso());
    }
  }, [open]);

  const [openTarget, setOpenTarget] = useState<{
    patientId: number;
    patientName?: string;
    visitId?: number;
    visitDate: string;
  } | null>(null);
  const [openAfterAdd, setOpenAfterAdd] = useState(false);

  const utils = trpc.useUtils();
  const addMutation = trpc.medical.addFollowupToQueue.useMutation({
    onSuccess: async (result, variables) => {
      await utils.medical.getTodayPatientsByQueueStatus.invalidate();
      toast.success("تمت إضافة المريض للطابور كمتابعة");
      if (openAfterAdd) {
        setOpenTarget({
          patientId: variables.patientId,
          patientName: patient?.fullName,
          visitId: (result as any)?.visitId,
          visitDate: variables.visitDate ?? cairoDateIso(),
        });
        return;
      }
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل الإضافة للطابور"));
    },
  });

  const handleAdd = (openAfter = false) => {
    if (!patient) {
      toast.error("اختر مريضاً أولاً");
      return;
    }
    setOpenAfterAdd(openAfter);
    addMutation.mutate({ patientId: patient.id, visitDate });
  };

  const followupDialog = (
    <FollowupFormDialog
      open={openTarget != null}
      onOpenChange={(next) => {
        if (!next) {
          setOpenTarget(null);
          onOpenChange(false);
        }
      }}
      patientId={openTarget?.patientId ?? 0}
      patientName={openTarget?.patientName}
      visitId={openTarget?.visitId}
      visitDate={openTarget?.visitDate}
    />
  );

  const formContent = (
    <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-4 overflow-y-auto p-5">
      <PatientPicker onSelect={(p) => setPatient(p)} />

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">تاريخ الزيارة:</Label>
        <DateInput
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="h-9 flex-1"
          dir="ltr"
        />
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 gap-2"
          onClick={() => handleAdd(false)}
          disabled={!patient || addMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          إضافة للطابور
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => handleAdd(true)}
          disabled={!patient || addMutation.isPending}
        >
          <ClipboardEdit className="h-4 w-4" />
          إضافة وفتح
        </Button>
      </div>
    </div>
  );

  if (inlineOnDesktop && !isMobile) {
    return (
      <section
        className="overflow-hidden rounded-lg border border-border bg-background"
        dir="rtl"
      >
        {formContent}
        {followupDialog}
      </section>
    );
  }

  return (
    <>
    {followupDialog}
    <Sheet open={open && openTarget == null} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="max-h-[92dvh] w-full gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 text-start">
          <SheetTitle className="text-start">إضافة متابعة للطابور</SheetTitle>
          <SheetDescription className="text-start text-muted-foreground">
            ابحث عن المريض واختر التاريخ ثم أضفه للطابور
          </SheetDescription>
        </SheetHeader>

        {formContent}
      </SheetContent>
    </Sheet>
    </>
  );
}
