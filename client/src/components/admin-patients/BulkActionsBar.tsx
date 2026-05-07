import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type DoctorDirectoryEntry, type SheetTypeChoice } from "@/hooks/admin-patients/adminPatientsShared";

type BulkActionsBarProps = {
  activeDoctors: DoctorDirectoryEntry[];
  bulkDoctorId: string;
  bulkSheetType: "none" | SheetTypeChoice;
  bulkManualLock: "none" | "on" | "off";
  canUndo: boolean;
  isBusy: boolean;
  isSaveStatePending: boolean;
  isUndoPending: boolean;
  onBulkDoctorChange: (value: string) => void;
  onBulkSheetTypeChange: (value: "none" | SheetTypeChoice) => void;
  onBulkManualLockChange: (value: "none" | "on" | "off") => void;
  onSetFilteredDoctor: () => void;
  onSetFilteredSheetType: () => void;
  onSetFilteredManualLock: () => void;
  onUndoLastBulkAction: () => void;
};

export function BulkActionsBar({
  activeDoctors,
  bulkDoctorId,
  bulkSheetType,
  bulkManualLock,
  canUndo,
  isBusy,
  isSaveStatePending,
  isUndoPending,
  onBulkDoctorChange,
  onBulkSheetTypeChange,
  onBulkManualLockChange,
  onSetFilteredDoctor,
  onSetFilteredSheetType,
  onSetFilteredManualLock,
  onUndoLastBulkAction,
}: BulkActionsBarProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-dashed border-border/80 bg-muted/10 px-3 py-3" dir="rtl">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <Select value={bulkDoctorId} onValueChange={onBulkDoctorChange}>
        <SelectTrigger className="min-w-[150px] rounded-lg sm:min-w-[190px]">
          <SelectValue placeholder="اختر طبيب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— بدون —</SelectItem>
          {activeDoctors.map((doctor) => (
            <SelectItem key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.locationType === "external" ? "خارجي" : "مركز"})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" className="rounded-lg" onClick={onSetFilteredDoctor} disabled={isBusy || isSaveStatePending}>
        تعيين للمرشحين
      </Button>

      <Select value={bulkSheetType} onValueChange={(value) => onBulkSheetTypeChange(value as "none" | SheetTypeChoice)}>
        <SelectTrigger className="min-w-[130px] rounded-lg sm:min-w-[160px]">
          <SelectValue placeholder="اختر الشيت" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— بدون —</SelectItem>
          <SelectItem value="consultant">استشاري</SelectItem>
          <SelectItem value="specialist">متخصص</SelectItem>
          <SelectItem value="pentacam_c">Pentacam C</SelectItem>
          <SelectItem value="pentacam_ex">Pentacam Ex</SelectItem>
          <SelectItem value="pentacam_ex_c">Pentacam Ex.C</SelectItem>
          <SelectItem value="lasik">ليزك</SelectItem>
          <SelectItem value="external">خارجي</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" className="rounded-lg" onClick={onSetFilteredSheetType} disabled={isBusy}>
        تعيين للمرشحين
      </Button>

      <Select value={bulkManualLock} onValueChange={(value) => onBulkManualLockChange(value as "none" | "on" | "off")}>
        <SelectTrigger className="min-w-[120px] rounded-lg sm:min-w-[150px]">
          <SelectValue placeholder="القفل اليدوي" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— القفل اليدوي —</SelectItem>
          <SelectItem value="on">تشغيل</SelectItem>
          <SelectItem value="off">إيقاف</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" className="rounded-lg" onClick={onSetFilteredManualLock} disabled={isSaveStatePending}>
        تعيين للمرشحين
      </Button>

      <Button variant="outline" className="rounded-lg" onClick={onUndoLastBulkAction} disabled={isUndoPending || !canUndo}>
        تراجع
      </Button>
      </div>
    </div>
  );
}
