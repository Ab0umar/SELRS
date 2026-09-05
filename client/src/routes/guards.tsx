import { lazy, useEffect } from "react";
import { Redirect, useLocation, useRoute } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ROUTES } from "../../../shared/routes";

const Dashboard = lazy(() => import("../pages/Dashboard"));

export function LegacySurgerySheetRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const match = window.location.pathname.match(
      /^\/sheets\/surgery\/([^/?#]+)/i,
    );
    const id = match?.[1];
    if (id) {
      setLocation(`/sheets/operation/${id}`);
    }
  }, [setLocation]);
  return null;
}

/** `/prescriptions/:id` كان يُستخدم لفتح الكاتب؛ يُوجَّه الآن إلى `/prescription/:id`. */
export function PrescriptionsWriterDeepLinkRedirect() {
  const [, params] = useRoute("/prescriptions/:id");
  const id = params?.id?.trim();
  if (!id) return null;
  return <Redirect to={`${ROUTES.prescription}/${id}`} />;
}

export function DashboardRouteGate() {
  const { user } = useAuth();
  const role = String(user?.role ?? "").toLowerCase();
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && role !== "admin" && role !== "accountant",
    refetchOnWindowFocus: false,
  });
  if (user && role !== "admin") {
    if (role === "accountant") return <Redirect to="/accounting" />;
    if (permissionsQuery.isSuccess) {
      const paths = (permissionsQuery.data ?? []) as string[];
      const normalized = paths.map((p) => p.replace(/:r[w]?$/, ""));
      const hasToday = normalized.some(
        (p) => p === ROUTES.today || p === ROUTES.todayRoute || p === "/today-patients",
      );
      if (!hasToday && normalized.includes("/kf")) {
        return <Redirect to="/kf" />;
      }
    }
    return <Redirect to={ROUTES.todayRoute} />;
  }
  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <Dashboard />
    </ProtectedRoute>
  );
}
