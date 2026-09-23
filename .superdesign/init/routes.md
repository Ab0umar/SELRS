# Medical/clinical report routes

## Route map

| Surface | URL | Owner | Default tab | Auth |
|---|---|---|---|---|
| Reports hub | `/reports` | `MedicalRoutes` -> `ClinicalReportsPage` | `clinical` | Protected |
| Hub alias | `/clinical-reports` | `MedicalRoutes` -> `ClinicalReportsPage` | `clinical` | Protected |
| Clinical report | `/clinical-report/:id` | `MedicalRoutes` -> `ClinicalReportsPage` | `clinical` | Protected |
| Pre/post-op | `/pre-post-op-report/:id` | `MedicalRoutes` -> `ClinicalReportsPage` | `pre-post-op` | Protected |
| Post-op off-days | `/post-op-offdays/:id` | `MedicalRoutes` -> `ClinicalReportsPage` | `offdays` | Protected |
| Medical condition | `/medical-condition-report/:id` | `MedicalRoutes` -> `ClinicalReportsPage` | `condition` | Protected |
| Referral letter | `/sheets/referral/:id` | `MedicalRoutes` -> `ClinicalReportsPage` | `referral` | Protected |
| Printable medical report | `/medical-report/:id` | `ClinicalSuiteRoutes` -> `ClinicalReportsPage` | `medical-report` | Protected |

All six deep links also have a bare no-id form. The page accepts `patientId`/`id` query parameters; direct id routes seed the selected patient. `/sheets/clinical-report/:id` and `/reports/:id` are also recognized for patient-id detection. `post-op-offdays-en` is a separate English implementation.

## Shared route constants

### `shared/routes.ts` lines 1-40

```ts
   1: export const ROUTES = {
   2:   // Core navigation
   3:   root: "/",
   4:   home: "/",
   5:   mainHome: "/home",
   6:   homeAlias: "/home",
   7:   login: "/login",
   8:   dashboard: "/dashboard",
   9:   profile: "/profile",
  10:   account: "/account",
  11:   accountWildcard: "/account/*",
  12:   forcePasswordChange: "/force-password-change",
  13: 
  14:   // Attendance
  15:   attendance: "/attendance",
  16:   attendanceLive: "/attendance/live",
  17:   attendanceMy: "/attendance/my",
  18:   attendanceEmployees: "/attendance/employees",
  19:   attendanceEmployeeDetail: "/attendance/employees/:empCd",
  20:   attendanceReports: "/attendance/reports",
  21:   attendanceSettings: "/attendance/settings",
  22:   attendanceAdminDevice: "/attendance/admin/device",
  23:   attendanceAdminSync: "/attendance/admin/sync",
  24:   attendanceAdminConsole: "/attendance/admin/console",
  25:   attendanceShiftSchedule: "/attendance/shift-schedule",
  26: 
  27:   // Medical / patient
  28:   clinicalSuite: "/clinical-suite",
  29:   clinicalDecisionSupport: "/clinical-decision-support",
  30:   medicalReport: "/medical-report",
  31:   medicalReportId: "/medical-report/:id",
  32:   examination: "/examination",
  33:   examCatalog: "/examinations/catalog",
  34:   patients: "/patients",
  35:   patientsById: "/patients/:id",
  36:   patientFile: "/patient-file",
  37:   patientHub: "/patient-hub",
  38:   prescriptions: "/prescriptions",
  39:   prescription: "/prescription",
  40:   tests: "/tests",
```

### `shared/routes.ts` lines 175-205

