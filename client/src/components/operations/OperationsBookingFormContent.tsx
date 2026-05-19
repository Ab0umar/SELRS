import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPERATION_LABELS } from "@/lib/operationsPricing";

export type OperationsBookingFormContentProps = {
  draft: {
    bookingDate: string;
    bookingTime: string;
    doctorName: string;
    operationType: string;
    casesCount: number;
    weekdayLabel?: string;
  };
  onChange: (field: string, value: string | number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  cancelLabel?: string;
};

export function OperationsBookingFormContent({
  draft,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "حفظ الحجز",
  cancelLabel = "إلغاء",
}: OperationsBookingFormContentProps) {
  return (
    <form
      className="space-y-4"
      dir="rtl"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Right Column: Doctor & Date */}
        <div className="space-y-3">
          <div>
            <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">الطبيب المعالج</Label>
            <Input
              value={draft.doctorName}
              onChange={(event) => onChange("doctorName", event.target.value)}
              placeholder="اسم الطبيب..."
              className="h-9 text-sm font-medium bg-background"
            />
          </div>
          <div>
            <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">تاريخ العملية</Label>
            <Input
              type="date"
              value={draft.bookingDate}
              onChange={(event) => onChange("bookingDate", event.target.value)}
              className="h-9 text-sm font-mono bg-background"
            />
          </div>
          <div>
            <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">اليوم (اختياري)</Label>
            <Input
              value={draft.weekdayLabel ?? ""}
              onChange={(event) => onChange("weekdayLabel", event.target.value)}
              placeholder="السبت، الأحد..."
              className="h-9 text-sm bg-background"
            />
          </div>
        </div>

        {/* Left Column: Operation Details */}
        <div className="bg-success/10/40 p-4 rounded-xl border border-success/20 space-y-3 h-full">
          <div>
            <Label className="font-bold text-[11px] text-foreground mb-1 block">نوع العملية</Label>
            <Input
              list="operation-booking-types"
              value={draft.operationType}
              onChange={(event) => onChange("operationType", event.target.value)}
              placeholder="ابحث عن العملية..."
              className="h-9 text-sm font-semibold bg-background border-success/30"
            />
            <datalist id="operation-booking-types">
              {Object.keys(OPERATION_LABELS).map((key) => (
                <option key={key} value={key}>
                  {OPERATION_LABELS[key]}
                </option>
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-bold text-[11px] text-foreground mb-1 block">الوقت</Label>
              <Input
                type="time"
                value={draft.bookingTime}
                onChange={(event) => onChange("bookingTime", event.target.value)}
                className="h-9 text-sm font-mono bg-background border-success/30"
              />
            </div>
            <div>
              <Label className="font-bold text-[11px] text-foreground mb-1 block">عدد الحالات</Label>
              <Input
                type="number"
                min={1}
                value={draft.casesCount}
                onChange={(event) => onChange("casesCount", Number(event.target.value) || 1)}
                className="h-9 text-sm text-center font-bold bg-background border-success/30"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[10px] text-success leading-tight">
              * سيتم حجز غرفة العمليات للطبيب في الموعد المحدد.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t mt-4">
        <Button type="button" variant="ghost" className="h-9 text-sm" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
        <Button type="submit" className="h-9 text-sm px-8 font-bold bg-success hover:bg-success/80" disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
