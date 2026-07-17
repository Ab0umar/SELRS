import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExaminationPatientQuickDialogContent } from "@/components/examination/ExaminationPatientQuickDialogContent";

export function QuickPatientEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mountKey, setMountKey] = useState(0);
  useEffect(() => {
    if (open) setMountKey((k) => k + 1);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="max-h-[92dvh] w-full gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 text-right">
          <SheetTitle>تسجيل مريض</SheetTitle>
          <SheetDescription className="sr-only">
            نموذج تسجيل مريض جديد
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5">
          {open ? (
            <ExaminationPatientQuickDialogContent
              key={mountKey}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
