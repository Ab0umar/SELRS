import { Save, Stethoscope } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ExaminationAutoAirTab from "@/components/examination/ExaminationAutoAirTab";
import ExaminationFormHeader from "@/components/examination/ExaminationFormHeader";
import ExaminationPatientInfoTab from "@/components/examination/ExaminationPatientInfoTab";
import ExaminationPentacamTab from "@/components/examination/ExaminationPentacamTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <Tabs defaultValue="patient-info" persistKey="examination-form" className="w-full">
            <TabsList className="mb-4 flex h-auto w-full gap-2 overflow-x-auto whitespace-nowrap rounded-3xl border border-border/80 bg-background/90 p-2 shadow-sm">
              <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                <Stethoscope className="h-4 w-4" />
                Sections
              </div>
              <TabsTrigger value="pentacam" className="flex-1 min-w-[120px] whitespace-normal text-center">
                البنتاكام
              </TabsTrigger>
              <TabsTrigger value="auto-air" className="flex-1 min-w-[180px] whitespace-normal text-center">
                الأوتوريفراكشن / الإيرباف
              </TabsTrigger>
              <TabsTrigger value="patient-info" className="flex-1 min-w-[120px] whitespace-normal text-center">
                بيانات المريض
              </TabsTrigger>
            </TabsList>

            <ExaminationPatientInfoTab form={form} />
            <ExaminationAutoAirTab form={form} />
            <ExaminationPentacamTab form={form} />
          </Tabs>

          <div className="mt-8 flex gap-4">
            <Button type="submit" disabled={form.loading} className="bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" />
              {form.loading ? " ..." : " "}
            </Button>
            <Button type="button" variant="outline" onClick={form.handleCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

