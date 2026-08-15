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
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";

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
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (open) {
      setPatient(null);
      setVisitDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const addMutation = trpc.medical.addFollowupToQueue.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة المريض للطابور كمتابعة");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل الإضافة للطابور"));
    },
  });

  const handleAdd = () => {
    if (!patient) {
      toast.error("اختر مريضاً أولاً");
      return;
    }
    addMutation.mutate({ patientId: patient.id, visitDate });
  };

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

      <Button
        className="w-full gap-2"
        onClick={handleAdd}
        disabled={!patient || addMutation.isPending}
      >
        <Plus className="h-4 w-4" />
        إضافة للطابور
      </Button>
    </div>
  );

  if (inlineOnDesktop && !isMobile) {
    return (
      <section
        className="overflow-hidden rounded-lg border border-border bg-background"
        dir="rtl"
      >
        {formContent}
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="max-h-[92dvh] w-full gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 text-right">
          <SheetTitle className="text-right">إضافة متابعة للطابور</SheetTitle>
          <SheetDescription className="text-right text-muted-foreground">
            ابحث عن المريض واختر التاريخ ثم أضفه للطابور
          </SheetDescription>
        </SheetHeader>

        {formContent}
      </SheetContent>
    </Sheet>
  );
}
