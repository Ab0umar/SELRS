import { useRoute } from "wouter";
import { AlertTriangle } from "lucide-react";
import { QuickPatientEntryForm } from "@/components/dashboard/QuickPatientEntryForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { parseQuickEntryPatientId } from "@/lib/quick-entry-patient-id";
import { ROUTES } from "@shared/routes";

export default function QuickPatientEntry() {
  const [, params] = useRoute("/quick-entry/:id");
  const { goTo } = useAppNavigation();
  const parsed = parseQuickEntryPatientId(params?.id);

  if (parsed.status === "invalid") {
    return (
      <div className="min-h-screen selrs-page-bg p-6" dir="rtl">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-3xl font-bold">رقم المريض غير صالح</h1>
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>رابط غير صالح</AlertTitle>
            <AlertDescription>
              <p>
                هذا الرابط لا يحتوي على رقم مريض صالح، لذلك لا يظهر نموذج
                الفحص هنا حتى لا يُسجَّل الفحص في ملف مريض آخر بالخطأ.
              </p>
            </AlertDescription>
          </Alert>
          <Button type="button" onClick={() => goTo(ROUTES.quickEntry)}>
            بدء فحص سريع جديد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen selrs-page-bg p-6" dir="rtl">
      <QuickPatientEntryForm
        initialPatientId={
          parsed.status === "valid" ? parsed.patientId : undefined
        }
      />
    </div>
  );
}
