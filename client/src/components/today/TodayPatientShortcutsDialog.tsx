import type { ComponentType } from "react";
import { useState } from "react";
import {
  CalendarPlus,
  CircleDot,
  Eye,
  FileSpreadsheet,
  FileText,
  FileHeart,
  FlaskConical,
  Glasses,
  Pill,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { patientNavPathForPageKey } from "@/lib/patientNavPaths";
import type { PageKey } from "@/lib/dashboard-data";
import { ScheduleVisitDialog } from "@/components/dashboard/ScheduleVisitDialog";

const iconBgMap = {
  calendar: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400",
  eye: "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary",
  glasses: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-400",
  pentacam: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400",
  pill: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
  flask: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400",
  fileText: "bg-primary/10 text-primary hover:bg-primary/20 dark:text-primary",
  fileHeart: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 dark:text-pink-400",
  spreadsheet: "bg-secondary/10 text-secondary hover:bg-secondary/20 dark:text-secondary",
} as const;

type ColorKey = keyof typeof iconBgMap;

function p(id: number, page: PageKey): string {
  return patientNavPathForPageKey(page, id) ?? "/dashboard";
}

type ShortcutRow = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  colorKey: ColorKey;
  path: string;
};

/** نفس ترتيب لوحة التحكم ما عدا «تسجيل مريض». */
function actionsForPatient(patientId: number): ShortcutRow[] {
  return [
    { key: "schedule", label: "حجز موعد", path: "", icon: CalendarPlus, colorKey: "calendar" },
    { key: "exam", label: "القياسات و الفحص", path: p(patientId, "examination-form"), icon: Eye, colorKey: "eye" },
    { key: "ref", label: "مقاس النظارة", path: p(patientId, "refraction"), icon: Glasses, colorKey: "glasses" },
    { key: "penta", label: "بنتاكام", path: p(patientId, "pentacam-sheet"), icon: CircleDot, colorKey: "pentacam" },
    { key: "rx", label: "الروشتات", path: p(patientId, "write-prescription"), icon: Pill, colorKey: "pill" },
    { key: "tests", label: "تحاليل و اشعه", path: p(patientId, "request-tests"), icon: FlaskConical, colorKey: "flask" },
    { key: "diag", label: "تشخيص / تقرير", path: p(patientId, "medical-reports"), icon: FileText, colorKey: "fileText" },
    { key: "file", label: "الملف الطبي", path: p(patientId, "patient-details"), icon: FileHeart, colorKey: "fileHeart" },
    { key: "summary", label: "تقرير المريض", path: p(patientId, "patient-summary"), icon: FileSpreadsheet, colorKey: "spreadsheet" },
  ];
}

export type TodayPatientShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName?: string | null;
  /** «القياسات و الفحص»: فتح `MedicalFilePanel` لهذا المريض بدل صفحة الفحص. */
  onOpenMeasurementsMedicalFile?: (patientId: number) => void;
};

export function TodayPatientShortcutsDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onOpenMeasurementsMedicalFile,
}: TodayPatientShortcutsDialogProps) {
  const [, setLocation] = useLocation();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const valid = Number.isFinite(patientId) && patientId > 0;
  const rows = valid ? actionsForPatient(patientId) : [];

  return (
    <>
      <ScheduleVisitDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        prefilledPatientId={valid ? patientId : undefined}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">اختصارات المريض</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            {patientName ? (
              <>
                اختر وجهة العمل لـ <span className="font-semibold text-foreground">{patientName}</span>
              </>
            ) : (
              "اختر وجهة العمل لهذا المريض"
            )}
          </DialogDescription>
        </DialogHeader>
        {!valid ? (
          <p className="text-center text-sm text-muted-foreground">لا يوجد مريض محدد</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {rows.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 py-4 text-center text-xs font-semibold transition-all hover:border-primary/30 hover:bg-muted active:scale-[0.98]",
                    "group cursor-pointer",
                  )}
                  onClick={() => {
                    if (item.key === "exam") {
                      if (onOpenMeasurementsMedicalFile) {
                        onOpenMeasurementsMedicalFile(patientId);
                      } else {
                        setLocation(p(patientId, "examination-form"));
                      }
                      onOpenChange(false);
                      return;
                    }
                    if (item.key === "schedule") {
                      setScheduleOpen(true);
                      onOpenChange(false);
                      return;
                    }
                    setLocation(item.path);
                    onOpenChange(false);
                  }}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      iconBgMap[item.colorKey],
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-tight text-muted-foreground group-hover:text-foreground">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
