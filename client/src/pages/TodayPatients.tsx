import { QueueLoadStatus } from "@/components/today/QueueLoadStatus";
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
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import {
  Users,
  Activity,
  Clock,
  Syringe,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { formatCount, summarizeToday } from "@/components/today/todaySummary";

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TodayPatients() {
  const { isAuthenticated, user } = useAuth();
  const userRole = String((user as any)?.role ?? "").toLowerCase();
  const [, setLocation] = useLocation();
  const {
    medicalFilePortal,
    openMedicalFilePicker,
    openMedicalFileForPatient,
  } = useMedicalFileLauncher();

  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [portalBookingOpen, setPortalBookingOpen] = useState(false);
  const [totalsOpen, setTotalsOpen] = useState(true);
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateIso());

  const utils = trpc.useUtils();

  const queue = useTodayQueuePatientsMerged(selectedDate);
  const { merged, isLoading: queueLoading, isError } = queue;
  const opsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  // opsCount sums the operations inside each list (not the number of lists),
  // so the strip agrees with the Operations tab badge.
  const summary = summarizeToday(merged, opsQuery.data);
  const queuePending = queueLoading || isError;
  const opsPending = opsQuery.isLoading || opsQuery.isError;

  const isLoading = queueLoading || opsQuery.isLoading;
  const refreshToday = () => {
    void utils.medical.getTodayPatientsByQueueStatus.invalidate();
    void utils.medical.getTodayOperationLists.invalidate();
  };

  return (
    <div
      className="today-patients-page min-h-screen bg-background text-foreground p-4 sm:p-6"
      dir="rtl"
    >
      {medicalFilePortal}
      <QuickPatientEntryDialog
        open={quickEntryOpen}
        onOpenChange={setQuickEntryOpen}
      />
      <ScheduleVisitDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <AddPortalBookingDialog
        open={portalBookingOpen}
        onOpenChange={setPortalBookingOpen}
      />
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => {
          void utils.medical.getTodayOperationLists.invalidate();
        }}
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <h1 className="sr-only">مرضى اليوم</h1>
        <QueueLoadStatus {...queue} />
        {/* ── Quick Actions Bento Card ─────────────────────────────────── */}
        <div className="bg-card border border-border/60 rounded-3xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0">
              <Button variant="bare"
                type="button"
                aria-expanded={quickActionsOpen}
                onClick={() => setQuickActionsOpen((open) => !open)}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                إجراءات سريعة
                <span aria-hidden>{quickActionsOpen ? "−" : "+"}</span>
              </Button>
              {quickActionsOpen ? (
                <QuickActions
                  onOpenMeasurementsMedicalFile={openMedicalFilePicker}
                  onOpenOperationsBooking={() => setBookingOpen(true)}
                  extraPrimaryAction={
                    <div className="flex items-center gap-2">
                    {userRole === "reception" || userRole === "admin" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLocation("/admin-hub/portal-bookings")
                        }
                        className="gap-2 shrink-0 rounded-xl"
                      >
                        <CalendarDays className="size-4" />
                        حجوزات البوابة
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={refreshToday}
                      disabled={isLoading}
                      aria-label="تحديث"
                      title="تحديث"
                      className="shrink-0 rounded-xl"
                    >
                      <RefreshCw
                        className={cn("size-4", isLoading && "animate-spin")}
                      />
                    </Button>
                    </div>
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Today Summary Strip ──────────────────────────────────────── */}
        <div className="bg-card border border-border/60 rounded-3xl p-4 shadow-sm">
          <Button
            variant="bare"
            type="button"
            aria-expanded={totalsOpen}
            onClick={() => setTotalsOpen((open) => !open)}
            className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ملخص اليوم
            <span aria-hidden>{totalsOpen ? "−" : "+"}</span>
          </Button>
          {totalsOpen ? (
            <div
              className={cn(
                STAT_CARDS_MOBILE_ROW,
                "sm:grid sm:grid-cols-4 sm:gap-3",
              )}
            >
              <StatCard
                label="مرضى اليوم"
                value={queuePending ? "—" : formatCount(summary.total)}
                icon={Users}
                iconColor="bg-primary/10 text-primary"
              />
              <StatCard
                label="تم معالجتهم"
                value={queuePending ? "—" : formatCount(summary.treated)}
                icon={Activity}
                iconColor="bg-success/15 text-success"
                description={
                  queuePending
                    ? undefined
                    : `نسبة الإنجاز ${summary.completionRate}%`
                }
              />
              <StatCard
                label="في الانتظار"
                value={queuePending ? "—" : formatCount(summary.waiting)}
                icon={Clock}
                iconColor="bg-warning/15 text-warning-text"
              />
              <StatCard
                label="العمليات"
                value={opsPending ? "—" : formatCount(summary.opsCount)}
                icon={Syringe}
                iconColor="bg-secondary/15 text-primary"
              />
            </div>
          ) : null}
        </div>

        {/* ── Main Appointments Bento Card ──────────────────────────────── */}
        <div className="queue-patient-frame bg-card border border-border/60 rounded-3xl shadow-sm overflow-hidden">
          <div className="queue-patient-frame-body p-4">
            <AppointmentsSection
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
