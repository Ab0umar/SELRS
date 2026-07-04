import { useMemo, useState } from "react";
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
  Repeat,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import { AddPortalBookingDialog } from "@/components/dashboard/AddPortalBookingDialog";
import { FollowupQuickDialog } from "@/components/dashboard/FollowupQuickDialog";

type QuickActionItem =
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "quick-entry-dialog";
      permPath: string;
    }
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "schedule-dialog";
      permPath: string;
    }
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "portal-booking-dialog";
      permPath: string;
    }
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "measurements-panel";
      permPath: string;
    }
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "operations-booking-dialog";
      permPath: string;
    }
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "pick-patient";
      page: PageKey;
      permPath: string;
    }
  | {
      label: string;
      icon: LucideIcon;
      color: string;
      kind: "followup-dialog";
      permPath: string;
    };

const quickActions: QuickActionItem[] = [
  {
    label: "تسجيل مريض",
    icon: UserPlus,
    color: "bg-primary/15 text-primary",
    kind: "quick-entry-dialog",
    permPath: "/patients",
  },
  {
    label: "تحديد موعد / كشف",
    icon: CalendarPlus,
    color: "bg-warning/15 text-warning",
    kind: "portal-booking-dialog",
    permPath: "/operations",
  },
  {
    label: "حجز العمليات",
    icon: Syringe,
    color: "bg-success/15 text-success",
    kind: "operations-booking-dialog",
    permPath: "/operations",
  },
  {
    label: "متابعة",
    icon: Repeat,
    color: "bg-primary/15 text-primary",
    kind: "followup-dialog",
    permPath: "action/followup-queue",
  },
  {
    label: "القياسات و الفحص",
    icon: Eye,
    color: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    kind: "measurements-panel",
    permPath: "/examination",
  },
  {
    label: "مقاس النظارة",
    icon: Glasses,
    color: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    kind: "pick-patient",
    page: "refraction",
    permPath: "/refraction",
  },
  {
    label: "بنتاكام",
    icon: CircleDot,
    color: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    kind: "pick-patient",
    page: "pentacam-sheet",
    permPath: "/sheets",
  },
  {
    label: "الروشتات",
    icon: Pill,
    color: "bg-warning text-warning-foreground hover:bg-warning/90",
    kind: "pick-patient",
    page: "write-prescription",
    permPath: "/prescription",
  },
  {
    label: "تحاليل و اشعه",
    icon: FlaskConical,
    color: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    kind: "pick-patient",
    page: "request-tests",
    permPath: "/request-tests",
  },
  {
    label: "تشخيص / تقرير",
    icon: FileText,
    color: "bg-primary text-primary-foreground hover:bg-primary/90",
    kind: "pick-patient",
    page: "medical-reports",
    permPath: "/medical-reports",
  },
  {
    label: "الملف الطبي",
    icon: FileHeart,
    color: "bg-primary text-primary-foreground hover:bg-primary/90",
    kind: "pick-patient",
    page: "patient-details",
    permPath: "/patient-file",
  },
  {
    label: "تقرير المريض",
    icon: FileSpreadsheet,
    color: "bg-muted/60 text-muted-foreground hover:bg-muted/80",
    kind: "pick-patient",
    page: "patient-summary",
    permPath: "/patient-summary",
  },
];

function normPerm(raw: string): string {
  return (
    raw
      .replace(/:r[w]?$/, "")
      .split("?")[0]
      .split("#")[0] || "/"
  );
}

function isPermAllowed(permPath: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((p) => {
    const base = p.includes("/:") ? p.split("/:")[0] : p;
    return (
      base === permPath ||
      permPath.startsWith(base + "/") ||
      base.startsWith(permPath + "/")
    );
  });
}

export type QuickActionsProps = {
  onOpenMeasurementsMedicalFile?: () => void;
  onOpenOperationsBooking?: () => void;
};

