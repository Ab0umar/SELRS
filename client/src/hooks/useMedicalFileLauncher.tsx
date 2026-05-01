import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientPicker from "@/components/PatientPicker";

const MedicalFilePanel = lazy(() => import("@/components/MedicalFilePanel"));

/**
 * Opens the real `MedicalFilePanel` overlay (not `/patient-file`).
 * Picker dialog is used when there is no patient id yet (e.g. dashboard quick action).
 */
export function useMedicalFileLauncher() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [patientId, setPatientId] = useState<number | null>(null);

  const openMedicalFilePicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const openMedicalFileForPatient = useCallback((id: number) => {
    if (Number.isFinite(id) && id > 0) {
      setPatientId(id);
    }
  }, []);

  const closeMedicalFilePanel = useCallback(() => {
    setPatientId(null);
  }, []);

  const onPatientChosenFromPicker = useCallback((id: number) => {
    setPickerOpen(false);
    if (Number.isFinite(id) && id > 0) {
      setPatientId(id);
    }
  }, []);

  const medicalFilePortal: ReactNode = (
    <>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">الملف الطبي — اختر المريض</DialogTitle>
          </DialogHeader>
          <PatientPicker
            onSelect={(p) => {
              if (p?.id) {
                onPatientChosenFromPicker(p.id);
              }
            }}
          />
        </DialogContent>
      </Dialog>
      {patientId != null && patientId > 0 ? (
        <Suspense fallback={null}>
          <MedicalFilePanel patientId={patientId} onClose={closeMedicalFilePanel} />
        </Suspense>
      ) : null}
    </>
  );

  return {
    medicalFilePortal,
    openMedicalFilePicker,
    openMedicalFileForPatient,
    closeMedicalFilePanel,
  };
}