```ts
 175:   kfSheetsConsultantPatient: "/kf/sheets/consultant/:kfPatientId",
 176:   kfSheetsConsultantPatientFollowup:
 177:     "/kf/sheets/consultant/:kfPatientId/followup",
 178:   marketing: "/marketing",
 179:   marketingBrand: "/marketing/brand",
 180:   marketingDrafts: "/marketing/drafts",
 181:   marketingHistory: "/marketing/history",
 182:   marketingSettings: "/marketing/settings",
 183:   marketingWhatsApp: "/marketing/whatsapp",
 184:   medicalReports: "/medical-reports",
 185:   medicalReference: "/medical-reference",
 186:   medicalReportsId: "/medical-reports/:id",
 187:   clinicalReport: "/clinical-report",
 188:   clinicalReportId: "/clinical-report/:id",
 189:   prePostOpReport: "/pre-post-op-report",
 190:   prePostOpReportId: "/pre-post-op-report/:id",
 191:   postOpOffdays: "/post-op-offdays",
 192:   postOpOffdaysId: "/post-op-offdays/:id",
 193:   postOpOffdaysEnglish: "/post-op-offdays-en",
 194:   postOpOffdaysEnglishId: "/post-op-offdays-en/:id",
 195:   medicalConditionReport: "/medical-condition-report",
 196:   medicalConditionReportId: "/medical-condition-report/:id",
 197:   medicalSheets: "/medical-sheets",
 198:   medicalFileDetail: "/medicalfile/:id",
 199:   medicalFile: "/medicalfile",
 200:   medicalReportDetail: "/medical-reports/:id",
 201:   medicalfile: "/medicalfile",
 202:   medicalfileId: "/medicalfile/:id",
 203:   medicationsTests: "/medications-tests",
 204:   medicationsRegistry: "/medications/registry",
 205:   migrations: "/migrations",
```

### `shared/routes.ts` lines 240-275

```ts
 240:   followupDetail: "/followup/:id",
 241:   requestTests: "/request-tests",
 242:   requestTestsId: "/request-tests/:id",
 243:   services: "/services",
 244:   servicesHub: "/services-hub",
 245:   servicesHubWildcard: "/services-hub/*",
 246:   sheetCopies: "/sheet-copies",
 247:   sheetDesigner: "/sheet-designer",
 248:   sheets: "/sheets",
 249:   archive: "/archive",
 250:   reports: "/reports",
 251:   patientsRecords: "/records/patients",
 252:   medicalRecords: "/records/medical",
 253:   sheetsAutorefs: "/sheets/autorefs",
 254:   sheetsAutorefsDashboard: "/sheets/autorefs/dashboard",
 255:   sheetsConsultantDetail: "/sheets/consultant/:id",
 256:   sheetsConsultantFollowup: "/sheets/consultant/:id/followup",
 257:   sheetsConsultantId: "/sheets/consultant/:id",
 258:   sheetsConsultantIdFollowup: "/sheets/consultant/:id/followup",
 259:   sheetsSpecialistDetail: "/sheets/specialist/:id",
 260:   sheetsExternalId: "/sheets/external/:id",
 261:   sheetsExternalDetail: "/sheets/external/:id",
 262:   sheetsLasikDetail: "/sheets/lasik/:id",
 263:   sheetsLasikId: "/sheets/lasik/:id",
 264:   sheetsLasikFollowup: "/sheets/lasik/:id/followup",
 265:   sheetsLasikIdFollowup: "/sheets/lasik/:id/followup",
 266:   sheetsReferral: "/sheets/referral",
 267:   sheetsReferralId: "/sheets/referral/:id",
 268:   sheetsPentacamDashboard: "/sheets/pentacam/dashboard",
 269:   sheetsOperationId: "/sheets/operation/:id",
 270:   sheetsOperationDetail: "/sheets/operation/:id",
 271:   sheetsRefractionsDashboard: "/sheets/refractions/dashboard",
 272:   sheetsRefractions: "/sheets/refractions",
 273:   sheetsPentacam: "/sheets/pentacam",
 274:   sheetsPentacamDetail: "/sheets/pentacam/:id",
 275:   sheetsPentacamId: "/sheets/pentacam/:id",
```

## MedicalRoutes relevant source

### `client/src/routes/medical-routes.tsx` lines 1-35

