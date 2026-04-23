import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Home, LogOut, Monitor, Moon, Settings, ShieldAlert, ShieldCheck, Sparkles, Sun, UserCog } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { requestAppReload } from "@/lib/appRuntime";
import { ShortcutsMenu } from "@/components/FloatingShortcuts";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { user, loading, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
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
    if (cleanPath === "/patient-file" || cleanPath.startsWith("/patient-file/")) {
      if (allowedPaths.includes("/patients") || allowedPaths.includes("/patients/:id")) return true;
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

    // Check role permission
    if (requiredRoles && !requiredRoles.map((role) => String(role).toLowerCase()).includes(userRole)) {
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
            <ShieldCheck className="h-6 w-6 animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
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

  if (requiredRoles && !requiredRoles.map((role) => String(role).toLowerCase()).includes(userRole)) {
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

  const handleBack = (event?: React.MouseEvent) => {
    event?.preventDefault();
    const stack = navStackRef.current;
    if (stack.length > 1) {
      stack.pop();
      const prev = stack[stack.length - 1];
      sessionStorage.setItem("navStack", JSON.stringify(stack));
      if (prev) {
        setLocation(prev);
        return;
      }
    }
    setLocation("/dashboard");
  };

  const handleHome = (event?: React.MouseEvent) => {
    event?.preventDefault();
    setLocation("/dashboard");
  };

  const showAdminButton = userRole === "admin";

  return (
    <>
      <div className="bg-primary text-primary-foreground shadow-lg print:hidden sticky top-0 z-[130]">
        <div className="hidden sm:flex flex-row sm:items-center sm:justify-between px-3 py-3 sm:px-4 sm:py-4 container mx-auto">
          <div className="flex flex-col gap-1 items-start">
            <p className="text-sm font-semibold">مرحباً بك، <span dir="auto">{user?.name ?? ""}</span></p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              Secure Session
            </div>
          </div>
          <div
            className="flex items-center justify-center gap-3 text-center cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={handleHome}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleHome();
              }
            }}
            aria-label="الصفحة الرئيسية"
          >
            <img src="/logo.png" alt="Logo" className="h-16 w-16" />
            <div className="text-right">
              <h1 className="text-2xl font-bold">مركز عيون الشروق</h1>
            </div>
          </div>
          <div className="hidden sm:flex gap-2 justify-center">
            <ShortcutsMenu onLogout={() => logout()} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHome}
              className="text-slate-200 hover:bg-slate-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-slate-200 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            {showAdminButton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLocation("/admin-hub")}
                className="text-slate-200 hover:bg-slate-100"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cycleTheme?.()}
              className="text-slate-200 hover:bg-slate-100"
              title={
                theme === "light"
                  ? "Dark mode"
                  : theme === "dark"
                    ? "Windows 7 mode"
                    : "Light mode"
              }
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : theme === "dark" ? <Monitor className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/profile")}
              className="text-slate-200 hover:bg-slate-100"
            >
              <UserCog className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex sm:hidden flex-col w-full">
          <div
            className="flex items-center justify-center gap-3 text-center cursor-pointer py-2"
            role="button"
            tabIndex={0}
            onClick={handleHome}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleHome();
              }
            }}
            aria-label="الصفحة الرئيسية"
          >
            <img src="/logo.png" alt="Logo" className="h-12 w-12" />
            <div className="text-right">
              <h1 className="text-lg font-bold">مركز عيون الشروق</h1>
            </div>
          </div>
          <div className="flex w-full px-3 py-2 justify-center overflow-visible z-50">
            <ShortcutsMenu isMobile={true} onLogout={() => logout()} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => cycleTheme?.()}
              className="ml-1 h-9 w-9 border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-none"
              title={
                theme === "light"
                  ? "Dark mode"
                  : theme === "dark"
                    ? "Windows 7 mode"
                    : "Light mode"
              }
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : theme === "dark" ? <Monitor className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </>
  );
}


