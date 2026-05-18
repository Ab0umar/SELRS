import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import PatientPicker from "@/components/PatientPicker";

interface PatientDetailsNavBarProps {
  patientId?: number;
  isAdmin: boolean;
  goBack: () => void;
  /** داخل مسار مركز المريض — الروابط تُعاد إلى `/patient-hub/...` */
  inPatientHub?: boolean;
  /** مركز المريض: لا حذف مريض */
  readOnlyPatientHub?: boolean;
  setLocation: (url: string) => void;
  deletePatientMutation: {
    isPending: boolean;
    mutateAsync: (vars: { patientId: number }) => Promise<any>;
  };
  handleSelectPatient: (p: { id: number; fullName: string; patientCode?: string | null }) => void;
}

export function PatientDetailsNavBar({
  patientId,
  isAdmin,
  goBack,
  inPatientHub,
  readOnlyPatientHub,
  setLocation,
  deletePatientMutation,
  handleSelectPatient,
}: PatientDetailsNavBarProps) {
  const qs = typeof window !== "undefined" ? window.location.search : "";
  const reportBriefPath =
    patientId && inPatientHub ? `/patient-hub/brief/${patientId}${qs}` : patientId ? `/patient-summary/${patientId}` : "/";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={() => goBack()}
        className="rounded-xl border-border bg-background hover:bg-muted"
      >
        <ArrowRight className="h-4 w-4 ml-2" />رجوع
      </Button>
      {patientId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation(reportBriefPath)}
          className="rounded-xl border-border bg-background hover:bg-muted"
        >
          <FileText className="h-4 w-4 ml-2" />التقرير المجمع / الموجز
        </Button>
      )}
      <PatientPicker initialPatientId={patientId} onSelect={handleSelectPatient} />
      {patientId && isAdmin && !readOnlyPatientHub && (
        <Button
          variant="destructive"
          size="sm"
          disabled={deletePatientMutation.isPending}
          className="rounded-xl"
          onClick={async () => {
            if (confirm("هل أنت متأكد من حذف المريض وكل بياناته؟\n\nهذا الإجراء لا يمكن التراجع عنه!")) {
              try {
                await deletePatientMutation.mutateAsync({ patientId });
                const { toast } = await import("sonner");
                toast.success("تم حذف المريض بنجاح");
                setLocation(inPatientHub ? "/patient-hub" : "/patients");
              } catch {
                const { toast } = await import("sonner");
                toast.error("حدث خطأ في الحذف");
              }
            }
          }}
        >
          <FileText className="h-4 w-4 ml-2" />حذف المريض
        </Button>
      )}
    </div>
  );
}
