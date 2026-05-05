import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPERATION_LABELS, TAB_CONFIG } from "@/lib/operationsPricing";

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
};

export function OperationsBookingFormContent({
  draft,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="operation-booking-date">تاريخ الحجز</Label>
          <Input
            id="operation-booking-date"
            type="date"
            value={draft.bookingDate}
            onChange={(event) => onChange("bookingDate", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="operation-booking-time">الوقت</Label>
          <Input
            id="operation-booking-time"
            type="time"
            value={draft.bookingTime}
            onChange={(event) => onChange("bookingTime", event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="operation-booking-doctor">الطبيب</Label>
        <Input
          id="operation-booking-doctor"
          list="operation-booking-doctors"
          value={draft.doctorName}
          onChange={(event) => onChange("doctorName", event.target.value)}
          placeholder="اسم الطبيب"
        />
        <datalist id="operation-booking-doctors">
          {TAB_CONFIG.map((tab) =>
            tab.doctor ? <option key={tab.key} value={tab.doctor} /> : null,
          )}
        </datalist>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="operation-booking-type">نوع العملية</Label>
        <Input
          id="operation-booking-type"
          list="operation-booking-types"
          value={draft.operationType}
          onChange={(event) => onChange("operationType", event.target.value)}
          placeholder="نوع العملية"
        />
        <datalist id="operation-booking-types">
          {Object.keys(OPERATION_LABELS).map((key) => (
            <option key={key} value={key}>
              {OPERATION_LABELS[key]}
            </option>
          ))}
        </datalist>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="operation-booking-cases">عدد الحالات</Label>
          <Input
            id="operation-booking-cases"
            type="number"
            min={1}
            value={draft.casesCount}
            onChange={(event) => onChange("casesCount", Number(event.target.value) || 1)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="operation-booking-weekday">اليوم</Label>
          <Input
            id="operation-booking-weekday"
            value={draft.weekdayLabel ?? ""}
            onChange={(event) => onChange("weekdayLabel", event.target.value)}
            placeholder="اختياري"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          حفظ الحجز
        </Button>
      </div>
    </form>
  );
}
