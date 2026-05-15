import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { TodayBottleneckBoard } from "@/components/today/TodayBottleneckBoard";
import { QuickPatientEntryDialog } from "@/components/dashboard/QuickPatientEntryDialog";
import { ScheduleVisitDialog } from "@/components/dashboard/ScheduleVisitDialog";
import { useMedicalFileLauncher } from "@/hooks/useMedicalFileLauncher";
import { OperationsBookingQuickDialog } from "@/components/operations/OperationsBookingQuickDialog";
import { trpc } from "@/lib/trpc";

export default function TodayPatients() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } = useMedicalFileLauncher();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="selrs-page-bg flex h-full flex-col" dir="rtl">
      {medicalFilePortal}
      <QuickPatientEntryDialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <ScheduleVisitDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => {
          void utils.medical.getTodayOperationLists.invalidate();
        }}
      />
      <TodayBottleneckBoard
        onOpenAddPatient={() => setQuickEntryOpen(true)}
        onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
        onOpenMeasurementsPicker={openMedicalFilePicker}
        onOpenOperationsBooking={() => setBookingOpen(true)}
        onOpenScheduleVisit={() => setScheduleOpen(true)}
      />
    </div>
  );
}
