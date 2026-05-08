import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  UserPlus,
  CalendarPlus,
  Eye,
  Pill,
  FileHeart,
  FileSpreadsheet,
  FlaskConical,
  FileText,
  Glasses,
  CircleDot,
  Syringe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PatientPicker from "@/components/PatientPicker";
import { patientNavPathForPageKey } from "@/lib/patientNavPaths";
import type { PageKey } from "@/lib/dashboard-data";
import { QuickPatientEntryDialog } from "@/components/dashboard/QuickPatientEntryDialog";
import { ScheduleVisitDialog } from "@/components/dashboard/ScheduleVisitDialog";

type QuickActionItem =
  | { label: string; icon: LucideIcon; color: string; kind: "quick-entry-dialog" }
  | { label: string; icon: LucideIcon; color: string; kind: "schedule-dialog" }
  | { label: string; icon: LucideIcon; color: string; kind: "measurements-panel" }
  | { label: string; icon: LucideIcon; color: string; kind: "operations-booking-dialog" }
  | { label: string; icon: LucideIcon; color: string; kind: "pick-patient"; page: PageKey };

const quickActions: QuickActionItem[] = [
  { label: "تسجيل مريض", icon: UserPlus, color: "bg-primary/10 text-primary hover:bg-primary/20", kind: "quick-entry-dialog" },
  { label: "حجز موعد", icon: CalendarPlus, color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400", kind: "schedule-dialog" },
  { label: "القياسات و الفحص", icon: Eye, color: "bg-primary/10 text-primary hover:bg-primary/15 dark:text-primary", kind: "measurements-panel" },
  { label: "حجز العمليات", icon: Syringe, color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400", kind: "operations-booking-dialog" },
  { label: "مقاس النظارة", icon: Glasses, color: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-400", kind: "pick-patient", page: "refraction" },
  { label: "بنتاكام", icon: CircleDot, color: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400", kind: "pick-patient", page: "pentacam-sheet" },
  { label: "الروشتات", icon: Pill, color: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400", kind: "pick-patient", page: "write-prescription" },
  { label: "تحاليل و اشعه", icon: FlaskConical, color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400", kind: "pick-patient", page: "request-tests" },
  { label: "تشخيص / تقرير", icon: FileText, color: "bg-primary/10 text-primary hover:bg-primary/20 dark:text-primary", kind: "pick-patient", page: "medical-reports" },
  { label: "الملف الطبي", icon: FileHeart, color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 dark:text-pink-400", kind: "pick-patient", page: "patient-details" },
  { label: "تقرير المريض", icon: FileSpreadsheet, color: "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 dark:text-slate-300 dark:bg-slate-400/10", kind: "pick-patient", page: "patient-summary" },
];

export type QuickActionsProps = {
  /** «القياسات و الفحص»: فتح منتقي المريض ثم `MedicalFilePanel`. */
  onOpenMeasurementsMedicalFile?: () => void;
  /** «حجز العمليات»: فتح نافذة حجز العمليات السريعة (موديال). */
  onOpenOperationsBooking?: () => void;
};

export function QuickActions({ onOpenMeasurementsMedicalFile, onOpenOperationsBooking }: QuickActionsProps) {
  const [, setLocation] = useLocation();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pickPage, setPickPage] = useState<PageKey | null>(null);

  const navigateForPatient = (page: PageKey, patientId: number) => {
    const path = patientNavPathForPageKey(page, patientId);
    if (path) setLocation(path);
    else setLocation("/dashboard");
  };

  return (
    <>
      <QuickPatientEntryDialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <ScheduleVisitDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <Dialog open={pickPage != null} onOpenChange={(o) => !o && setPickPage(null)}>
        <DialogContent className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-lg" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">اختر المريض</DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">
              أدخل كود المريض أو ابحث بالاسم ثم أكّد للانتقال
            </DialogDescription>
          </DialogHeader>
          <PatientPicker
            onSelect={(patient) => {
              if (pickPage && patient?.id) {
                navigateForPatient(pickPage, patient.id);
              }
              setPickPage(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-6 gap-0.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 sm:gap-1.5">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                if (action.kind === "quick-entry-dialog") {
                  setQuickEntryOpen(true);
                  return;
                }
                if (action.kind === "schedule-dialog") {
                  setScheduleOpen(true);
                  return;
                }
                if (action.kind === "measurements-panel") {
                  if (onOpenMeasurementsMedicalFile) {
                    onOpenMeasurementsMedicalFile();
                    return;
                  }
                  setLocation("/examination");
                  return;
                }
                if (action.kind === "operations-booking-dialog") {
                  if (onOpenOperationsBooking) {
                    onOpenOperationsBooking();
                    return;
                  }
                  setLocation("/operations");
                  return;
                }
                setPickPage(action.page);
              }}
              className={cn(
                "flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer group",
                "py-0.5 px-0 sm:gap-1 sm:rounded-lg sm:py-1.5 sm:px-0.5",
                index >= 10 && "max-sm:hidden",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl transition-colors shrink-0",
                  "h-9 w-9 sm:h-9 sm:w-9 sm:rounded-lg",
                  action.color,
                )}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </div>
              <span className="hidden sm:block text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center truncate w-full">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
