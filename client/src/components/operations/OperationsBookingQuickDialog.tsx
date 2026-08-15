import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { TAB_CONFIG } from "@/lib/operationsPricing";
import { trpc } from "@/lib/trpc";
import { OperationsBookingFormContent } from "./OperationsBookingFormContent";
import { useIsMobile } from "@/hooks/useMobile";

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
  inlineOnDesktop?: boolean;
};

export function defaultOperationsBookingDraft(
  initialDate?: string,
  initialDoctorName?: string,
): OperationsBookingDraft {
  const now = new Date();
  const doctorName =
    String(initialDoctorName ?? "").trim() ||
    TAB_CONFIG[0]?.doctor ||
    "طبيب غير محدد";
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
  inlineOnDesktop = false,
}: OperationsBookingQuickDialogProps) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<OperationsBookingDraft>(() =>
    defaultOperationsBookingDraft(initialDate, initialDoctorName),
  );
  const utils = trpc.useUtils();
  const createBooking = trpc.medical.createOperationBooking.useMutation({
    onSuccess: async () => {
      await utils.medical.getOperationBookings.invalidate();
      onSaved();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open)
      setDraft(defaultOperationsBookingDraft(initialDate, initialDoctorName));
  }, [initialDate, initialDoctorName, open]);

  const handleChange = (field: string, value: string | number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const fallbackDoctor =
      String(initialDoctorName ?? "").trim() ||
      TAB_CONFIG[0]?.doctor ||
      "طبيب غير محدد";
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

  const formContent = (
    <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto p-5">
      <OperationsBookingFormContent
        draft={draft}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={createBooking.isPending}
      />
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
          <SheetTitle className="text-right">حجز عملية</SheetTitle>
        </SheetHeader>
        {formContent}
      </SheetContent>
    </Sheet>
  );
}