```tsx
   1: import { lazy } from "react";
   2: import { Redirect, Route } from "wouter";
   3: import ProtectedRoute from "../components/ProtectedRoute";
   4: import { ROUTES } from "../../../shared/routes";
   5: const ExaminationForm = lazy(() => import("../pages/ExaminationForm"));
   6: const QuickPatientEntry = lazy(() => import("../pages/QuickPatientEntry"));
   7: const NewCases = lazy(() => import("../pages/NewCases"));
   8: const FollowupForm = lazy(() => import("../pages/FollowupForm"));
   9: const Followups = lazy(() => import("../pages/Followups"));
  10: const Visits = lazy(() => import("../pages/Visits"));
  11: const TodayPatients = lazy(() => import("../pages/TodayPatients"));
  12: const Operations = lazy(() => import("../pages/Operations"));
  13: const WorkflowHub = lazy(() => import("../pages/WorkflowHub"));
  14: const WorkflowPrototype = lazy(() => import("../pages/WorkflowPrototype"));
  15: const Patients = lazy(() => import("../pages/Patients"));
  16: const PatientDetails = lazy(() => import("../pages/PatientDetails"));
  17: const MedicalReports = lazy(() => import("../pages/MedicalReports"));
  18: const MedicalReference = lazy(() => import("../pages/MedicalReference"));
  19: const ClinicalPortal = lazy(() => import("../pages/ClinicalPortal"));
  20: const PatientSummary = lazy(() => import("../pages/PatientSummary"));
  21: const DoctorPatientView = lazy(() => import("../pages/DoctorPatientView"));
  22: const ConsultantSheet = lazy(() => import("../pages/ConsultantSheet"));
  23: const ConsultantFollowupPage = lazy(
  24:   () => import("../pages/ConsultantFollowupPage"),
  25: );
  26: const SpecialistSheet = lazy(() => import("../pages/SpecialistSheet"));
  27: const LasikExamSheet = lazy(() => import("../pages/LasikExamSheet"));
  28: const LasikFollowupPage = lazy(() => import("../pages/LasikFollowupPage"));
  29: const PentacamPage = lazy(() => import("../pages/PentacamPage"));
  30: const SheetsPage = lazy(() => import("../pages/SheetsPage"));
  31: const ArchivePage = lazy(() => import("../pages/ArchivePage"));
  32: const ClinicalReportsPage = lazy(() => import("../pages/ClinicalReportsPage"));
  33: const PatientsRecordsPage = lazy(() => import("../pages/PatientsRecordsPage"));
  34: const MedicalRecordsPage = lazy(() => import("../pages/MedicalRecordsPage"));
  35: const PentacamResultsDashboard = lazy(
```

### `client/src/routes/medical-routes.tsx` lines 686-799

