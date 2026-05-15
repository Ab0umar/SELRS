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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { patientNavPathForPageKey } from "@/lib/patientNavPaths";
import type { PageKey } from "@/lib/dashboard-data";
import { ScheduleVisitDialog } from "@/components/dashboard/ScheduleVisitDialog";

const semanticColors = {
  success: { text: "text-success", bg: "hover:bg-success/10", border: "border-success/20" },
  info:    { text: "text-info",    bg: "hover:bg-info/10",    border: "border-info/20"    },
  warning: { text: "text-warning", bg: "hover:bg-warning/10", border: "border-warning/20" },
  error:   { text: "text-error",   bg: "hover:bg-error/10",   border: "border-error/20"   },
} as const;

type SemanticType = keyof typeof semanticColors;

const groupLabels = {
  scheduling: "المواعيد",
  records:    "الملفات الطبية",
  exams:      "الفحوصات والقياسات",
  treatment:  "العلاج والتحاليل",
  reports:    "التقارير",
} as const;

type GroupKey = keyof typeof groupLabels;

function p(id: number, page: PageKey): string {
  return patientNavPathForPageKey(page, id) ?? "/dashboard";
}

type ShortcutRow = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  semantic: SemanticType;
  group: GroupKey;
  path: string;
};

function actionsForPatient(patientId: number): ShortcutRow[] {
  return [
    { key: "schedule", label: "حجز موعد",        path: "",                                      icon: CalendarPlus,  semantic: "info",    group: "scheduling" },
    { key: "file",     label: "الملف الطبي",      path: p(patientId, "patient-details"),         icon: FileHeart,     semantic: "success", group: "records"    },
    { key: "summary",  label: "تقرير المريض",     path: p(patientId, "patient-summary"),         icon: FileSpreadsheet, semantic: "info",  group: "records"    },
    { key: "exam",     label: "القياسات و الفحص", path: p(patientId, "examination-form"),        icon: Eye,           semantic: "warning", group: "exams"      },
    { key: "ref",      label: "مقاس النظارة",     path: p(patientId, "refraction"),              icon: Glasses,       semantic: "warning", group: "exams"      },
    { key: "penta",    label: "بنتاكام",          path: p(patientId, "pentacam-sheet"),          icon: CircleDot,     semantic: "warning", group: "exams"      },
    { key: "rx",       label: "الروشتات",         path: p(patientId, "write-prescription"),      icon: Pill,          semantic: "error",   group: "treatment"  },
    { key: "tests",    label: "تحاليل و اشعه",   path: p(patientId, "request-tests"),           icon: FlaskConical,  semantic: "error",   group: "treatment"  },
    { key: "diag",     label: "تشخيص / تقرير",   path: p(patientId, "medical-reports"),         icon: FileText,      semantic: "info",    group: "reports"    },
  ];
}

export type TodayPatientShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName?: string | null;
  onOpenMeasurementsMedicalFile?: (patientId: number) => void;
  readOnly?: boolean;
};

export function TodayPatientShortcutsDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onOpenMeasurementsMedicalFile,
  readOnly = false,
}: TodayPatientShortcutsDialogProps) {
  const [, setLocation] = useLocation();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const valid = Number.isFinite(patientId) && patientId > 0;
  const allRows = valid ? actionsForPatient(patientId) : [];
  const primaryRow = allRows.find((r) => r.key === "exam");
  const rows = allRows.filter((r) => r.key !== "exam" && !(readOnly && r.key === "schedule"));

  const handleAction = (item: ShortcutRow) => {
    if (item.key === "schedule") {
      if (readOnly) return;
      setScheduleOpen(true);
      onOpenChange(false);
      return;
    }
    if (item.key === "exam" && onOpenMeasurementsMedicalFile) {
      onOpenMeasurementsMedicalFile(patientId);
      onOpenChange(false);
      return;
    }
    setLocation(item.path);
    onOpenChange(false);
  };

  return (
    <>
      <ScheduleVisitDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        prefilledPatientId={valid ? patientId : undefined}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-xl"
          dir="rtl"
        >
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-base font-semibold">
              اختصارات المريض
              {patientName && (
                <span className="text-muted-foreground font-normal"> — {patientName}</span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              اختر وجهة العمل لهذا المريض
            </DialogDescription>
          </DialogHeader>

          {/* Groups */}
          <div className="px-4 pb-5 space-y-4 overflow-y-auto">
            {!valid ? (
              <p className="text-center text-sm text-muted-foreground py-4">لا يوجد مريض محدد</p>
            ) : primaryRow ? (
              <>
                {readOnly ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    عرض تاريخي للقراءة فقط. اختصارات الحجز متوقفة.
                  </div>
                ) : null}
                {/* Primary action */}
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full h-auto py-4 px-4 gap-3 justify-center text-sm font-semibold transition-colors border-2",
                    semanticColors[primaryRow.semantic].text,
                    semanticColors[primaryRow.semantic].bg,
                    semanticColors[primaryRow.semantic].border,
                  )}
                  onClick={() => handleAction(primaryRow)}
                >
                  <primaryRow.icon className="h-5 w-5 shrink-0" />
                  <span>{primaryRow.label}</span>
                </Button>
                {/* Remaining groups */}
                {(
                  Object.keys(groupLabels) as GroupKey[]).map((groupKey) => {
                  const groupItems = rows.filter((r) => r.group === groupKey);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={groupKey}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {groupLabels[groupKey]}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {groupItems.map((item) => {
                          const Icon = item.icon;
                          const colors = semanticColors[item.semantic];
                          return (
                            <Button
                              key={item.key}
                              type="button"
                              variant="outline"
                              className={cn(
                                "h-auto py-3 px-3 gap-2.5 justify-start text-xs font-medium transition-colors border",
                                colors.text,
                                colors.bg,
                                colors.border,
                              )}
                              onClick={() => handleAction(item)}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{item.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
