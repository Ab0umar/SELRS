import { useAuth, persistSessionUser } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { getTrpcErrorMessage } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

type AppShellProps = {
  children: ReactNode;
  /** Hide sidebar + mobile drawer (e.g. kiosk / print-focused routes). */
  hideSidebar?: boolean;
};

export function AppShell({ children, hideSidebar = false }: AppShellProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdminPatientsRoute = location === "/admin/patients" || location === "/admin-patients";
  const isDashboardLikeRoute =
    location === "/dashboard" ||
    location === "/today-patients" ||
    location === "/today";
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isMobile || hideSidebar) return;
    const EDGE_PX = 32;
    const MIN_SWIPE_PX = 48;

    const onTouchStart = (e: TouchEvent) => {
      swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = swipeTouchStart.current;
      if (!start) return;
      swipeTouchStart.current = null;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - start.x;
      const dy = endY - start.y;
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
      const viewWidth = window.innerWidth;
      if (!mobileNavOpen && start.x > viewWidth - EDGE_PX && dx < -MIN_SWIPE_PX) {
        setMobileNavOpen(true);
      }
      if (mobileNavOpen && dx > MIN_SWIPE_PX) {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, hideSidebar, mobileNavOpen]);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const utils = trpc.useUtils();
  const mustForcePasswordChange = Boolean((user as any)?.mustChangePassword);

  const changeUsernameMutation = trpc.auth.changeUsername.useMutation({
    onSuccess: async () => {
      toast.success("Username Updated");
      setIsAccountDialogOpen(false);
      await utils.auth.me.invalidate();
    },
  });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile Updated");
      await utils.auth.me.invalidate();
    },
  });
  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setIsPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      await utils.auth.me.invalidate();
    },
  });

  useEffect(() => {
    setAccountUsername(String((user as any)?.username ?? ""));
    setAccountName(String((user as any)?.name ?? ""));
    setAccountEmail(String((user as any)?.email ?? ""));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (mustForcePasswordChange) setIsPasswordDialogOpen(true);
  }, [mustForcePasswordChange, user]);

  const handleSignOut = async () => {
    await logout();
  };

  const handleChangePassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع حقول كلمة المرور");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تأكيد كلمة المرور الجديدة غير متطابق");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية");
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل تغيير كلمة المرور"));
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
    if (nextUsername === String((user as any)?.username ?? "").trim()) return true;
    try {
      await changeUsernameMutation.mutateAsync({ username: nextUsername });
      const nextUser = { ...(user as any), username: nextUsername };
      utils.auth.me.setData(undefined, nextUser);
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
      const currentEmail = String((user as any)?.email ?? "").trim();
      if (nextEmail === currentEmail) return true;
      await updateProfileMutation.mutateAsync({ email: nextEmail });
      const nextUser = { ...(user as any), email: nextEmail };
      utils.auth.me.setData(undefined, nextUser);
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
      className="flex h-dvh min-h-0 w-full max-w-[100vw] overflow-hidden selrs-page-bg md:flex-row"
      dir="rtl"
    >
      {!hideSidebar && !isMobile ? (
        <AppSidebar
          location={location}
          onNavigate={setLocation}
          isMobile={false}
          mobileOpen={false}
          onMobileOpenChange={() => {}}
          onOpenAccount={() => {
            if (mustForcePasswordChange) return;
            setAccountUsername(String((user as any)?.username ?? ""));
            setAccountName(String((user as any)?.name ?? ""));
            setAccountEmail(String((user as any)?.email ?? ""));
            setIsAccountDialogOpen(true);
          }}
          onOpenPassword={() => setIsPasswordDialogOpen(true)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader
          userName={
            typeof (user as any)?.name === "string" && String((user as any).name).trim()
              ? String((user as any).name).trim()
              : String((user as any)?.username ?? "").trim() || "—"
          }
          theme={theme}
          onToggleTheme={() => toggleTheme?.()}
          onLogout={() => void handleSignOut()}
          onHome={() => setLocation("/dashboard")}
          onProfile={() => setLocation("/profile")}
          isMobile={isMobile}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          showMobileNavToggle={!hideSidebar}
        />

        {!hideSidebar && isMobile ? (
          <AppSidebar
            location={location}
            onNavigate={setLocation}
            isMobile
            mobileOpen={mobileNavOpen}
            onMobileOpenChange={setMobileNavOpen}
            onOpenAccount={() => {
              if (mustForcePasswordChange) return;
              setAccountUsername(String((user as any)?.username ?? ""));
              setAccountName(String((user as any)?.name ?? ""));
              setAccountEmail(String((user as any)?.email ?? ""));
              setIsAccountDialogOpen(true);
            }}
            onOpenPassword={() => setIsPasswordDialogOpen(true)}
          />
        ) : null}

        <main
          className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${isAdminPatientsRoute ? "overflow-x-auto" : "overflow-x-hidden"} ${isDashboardLikeRoute ? "bg-transparent" : "bg-background"} px-2 pt-1.5 pb-2 sm:p-3 md:p-4`}
        >
          <div className={`mx-auto min-h-0 w-full flex-1 ${isAdminPatientsRoute ? "max-w-none" : "max-w-[1600px]"}`}>
            {children}
          </div>
        </main>
      </div>

      <Dialog
        open={isAccountDialogOpen}
        onOpenChange={(open) => {
          setIsAccountDialogOpen(open);
          if (!open) {
            setAccountUsername(String((user as any)?.username ?? ""));
            setAccountName(String((user as any)?.name ?? ""));
            setAccountEmail(String((user as any)?.email ?? ""));
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullNameEditable">Full Name</Label>
              <Input id="fullNameEditable" value={accountName} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailEditable">Email</Label>
              <Input id="emailEditable" type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usernameEditable">Username</Label>
              <Input
                id="usernameEditable"
                value={accountUsername}
                onChange={(e) => setAccountUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changeUsernameMutation.isPending) void handleUpdateUsername();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAccountDialogOpen(false)}
                disabled={changeUsernameMutation.isPending || updateProfileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const profileOk = await handleUpdateProfile();
                  if (!profileOk) return;
                  const usernameOk = await handleUpdateUsername();
                  if (!usernameOk) return;
                  setIsAccountDialogOpen(false);
                }}
                disabled={changeUsernameMutation.isPending || updateProfileMutation.isPending}
              >
                {changeUsernameMutation.isPending || updateProfileMutation.isPending ? "Saving..." : "Save"}
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
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                For Security, You Must Change Your Password Before Continuing.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changePasswordMutation.isPending) void handleChangePassword();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              {!mustForcePasswordChange ? (
                <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={changePasswordMutation.isPending}>
                  إلغاء
                </Button>
              ) : null}
              <Button onClick={() => void handleChangePassword()} disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