```tsx
 686:     <Route
 687:       path="/reports"
 688:       component={() => (
 689:         <ProtectedRoute>
 690:           <ClinicalReportsPage />
 691:         </ProtectedRoute>
 692:       )}
 693:     />
 694:     <Route
 695:       path="/clinical-reports"
 696:       component={() => (
 697:         <ProtectedRoute>
 698:           <ClinicalReportsPage />
 699:         </ProtectedRoute>
 700:       )}
 701:     />
 702:     <Route
 703:       path={ROUTES.sheetsReferralId}
 704:       component={() => (
 705:         <ProtectedRoute>
 706:           <ClinicalReportsPage defaultTab="referral" />
 707:         </ProtectedRoute>
 708:       )}
 709:     />
 710:     <Route
 711:       path={ROUTES.sheetsReferral}
 712:       component={() => (
 713:         <ProtectedRoute>
 714:           <ClinicalReportsPage defaultTab="referral" />
 715:         </ProtectedRoute>
 716:       )}
 717:     />
 718:     <Route
 719:       path={ROUTES.clinicalReportId}
 720:       component={() => (
 721:         <ProtectedRoute>
 722:           <ClinicalReportsPage defaultTab="clinical" />
 723:         </ProtectedRoute>
 724:       )}
 725:     />
 726:     <Route
 727:       path={ROUTES.clinicalReport}
 728:       component={() => (
 729:         <ProtectedRoute>
 730:           <ClinicalReportsPage defaultTab="clinical" />
 731:         </ProtectedRoute>
 732:       )}
 733:     />
 734:     <Route
 735:       path={ROUTES.prePostOpReportId}
 736:       component={() => (
 737:         <ProtectedRoute>
 738:           <ClinicalReportsPage defaultTab="pre-post-op" />
 739:         </ProtectedRoute>
 740:       )}
 741:     />
 742:     <Route
 743:       path={ROUTES.prePostOpReport}
 744:       component={() => (
 745:         <ProtectedRoute>
 746:           <ClinicalReportsPage defaultTab="pre-post-op" />
 747:         </ProtectedRoute>
 748:       )}
 749:     />
 750:     <Route
 751:       path={ROUTES.postOpOffdaysId}
 752:       component={() => (
 753:         <ProtectedRoute>
 754:           <ClinicalReportsPage defaultTab="offdays" />
 755:         </ProtectedRoute>
 756:       )}
 757:     />
 758:     <Route
 759:       path={ROUTES.postOpOffdays}
 760:       component={() => (
 761:         <ProtectedRoute>
 762:           <ClinicalReportsPage defaultTab="offdays" />
 763:         </ProtectedRoute>
 764:       )}
 765:     />
 766:     <Route
 767:       path={ROUTES.postOpOffdaysEnglishId}
 768:       component={() => (
 769:         <ProtectedRoute>
 770:           <PostOpOffdaysEnglish />
 771:         </ProtectedRoute>
 772:       )}
 773:     />
 774:     <Route
 775:       path={ROUTES.postOpOffdaysEnglish}
 776:       component={() => (
 777:         <ProtectedRoute>
 778:           <PostOpOffdaysEnglish />
 779:         </ProtectedRoute>
 780:       )}
 781:     />
 782:     <Route
 783:       path={ROUTES.medicalConditionReportId}
 784:       component={() => (
 785:         <ProtectedRoute>
 786:           <ClinicalReportsPage defaultTab="condition" />
 787:         </ProtectedRoute>
 788:       )}
 789:     />
 790:     <Route
 791:       path={ROUTES.medicalConditionReport}
 792:       component={() => (
 793:         <ProtectedRoute>
 794:           <ClinicalReportsPage defaultTab="condition" />
 795:         </ProtectedRoute>
 796:       )}
 797:     />
 798:   </>
 799: );
```

## ClinicalSuiteRoutes

### `client/src/routes/clinical-suite-routes.tsx`

```tsx
import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";

const ClinicalSuiteShell = lazy(
  () => import("../features/clinical-suite/ClinicalSuiteShell"),
);

const ClinicalReportsPage = lazy(
  () => import("../pages/ClinicalReportsPage"),
);

const ClinicalDecisionSupportPage = lazy(
  () => import("../pages/ClinicalDecisionSupportPage"),
);

export const ClinicalSuiteRoutes = (
  <>
    <Route
      path={ROUTES.clinicalSuite}
      component={() => (
        <ProtectedRoute>
          <ClinicalSuiteShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.clinicalDecisionSupport}
      component={() => (
        <ProtectedRoute>
          <ClinicalDecisionSupportPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReport}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="medical-report" />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.medicalReportId}
      component={() => (
        <ProtectedRoute>
          <ClinicalReportsPage defaultTab="medical-report" />
        </ProtectedRoute>
      )}
    />
  </>
);
```

## ClinicalReportsPage route detection

### `client/src/pages/ClinicalReportsPage.tsx` lines 47-175

