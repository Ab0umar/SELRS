import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMedicalFileLauncher } from "@/hooks/useMedicalFileLauncher";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import { AppointmentsSection } from "@/components/dashboard/appointments-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { QuickPatientEntryDialog } from "@/components/dashboard/QuickPatientEntryDialog";
import { ScheduleVisitDialog } from "@/components/dashboard/ScheduleVisitDialog";
import { AddPortalBookingDialog } from "@/components/dashboard/AddPortalBookingDialog";
import { OperationsBookingQuickDialog } from "@/components/operations/OperationsBookingQuickDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { Users, Activity, Clock, Syringe } from "lucide-react";

// ─── Shared primitives ────────────────────────────────────────────────────────
function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-background shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
      <h3 className="text-base font-semibold leading-tight text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        <span>{label}</span>
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}


// ─── Main page ────────────────────────────────────────────────────────────────
export default function TodayPatients() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } =
    useMedicalFileLauncher();

  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [portalBookingOpen, setPortalBookingOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateIso());

  const utils = trpc.useUtils();

  const { merged, isLoading: queueLoading } =
    useTodayQueuePatientsMerged(selectedDate);
  const opsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const total = merged.length;
  const treated = merged.filter((p) => p.queueStatus === "treated").length;
  const waiting = total - treated;
  const completionRate = total > 0 ? Math.round((treated / total) * 100) : 0;
  const opsCount = opsQuery.data?.length ?? 0;

  const tiles = [
    { label: "مرضى اليوم",  value: total,   icon: Users,     cls: "bg-primary/10 text-primary",    bar: "bg-primary" },
    { label: "تم معالجتهم", value: treated,  icon: Activity,  cls: "bg-success/15 text-success",    bar: "bg-success" },
    { label: "في الانتظار", value: waiting,  icon: Clock,     cls: "bg-warning/15 text-warning",    bar: "bg-warning" },
    { label: "العمليات",    value: opsCount, icon: Syringe,   cls: "bg-secondary/15 text-secondary", bar: "bg-secondary" },
  ];

  const isLoading = queueLoading || opsQuery.isLoading;

  return (
    <div className="selrs-page-bg -m-3 min-h-full px-3 py-4 sm:-m-4 sm:px-4 sm:py-5" dir="rtl">
      {medicalFilePortal}
      <QuickPatientEntryDialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <ScheduleVisitDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <AddPortalBookingDialog open={portalBookingOpen} onOpenChange={setPortalBookingOpen} />
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => { void utils.medical.getTodayOperationLists.invalidate(); }}
      />

      <div className="mx-auto w-full max-w-[1440px] space-y-4">

        {/* Quick actions */}
        <Surface className="overflow-hidden px-4 py-3">
          <QuickActions
            onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
            onOpenOperationsBooking={() => setBookingOpen(true)}
          />
        </Surface>

        {/* Tiles */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {tiles.map((_, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-background px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Surface key={t.label} className="relative overflow-hidden px-3 py-2.5">
                  <div className={cn("absolute inset-x-0 top-0 h-1", t.bar)} aria-hidden />
                  <div className="flex items-center gap-3 pt-1">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", t.cls)}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-none text-foreground tabular-nums">
                        {t.value}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {t.label}
                      </p>
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}

        {/* Completion bar */}
        <Surface className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-sm font-medium text-foreground">نسبة الإنجاز</span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="نسبة الإنجاز"
            >
              <div
                className={cn(
                  "h-full w-full origin-right rounded-full transition-transform duration-500 ease-out",
                  completionRate >= 80 ? "bg-success" : completionRate >= 50 ? "bg-primary" : "bg-secondary",
                )}
                style={{ transform: `scaleX(${completionRate / 100})` }}
              />
            </div>
            <span className="w-10 text-left text-sm font-semibold tabular-nums">
              {completionRate}%
            </span>
          </div>
        </Surface>

        {/* Appointments — full width */}
        <Surface>
          <SectionHeader title="مرضى اليوم و العمليات" />
          <div className="p-3">
            <AppointmentsSection
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
            />
          </div>
        </Surface>

      </div>
    </div>
  );
}
