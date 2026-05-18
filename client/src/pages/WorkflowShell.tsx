import { Link, Route, Switch } from "wouter";
import Dashboard from "./Dashboard";
import ExaminationForm from "./ExaminationForm";
import QuickPatientEntry from "./QuickPatientEntry";
import NewCases from "./NewCases";
import FollowupForm from "./FollowupForm";
import Followups from "./Followups";
import Visits from "./Visits";
import TodayPatients from "./TodayPatients";
import Operations from "./Operations";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/workflow/dashboard", label: "لوحة العمل" },
  { href: "/workflow/examination", label: "الفحوصات" },
  { href: "/workflow/quick-entry", label: "دخول سريع" },
  { href: "/workflow/new-cases", label: "حالات جديدة" },
  { href: "/workflow/followups", label: "المتابعات" },
  { href: "/workflow/visits", label: "الزيارات" },
  { href: "/workflow/today", label: "مرضي اليوم" },
  { href: "/workflow/appointments", label: "المواعيد" },
];

export default function WorkflowShell() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {nav.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button variant="outline" size="sm" className="min-w-[130px]">
              {item.label}
            </Button>
          </Link>
        ))}
      </div>

      <Switch>
        {/* Preferred workflow routes */}
        <Route path="/workflow/dashboard" component={Dashboard} />
        <Route path="/workflow/examination/:id" component={ExaminationForm} />
        <Route path="/workflow/examination" component={ExaminationForm} />
        <Route path="/workflow/quick-entry/:id" component={QuickPatientEntry} />
        <Route path="/workflow/quick-entry" component={QuickPatientEntry} />
        <Route path="/workflow/new-cases/:id" component={NewCases} />
        <Route path="/workflow/new-cases" component={NewCases} />
        <Route path="/workflow/followup/:id" component={FollowupForm} />
        <Route path="/workflow/followups" component={Followups} />
        <Route path="/workflow/visits/:id" component={Visits} />
        <Route path="/workflow/visits" component={Visits} />
        <Route path="/workflow/today" component={TodayPatients} />
        <Route path="/workflow/operations" component={Operations} />
        {/* Legacy routes without prefix */}
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/examination/:id" component={ExaminationForm} />
        <Route path="/examination" component={ExaminationForm} />
        <Route path="/quick-entry/:id" component={QuickPatientEntry} />
        <Route path="/quick-entry" component={QuickPatientEntry} />
        <Route path="/new-cases/:id" component={NewCases} />
        <Route path="/new-cases" component={NewCases} />
        <Route path="/followup/:id" component={FollowupForm} />
        <Route path="/followups" component={Followups} />
        <Route path="/visits/:id" component={Visits} />
        <Route path="/visits" component={Visits} />
        <Route path="/today" component={TodayPatients} />
        <Route path="/operations" component={Operations} />
        <Route>
          <div className="rounded-lg border bg-background p-4 text-right text-sm text-foreground">
            اختر صفحة من الأزرار أعلاه لإدارة سير العمل.
          </div>
        </Route>
      </Switch>
    </div>
  );
}