```tsx
  47:   embeddedInHub = false,
  48: }: ClinicalReportsPageProps = {}) {
  49:   const { isAuthenticated } = useAuth();
  50:   const [location, setLocation] = useLocation();
  51:   const { goBack } = useAppNavigation();
  52: 
  53:   // Route matches for any direct report URLs with an ID
  54:   const [, refParams] = useRoute("/sheets/referral/:id");
  55:   const [, clinParams1] = useRoute("/clinical-report/:id");
  56:   const [, clinParams2] = useRoute("/sheets/clinical-report/:id");
  57:   const [, prePostParams] = useRoute("/pre-post-op-report/:id");
  58:   const [, offdaysParams] = useRoute("/post-op-offdays/:id");
  59:   const [, condParams] = useRoute("/medical-condition-report/:id");
  60:   const [, medParams] = useRoute("/medical-report/:id");
  61:   const [, repIdParams] = useRoute("/reports/:id");
  62: 
  63:   const routePatientId = useMemo(() => {
  64:     const id =
  65:       refParams?.id ||
  66:       clinParams1?.id ||
  67:       clinParams2?.id ||
  68:       prePostParams?.id ||
  69:       offdaysParams?.id ||
  70:       condParams?.id ||
  71:       medParams?.id ||
  72:       repIdParams?.id;
  73:     return id ? Number(id) : undefined;
  74:   }, [
  75:     refParams,
  76:     clinParams1,
  77:     clinParams2,
  78:     prePostParams,
  79:     offdaysParams,
  80:     condParams,
  81:     medParams,
  82:     repIdParams,
  83:   ]);
  84: 
  85:   const queryPatientId = useMemo(() => {
  86:     try {
  87:       const sp = new URLSearchParams(window.location.search);
  88:       const val = sp.get("patientId") || sp.get("id");
  89:       return val ? Number(val) : undefined;
  90:     } catch {
  91:       return undefined;
  92:     }
  93:   }, [location]);
  94: 
  95:   const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
  96:     routePatientId || queryPatientId,
  97:   );
  98: 
  99:   useEffect(() => {
 100:     const detected = routePatientId || queryPatientId;
 101:     if (detected && detected !== selectedPatientId) {
 102:       setSelectedPatientId(detected);
 103:     }
 104:   }, [routePatientId, queryPatientId]);
 105: 
 106:   const patientQuery = trpc.patient.getPatient.useQuery(selectedPatientId ?? null, {
 107:     enabled: Boolean(selectedPatientId),
 108:     refetchOnWindowFocus: false,
 109:   });
 110: 
 111:   const handlePatientSelect = (id: number | undefined) => {
 112:     setSelectedPatientId(id);
 113:     try {
 114:       const url = new URL(window.location.href);
 115:       if (id) {
 116:         url.searchParams.set("patientId", String(id));
 117:       } else {
 118:         url.searchParams.delete("patientId");
 119:         url.searchParams.delete("id");
 120:       }
 121:       window.history.replaceState({}, "", url.toString());
 122:     } catch {
 123:       // ignore
 124:     }
 125:   };
 126: 
 127:   // Determine initial tab from route, URL query, or defaultTab
 128:   const initialTab = useMemo<ClinicalReportsTabKey>(() => {
 129:     try {
 130:       const sp = new URLSearchParams(window.location.search);
 131:       const tabParam = sp.get("tab");
 132:       if (
 133:         tabParam &&
 134:         ["clinical", "pre-post-op", "offdays", "condition", "referral", "medical-report"].includes(
 135:           tabParam,
 136:         )
 137:       ) {
 138:         return tabParam as ClinicalReportsTabKey;
 139:       }
 140:     } catch {
 141:       // ignore
 142:     }
 143: 
 144:     if (location.includes("/pre-post-op-report")) return "pre-post-op";
 145:     if (location.includes("/post-op-offdays")) return "offdays";
 146:     if (location.includes("/medical-condition-report")) return "condition";
 147:     if (location.includes("/sheets/referral")) return "referral";
 148:     if (location.includes("/clinical-report")) return "clinical";
 149:     if (location.includes("/medical-report")) return "medical-report";
 150: 
 151:     return defaultTab;
 152:   }, [location, defaultTab]);
 153: 
 154:   const [activeTab, setActiveTab] = useState<ClinicalReportsTabKey>(initialTab);
 155: 
 156:   useEffect(() => {
 157:     setActiveTab(initialTab);
 158:   }, [initialTab]);
 159: 
 160:   const handleTabChange = (val: string) => {
 161:     const nextTab = val as ClinicalReportsTabKey;
 162:     setActiveTab(nextTab);
 163:     try {
 164:       const url = new URL(window.location.href);
 165:       url.searchParams.set("tab", nextTab);
 166:       if (selectedPatientId) {
 167:         url.searchParams.set("patientId", String(selectedPatientId));
 168:       }
 169:       window.history.replaceState({}, "", url.toString());
 170:     } catch {
 171:       // ignore
 172:     }
 173:   };
 174: 
 175:   useEffect(() => {
```
