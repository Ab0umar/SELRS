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
import {
  Users,
  Activity,
  Clock,
  Syringe,
  ChevronDown,
  ChevronLeft,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const dateLabel = new Date(selectedDate).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const tiles = [
    {
      label: "مرضى اليوم",
      value: total,
      icon: Users,
      cls: "bg-primary/10 text-primary",
      bar: "bg-primary",
    },
    {
      label: "تم معالجتهم",
      value: treated,
      icon: Activity,
      cls: "bg-success/15 text-success",
      bar: "bg-success",
    },
    {
      label: "في الانتظار",
      value: waiting,
      icon: Clock,
      cls: "bg-warning/15 text-warning",
      bar: "bg-warning",
    },
    {
      label: "العمليات",
      value: opsCount,
      icon: Syringe,
      cls: "bg-secondary/15 text-secondary",
      bar: "bg-secondary",
    },
  ];

  const isLoading = queueLoading || opsQuery.isLoading;
  const refreshToday = () => {
    void utils.medical.getTodayPatientsByQueueStatus.invalidate();
    void utils.medical.getTodayOperationLists.invalidate();
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground p-4 sm:p-6"
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
        {/* ── Quick Actions Bento Card ─────────────────────────────────── */}
        <div className="bg-card border border-border/60 rounded-3xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0">
              <QuickActions
                onOpenMeasurementsMedicalFile={openMedicalFilePicker}
                onOpenOperationsBooking={() => setBookingOpen(true)}
              />
            </div>
            {(userRole === "reception" || userRole === "admin") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/booking-triage/portal-bookings")}
                className="gap-2 shrink-0 rounded-xl"
              >
                <CalendarDays className="size-4" />
                حجوزات البوابة
              </Button>
            )}
          </div>
        </div>

        {/* ── Main Appointments Bento Card ──────────────────────────────── */}
        <div className="bg-card border border-border/60 rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
            <h3 className="text-base font-semibold leading-tight text-foreground">
              مرضى اليوم و العمليات
            </h3>
          </div>
          <div className="p-4">
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
