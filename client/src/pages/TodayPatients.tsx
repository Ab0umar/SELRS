import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { AppointmentsSection } from "@/components/dashboard/appointments-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useMedicalFileLauncher } from "@/hooks/useMedicalFileLauncher";

/**
 * مرضى اليوم — نفس محتوى قسم «مرضى اليوم و العمليات» في لوحة التحكم (`AppointmentsSection`).
 */
export default function TodayPatients() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } = useMedicalFileLauncher();
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen selrs-page-bg flex flex-col" dir="rtl">
      {medicalFilePortal}
      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 py-6 sm:px-4">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">مرضى اليوم و العمليات</h1>
        <QuickActions onOpenMeasurementsMedicalFile={openMedicalFilePicker} />
        <AppointmentsSection onOpenMeasurementsMedicalFile={openMedicalFileForPatient} />
        </main>
    </div>
  );
}
