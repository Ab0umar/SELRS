import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PatientPicker from "@/components/PatientPicker";

const MedicalFilePanel = lazy(() => import("@/components/MedicalFilePanel"));

/**
 * Opens the real `MedicalFilePanel` overlay (not `/patient-file`).
 * Picker dialog is used when there is no patient id yet (e.g. dashboard quick action).
 */
export function useMedicalFileLauncher() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [visitContext, setVisitContext] = useState<{ visitId?: number; visitDate?: string }>({});

  const openMedicalFilePicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const openMedicalFileForPatient = useCallback((id: number, context?: { visitId?: number; visitDate?: string }) => {
    if (Number.isFinite(id) && id > 0) {
      setVisitContext(context ?? {});
      setPatientId(id);
    }
  }, []);

  const closeMedicalFilePanel = useCallback(() => {
    setPatientId(null);
  }, []);

  const onPatientChosenFromPicker = useCallback((id: number) => {
    setVisitContext({});
    setPickerOpen(false);
    if (Number.isFinite(id) && id > 0) {
      setPatientId(id);
    }
  }, []);

  const medicalFilePortal: ReactNode = (
    <>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle className="text-start">
              الملف الطبي — اختر المريض
            </DialogTitle>
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
          <MedicalFilePanel
            key={`${patientId}-${visitContext.visitId ?? visitContext.visitDate ?? "default"}`}
            patientId={patientId}
            hubVisitId={visitContext.visitId}
            hubVisitDate={visitContext.visitDate}
            onClose={closeMedicalFilePanel}
          />
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
