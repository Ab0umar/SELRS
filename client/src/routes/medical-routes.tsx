import { lazy } from "react";
import { Redirect, Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
const ExaminationForm = lazy(() => import("../pages/ExaminationForm"));
const QuickPatientEntry = lazy(() => import("../pages/QuickPatientEntry"));
const NewCases = lazy(() => import("../pages/NewCases"));
const FollowupForm = lazy(() => import("../pages/FollowupForm"));
const Followups = lazy(() => import("../pages/Followups"));
const Visits = lazy(() => import("../pages/Visits"));
const TodayPatients = lazy(() => import("../pages/TodayPatients"));
const Operations = lazy(() => import("../pages/Operations"));
const WorkflowHub = lazy(() => import("../pages/WorkflowHub"));
const WorkflowPrototype = lazy(() => import("../pages/WorkflowPrototype"));
const Patients = lazy(() => import("../pages/Patients"));
const PatientDetails = lazy(() => import("../pages/PatientDetails"));
const MedicalReports = lazy(() => import("../pages/MedicalReports"));
const MedicalReference = lazy(() => import("../pages/MedicalReference"));
const ClinicalPortal = lazy(() => import("../pages/ClinicalPortal"));
const PatientSummary = lazy(() => import("../pages/PatientSummary"));
const DoctorPatientView = lazy(() => import("../pages/DoctorPatientView"));
const ConsultantSheet = lazy(() => import("../pages/ConsultantSheet"));
const ConsultantFollowupPage = lazy(
  () => import("../pages/ConsultantFollowupPage"),
);
const SpecialistSheet = lazy(() => import("../pages/SpecialistSheet"));
const LasikExamSheet = lazy(() => import("../pages/LasikExamSheet"));
const LasikFollowupPage = lazy(() => import("../pages/LasikFollowupPage"));
const PentacamPage = lazy(() => import("../pages/PentacamPage"));
const SheetsPage = lazy(() => import("../pages/SheetsPage"));
const ArchivePage = lazy(() => import("../pages/ArchivePage"));
const ClinicalReportsPage = lazy(() => import("../pages/ClinicalReportsPage"));
const PatientsRecordsPage = lazy(() => import("../pages/PatientsRecordsPage"));
const MedicalRecordsPage = lazy(() => import("../pages/MedicalRecordsPage"));
const PentacamResultsDashboard = lazy(
  () => import("../pages/PentacamResultsDashboard"),
);
const RefractionsDashboard = lazy(
  () => import("../pages/RefractionsDashboard"),
);
const AutorefsDashboard = lazy(() => import("../pages/AutorefsDashboard"));
const PrescriptionsDashboard = lazy(
  () => import("../pages/PrescriptionsDashboard"),
);
const ExternalOperationSheet = lazy(
  () => import("../pages/ExternalOperationSheet"),
);
const RefractionPage = lazy(() => import("../pages/RefractionPage"));
const PentacamSheet = lazy(() => import("../pages/PentacamSheet"));
const MedicationsCatalogPage = lazy(
  () => import("../pages/MedicationsCatalogPage"),
);
const MedicationsManagement = lazy(
  () => import("../pages/MedicationsManagement"),
);
const ExaminationsCatalogPage = lazy(
  () => import("../pages/ExaminationsCatalogPage"),
);
const TxHubPage = lazy(() => import("../pages/TxHubPage"));
const WritePrescription = lazy(() => import("../pages/WritePrescription"));
const PrescriptionsList = lazy(() => import("../pages/PrescriptionsList"));
const RequestTests = lazy(() => import("../pages/RequestTests"));
const MedicationsTestsManagement = lazy(
  () => import("../pages/MedicationsTestsManagement"),
);
const TestsManagement = lazy(() => import("../pages/TestsManagement"));
const AdminPentacamLinking = lazy(
  () => import("../features/admin/AdminPentacamLinking"),
);
const ExternalDoctorReferrals = lazy(
  () => import("../pages/ExternalDoctorReferrals"),
);
const ExternalDoctors = lazy(() => import("../pages/ExternalDoctors"));
const ReferralLetter = lazy(() => import("../pages/ReferralLetter"));
const ClinicalReport = lazy(() => import("../pages/ClinicalReport"));
const PrePostOpReport = lazy(() => import("../pages/PrePostOpReport"));
const PostOpOffdays = lazy(() => import("../pages/PostOpOffdays"));
const PostOpOffdaysEnglish = lazy(
  () => import("../pages/PostOpOffdaysEnglish"),
);
const MedicalConditionReport = lazy(
  () => import("../pages/MedicalConditionReport"),
);

export const MedicalRoutes = (
  <>
    <Route
      path={`${ROUTES.examination}/:id`}
      component={() => (
        <ProtectedRoute>
          <ExaminationForm />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.examination}
      component={() => (
        <ProtectedRoute>
          <ExaminationForm />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.quickEntry}
      component={() => (
        <ProtectedRoute>
          <QuickPatientEntry />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.quickEntryId}
      component={() => (
        <ProtectedRoute>
          <QuickPatientEntry />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.newCases}
      component={() => (
        <ProtectedRoute>
          <NewCases />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.newCasesId}
      component={() => (
        <ProtectedRoute>
          <NewCases />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.followupId}
      component={() => (
        <ProtectedRoute>
          <FollowupForm />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/records/patients"
      component={() => (
        <ProtectedRoute>
          <PatientsRecordsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/patients-records"
      component={() => (
        <ProtectedRoute>
          <PatientsRecordsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.followups}
      component={() => (
        <ProtectedRoute>
          <PatientsRecordsPage defaultTab="followups" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.visitsId}
      component={() => (
        <ProtectedRoute>
          <PatientsRecordsPage defaultTab="visits" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.visits}
      component={() => (
        <ProtectedRoute>
          <PatientsRecordsPage defaultTab="visits" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.todayRoute}
      component={() => <Redirect href={ROUTES.today} />}
    />
    <Route path="/TODAY" component={() => <Redirect href={ROUTES.today} />} />
    <Route
      path={ROUTES.today}
      component={() => (
        <ProtectedRoute>
          <TodayPatients />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.operations}
      component={() => (
        <ProtectedRoute>
          <Operations />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.workflowHub}
      component={() => (
        <ProtectedRoute>
          <WorkflowHub />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/workflow-hub/prototype"
      component={() => (
        <ProtectedRoute>
          <WorkflowPrototype />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.patients}
      component={() => (
        <ProtectedRoute>
          <Patients />
        </ProtectedRoute>
      )}
    />
    <Route
      path={`${ROUTES.patients}/:id`}
      component={() => (
        <ProtectedRoute>
          <PatientDetails />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalfileId}
      component={() => (
        <ProtectedRoute>
          <ClinicalPortal mode="file" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalfile}
      component={() => (
        <ProtectedRoute>
          <ClinicalPortal mode="file" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={`${ROUTES.patientFile}/:id`}
      component={() => (
        <ProtectedRoute>
          <ClinicalPortal mode="file" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.patientFile}
      component={() => (
        <ProtectedRoute>
          <ClinicalPortal mode="file" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReportsId}
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage defaultTab="medical-reports" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReports}
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage defaultTab="medical-reports" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.archive}
      component={() => (
        <ProtectedRoute>
          <ArchivePage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReference}
      component={() => <Redirect to="/archive?tab=reference" />}
    />
    <Route
      path={ROUTES.adminLegacyPatients}
      component={() => <Redirect to="/archive?tab=patients" />}
    />
    <Route
      path={ROUTES.opHistory}
      component={() => <Redirect to="/archive?tab=operations" />}
    />
    <Route
      path={ROUTES.patientSummaryId}
      component={() => (
        <ProtectedRoute>
          <ClinicalPortal mode="report" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.patientSummary}
      component={() => (
        <ProtectedRoute>
          <PatientSummary />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.doctorPatientId}
      component={() => (
        <ProtectedRoute>
          <DoctorPatientView />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/sheets"
      component={() => (
        <ProtectedRoute>
          <SheetsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/sheets/consultant"
      component={() => (
        <ProtectedRoute>
          <SheetsPage defaultTab="consultant" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsConsultantId}
      component={() => (
        <ProtectedRoute>
          <ConsultantSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsConsultantIdFollowup}
      component={() => (
        <ProtectedRoute>
          <ConsultantFollowupPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/sheets/followup/consultant"
      component={() => (
        <ProtectedRoute>
          <SheetsPage defaultTab="followup-consultant" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsSpecialistId}
      component={() => (
        <ProtectedRoute>
          <SpecialistSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/sheets/specialist"
      component={() => (
        <ProtectedRoute>
          <SheetsPage defaultTab="specialist" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsExternalId}
      component={() => (
        <ProtectedRoute>
          <ExternalOperationSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsLasikId}
      component={() => (
        <ProtectedRoute>
          <LasikExamSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/sheets/lasik"
      component={() => (
        <ProtectedRoute>
          <SheetsPage defaultTab="lasik" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsLasikIdFollowup}
      component={() => (
        <ProtectedRoute>
          <LasikFollowupPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/sheets/followup/lasik"
      component={() => (
        <ProtectedRoute>
          <SheetsPage defaultTab="followup-lasik" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsPentacamDashboard}
      component={() => (
        <ProtectedRoute>
          <PentacamPage defaultTab="dashboard" />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/records/medical"
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/medical-records"
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsRefractionsDashboard}
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage defaultTab="refraction" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsRefractions}
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage defaultTab="refraction" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsAutorefsDashboard}
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage defaultTab="autoref" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsAutorefs}
      component={() => (
        <ProtectedRoute>
          <MedicalRecordsPage defaultTab="autoref" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsPrescriptionsDashboard}
      component={() => (
        <ProtectedRoute>
          <PrescriptionsDashboard />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsPrescriptions}
      component={() => (
        <ProtectedRoute>
          <PrescriptionsDashboard />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsPentacamId}
      component={() => (
        <ProtectedRoute>
          <PentacamSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsPentacam}
      component={() => (
        <ProtectedRoute>
          <PentacamSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminPentacamId}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPentacamLinking />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.adminPentacam}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPentacamLinking />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsOperationId}
      component={() => (
        <ProtectedRoute>
          <ExternalOperationSheet />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.refractionId}
      component={() => (
        <ProtectedRoute>
          <RefractionPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.refraction}
      component={() => (
        <ProtectedRoute>
          <RefractionPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medications}
      component={() => (
        <ProtectedRoute>
          <MedicationsCatalogPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicationsRegistry}
      component={() => (
        <ProtectedRoute>
          <MedicationsManagement />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.examCatalog}
      component={() => (
        <ProtectedRoute>
          <ExaminationsCatalogPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.txhubRoute}
      component={() => <Redirect href={ROUTES.txhub} />}
    />
    <Route
      path={ROUTES.txhub}
      component={() => (
        <ProtectedRoute>
          <TxHubPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={`${ROUTES.prescription}/:id`}
      component={() => (
        <ProtectedRoute>
          <WritePrescription />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.prescription}
      component={() => (
        <ProtectedRoute>
          <WritePrescription />
        </ProtectedRoute>
      )}
    />
    <Route
      path={`${ROUTES.prescriptions}/:id`}
      component={() => (
        <ProtectedRoute>
          <WritePrescription />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.prescriptions}
      component={() => (
        <ProtectedRoute>
          <PrescriptionsList />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicationsTests}
      component={() => (
        <ProtectedRoute>
          <MedicationsTestsManagement />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.tests}
      component={() => (
        <ProtectedRoute>
          <MedicationsTestsManagement />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.testsManagement}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <TestsManagement />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.pentacam}
      component={() => <Redirect href="/sheets/pentacam" />}
    />
    <Route
      path={ROUTES.requestTestsId}
      component={() => (
        <ProtectedRoute>
          <RequestTests />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.requestTests}
      component={() => (
        <ProtectedRoute>
          <RequestTests />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetCopies}
      component={() => (
        <Redirect href="/admin-hub/sheets" />
      )}
    />
    <Route
      path={ROUTES.externalDoctorsReferrals}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <ExternalDoctorReferrals />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.externalDoctors}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <ExternalDoctors />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/reports"
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="/clinical-reports"
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsReferralId}
      component={() => (
        <ProtectedRoute>
          <ReferralLetter />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.sheetsReferral}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="referral" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.clinicalReportId}
      component={() => (
        <ProtectedRoute>
          <ClinicalReport />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.clinicalReport}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="clinical" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.prePostOpReportId}
      component={() => (
        <ProtectedRoute>
          <PrePostOpReport />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.prePostOpReport}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="pre-post-op" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.postOpOffdaysId}
      component={() => (
        <ProtectedRoute>
          <PostOpOffdays />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.postOpOffdays}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="offdays" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.postOpOffdaysEnglishId}
      component={() => (
        <ProtectedRoute>
          <PostOpOffdaysEnglish />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.postOpOffdaysEnglish}
      component={() => (
        <ProtectedRoute>
          <PostOpOffdaysEnglish />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalConditionReportId}
      component={() => (
        <ProtectedRoute>
          <MedicalConditionReport />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalConditionReport}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="condition" />
        </ProtectedRoute>
      )}
    />
  </>
);
