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
import { useAuth } from "@/hooks/useAuth";
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
  { label: "تسجيل مريض", icon: UserPlus, color: "bg-primary text-primary-foreground hover:bg-primary/20", kind: "quick-entry-dialog" },
  { label: "حجز موعد", icon: CalendarPlus, color: "bg-primary text-primary-foreground hover:bg-primary/20", kind: "schedule-dialog" },
  { label: "القياسات و الفحص", icon: Eye, color: "bg-secondary text-secondary-foreground hover:bg-secondary/20", kind: "measurements-panel" },
  { label: "حجز العمليات", icon: Syringe, color: "bg-success text-success-foreground hover:bg-success/20", kind: "operations-booking-dialog" },
  { label: "مقاس النظارة", icon: Glasses, color: "bg-secondary text-secondary-foreground hover:bg-secondary/20", kind: "pick-patient", page: "refraction" },
  { label: "بنتاكام", icon: CircleDot, color: "bg-secondary text-secondary-foreground hover:bg-secondary/20", kind: "pick-patient", page: "pentacam-sheet" },
  { label: "الروشتات", icon: Pill, color: "bg-warning text-warning-foreground hover:bg-warning/20", kind: "pick-patient", page: "write-prescription" },
  { label: "تحاليل و اشعه", icon: FlaskConical, color: "bg-secondary text-secondary-foreground hover:bg-secondary/20", kind: "pick-patient", page: "request-tests" },
  { label: "تشخيص / تقرير", icon: FileText, color: "bg-primary text-primary-foreground hover:bg-primary/20", kind: "pick-patient", page: "medical-reports" },
  { label: "الملف الطبي", icon: FileHeart, color: "bg-primary text-primary-foreground hover:bg-primary/20", kind: "pick-patient", page: "patient-details" },
  { label: "تقرير المريض", icon: FileSpreadsheet, color: "bg-muted/60 text-muted-foreground hover:bg-muted/80", kind: "pick-patient", page: "patient-summary" },
];

type UserRole =
  | "admin"
  | "manager"
  | "reception"
  | "nurse"
  | "technician"
  | "doctor"
  | "accountant"
  | "";

function actionsForRole(userRole: UserRole): QuickActionItem[] {
  const all = quickActions;
  const byKind = <K extends QuickActionItem["kind"]>(kind: K) =>
    all.filter((a) => a.kind === kind);
  const byPage = (page: PageKey) => all.find((a) => a.kind === "pick-patient" && a.page === page);

  const reception = [
    ...byKind("quick-entry-dialog"),
    ...byKind("schedule-dialog"),
    ...byKind("operations-booking-dialog"),
  ];

  const nurse = [
    ...byKind("measurements-panel"),
    byPage("refraction"),
  ].filter(Boolean) as QuickActionItem[];

  const technician = [
    ...byKind("measurements-panel"),
    byPage("refraction"),
    byPage("pentacam-sheet"),
  ].filter(Boolean) as QuickActionItem[];

  const doctor = [
    ...byKind("measurements-panel"),
    byPage("refraction"),
    byPage("pentacam-sheet"),
    byPage("write-prescription"),
    byPage("request-tests"),
    byPage("medical-reports"),
    byPage("patient-details"),
    byPage("patient-summary"),
  ].filter(Boolean) as QuickActionItem[];

  if (userRole === "admin" || userRole === "manager") return all;
  if (userRole === "reception") return reception;
  if (userRole === "nurse") return nurse;
  if (userRole === "technician") return technician;
  if (userRole === "doctor") return doctor;
  return all;
}

export type QuickActionsProps = {
  /** «القياسات و الفحص»: فتح منتقي المريض ثم `MedicalFilePanel`. */
  onOpenMeasurementsMedicalFile?: () => void;
  /** «حجز العمليات»: فتح نافذة حجز العمليات السريعة (موديال). */
  onOpenOperationsBooking?: () => void;
};

export function QuickActions({ onOpenMeasurementsMedicalFile, onOpenOperationsBooking }: QuickActionsProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pickPage, setPickPage] = useState<PageKey | null>(null);
  const userRole = String(user?.role ?? "").toLowerCase() as UserRole;
  const visibleActions = actionsForRole(userRole);

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

      {/* Primary CTAs: Register, Schedule & Operations */}
      {visibleActions.filter((a) => ["quick-entry-dialog", "schedule-dialog", "operations-booking-dialog"].includes(a.kind)).length > 0 && (
        <div className="flex gap-3">
          {visibleActions.filter((a) => ["quick-entry-dialog", "schedule-dialog", "operations-booking-dialog"].includes(a.kind)).map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                aria-label={action.label}
                onClick={() => {
                  if (action.kind === "quick-entry-dialog") { setQuickEntryOpen(true); return; }
                  if (action.kind === "schedule-dialog") { setScheduleOpen(true); return; }
                  if (action.kind === "operations-booking-dialog") {
                    if (onOpenOperationsBooking) { onOpenOperationsBooking(); return; }
                    setLocation("/operations");
                    return;
                  }
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-[background-color,transform] active:scale-[0.97]",
                  i === 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/15"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Clinical tools: Measurements, refraction, pentacam, tests */}
      {visibleActions.some((a) => a.kind === "measurements-panel" || (a.kind === "pick-patient" && ["refraction", "pentacam-sheet", "request-tests"].includes(("page" in a) ? a.page : ""))) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {visibleActions
            .filter((a) => a.kind === "measurements-panel" || (a.kind === "pick-patient" && ["refraction", "pentacam-sheet", "request-tests"].includes(("page" in a) ? a.page : "")))
            .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  aria-label={action.label}
                  onClick={() => {
                    if (action.kind === "measurements-panel") {
                      if (onOpenMeasurementsMedicalFile) { onOpenMeasurementsMedicalFile(); return; }
                      setLocation("/examination");
                      return;
                    }
                    if (action.kind === "pick-patient") { setPickPage(action.page); }
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-muted/60 active:scale-[0.97]"
                >
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded", action.color)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  {action.label}
                </button>
              );
            })}
        </div>
      )}

      {/* Admin/report links: Prescriptions, reports, file, summary */}
      {visibleActions.some((a) => a.kind === "pick-patient" && ["write-prescription", "medical-reports", "patient-details", "patient-summary"].includes(("page" in a) ? a.page : "")) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleActions
            .filter((a) =>
              (a.kind === "pick-patient" && ["write-prescription", "medical-reports", "patient-details", "patient-summary"].includes(("page" in a) ? a.page : ""))
            )
            .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  aria-label={action.label}
                  onClick={() => {
                    if (action.kind === "pick-patient") { setPickPage(action.page); }
                  }}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-[color,background-color,transform] hover:bg-muted text-muted-foreground active:scale-[0.97]"
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {action.label}
                </button>
              );
            })}
        </div>
      )}
    </>
  );
}
