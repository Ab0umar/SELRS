import ExaminationPatientInfoTab from "@/components/examination/ExaminationPatientInfoTab";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useExaminationForm } from "@/hooks/examination/useExaminationForm";

const PATIENT_DATA_EDIT_PERMISSION = "/patient-data/edit";

/** Patient registration modal for quick patient entry dialog */
export function ExaminationPatientQuickDialogContent({ onClose }: { onClose: () => void }) {
  const form = useExaminationForm(PATIENT_DATA_EDIT_PERMISSION, {
    embedded: true,
    onEmbeddedClose: onClose,
  });

  if (!form.isAuthenticated) return null;

  return (
    <form ref={form.formRef} onSubmit={form.handleSubmit} dir="rtl" className="space-y-0">
      <Tabs value="patient-info" onValueChange={() => {}} className="w-full">
        <ExaminationPatientInfoTab form={form} />
      </Tabs>
      <div className="flex flex-wrap gap-3 justify-end border-t border-border/60 pt-4 px-6 pb-6">
        <Button type="button" variant="outline" onClick={form.handleCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={form.loading} className="bg-primary hover:bg-primary/85">
          {form.loading ? "جاري الحفظ…" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
