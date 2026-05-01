import { Link, Route, Switch, useLocation } from "wouter";
import Patients from "./Patients";
import PatientDetails from "./PatientDetails";
import PatientSummary from "./PatientSummary";
import MedicalReports from "./MedicalReports";
import DoctorPatientView from "./DoctorPatientView";
import { useMemo } from "react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Activity,
  ClipboardList,
  FlaskConical,
  LayoutGrid,
  Pill,
  UserRound,
} from "lucide-react";
import { AppShellFooter } from "@/components/layout/AppShellFooter";

function extractHubPatientId(path: string): string | undefined {
  const m = path.match(/\/patient-hub\/(?:file|summary|reports|doctor)\/(\d+)/);
  return m?.[1];
}

type NavKey = "summary" | "data" | "exams" | "sheets" | "rx" | "labs";

export default function PatientHubShell() {
  const [location] = useLocation();
  const { goBack } = useAppNavigation();

  const patientId = useMemo(() => extractHubPatientId(location), [location]);

  const navItems: Array<{
    key: NavKey;
    label: string;
    href: string;
    icon: LucideIcon;
    match: (path: string) => boolean;
  }> = [
    {
      key: "summary",
      label: "الملخص",
      href: patientId ? `/patient-hub/summary/${patientId}` : "/patient-hub/summary",
      icon: LayoutGrid,
      match: (p) => p.startsWith("/patient-hub/summary"),
    },
    {
      key: "data",
      label: "البيانات",
      href: patientId ? `/patient-hub/file/${patientId}` : "/patient-hub/file",
      icon: UserRound,
      match: (p) => p.startsWith("/patient-hub/file"),
    },
    {
      key: "exams",
      label: "الفحوصات",
      href: "/examination",
      icon: Activity,
      match: (p) => p.startsWith("/examination"),
    },
    {
      key: "sheets",
      label: "الشيتات",
      href: patientId ? `/sheets/consultant/${patientId}` : "/patient-hub",
      icon: ClipboardList,
      match: (p) => p.startsWith("/sheets/"),
    },
    {
      key: "rx",
      label: "الروشتات",
      href: patientId ? `/prescription/${patientId}` : "/prescription",
      icon: Pill,
      match: (p) => p.startsWith("/prescription") || p.startsWith("/prescriptions"),
    },
    {
      key: "labs",
      label: "التحاليل",
      href: patientId ? `/request-tests/${patientId}` : "/request-tests",
      icon: FlaskConical,
      match: (p) => p.startsWith("/request-tests"),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa] dark:bg-background" dir="rtl">
      <header className="shrink-0 border-b border-border/80 bg-background">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => goBack()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h1 className="text-lg font-black leading-tight text-foreground sm:text-xl">مركز المريض</h1>
            <p className="mt-0.5 text-sm font-medium text-muted-foreground tabular-nums">
              {patientId ? `: ${patientId}` : ": —"}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col md:flex-row md:min-h-0">
        <aside className="shrink-0 border-b border-border/80 bg-background md:w-56 md:border-b-0 md:border-s md:border-border/80">
          <nav className="flex flex-row gap-0.5 overflow-x-auto px-2 py-2 md:flex-col md:overflow-y-auto md:px-2 md:py-3 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(location);
              return (
                <Link key={item.key} href={item.href} className="shrink-0 md:w-full">
                  <span
                    className={cn(
                      "flex min-w-[8.5rem] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors md:min-w-0 md:w-full",
                      active
                        ? "bg-primary/12 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                        active ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-[50vh] flex-1 bg-background md:min-h-0 md:border-s md:border-border/80">
          <Switch>
            <Route path="/patient-hub/file/:id" component={PatientDetails} />
            <Route path="/patient-hub/summary/:id" component={PatientSummary} />
            <Route path="/patient-hub/reports/:id" component={MedicalReports} />
            <Route path="/patient-hub/doctor/:id" component={DoctorPatientView} />
            <Route path="/patient-hub/file" component={PatientDetails} />
            <Route path="/patient-hub/summary" component={PatientSummary} />
            <Route path="/patient-hub/reports" component={MedicalReports} />
            <Route path="/patient-hub" component={Patients} />
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
              <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-16 text-center">
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  محتوى مركز المريض — يتم تحميل الصفحة المحددة
                </p>
              </div>
            </Route>
          </Switch>
        </main>
      </div>

      <AppShellFooter />
    </div>
  );
}
