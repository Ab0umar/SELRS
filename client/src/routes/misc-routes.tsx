import { lazy } from "react";
import { Redirect, Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import DoctorPortalRoute from "../components/DoctorPortalRoute";
import PatientPortalRoute from "../components/PatientPortalRoute";
import { ROUTES } from "../../../shared/routes";

const DoctorLogin = lazy(() => import("../features/doctor-portal/DoctorLogin"));
const DoctorDashboard = lazy(
  () => import("../features/doctor-portal/DoctorDashboard"),
);
const DoctorPatientImages = lazy(
  () => import("../features/doctor-portal/DoctorPatientImages"),
);
const PatientLogin = lazy(
  () => import("../features/patient-portal/PatientLogin"),
);
const PatientGuestBook = lazy(
  () => import("../features/patient-portal/PatientGuestBook"),
);
const PatientFile = lazy(
  () => import("../features/patient-portal/PatientFile"),
);
const PatientRefraction = lazy(
  () => import("../features/patient-portal/PatientRefraction"),
);
const PatientPrescription = lazy(
  () => import("../features/patient-portal/PatientPrescription"),
);
const PatientScans = lazy(
  () => import("../features/patient-portal/PatientScans"),
);
const PatientBook = lazy(
  () => import("../features/patient-portal/PatientBook"),
);
const PatientBookings = lazy(
  () => import("../features/patient-portal/PatientBookings"),
);
const Home = lazy(() => import("../pages/Home"));
const MainHome = lazy(() => import("../pages/MainHome"));
const ForcePasswordChange = lazy(() => import("../pages/ForcePasswordChange"));
const Profile = lazy(() => import("../pages/Profile"));
const AccountPage = lazy(() => import("../pages/AccountPage"));
const PatientHubShell = lazy(() => import("../pages/PatientHubShell"));
const ClinicsHubShell = lazy(() => import("../pages/ClinicsHubShell"));
const PatientsHubShell = lazy(() => import("../pages/PatientsHubShell"));
const ServicesHubShell = lazy(() => import("../pages/ServicesHubShell"));
const StockroomShell = lazy(
  () => import("../features/stockroom/StockroomShell"),
);
const ComponentShowcase = lazy(() => import("../pages/ComponentShowcase"));
const Styleguide = lazy(() => import("../pages/dev/Styleguide"));
const ComponentsGallery = lazy(() => import("../pages/dev/ComponentsGallery"));
const Prototypes = lazy(() => import("../pages/dev/Prototypes"));
const WorkflowPrototypeLive = lazy(
  () => import("../pages/WorkflowPrototypeLive"),
);

const Documentation = lazy(() => import("../pages/dev/Documentation"));
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const NotFound = lazy(() => import("../pages/NotFound"));

export const MiscRoutes = (
  <>
    <Route path={ROUTES.doctorPortalLogin} component={DoctorLogin} />
    <Route
      path={ROUTES.doctorPortalPatient}
      component={() => (
        <DoctorPortalRoute>
          <DoctorPatientImages />
        </DoctorPortalRoute>
      )}
    />
    <Route
      path={ROUTES.doctorPortalDashboard}
      component={() => (
        <DoctorPortalRoute>
          <DoctorDashboard />
        </DoctorPortalRoute>
      )}
    />
    <Route
      path={ROUTES.doctorPortalRoot}
      component={() => (
        <DoctorPortalRoute>
          <DoctorDashboard />
        </DoctorPortalRoute>
      )}
    />
    <Route
      path={ROUTES.patientPortalLogin}
      component={() => <Redirect to="/my/login" />}
    />
    <Route
      path={ROUTES.patientPortalRoot}
      component={() => <Redirect to="/my/login" />}
    />
    <Route path={ROUTES.myLogin} component={PatientLogin} />
    <Route path={ROUTES.myBookGuest} component={PatientGuestBook} />
    <Route
      path={ROUTES.myFile}
      component={() => (
        <PatientPortalRoute>
          <PatientFile />
        </PatientPortalRoute>
      )}
    />
    <Route
      path={ROUTES.myRefraction}
      component={() => (
        <PatientPortalRoute>
          <PatientRefraction />
        </PatientPortalRoute>
      )}
    />
    <Route
      path={ROUTES.myPrescription}
      component={() => (
        <PatientPortalRoute>
          <PatientPrescription />
        </PatientPortalRoute>
      )}
    />
    <Route
      path={ROUTES.myScans}
      component={() => (
        <PatientPortalRoute>
          <PatientScans />
        </PatientPortalRoute>
      )}
    />
    <Route
      path={ROUTES.myBook}
      component={() => (
        <PatientPortalRoute>
          <PatientBook />
        </PatientPortalRoute>
      )}
    />
    <Route
      path={ROUTES.myBookings}
      component={() => (
        <PatientPortalRoute>
          <PatientBookings />
        </PatientPortalRoute>
      )}
    />
    <Route
      path={ROUTES.myRoot}
      component={() => (
        <PatientPortalRoute>
          <PatientFile />
        </PatientPortalRoute>
      )}
    />
    <Route path={ROUTES.login} component={Home} />
    <Route
      path={ROUTES.forcePasswordChange}
      component={() => (
        <ProtectedRoute>
          <ForcePasswordChange />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.profile}
      component={() => (
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.account}
      component={() => (
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.accountWildcard}
      component={() => (
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      )}
    />
    <Route path={ROUTES.root} component={() => <Redirect to={ROUTES.mainHome} />} />
    <Route
      path={ROUTES.mainHome}
      component={() => (
        <ProtectedRoute>
          <MainHome />
        </ProtectedRoute>
      )}
    />
    <Route
      path={`${ROUTES.patientHub}/*?`}
      component={() => (
        <ProtectedRoute>
          <PatientHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.clinicsHub}
      component={() => (
        <ProtectedRoute>
          <ClinicsHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.clinicsHubWildcard}
      component={() => (
        <ProtectedRoute>
          <ClinicsHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.patientsHub}
      component={() => (
        <ProtectedRoute>
          <PatientsHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.patientsHubWildcard}
      component={() => (
        <ProtectedRoute>
          <PatientsHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.servicesHub}
      component={() => (
        <ProtectedRoute>
          <ServicesHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.servicesHubWildcard}
      component={() => (
        <ProtectedRoute>
          <ServicesHubShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.stockroom}
      component={() => (
        <ProtectedRoute>
          <StockroomShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.stockroomWildcard}
      component={() => (
        <ProtectedRoute>
          <StockroomShell />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.showcase}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <ComponentShowcase />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.styleguide}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <Styleguide />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.componentsGallery}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <ComponentsGallery />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.prototypes}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <Prototypes />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.workflow}
      component={() => (
        <ProtectedRoute>
          <WorkflowPrototypeLive />
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.workflowPrototype}
      component={() => <Redirect to={ROUTES.workflow} />}
    />

    <Route
      path={ROUTES.documentation}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <Documentation />
        </ProtectedRoute>
      )}
    />
    <Route path={ROUTES.privacy} component={PrivacyPolicy} />
    <Route path={ROUTES.page404} component={NotFound} />
    <Route component={NotFound} />
  </>
);
