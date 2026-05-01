import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto sm:max-w-4xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">تسجيل مريض</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            بيانات المريض كما في الفحص — اختر المريض أو أدخل بيانات حالة جديدة ثم احفظ
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ExaminationPatientQuickDialogContent key={mountKey} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
