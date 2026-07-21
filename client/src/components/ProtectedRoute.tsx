import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { requestAppReload } from "@/lib/appRuntime";
import { AppShell } from "@/components/layout/AppShell";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import type { User } from "@shared/types";
import { ROUTES } from "../../../shared/routes";
import { PAGE_PERMISSION_DEFINITIONS } from "@/lib/page-permissions";

// Paths that have their own explicit permission entry — parent permission does NOT cover these.
const DEFINED_PERMISSION_PATHS = new Set(
  PAGE_PERMISSION_DEFINITIONS.map((p) => p.id).filter((id) => id.startsWith("/")),
);

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredBranches?: string[];
}

function normalizePath(path: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return ROUTES.home;
  const withSlash = raw.startsWith(ROUTES.home)
    ? raw
    : `${ROUTES.home}${raw}`;
  const noHashOrQuery = withSlash.split("?")[0].split("#")[0];
  if (noHashOrQuery.length > 1 && noHashOrQuery.endsWith(ROUTES.home)) {
    return noHashOrQuery.slice(0, -1);
  }
  return noHashOrQuery;
}

export default function ProtectedRoute({
  children,
  requiredRoles,
  requiredBranches,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const userRole = String(user?.role ?? "").toLowerCase();
  const mustChangePassword = Boolean(
    (user as (User & { mustChangePassword?: boolean }) | null)
      ?.mustChangePassword,
  );
  const forcePasswordRoute = ROUTES.forcePasswordChange;
  const [location, setLocation] = useLocation();
  const navStackRef = useRef<string[]>([]);
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && userRole !== "admin",
    refetchOnWindowFocus: false,
  });

  const allowedPaths = useMemo(() => {
    const raw = (permissionsQuery.data ?? []) as string[];
    const normalized = raw
      .map((entry) => normalizePath(entry.replace(/:r[w]?$/, "")))
      .filter((entry) => entry.length > 0);
    return Array.from(new Set(normalized));
  }, [permissionsQuery.data]);

  const cleanPath = useMemo(() => {
    return normalizePath(location || ROUTES.home);
  }, [location]);

  const isPathAllowed = useMemo(() => {
    if (!user) return false;
    if (userRole === "admin") return true;
    if (cleanPath === ROUTES.profile) return true;
    if (cleanPath === ROUTES.attendanceMy) return true;
    if (cleanPath === ROUTES.attendanceShiftSchedule) return true;
    if (userRole === "reception" && cleanPath === ROUTES.examination) return true;
    if (
      userRole === "reception" &&
      (cleanPath === ROUTES.portalBookings ||
        cleanPath.startsWith(`${ROUTES.portalBookings}/`))
    )
      return true;
    if (
      (cleanPath === ROUTES.adminSettingsPricingRules ||
        cleanPath === ROUTES.adminHubSettingsPricingRules) &&
      userRole === "accountant"
    )
      return true;
    if (
      userRole === "accountant" &&
      (cleanPath === ROUTES.kf || cleanPath.startsWith(`${ROUTES.kf}/`))
    ) {
      return true;
    }
    if (
      cleanPath === ROUTES.kfSheetsConsultant ||
      cleanPath.startsWith(`${ROUTES.kfSheetsConsultant}/`)
    ) {
      const matchKf = allowedPaths.some(
        (p) => p === ROUTES.kf || (p !== ROUTES.home && p.startsWith(ROUTES.kf)),
      );
      if (matchKf) return true;
    }
    /** مركز الخدمات ومكوناته (الأدوية، كتالوج الفحوصات، TXhub، السجل) */
    const isServicesHubPath =
      cleanPath === "/services-hub" || cleanPath.startsWith("/services-hub/");
    const isMedicationsPath =
      cleanPath === ROUTES.medications || cleanPath.startsWith(`${ROUTES.medications}/`);
    const isExamCatalogPath =
      cleanPath === ROUTES.examCatalog || cleanPath.startsWith(`${ROUTES.examCatalog}/`);
    const isTxHubPath =
      cleanPath === ROUTES.txhub ||
      cleanPath.startsWith(`${ROUTES.txhub}/`) ||
      cleanPath === ROUTES.txhubRoute ||
      cleanPath.startsWith(`${ROUTES.txhubRoute}/`);
    const isMedicationsTestsPath =
      cleanPath === ROUTES.medicationsTests || cleanPath === ROUTES.tests;

    const matchServicesHub =
      allowedPaths.includes("/services-hub") ||
      allowedPaths.some((p) => p.startsWith("/services-hub"));
    const matchMeds = allowedPaths.some(
      (p) =>
        p === ROUTES.medications ||
        (p !== ROUTES.home && p.startsWith(ROUTES.medications)),
    );
    const matchExamCatalog =
      allowedPaths.includes(ROUTES.examCatalog) ||
      allowedPaths.some((p) => p.startsWith(`${ROUTES.examCatalog}`));
    const matchTx =
      allowedPaths.includes(ROUTES.txhub) ||
      allowedPaths.includes(ROUTES.txhubRoute) ||
      allowedPaths.includes("/txhub") ||
      allowedPaths.includes("/treatment") ||
      allowedPaths.some((p) => p.startsWith("/txhub") || p.startsWith("/treatment"));
    const matchTests = allowedPaths.some(
      (p) => p === ROUTES.tests || (p !== ROUTES.home && p.startsWith(ROUTES.tests)),
    );
    const matchRegistry = allowedPaths.some(
      (p) => p === "/medications/registry" || p.startsWith("/medications/registry"),
    );

    const hasAnyServiceHubPermission =
      matchServicesHub ||
      matchMeds ||
      matchExamCatalog ||
      matchTx ||
      matchTests ||
      matchRegistry;

    if (isServicesHubPath) {
      if (hasAnyServiceHubPermission) return true;
    }
    if (isMedicationsPath) {
      if (cleanPath.startsWith("/medications/registry")) {
        if (matchServicesHub || matchRegistry || matchMeds) return true;
      } else {
        if (matchServicesHub || matchMeds) return true;
      }
    }
    if (isExamCatalogPath) {
      if (matchServicesHub || matchExamCatalog || matchTests || matchMeds) return true;
    }
    if (isTxHubPath) {
      if (matchServicesHub || matchTx || matchTests || matchMeds) return true;
    }
    if (isMedicationsTestsPath) {
      if (hasAnyServiceHubPermission) return true;
    }
    if (
      cleanPath === ROUTES.patientFile ||
      cleanPath.startsWith(`${ROUTES.patientFile}/`)
    ) {
      if (
        allowedPaths.includes(ROUTES.patients) ||
        allowedPaths.includes(ROUTES.patientsById)
      )
        return true;
    }
    /** مركز المريض: نفس مستوى الوصول لقائمة المرضى / ملف المريض */
    if (cleanPath === ROUTES.patientHub || cleanPath.startsWith(`${ROUTES.patientHub}/`)) {
      if (
        allowedPaths.includes(ROUTES.patients) ||
        allowedPaths.includes(ROUTES.patientsById)
      )
        return true;
    }
    /** قائمة الروشتات: تُعامل مثل صلاحية الكتابة `/prescription` إن لم تُذكر صريحةً. */
    if (
      cleanPath === ROUTES.prescriptions ||
      cleanPath.startsWith(`${ROUTES.prescriptions}/`)
    ) {
      if (
        allowedPaths.includes(ROUTES.prescriptions) ||
        allowedPaths.some(
          (p) => p === ROUTES.prescription || p.startsWith(`${ROUTES.prescription}/`),
        )
      ) {
        return true;
      }
    }
    if (cleanPath === forcePasswordRoute) return true;
    if (cleanPath === ROUTES.home || cleanPath === ROUTES.dashboard) return true;
    // /today (/bookings) and /today (alias) are the same page — treat them as interchangeable
    if (cleanPath === ROUTES.today) {
      return allowedPaths.some(
        (p) => p === ROUTES.today || p === ROUTES.todayRoute || p === "/today-patients",
      );
    }
    if (!allowedPaths.length) {
      return false;
    }

    return allowedPaths.some((permission) => {
      if (!permission) return false;
      if (permission === cleanPath) return true;
      // Parent-prefix match: only applies when cleanPath has no own permission definition.
      // If the target path has its own defined permission, the user must hold that explicitly.
      if (
        permission !== ROUTES.home &&
        cleanPath.startsWith(`${permission}/`) &&
        !DEFINED_PERMISSION_PATHS.has(cleanPath as any)
      )
        return true;
      if (permission.includes(`${ROUTES.home}:`)) {
        const base = permission.split(`${ROUTES.home}:`)[0];
        if (cleanPath === base) return true;
        if (cleanPath.startsWith(`${base}/`) && !DEFINED_PERMISSION_PATHS.has(cleanPath as any))
          return true;
      }
      return false;
    });
  }, [allowedPaths, cleanPath, user, userRole]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("navStack");
      navStackRef.current = raw ? JSON.parse(raw) : [];
    } catch {
      navStackRef.current = [];
    }
  }, []);

  useEffect(() => {
    const stack = navStackRef.current;
    const last = stack[stack.length - 1];
    if (last !== location) {
      stack.push(location);
      if (stack.length > 50) stack.shift();
      sessionStorage.setItem("navStack", JSON.stringify(stack));
    }
  }, [location]);

  useEffect(() => {
    if (loading) return;

    // If not authenticated, redirect to login
    if (!user) {
      setLocation(ROUTES.login);
      return;
    }

    if (mustChangePassword && cleanPath !== forcePasswordRoute) {
      setLocation(forcePasswordRoute);
      return;
    }
    if (!mustChangePassword && cleanPath === forcePasswordRoute) {
      setLocation(ROUTES.dashboard);
      return;
    }

    if (
      userRole === "accountant" &&
      (cleanPath === ROUTES.home || cleanPath === ROUTES.dashboard)
    ) {
      setLocation(ROUTES.accounting);
      return;
    }

    const roleMismatch =
      requiredRoles &&
      !requiredRoles
        .map((role) => String(role).toLowerCase())
        .includes(userRole);
    if (
      roleMismatch &&
      !(userRole !== "admin" && permissionsQuery.isSuccess && isPathAllowed)
    ) {
      setLocation(ROUTES.home);
      return;
    }

    // Check branch permission
    if (
      requiredBranches &&
      user.branch !== "both" &&
      !requiredBranches.includes(user.branch)
    ) {
      setLocation(ROUTES.home);
      return;
    }

    if (userRole !== "admin" && permissionsQuery.isSuccess && !isPathAllowed) {
      const fallback = allowedPaths.includes(ROUTES.kf) ? ROUTES.kf : ROUTES.home;
      setLocation(fallback !== cleanPath ? fallback : ROUTES.home);
      return;
    }
  }, [
    user,
    userRole,
    loading,
    requiredRoles,
    requiredBranches,
    setLocation,
    permissionsQuery.isSuccess,
    isPathAllowed,
    mustChangePassword,
    cleanPath,
  ]);

  if (loading || (userRole !== "admin" && permissionsQuery.isLoading)) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (userRole !== "admin" && permissionsQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Unable to verify page permissions
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The app could not reach the server to confirm access for this page.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void permissionsQuery.refetch()}
            >
              Retry
            </Button>
            <Button
              type="button"
              onClick={() => requestAppReload("permissions-error")}
            >
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const roleMismatch =
    requiredRoles &&
    !requiredRoles.map((role) => String(role).toLowerCase()).includes(userRole);
  const roleOverrideByPermission =
    userRole !== "admin" && permissionsQuery.isSuccess && isPathAllowed;

  if (roleMismatch && !roleOverrideByPermission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="rounded-[28px] border border-border bg-background/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-destructive font-semibold mb-4">
            ليس لديك صلاحية للوصول لهذه الصفحة
          </p>
          <button
            onClick={() => setLocation(ROUTES.home)}
            className="text-primary hover:underline"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (
    requiredBranches &&
    user.branch !== "both" &&
    !requiredBranches.includes(user.branch)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="rounded-[28px] border border-border bg-background/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-destructive font-semibold mb-4">
            هذه الصفحة غير متاحة لفرعك
          </p>
          <button
            onClick={() => setLocation(ROUTES.home)}
            className="text-primary hover:underline"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (userRole !== "admin" && permissionsQuery.isSuccess && !isPathAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="rounded-[28px] border border-border bg-background/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-destructive font-semibold mb-4">
            ليس لديك صلاحية للوصول لهذه الصفحة
          </p>
          <button
            onClick={() => setLocation(ROUTES.home)}
            className="text-primary hover:underline"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
