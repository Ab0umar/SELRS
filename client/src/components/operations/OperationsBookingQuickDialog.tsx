import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { TAB_CONFIG } from "@/lib/operationsPricing";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { OperationsBookingFormContent } from "./OperationsBookingFormContent";

type OperationsBookingDraft = {
  bookingDate: string;
  bookingTime: string;
  doctorName: string;
  operationType: string;
  casesCount: number;
  weekdayLabel?: string;
};

export type OperationsBookingQuickDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialDate?: string;
};

function defaultDraft(initialDate?: string): OperationsBookingDraft {
  const now = new Date();
  return {
    bookingDate: initialDate || getLocalDateIso(),
    bookingTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    doctorName: TAB_CONFIG[0]?.doctor ?? "",
    operationType: "PRK",
    casesCount: 1,
    weekdayLabel: "",
  };
}

export function OperationsBookingQuickDialog({
  open,
  onOpenChange,
  onSaved,
  initialDate,
}: OperationsBookingQuickDialogProps) {
  const [draft, setDraft] = useState<OperationsBookingDraft>(() => defaultDraft(initialDate));
  const utils = trpc.useUtils();
  const createBooking = trpc.medical.createOperationBooking.useMutation({
    onSuccess: async () => {
      await utils.medical.getOperationBookings.invalidate();
      onSaved();
      onOpenChange(false);
      toast.success("تم حفظ حجز العملية");
    },
  });

  useEffect(() => {
    if (open) setDraft(defaultDraft(initialDate));
  }, [initialDate, open]);

  const handleChange = (field: string, value: string | number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    createBooking.mutate({
      bookingDate: draft.bookingDate,
      bookingTime: draft.bookingTime,
      doctorName: draft.doctorName,
      operationType: draft.operationType,
      casesCount: Math.max(1, Math.trunc(Number(draft.casesCount) || 1)),
      weekdayLabel: draft.weekdayLabel?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">حجز عملية</DialogTitle>
        </DialogHeader>
        <OperationsBookingFormContent
          draft={draft}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createBooking.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