export function QuickActions({
  onOpenMeasurementsMedicalFile,
  onOpenOperationsBooking,
}: QuickActionsProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [portalBookingOpen, setPortalBookingOpen] = useState(false);
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [pickPage, setPickPage] = useState<PageKey | null>(null);

  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedPaths = useMemo(() => {
    if (isAdmin) return [];
    const raw = (permissionsQuery.data ?? []) as string[];
    return Array.from(new Set(raw.map(normPerm).filter((p) => p.length > 0)));
  }, [isAdmin, permissionsQuery.data]);

  const visibleActions = useMemo(() => {
    if (isAdmin) return quickActions;
    if (!permissionsQuery.isSuccess) return [];
    return quickActions.filter((a) => isPermAllowed(a.permPath, allowedPaths));
  }, [isAdmin, permissionsQuery.isSuccess, allowedPaths]);

  const primaryActions = visibleActions.slice(0, 4);
  const secondaryActions = visibleActions.slice(4);


  const navigateForPatient = (page: PageKey, patientId: number) => {
    const path = patientNavPathForPageKey(page, patientId);
    if (path) setLocation(path);
    else setLocation("/dashboard");
  };

  const handleAction = (action: QuickActionItem) => {
    if (action.kind === "quick-entry-dialog") {
      setQuickEntryOpen(true);
      return;
    }
    if (action.kind === "schedule-dialog") {
      setScheduleOpen(true);
      return;
    }
    if (action.kind === "portal-booking-dialog") {
      setPortalBookingOpen(true);
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
    if (action.kind === "measurements-panel") {
      if (onOpenMeasurementsMedicalFile) {
        onOpenMeasurementsMedicalFile();
        return;
      }
      setLocation("/examination");
      return;
    }
    if (action.kind === "followup-dialog") {
      setFollowupDialogOpen(true);
      return;
    }
    setPickPage(action.page);
  };

  if (!visibleActions.length) return null;

  return (
    <>
      <QuickPatientEntryDialog
        open={quickEntryOpen}
        onOpenChange={setQuickEntryOpen}
      />
      <ScheduleVisitDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <AddPortalBookingDialog
        open={portalBookingOpen}
        onOpenChange={setPortalBookingOpen}
      />
      <FollowupQuickDialog
        open={followupDialogOpen}
        onOpenChange={setFollowupDialogOpen}
      />
      <Dialog
        open={pickPage != null}
        onOpenChange={(o) => !o && setPickPage(null)}
      >
        <DialogContent
          className="max-h-[min(92dvh,calc(100vh-24px))] overflow-x-hidden overflow-y-auto sm:max-w-lg"
          dir="rtl"
        >
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">اختر المريض</DialogTitle>
            <DialogDescription className="text-right text-muted-foreground">
              أدخل كود المريض أو ابحث بالاسم ثم أكّد للانتقال
            </DialogDescription>
          </DialogHeader>
          <PatientPicker
            onSelect={(patient) => {
              if (pickPage && patient?.id)
                navigateForPatient(pickPage, patient.id);
              setPickPage(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div aria-label="اختصارات لوحة التحكم" className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {primaryActions.map((action) => renderActionButton(action, true))}
        </div>
        {secondaryActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions.map((action) => renderActionButton(action, false))}
          </div>
        )}
      </div>
    </>
  );

  function renderActionButton(action: QuickActionItem, isPrimary: boolean) {
    const Icon = action.icon;
    return (
      <button
        key={action.label}
        type="button"
        aria-label={action.label}
        onClick={() => handleAction(action)}
        className={cn(
          "group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-0 text-sm font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] sm:w-auto sm:justify-start sm:px-3",
          isPrimary
            ? "border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-border/60 bg-background text-foreground hover:border-primary/25 hover:bg-accent/30",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            isPrimary
              ? "bg-white/15 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">
          {action.label}
        </span>
      </button>
    );
  }
}
