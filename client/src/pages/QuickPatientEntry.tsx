import { useRoute } from "wouter";
import { QuickPatientEntryForm } from "@/components/dashboard/QuickPatientEntryForm";

export default function QuickPatientEntry() {
  const [, params] = useRoute("/quick-entry/:id");
  const initialPatientId = params?.id ? parseInt(params.id, 10) : 0;

  return (
    <div className="min-h-screen selrs-page-bg p-6" dir="rtl">
      <QuickPatientEntryForm initialPatientId={initialPatientId > 0 ? initialPatientId : undefined} />
    </div>
  );
}
