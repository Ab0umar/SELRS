import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { requestAppReload } from "@/lib/appRuntime";
import { AppShell } from "@/components/layout/AppShell";
import { LidWipeLoader } from "@/components/loaders/OrganicLoaders";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredBranches?: string[];
}

function normalizePath(path: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const noHashOrQuery = withSlash.split("?")[0].split("#")[0];
  if (noHashOrQuery.length > 1 && noHashOrQuery.endsWith("/")) {
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
  const mustChangePassword = Boolean((user as any)?.mustChangePassword);
  const forcePasswordRoute = "/force-password-change";
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
    return normalizePath(location || "/");
  }, [location]);

  const isPathAllowed = useMemo(() => {
    if (!user) return false;
    if (userRole === "admin") return true;
    if (cleanPath === "/profile") return true;
    if (userRole === "reception" && cleanPath === "/examination") return true;
    if ((cleanPath === "/admin/settings/pricing-rules" || cleanPath === "/admin-hub/settings/pricing-rules") && userRole === "accountant") return true;
    /** كتالوج الفحوصات و TXhub يُقيّدان بنفس مستوى صلاحيات الاختبارات أو الأدوية */
    if (
      cleanPath === "/examinations/catalog" ||
      cleanPath.startsWith("/examinations/catalog/") ||
      cleanPath === "/txhub" ||
      cleanPath.startsWith("/txhub/")
    ) {
      const matchTests = allowedPaths.some((p) => p === "/tests" || (p !== "/" && p.startsWith("/tests")));
      const matchMeds = allowedPaths.some((p) => p === "/medications" || (p !== "/" && p.startsWith("/medications")));
      const matchExamCatalog = allowedPaths.includes("/examinations/catalog") || allowedPaths.some((p) => p.startsWith("/examinations/catalog:"));
      const matchTx = allowedPaths.includes("/txhub") || allowedPaths.some((p) => p.startsWith("/txhub"));
      const allowExamPath = cleanPath === "/examinations/catalog" || cleanPath.startsWith("/examinations/catalog/");
      const allowTxPath = cleanPath === "/txhub" || cleanPath.startsWith("/txhub/");
      if (allowExamPath && (matchTests || matchMeds || matchExamCatalog)) return true;
      if (allowTxPath && (matchTests || matchMeds || matchTx)) return true;
    }
    if (cleanPath === "/patient-file" || cleanPath.startsWith("/patient-file/")) {
      if (allowedPaths.includes("/patients") || allowedPaths.includes("/patients/:id")) return true;
    }
    /** مركز المريض: نفس مستوى الوصول لقائمة المرضى / ملف المريض */
    if (cleanPath === "/patient-hub" || cleanPath.startsWith("/patient-hub/")) {
      if (allowedPaths.includes("/patients") || allowedPaths.includes("/patients/:id")) return true;
    }
    /** قائمة الروشتات: تُعامل مثل صلاحية الكتابة `/prescription` إن لم تُذكر صريحةً. */
    if (cleanPath === "/prescriptions" || cleanPath.startsWith("/prescriptions/")) {
      if (
        allowedPaths.includes("/prescriptions") ||
        allowedPaths.some((p) => p === "/prescription" || p.startsWith("/prescription/"))
      ) {
        return true;
      }
    }
    if (cleanPath === forcePasswordRoute) return true;
    if (cleanPath === "/" || cleanPath === "/dashboard") return true;
    if (!allowedPaths.length) {
      return false;
    }

    return allowedPaths.some((permission) => {
      if (!permission) return false;
      if (permission === cleanPath) return true;
      if (permission !== "/" && cleanPath.startsWith(`${permission}/`)) return true;
      if (permission.includes("/:")) {
        const base = permission.split("/:")[0];
        return cleanPath === base || cleanPath.startsWith(`${base}/`);
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
      setLocation("/login");
      return;
    }

    if (mustChangePassword && cleanPath !== forcePasswordRoute) {
      setLocation(forcePasswordRoute);
      return;
    }
    if (!mustChangePassword && cleanPath === forcePasswordRoute) {
      setLocation("/dashboard");
      return;
    }

    const roleMismatch =
      requiredRoles &&
      !requiredRoles.map((role) => String(role).toLowerCase()).includes(userRole);
    if (roleMismatch && !(userRole !== "admin" && permissionsQuery.isSuccess && isPathAllowed)) {
      setLocation("/");
      return;
    }

    // Check branch permission
    if (
      requiredBranches &&
      user.branch !== "both" &&
      !requiredBranches.includes(user.branch)
    ) {
      setLocation("/");
      return;
    }

    if (userRole !== "admin" && permissionsQuery.isSuccess && !isPathAllowed) {
      setLocation("/");
      return;
    }
  }, [user, userRole, loading, requiredRoles, requiredBranches, setLocation, permissionsQuery.isSuccess, isPathAllowed, mustChangePassword, cleanPath]);

  if (loading || (userRole !== "admin" && permissionsQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
        <LidWipeLoader size={140} logo="eye" label="جاري التحميل..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (userRole !== "admin" && permissionsQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
        <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-slate-900">Unable to verify page permissions</p>
          <p className="mt-2 text-sm text-slate-600">
            The app could not reach the server to confirm access for this page.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => void permissionsQuery.refetch()}>
              Retry
            </Button>
            <Button type="button" onClick={() => requestAppReload("permissions-error")}>
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
  const roleOverrideByPermission = userRole !== "admin" && permissionsQuery.isSuccess && isPathAllowed;

  if (roleMismatch && !roleOverrideByPermission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-red-600 font-semibold mb-4">ليس لديك صلاحية للوصول لهذه الصفحة</p>
          <button
            onClick={() => setLocation("/")}
            className="text-blue-600 hover:underline"
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-red-600 font-semibold mb-4">هذه الصفحة غير متاحة لفرعك</p>
          <button
            onClick={() => setLocation("/")}
            className="text-blue-600 hover:underline"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (userRole !== "admin" && permissionsQuery.isSuccess && !isPathAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-red-600 font-semibold mb-4">ليس لديك صلاحية للوصول لهذه الصفحة</p>
          <button
            onClick={() => setLocation("/")}
            className="text-blue-600 hover:underline"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}


