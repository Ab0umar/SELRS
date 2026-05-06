import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { AppointmentsSection } from "@/components/dashboard/appointments-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useMedicalFileLauncher } from "@/hooks/useMedicalFileLauncher";
import { OperationsBookingQuickDialog } from "@/components/operations/OperationsBookingQuickDialog";
import { BookingShortcutModule } from "@/components/dashboard/BookingShortcutModule";
import { trpc } from "@/lib/trpc";

/**
 * مرضى اليوم — نفس محتوى قسم «مرضى اليوم و العمليات» في لوحة التحكم (`AppointmentsSection`).
 */
export default function TodayPatients() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } = useMedicalFileLauncher();
  const [bookingOpen, setBookingOpen] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen selrs-page-bg flex flex-col" dir="rtl">
      {medicalFilePortal}
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => {
          void utils.medical.getTodayOperationLists.invalidate();
        }}
      />
      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 py-6 sm:px-4">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">مرضى اليوم و العمليات</h1>
        
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickActions onOpenMeasurementsMedicalFile={openMedicalFilePicker} />
          </div>
          <div className="flex flex-col">
            <BookingShortcutModule onAddBooking={() => setBookingOpen(true)} />
          </div>
        </div>

        <AppointmentsSection onOpenMeasurementsMedicalFile={openMedicalFileForPatient} />
      </main>
    </div>
  );
}
