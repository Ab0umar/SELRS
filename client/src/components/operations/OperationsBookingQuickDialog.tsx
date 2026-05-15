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
import { OperationsBookingFormContent } from "./OperationsBookingFormContent";

export type OperationsBookingDraft = {
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
  initialDoctorName?: string;
};

export function defaultOperationsBookingDraft(initialDate?: string, initialDoctorName?: string): OperationsBookingDraft {
  const now = new Date();
  const doctorName = String(initialDoctorName ?? "").trim() || TAB_CONFIG[0]?.doctor || "طبيب غير محدد";
  return {
    bookingDate: initialDate || getLocalDateIso(),
    bookingTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    doctorName,
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
  initialDoctorName,
}: OperationsBookingQuickDialogProps) {
  const [draft, setDraft] = useState<OperationsBookingDraft>(() => defaultOperationsBookingDraft(initialDate, initialDoctorName));
  const utils = trpc.useUtils();
  const createBooking = trpc.medical.createOperationBooking.useMutation({
    onSuccess: async () => {
      await utils.medical.getOperationBookings.invalidate();
      onSaved();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) setDraft(defaultOperationsBookingDraft(initialDate, initialDoctorName));
  }, [initialDate, initialDoctorName, open]);

  const handleChange = (field: string, value: string | number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const fallbackDoctor = String(initialDoctorName ?? "").trim() || TAB_CONFIG[0]?.doctor || "طبيب غير محدد";
    const doctorName = String(draft.doctorName ?? "").trim() || fallbackDoctor;
    createBooking.mutate({
      bookingDate: draft.bookingDate,
      bookingTime: draft.bookingTime,
      doctorName,
      operationType: draft.operationType,
      casesCount: Math.max(1, Math.trunc(Number(draft.casesCount) || 1)),
      weekdayLabel: draft.weekdayLabel?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,calc(100vh-24px))] w-[96vw] overflow-x-hidden overflow-y-auto sm:max-w-5xl" dir="rtl">
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
