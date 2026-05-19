import { Suspense, lazy } from "react";
import { Redirect, Route, Switch } from "wouter";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";

const StockroomDashboard = lazy(() => import("./StockroomDashboard"));
const StockroomCategory = lazy(() => import("./StockroomCategory"));
const StockroomReports = lazy(() => import("./StockroomReports"));

export default function StockroomShell() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4 sm:px-6 pb-10 text-right" dir="rtl">
      <Suspense fallback={<AppShellSkeleton />}>
        <Switch>
          <Route path="/stockroom" component={StockroomDashboard} />
          <Route path="/stockroom/reports" component={StockroomReports} />
          <Route path="/stockroom/:category" component={StockroomCategory} />
          {/* Default route for this shell, redirects back to the main stockroom dashboard */}
          <Route>
            <Redirect to="/stockroom" />
          </Route>
        </Switch>
      </Suspense>
    </div>
  );
}
