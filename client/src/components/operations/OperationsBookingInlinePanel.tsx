import { CalendarPlus, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OperationsBookingFormContent } from "./OperationsBookingFormContent";
import { defaultOperationsBookingDraft, type OperationsBookingDraft } from "./OperationsBookingQuickDialog";
import { trpc } from "@/lib/trpc";

type OperationsBookingInlinePanelProps = {
  initialDate?: string;
  initialDoctorName?: string;
  onSaved: () => void;
};

export function OperationsBookingInlinePanel({
  initialDate,
  initialDoctorName,
  onSaved,
}: OperationsBookingInlinePanelProps) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<OperationsBookingDraft>(() => defaultOperationsBookingDraft(initialDate, initialDoctorName));
  const [panelOpen, setPanelOpen] = useState(false);

  const createBooking = trpc.medical.createOperationBooking.useMutation({
    onSuccess: async () => {
      await utils.medical.getOperationBookings.invalidate();
      onSaved();
    },
  });

  useEffect(() => {
    setDraft(defaultOperationsBookingDraft(initialDate, initialDoctorName));
  }, [initialDate, initialDoctorName]);

  const canReset = useMemo(() => {
    const defaults = defaultOperationsBookingDraft(initialDate, initialDoctorName);
    return (
      draft.bookingDate !== defaults.bookingDate ||
      draft.bookingTime !== defaults.bookingTime ||
      draft.doctorName !== defaults.doctorName ||
      draft.operationType !== defaults.operationType ||
      draft.casesCount !== defaults.casesCount ||
      String(draft.weekdayLabel ?? "") !== String(defaults.weekdayLabel ?? "")
    );
  }, [draft, initialDate, initialDoctorName]);

  const handleChange = (field: string, value: string | number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const nextDraft = {
      ...draft,
      casesCount: Math.max(1, Math.trunc(Number(draft.casesCount) || 1)),
      doctorName: String(draft.doctorName ?? "").trim() || defaultOperationsBookingDraft(initialDate, initialDoctorName).doctorName,
    };
    createBooking.mutate({
      bookingDate: nextDraft.bookingDate,
      bookingTime: nextDraft.bookingTime,
      doctorName: nextDraft.doctorName,
      operationType: nextDraft.operationType,
      casesCount: nextDraft.casesCount,
      weekdayLabel: nextDraft.weekdayLabel?.trim() || undefined,
    });
  };

  return (
    <section className="rounded-lg border border-border/50 bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-right"
          onClick={() => setPanelOpen((prev) => !prev)}
          aria-expanded={panelOpen}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarPlus className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">حجز عملية جديدة</h2>
            <p className="text-[11px] text-muted-foreground">المدخل المباشر للحجز اليومي</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setDraft(defaultOperationsBookingDraft(initialDate, initialDoctorName))}
            disabled={!canReset || createBooking.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            ضبط
          </Button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:bg-muted text-muted-foreground transition-colors"
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-label={panelOpen ? "إخفاء حجز عملية جديدة" : "إظهار حجز عملية جديدة"}
            aria-expanded={panelOpen}
          >
            {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {panelOpen && (
        <div className="px-4 py-4">
          <OperationsBookingFormContent
            draft={draft}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={() => setDraft(defaultOperationsBookingDraft(initialDate, initialDoctorName))}
            isSubmitting={createBooking.isPending}
            submitLabel="حفظ الحجز"
            cancelLabel="إعادة ضبط"
          />
        </div>
      )}
    </section>
  );
}
