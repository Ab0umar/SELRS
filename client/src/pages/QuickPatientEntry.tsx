import { useLocation, useRoute } from "wouter";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { QuickPatientEntryForm } from "@/components/dashboard/QuickPatientEntryForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { parseQuickEntryPatientId } from "@/lib/quick-entry-patient-id";
import { ROUTES } from "@shared/routes";

export default function QuickPatientEntry() {
  const [location] = useLocation();
  const [, params] = useRoute("/quick-entry/:id");
  const { goBack, goTo } = useAppNavigation();
  const parsed = parseQuickEntryPatientId(params?.id);
  // This page renders both standalone (/quick-entry) and inside the patients
  // hub (/patients-hub/quick). AppShell already supplies the page's <main>
  // landmark and the hub draws its own back control, so this page adds
  // neither and shows a back button only on its own routes.
  const isStandaloneRoute =
    location === ROUTES.quickEntry ||
    location.startsWith(`${ROUTES.quickEntry}/`);

  return (
    <div className="min-h-screen selrs-page-bg p-6" dir="rtl">
      {isStandaloneRoute && (
        <Button
          variant="outline"
          size="icon"
          className="mb-4 h-11 w-11 shrink-0"
          onClick={() => goBack()}
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      )}
      {parsed.status === "invalid" ? (
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
      ) : (
        <QuickPatientEntryForm
          initialPatientId={
            parsed.status === "valid" ? parsed.patientId : undefined
          }
        />
      )}
    </div>
  );
}
