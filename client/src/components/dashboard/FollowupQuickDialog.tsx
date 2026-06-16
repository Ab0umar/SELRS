import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { Plus } from "lucide-react";

export function FollowupQuickDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [patient, setPatient] = useState<{ id: number; fullName?: string } | null>(null);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-md"
        dir="rtl"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">إضافة متابعة للطابور</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            ابحث عن المريض واختر التاريخ ثم أضفه للطابور
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
}
