import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import ExaminationPatientInfoTab from "@/components/examination/ExaminationPatientInfoTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useExaminationForm } from "@/hooks/examination/useExaminationForm";

const PATIENT_DATA_EDIT_PERMISSION = "/patient-data/edit";

function usePatientCreatePresence() {
  const [otherActiveCount, setOtherActiveCount] = useState(0);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (message.type === "staff-ready") {
          socket.send(
            JSON.stringify({ type: "patient-create-presence", active: true }),
          );
        } else if (message.type === "patient-create-presence") {
          setOtherActiveCount(
            Math.max(0, Number(message.activeCount ?? 0) - 1),
          );
        }
      } catch {
        // Ignore messages for unrelated WebSocket features.
      }
    });

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({ type: "patient-create-presence", active: false }),
        );
      }
      socket.close();
    };
  }, []);

  return otherActiveCount;
}

/** Patient registration modal for quick patient entry dialog */
export function ExaminationPatientQuickDialogContent({
  onClose,
  initialData,
  onSaved,
}: {
  onClose: () => void;
  initialData?: {
    patientId?: number | null;
    patientCode?: string | null;
    fullName?: string;
    age?: number | string | null;
    phone?: string | null;
    email?: string | null;
    visitDate?: string | null;
    serviceType?:
      "consultant" | "specialist" | "lasik" | "external" | "followup" | null;
  };
  onSaved?: (result: { patientId: number }) => void | Promise<void>;
}) {
  const form = useExaminationForm(PATIENT_DATA_EDIT_PERMISSION, {
    embedded: true,
    onEmbeddedClose: onClose,
    initialData,
    onEmbeddedSaved: onSaved,
  });
  const otherActiveCount = usePatientCreatePresence();

  if (!form.isAuthenticated) return null;

  return (
    <form
      ref={form.formRef}
      onSubmit={form.handleSubmit}
      dir="rtl"
      className="quick-patient-registration-form space-y-0"
    >
      {otherActiveCount > 0 ? (
        <Alert variant="destructive" className="mx-6 mb-4 w-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            يوجد{" "}
            {otherActiveCount === 1 ? "موظف آخر" : `${otherActiveCount} موظفين`}{" "}
            يسجل مريضًا الآن. سيحصل كل مريض على كود مستقل عند الحفظ.
          </AlertDescription>
        </Alert>
      ) : null}
      <Tabs value="patient-info" onValueChange={() => {}} className="w-full">
        <ExaminationPatientInfoTab form={form} showMedicalHistory />
      </Tabs>
      <div className="quick-patient-registration-actions flex flex-wrap gap-3 justify-end border-t border-border/60 pt-4 px-6 pb-6">
        <Button type="button" variant="outline" onClick={form.handleCancel}>
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={form.loading}
          className="bg-primary hover:bg-primary/85"
        >
          {form.loading ? "جاري الحفظ…" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
