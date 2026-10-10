import { Save } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ExaminationAutoAirTab from "@/components/examination/ExaminationAutoAirTab";
import ExaminationFormHeader from "@/components/examination/ExaminationFormHeader";
import ExaminationPatientInfoTab from "@/components/examination/ExaminationPatientInfoTab";
import ExaminationPentacamTab from "@/components/examination/ExaminationPentacamTab";
import { DiagnosisImagesPanel } from "@/components/patient-details/DiagnosisImagesPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExaminationForm } from "@/hooks/examination/useExaminationForm";

const PATIENT_DATA_EDIT_PERMISSION = "/patient-data/edit";

export default function ExaminationForm() {
  const form = useExaminationForm(PATIENT_DATA_EDIT_PERMISSION);

  if (!form.isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background examination-page">
      <PageHeader backTo="/dashboard" />
      <main className="container mx-auto px-4 py-8">
        <form ref={form.formRef} onSubmit={form.handleSubmit} dir="rtl">
          <ExaminationFormHeader form={form} />
          <Tabs
            defaultValue="patient-info"
            persistKey="examination-form"
            className="w-full"
          >
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 rounded-lg border border-border bg-card p-2">
              <TabsTrigger
                value="pentacam"
                className="min-w-0 flex-1 whitespace-normal text-center sm:min-w-[120px]"
              >
                البنتاكام
              </TabsTrigger>
              <TabsTrigger
                value="auto-air"
                className="min-w-0 flex-1 whitespace-normal text-center sm:min-w-[180px]"
              >
                الأوتوريفراكشن / الإيرباف
              </TabsTrigger>
              <TabsTrigger
                value="patient-info"
                className="min-w-0 flex-1 whitespace-normal text-center sm:min-w-[120px]"
              >
                بيانات المريض
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="min-w-0 flex-1 whitespace-normal text-center sm:min-w-[100px]"
              >
                صور التشخيص
              </TabsTrigger>
            </TabsList>

            <ExaminationPatientInfoTab form={form} />
            <ExaminationAutoAirTab form={form} />
            <ExaminationPentacamTab form={form} />

            <TabsContent value="images" className="mt-4">
              {form.patientInfo.id ? (
                <DiagnosisImagesPanel patientId={form.patientInfo.id} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  اختر مريضاً أولاً لعرض الصور
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={form.loading}
              className="min-h-11 min-w-28 bg-primary hover:bg-primary/90"
            >
              <Save className="ms-2 h-4 w-4" aria-hidden="true" />
              {form.loading ? "جارٍ الحفظ" : "حفظ البيانات"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11 min-w-24" onClick={form.handleCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
