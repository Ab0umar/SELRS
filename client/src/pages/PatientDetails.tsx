import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import {
  CalendarDays,
  Eye,
  FileText,
  FlaskConical,
  Pill,
  ScanEye,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { usePatientDetails } from "@/hooks/patient-details/usePatientDetails";
import { PatientDetailsError } from "@/components/patient-details/PatientDetailsError";
import { MedicalHistoryTab } from "@/components/patient-details/MedicalHistoryTab";
import { ExternalDoctorReferralPanel } from "@/components/patient-details/ExternalDoctorReferralPanel";
import { ExaminationsTab } from "@/components/patient-details/ExaminationsTab";
import { PentacamTab } from "@/components/patient-details/PentacamTab";
import { DiagnosisTab } from "@/components/patient-details/DiagnosisTab";
import { TreatmentTab } from "@/components/patient-details/TreatmentTab";
import { TestsTab } from "@/components/patient-details/TestsTab";
import { FollowupTab } from "@/components/patient-details/FollowupTab";
import PatientPicker from "@/components/PatientPicker";
import type { LucideIcon } from "lucide-react";

type Section = { key: string; label: string; icon: LucideIcon };

const ALL_SECTIONS: Section[] = [
  { key: "examinations", label: "القياسات", icon: Eye },
  { key: "pentacam", label: "بنتاكام", icon: ScanEye },
  { key: "diagnosis", label: "التشخيص", icon: Stethoscope },
  { key: "treatment", label: "العلاج", icon: Pill },
  { key: "tests", label: "الفحوصات", icon: FlaskConical },
  { key: "followup", label: "المتابعة", icon: CalendarDays },
];

function getShortDiagnosis(
  latestReport: unknown,
  latestReportContent: unknown,
): string | null {
  if (!latestReport) return null;
  const report = latestReport as Record<string, unknown>;
  const raw =
    typeof latestReportContent === "string"
      ? latestReportContent
      : String(report.clinicalOpinion ?? "").trim() ||
        String(report.diagnosis ?? "").trim();
  const text = raw.split("\n")[0].trim();
  if (!text) return null;
  return text.length > 22 ? `${text.slice(0, 22)}…` : text;
}

export default function PatientDetails() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const inPatientHub = location.startsWith("/patient-hub/");
  const { goBack } = useAppNavigation();
  const [, patientsParams] = useRoute("/patients/:id");
  const [, patientFileParams] = useRoute("/patient-file/:id");
  const rawPatientId = patientsParams?.id ?? patientFileParams?.id;
  const patientId = rawPatientId ? Number(rawPatientId) : undefined;

  const pd = usePatientDetails({
    patientId,
    user,
    isAuthenticated,
    setLocation,
  });

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

  const handleSelectPatient = (p: {
    id: number;
    fullName: string;
    patientCode?: string | null;
  }) => {
    if (!p.id) return;
    const qs = typeof window !== "undefined" ? window.location.search : "";
    setLocation(
      inPatientHub
        ? `/patient-hub/examination/${p.id}${qs}`
        : `/patient-file/${p.id}`,
    );
  };

  const sections = ALL_SECTIONS.filter(
    (s) => s.key !== "pentacam" || pd.canViewPentacam,
  );
  const diagnosisLabel = getShortDiagnosis(
    pd.latestReport,
    pd.latestReportContent,
  );
  const age = String(pd.overviewStats.age ?? "").trim();

  const qs = typeof window !== "undefined" ? window.location.search : "";
  const reportPath = patientId
    ? inPatientHub
      ? `/patient-hub/brief/${patientId}${qs}`
      : `/patient-summary/${patientId}`
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col" dir="rtl">
      {/* Two-column layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar — in RTL renders on the right */}
        <aside className="hidden w-[200px] shrink-0 flex-col border-e border-border/60 bg-muted/20 md:flex print:hidden">
          <nav className="flex flex-col py-2" aria-label="أقسام ملف المريض">
            {sections.map((section) => {
              const active = pd.activeTab === section.key;
              const Icon = section.icon;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => pd.setActiveTab(section.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 border-s-2 px-4 py-2.5 text-sm transition-colors",
                    active
                      ? "border-s-primary bg-primary/10 text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={active ? 2.2 : 1.8}
                    aria-hidden
                  />
                  {section.label}
                </button>
              );
            })}
          </nav>

          {pd.isAdmin && pd.patientCode && (
            <ExternalDoctorReferralPanel patientCode={pd.patientCode} />
          )}

          <div className="mt-auto space-y-1.5 border-t border-border/50 p-3">
            <PatientPicker
              initialPatientId={patientId}
              onSelect={handleSelectPatient}
              label=""
              placeholder="تغيير المريض..."
            />
            {reportPath && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setLocation(reportPath)}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                التقرير المجمع
              </Button>
            )}
            {patientId && pd.isAdmin && !inPatientHub && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pd.deletePatientMutation.isPending}
                className="w-full justify-start gap-2 text-xs text-destructive-foreground bg-destructive text-destructive-foreground"
                onClick={async () => {
                  if (
                    confirm(
                      "هل أنت متأكد من حذف المريض وكل بياناته؟\n\nهذا الإجراء لا يمكن التراجع عنه!",
                    )
                  ) {
                    try {
                      await pd.deletePatientMutation.mutateAsync({ patientId });
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
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                حذف المريض
              </Button>
            )}
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <PullToRefresh onRefresh={pd.onRefresh} className="min-h-full">
            <div className="space-y-5 p-4">
              <MedicalHistoryTab
                history={pd.overviewData.history}
                symptoms={pd.overviewData.symptoms}
              />

              {pd.activeTab === "examinations" && (
                <ExaminationsTab
                  autorefractionRows={pd.autorefractionRows}
                  afterRows={pd.afterRows}
                  glassesRows={pd.glassesRows}
                  fundusRows={pd.fundusRows}
                  requestedImagingAndLabs={pd.requestedImagingAndLabs}
                  parsedExamSources={pd.parsedExamSources}
                  openExamSections={pd.openExamSections}
                  toggleExamSection={pd.toggleExamSection}
                  followupSheets={(pd.followupSheetsQuery.data ?? []) as any[]}
                />
              )}
              {pd.canViewPentacam && pd.activeTab === "pentacam" && (
                <PentacamTab pentacamRows={pd.pentacamRows} />
              )}
              {pd.activeTab === "diagnosis" && (
                <DiagnosisTab
                  latestReport={pd.latestReport}
                  latestReportContent={pd.latestReportContent}
                />
              )}
              {pd.activeTab === "treatment" && (
                <TreatmentTab
                  treatmentRows={pd.treatmentRows}
                  treatmentData={pd.treatmentData}
                  medications={(pd.medicationsQuery.data ?? []) as any[]}
                />
              )}
              {pd.activeTab === "tests" && (
                <TestsTab
                  testRequestsData={
                    pd.testRequestsQuery?.data as any[] | undefined
                  }
                />
              )}
              {pd.activeTab === "followup" && (
                <FollowupTab
                  examinations={pd.examinations}
                  visitsData={(pd.visitsQuery.data ?? []) as any[]}
                  surgeries={pd.surgeries}
                  followups={pd.followups}
                  followupSheets={(pd.followupSheetsQuery.data ?? []) as any[]}
                  isAdmin={pd.isAdmin && !inPatientHub}
                  patientId={patientId}
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
                      pd.followupSheetsQuery.refetch(),
                    ]);
                  }}
                />
              )}
            </div>
          </PullToRefresh>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="shrink-0 border-t border-border/60 bg-background md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="أقسام ملف المريض"
      >
        <div className="flex h-14 items-stretch">
          {sections.map((section) => {
            const active = pd.activeTab === section.key;
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => pd.setActiveTab(section.key)}
                aria-label={section.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-primary"
                    aria-hidden
                  />
                )}
                <Icon
                  className="h-[20px] w-[20px] shrink-0"
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden
                />
                <span
                  className={cn(
                    "whitespace-nowrap text-[9px] leading-none",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {section.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
