import { Link, Route, Switch } from "wouter";
import Patients from "./Patients";
import PatientDetails from "./PatientDetails";
import PatientSummary from "./PatientSummary";
import MedicalReports from "./MedicalReports";
import DoctorPatientView from "./DoctorPatientView";
import { Button } from "@/components/ui/button";

export default function PatientHubShell() {
  const navItems = [
    { href: "/patient-hub", label: "المرضى" },
    { href: "/patient-hub/file", label: "ملف المريض" },
    { href: "/patient-hub/summary", label: "التقرير المجمع" },
    { href: "/patient-hub/reports", label: "التقارير الطبية" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Navigation - Horizontal Scroll على الموبايل */}
      <div className="w-full bg-white border-b sticky top-0 z-10">
        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 flex-nowrap min-w-max">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap text-xs sm:text-sm px-3 py-2"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Switch>
        {/* Preferred routes */}
        <Route path="/patient-hub" component={Patients} />
        <Route path="/patient-hub/file/:id" component={PatientDetails} />
        <Route path="/patient-hub/file" component={PatientDetails} />
        <Route path="/patient-hub/summary/:id" component={PatientSummary} />
        <Route path="/patient-hub/summary" component={PatientSummary} />
        <Route path="/patient-hub/reports/:id" component={MedicalReports} />
        <Route path="/patient-hub/reports" component={MedicalReports} />
        <Route path="/patient-hub/doctor/:id" component={DoctorPatientView} />
        {/* Legacy paths (no prefix) */}
        <Route path="/patients" component={Patients} />
        <Route path="/patients/:id" component={PatientDetails} />
        <Route path="/patient-file/:id" component={PatientDetails} />
        <Route path="/patient-file" component={PatientDetails} />
        <Route path="/patient-summary/:id" component={PatientSummary} />
        <Route path="/patient-summary" component={PatientSummary} />
        <Route path="/medical-reports/:id" component={MedicalReports} />
        <Route path="/medical-reports" component={MedicalReports} />
        <Route path="/doctor/patient/:id" component={DoctorPatientView} />
        <Route>
          <div className="rounded-lg border bg-white p-4 text-right text-sm text-slate-700">
            اختر مريضاً من الجدول ثم انتقل لملفه أو التقرير أو العرض الخاص بالطبيب من نفس الهب.
          </div>
        </Route>
      </Switch>
    </div>
  );
}
