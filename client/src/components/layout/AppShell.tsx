import { useAuth, persistSessionUser } from "@/hooks/useAuth";
import { getTrpcErrorMessage } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ReactNode,
  type UIEvent as ReactUIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { User } from "@shared/types";

import { AppBottomNav } from "./AppBottomNav";
import { AppTopNav } from "./AppTopNav";
import "./mobile-brand-canvas.css";

import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import { requestAppReload } from "@/lib/appRuntime";
import { RouteTitleFallback } from "./RouteTitleFallback";
import { extractHubPatientId } from "@/lib/patientHubNavigation";
import {
  CHANGE_PASSWORD_RULES_HINT,
  validateChangePasswordForm,
  type ChangePasswordFieldErrors,
  type ChangePasswordFormValues,
} from "@/lib/change-password-validation";

type AppShellProps = {
  children: ReactNode;
  /** Hide sidebar + mobile drawer (e.g. kiosk / print-focused routes). */
  hideSidebar?: boolean;
  /** Hide the main top navigation on selected screens. */
  hideTopNav?: boolean;
  /** Keep the header visible while hiding its shortcut strip. */
  hideTopShortcuts?: boolean;
};

export function AppShell({
  children,
  hideSidebar = false,
  hideTopNav = false,
  hideTopShortcuts = false,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";
  const isNativeMobileApp = Capacitor.isNativePlatform();
  const isAdminPatientsRoute =
    location === "/admin/patients" || location === "/admin-patients";
  const isDashboardLikeRoute =
    location === "/dashboard" ||
    location === "/today-patients" ||
    location === "/today";

  const isShiftScheduleRoute =
    location === "/attendance/shift-schedule" ||
    location.startsWith("/attendance/shift-schedule");

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedRoots = useMemo(
    () =>
      permissionsToAllowedRoots(
        (permissionsQuery.data ?? []) as string[],
      ) as unknown,
    [permissionsQuery.data],
  );

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [topNavHidden, setTopNavHidden] = useState(false);
  const previousScrollTopRef = useRef(0);
  const scrollTravelRef = useRef(0);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({});

  const utils = trpc.useUtils();
  const mustForcePasswordChange = Boolean(
    (user as (User & { mustChangePassword?: boolean }) | null)
      ?.mustChangePassword,
  );

  const changeUsernameMutation = trpc.auth.changeUsername.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث اسم المستخدم");
      setIsAccountDialogOpen(false);
      await utils.auth.me.invalidate();
    },
  });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث الملف الشخصي");
      await utils.auth.me.invalidate();
    },
  });
  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      setFieldErrors({});
      toast.success("تم تغيير كلمة المرور بنجاح");
      setIsPasswordDialogOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await utils.auth.me.invalidate();
    },
  });

  useEffect(() => {
    setAccountUsername(String((user as User | null)?.username ?? ""));
    setAccountName(String((user as User | null)?.name ?? ""));
    setAccountEmail(String((user as User | null)?.email ?? ""));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (mustForcePasswordChange) setIsPasswordDialogOpen(true);
  }, [mustForcePasswordChange, user]);

    const handleSignOut = async () => {
    await logout();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/home");
  };

  const handleContentScroll = (event: ReactUIEvent<HTMLElement>) => {
    const scrollContainer = event.currentTarget;
    const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    const nextScrollTop = Math.max(0, Math.min(scrollContainer.scrollTop, maxScrollTop));
    const delta = nextScrollTop - previousScrollTopRef.current;
    previousScrollTopRef.current = nextScrollTop;
    if (nextScrollTop <= 12) {
      setTopNavHidden(false);
      scrollTravelRef.current = 0;
      return;
    }
    // Ignore edge bounce and require sustained travel in one direction.
    if (Math.abs(delta) < 1 || nextScrollTop >= maxScrollTop - 12) return;
    scrollTravelRef.current = Math.sign(delta) === Math.sign(scrollTravelRef.current)
      ? scrollTravelRef.current + delta
      : delta;
    if (scrollTravelRef.current <= -24) {
      setTopNavHidden(false);
      scrollTravelRef.current = 0;
    } else if (scrollTravelRef.current >= 24 && nextScrollTop > 48) {
      setTopNavHidden(true);
      scrollTravelRef.current = 0;
    }
  };

  useEffect(() => {
    previousScrollTopRef.current = 0;
    scrollTravelRef.current = 0;
    setTopNavHidden(false);
  }, [location]);



  const handlePasswordFieldChange = (
    field: keyof ChangePasswordFormValues,
    value: string,
  ) => {
    const nextForm = { ...passwordForm, [field]: value };
    setPasswordForm(nextForm);
    // Live re-validation only after a failed submit so errors never show early.
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(validateChangePasswordForm(nextForm));
    }
  };

  const handleChangePassword = async () => {
    const validationErrors = validateChangePasswordForm(passwordForm);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword.trim(),
        newPassword: passwordForm.newPassword.trim(),
      });
    } catch (error) {
      const message = getTrpcErrorMessage(error, "فشل تغيير كلمة المرور");
      if (message === "كلمة المرور الحالية غير صحيحة") {
        setFieldErrors({ currentPassword: message });
        return;
      }
      toast.error(message);
    }
  };

  const handleUpdateUsername = async () => {
    const nextUsername = accountUsername.trim();
    if (!nextUsername) {
      toast.error("Username Is Required");
      return false;
    }
    if (nextUsername.length < 3) {
      toast.error("Username Must Be At Least 3 Characters");
      return false;
    }
    if (nextUsername === String((user as User | null)?.username ?? "").trim())
      return true;
    try {
      await changeUsernameMutation.mutateAsync({ username: nextUsername });
      const nextUser = {
        ...(user as User & { mustChangePassword?: boolean }),
        username: nextUsername,
        mustChangePassword: mustForcePasswordChange,
      };
      utils.auth.me.setData(undefined, nextUser as any);
      persistSessionUser(nextUser);
      return true;
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed To Update Username"));
      return false;
    }
  };

  const handleUpdateProfile = async () => {
    const nextEmail = accountEmail.trim();
    try {
      const currentEmail = String((user as User | null)?.email ?? "").trim();
      if (nextEmail === currentEmail) return true;
      await updateProfileMutation.mutateAsync({ email: nextEmail });
      const nextUser = {
        ...(user as User & { mustChangePassword?: boolean }),
        email: nextEmail,
        mustChangePassword: mustForcePasswordChange,
      };
      utils.auth.me.setData(undefined, nextUser as any);
      persistSessionUser(nextUser);
      return true;
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed To Update Profile"));
      return false;
    }
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div
      className="selrs-mobile-brand-canvas relative flex h-dvh min-h-0 w-full max-w-[100vw] flex-col overflow-hidden selrs-page-bg print:h-auto print:overflow-visible print:max-w-none"
      dir="rtl"
    >
      {!hideSidebar && !hideTopNav && (
        <AppTopNav
          location={location}
          onNavigate={setLocation}
          onOpenAccount={() => {
            if (mustForcePasswordChange) return;
            setAccountUsername(String((user as User | null)?.username ?? ""));
            setAccountName(String((user as User | null)?.name ?? ""));
            setAccountEmail(String((user as User | null)?.email ?? ""));
            setIsAccountDialogOpen(true);
          }}
          onOpenPassword={() => setIsPasswordDialogOpen(true)}
          onLogout={() => void handleSignOut()}
          hideShortcuts={hideTopShortcuts}
          onBack={handleBack}
          onRefresh={() => requestAppReload("manual-refresh")}
          showRefresh={isNativeMobileApp}
          mobileHidden={topNavHidden}
        />
      )}

      <main
        data-app-scroll-container
        onScroll={handleContentScroll}
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto print:h-auto print:min-h-0 print:overflow-visible ${isAdminPatientsRoute ? "overflow-x-auto" : "overflow-x-hidden"} print:overflow-x-visible ${isDashboardLikeRoute ? "bg-transparent" : "bg-background"} ${isShiftScheduleRoute ? "p-0" : "px-1 pt-0 pb-2 sm:px-4 sm:pb-3 md:px-4 md:pb-4"}`}
      >
        <div
          className="selrs-app-content mx-auto min-h-0 w-full flex-1 max-w-none"
        >
          {!hideSidebar && !hideTopNav && (
            <div className="h-[calc(3.5rem+1px+env(safe-area-inset-top))] shrink-0 md:hidden print:hidden" aria-hidden />
          )}
          <RouteTitleFallback location={location} />
          {children}
          {!hideSidebar && !extractHubPatientId(location) && (
            <div
              data-app-bottom-nav-clearance
              aria-hidden="true"
              className="h-[calc(92px+env(safe-area-inset-bottom))] shrink-0 md:hidden print:hidden"
            />
          )}
        </div>
      </main>

      {!hideSidebar && !extractHubPatientId(location) && (
        <AppBottomNav
          location={location}
          onNavigate={setLocation}
          isAdmin={isAdmin}
          userRole={userRole}
          allowedRoots={allowedRoots}
          permissionsLoaded={permissionsQuery.isSuccess}
        />
      )}

      <Dialog
        open={isAccountDialogOpen}
        onOpenChange={(open) => {
          setIsAccountDialogOpen(open);
          if (!open) {
            setAccountUsername(String((user as User | null)?.username ?? ""));
            setAccountName(String((user as User | null)?.name ?? ""));
            setAccountEmail(String((user as User | null)?.email ?? ""));
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إعدادات الحساب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4" dir="rtl">
            <div className="space-y-2">
              <Label htmlFor="fullNameEditable">الاسم الكامل</Label>
              <Input id="fullNameEditable" value={accountName} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailEditable">البريد الإلكتروني</Label>
              <Input
                id="emailEditable"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usernameEditable">اسم المستخدم</Label>
              <Input
                id="usernameEditable"
                value={accountUsername}
                onChange={(e) => setAccountUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changeUsernameMutation.isPending)
                    void handleUpdateUsername();
                }}
              />
            </div>
            <div className="flex justify-start gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAccountDialogOpen(false)}
                disabled={
                  changeUsernameMutation.isPending ||
                  updateProfileMutation.isPending
                }
              >
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  const profileOk = await handleUpdateProfile();
                  if (!profileOk) return;
                  const usernameOk = await handleUpdateUsername();
                  if (!usernameOk) return;
                  setIsAccountDialogOpen(false);
                }}
                disabled={
                  changeUsernameMutation.isPending ||
                  updateProfileMutation.isPending
                }
              >
                {changeUsernameMutation.isPending ||
                updateProfileMutation.isPending
                  ? "جاري الحفظ…"
                  : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          if (mustForcePasswordChange && !open) return;
          setIsPasswordDialogOpen(open);
          if (!open) {
            setFieldErrors({});
            setPasswordForm({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => {
            if (mustForcePasswordChange) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (mustForcePasswordChange) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mustForcePasswordChange ? (
              <div className="rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-warning-text">
                For Security, You Must Change Your Password Before Continuing.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.currentPassword)}
                aria-describedby={
                  fieldErrors.currentPassword
                    ? "currentPassword-error"
                    : undefined
                }
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("currentPassword", e.target.value)
                }
              />
              {fieldErrors.currentPassword ? (
                <p
                  id="currentPassword-error"
                  aria-live="polite"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.currentPassword}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.newPassword)}
                aria-describedby={
                  fieldErrors.newPassword
                    ? "newPassword-rules newPassword-error"
                    : "newPassword-rules"
                }
                value={passwordForm.newPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("newPassword", e.target.value)
                }
              />
              <p
                id="newPassword-rules"
                className="text-xs text-muted-foreground"
              >
                {CHANGE_PASSWORD_RULES_HINT}
              </p>
              {fieldErrors.newPassword ? (
                <p
                  id="newPassword-error"
                  aria-live="polite"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.newPassword}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword
                    ? "confirmPassword-error"
                    : undefined
                }
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("confirmPassword", e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changePasswordMutation.isPending)
                    void handleChangePassword();
                }}
              />
              {fieldErrors.confirmPassword ? (
                <p
                  id="confirmPassword-error"
                  aria-live="polite"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              {!mustForcePasswordChange ? (
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  disabled={changePasswordMutation.isPending}
                >
                  إلغاء
                </Button>
              ) : null}
              <Button
                onClick={() => void handleChangePassword()}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "جارٍ الحفظ…" : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
