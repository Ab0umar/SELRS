import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Calendar, Download, FileText, Phone, PrinterIcon, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { OfflinePageState } from "@/components/OfflinePageState";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { usePatientDetails } from "@/hooks/patient-details/usePatientDetails";
import { PatientDetailsHeader } from "@/components/patient-details/PatientDetailsHeader";
import { PatientDetailsNavBar } from "@/components/patient-details/PatientDetailsNavBar";
import { PatientDetailsError } from "@/components/patient-details/PatientDetailsError";
import { MedicalHistoryTab } from "@/components/patient-details/MedicalHistoryTab";
import { ExaminationsTab } from "@/components/patient-details/ExaminationsTab";
import { PentacamTab } from "@/components/patient-details/PentacamTab";
import { DiagnosisTab } from "@/components/patient-details/DiagnosisTab";
import { TreatmentTab } from "@/components/patient-details/TreatmentTab";
import { TestsTab } from "@/components/patient-details/TestsTab";
import { FollowupTab } from "@/components/patient-details/FollowupTab";

export default function PatientDetails() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, patientsParams] = useRoute("/patients/:id");
  const [, patientFileParams] = useRoute("/patient-file/:id");
  const [, patientHubFileParams] = useRoute("/patient-hub/file/:id");
  const rawPatientId = patientsParams?.id ?? patientFileParams?.id ?? patientHubFileParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;

  const pd = usePatientDetails({ patientId, user, isAuthenticated, setLocation });

  if (!isAuthenticated) return null;

  if (pd.patientQuery.isError && !pd.patient) {
    return (
      <PatientDetailsError
        onRetry={() => {
          void pd.patientQuery.refetch();
          void pd.examinationsQuery.refetch();
          void pd.reportsQuery.refetch();
          void pd.prescriptionsQuery.refetch();
          void pd.surgeriesQuery.refetch();
          void pd.followupsQuery.refetch();
        }}
      />
    );
  }

  const handleSelectPatient = (p: { id: number; fullName: string; patientCode?: string | null }) => {
    if (p.id) setLocation(`/patient-file/${p.id}`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PullToRefresh onRefresh={pd.onRefresh} className="min-h-screen">
        <main className="container mx-auto px-4 py-8 print:p-0 overflow-x-hidden">
          <PageHeader
            title={pd.patientName || "ملف المريض"}
            subtitle={pd.patientCode || undefined}
            icon={<UserRound className="h-5 w-5" />}
          />

            <PatientDetailsHeader
              patientName={pd.patientName || ""}
              patientCode={pd.patientCode || ""}
              phone={pd.patient?.phone}
              age={pd.overviewStats.age}
              gender={pd.overviewStats.gender}
              patientId={patientId}
              setLocation={setLocation}
            />


            <PatientDetailsNavBar
              patientId={patientId}
              isAdmin={pd.isAdmin}
              goBack={goBack}
              setLocation={setLocation}
              deletePatientMutation={pd.deletePatientMutation}
              handleSelectPatient={handleSelectPatient}
            />


            <MedicalHistoryTab
              history={pd.overviewData.history}
              symptoms={pd.overviewData.symptoms}
            />


          {/* Tabs */}
          <Tabs value={pd.activeTab} onValueChange={pd.setActiveTab} persistKey={`patient-details:${patientId ?? "new"}`} className="w-full overflow-x-hidden">
            <div className="mb-8 overflow-x-auto md:overflow-visible pb-1 print:hidden">
              <TabsList className="inline-flex h-auto w-max min-w-max md:flex md:w-full md:min-w-0 rounded-3xl border border-slate-200/80 bg-white/85 p-2 shadow-sm" dir="rtl" style={{ direction: "rtl" }}>
                <TabsTrigger className="rounded-2xl whitespace-nowrap" value="examinations">القياسات</TabsTrigger>
                {pd.canViewPentacam && <TabsTrigger className="rounded-2xl whitespace-nowrap" value="pentacam">بنتاكام</TabsTrigger>}
                <TabsTrigger className="rounded-2xl whitespace-nowrap" value="diagnosis">التشخيص</TabsTrigger>
                <TabsTrigger className="rounded-2xl whitespace-nowrap" value="treatment">العلاج</TabsTrigger>
                <TabsTrigger className="rounded-2xl whitespace-nowrap" value="tests">الفحوصات</TabsTrigger>
                <TabsTrigger className="rounded-2xl whitespace-nowrap" value="followup">المتابعة</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="examinations" className="space-y-6">
              <ExaminationsTab
                autorefractionRows={pd.autorefractionRows}
                afterRows={pd.afterRows}
                glassesRows={pd.glassesRows}
                fundusRows={pd.fundusRows}
                requestedImagingAndLabs={pd.requestedImagingAndLabs}
                parsedExamSources={pd.parsedExamSources}
                openExamSections={pd.openExamSections}
                toggleExamSection={pd.toggleExamSection}
              />
            </TabsContent>

            {pd.canViewPentacam && (
              <TabsContent value="pentacam" className="space-y-6">
                <PentacamTab pentacamRows={pd.pentacamRows} />
              </TabsContent>
            )}

            <TabsContent value="diagnosis">
              <DiagnosisTab latestReport={pd.latestReport} latestReportContent={pd.latestReportContent} />
            </TabsContent>

            <TabsContent value="treatment">
              <TreatmentTab
                treatmentRows={pd.treatmentRows}
                treatmentData={pd.treatmentData}
                medications={(pd.medicationsQuery.data ?? []) as any[]}
              />
            </TabsContent>

            <TabsContent value="tests" className="space-y-6">
              <TestsTab testRequestsData={pd.testRequestsQuery?.data as any[] | undefined} />
            </TabsContent>

            <TabsContent value="followup">
              <FollowupTab
                examinations={pd.examinations}
                visitsData={(pd.visitsQuery.data ?? []) as any[]}
                surgeries={pd.surgeries}
                followups={pd.followups}
                isAdmin={pd.isAdmin}
                editingVisitId={pd.editingVisitId}
                editVisitDate={pd.editVisitDate}
                setEditingVisitId={pd.setEditingVisitId}
                setEditVisitDate={pd.setEditVisitDate}
                updateVisitDateMutation={pd.updateVisitDateMutation}
                deleteExamMutation={pd.deleteExamMutation}
                deleteVisitMutation={pd.deleteVisitMutation}
                onAfterDelete={async () => {
                  await Promise.all([
                    pd.examinationsQuery.refetch(),
                    pd.pentacamQuery.refetch(),
                    pd.followupsQuery.refetch(),
                  ]);
                }}
              />
            </TabsContent>
          </Tabs>
        </main>
      </PullToRefresh>
    </div>
  );
}
