import { useRoute } from "wouter";
import { QuickPatientEntryForm } from "@/components/dashboard/QuickPatientEntryForm";
import { parseQuickEntryPatientId } from "@/lib/quick-entry-patient-id";

export default function QuickPatientEntry() {
  const [, params] = useRoute("/quick-entry/:id");
  const parsed = parseQuickEntryPatientId(params?.id);

  if (parsed.status === "invalid") {
    // TODO(subtask-2-2): destructive invalid-id alert linking to /quick-entry.
    return <div className="min-h-screen selrs-page-bg p-6" dir="rtl" />;
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
