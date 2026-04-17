import { useAuth } from "@/hooks/useAuth";
import { persistSessionUser } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { getTrpcErrorMessage } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  formatBuildLabel,
  formatNativeAppLabel,
  getOfflineCacheSummary,
  loadCachedBuildInfo,
  loadCachedNativeAppInfo,
  refreshNativeAppInfo,
} from "@/lib/appRuntime";
import {
  Activity,
  KeyRound,
  LogOut,
  PanelLeft,
  UserCog,
  Users,
  Settings,
  Shield,
  FileText,
  Stethoscope,
  AlertCircle,
  Wrench,
  Copy,
  Eye,
  Clock,
} from "lucide-react";
import { type ReactNode, CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";

const menuItems = [
  { icon: Activity, label: "لوحة التحكم", path: "/dashboard?tab=admin" },
  { icon: Clock, label: "مرضى اليوم", path: "/today" },
  {
    label: "المستخدمين والأدوار",
    items: [
      { icon: Users, label: "إدارة المستخدمين", path: "/admin/users" },
      { icon: Stethoscope, label: "إدارة الأطباء", path: "/admin/doctors" },
      { icon: Shield, label: "الصلاحيات", path: "/admin/permissions" },
    ]
  },
  {
    label: "البيانات والخدمات",
    items: [
      { icon: Settings, label: "إدارة الخدمات", path: "/admin/services" },
      { icon: FileText, label: "إدارة النماذس", path: "/admin/sheets" },
      { icon: Wrench, label: "مصمم النماذس", path: "/admin/sheet-designer" },
      { icon: Copy, label: "نسخ النماذس", path: "/sheet-copies" },
    ]
  },
  {
    label: "النظام والإعدادات",
    items: [
      { icon: Settings, label: "الإعدادات", path: "/admin/settings" },
      { icon: Activity, label: "حالة النظام", path: "/admin/status" },
      { icon: AlertCircle, label: "الهجرات", path: "/admin/migrations" },
      { icon: AlertCircle, label: "البنتاكام الفاشل", path: "/admin/pentacam-failed" },
      { icon: Wrench, label: "أدوات API", path: "/admin/api-tools" },
    ]
  },
  {
    label: "الأدوات الأخرى",
    items: [
      { icon: Stethoscope, label: "إدارة الاختبارات", path: "/admin/tests" },
      { icon: Eye, label: "عرض المكونات", path: "/showcase" },
    ]
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [, setLocation] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign In To Continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access To This Dashboard Requires Authentication. Continue To Launch The Login Flow.
            </p>
          </div>
          <Button
            onClick={() => {
              setLocation(getLoginUrl(), { replace: true });
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const mustForcePasswordChange = Boolean((user as any)?.mustChangePassword);
  const utils = trpc.useUtils();
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
  const [location, setLocation] = useLocation();
  const [buildLabel, setBuildLabel] = useState(() => formatBuildLabel(loadCachedBuildInfo()));
  const [nativeAppLabel, setNativeAppLabel] = useState(() => formatNativeAppLabel(loadCachedNativeAppInfo()));
  const [offlineCacheCount, setOfflineCacheCount] = useState(() => getOfflineCacheSummary().count);
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item: any) => 'path' in item && item.path === location);
  const isMobile = useIsMobile();
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
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await utils.auth.me.invalidate();
    },
  });

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
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
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
    if (nextUsername === String((user as any)?.username ?? "").trim()) {
      return true;
    }

    try {
      await changeUsernameMutation.mutateAsync({ username: nextUsername });
      const nextUser = {
        ...(user as any),
        username: nextUsername,
      };
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
      if (nextEmail === currentEmail) {
        return true;
      }
      await updateProfileMutation.mutateAsync({
        email: nextEmail,
      });
      const nextUser = {
        ...(user as any),
        email: nextEmail,
      };
      utils.auth.me.setData(undefined, nextUser);
      persistSessionUser(nextUser);
      return true;
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed To Update Profile"));
      return false;
    }
  };

  useEffect(() => {
    setAccountUsername(String((user as any)?.username ?? ""));
    setAccountName(String((user as any)?.name ?? ""));
    setAccountEmail(String((user as any)?.email ?? ""));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (mustForcePasswordChange) {
      setIsPasswordDialogOpen(true);
    }
  }, [mustForcePasswordChange, user]);

  useEffect(() => {
    setBuildLabel(formatBuildLabel(loadCachedBuildInfo()));
    setNativeAppLabel(formatNativeAppLabel(loadCachedNativeAppInfo()));
    setOfflineCacheCount(getOfflineCacheSummary().count);
  }, [location]);

  useEffect(() => {
    void refreshNativeAppInfo().then((info) => {
      if (info) setNativeAppLabel(formatNativeAppLabel(info));
    });
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.94))]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-24 justify-center border-b border-slate-200/80">
            <div className="flex items-center gap-3 px-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] text-white shadow-lg shadow-sky-200">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black tracking-tight text-slate-900">SELRS</div>
                    <div className="truncate text-xs text-slate-500">نظام مركز عيون الشروق</div>
                  </div>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <div className="px-3 pt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 group-data-[collapsible=icon]:hidden">
              Navigation
            </div>
            <SidebarMenu className="px-2 py-2">
              {menuItems.map((item, idx) => {
                const isGroup = 'items' in item;

                if (isGroup && 'items' in item && item.items) {
                  return (
                    <div key={`group-${idx}`} className="mb-4">
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-400 group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </div>
                      {(item.items as any).map((subItem: any) => {
                        const isActive = location === subItem.path;
                        return (
                          <SidebarMenuItem key={subItem.path}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => setLocation(subItem.path)}
                              tooltip={subItem.label}
                              className={`h-10 rounded-lg transition-all font-medium text-sm ${isActive ? "bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(37,99,235,0.14))] text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/90 hover:text-slate-900"}`}
                            >
                              <subItem.icon
                                className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                              />
                              <span>{subItem.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  );
                } else {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-11 rounded-2xl transition-all font-medium ${isActive ? "bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(37,99,235,0.14))] text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/90 hover:text-slate-900"}`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-2 py-2 text-left transition-colors hover:bg-accent/50 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-10 w-10 border border-slate-200 shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    if (mustForcePasswordChange) return;
                    setAccountUsername(String((user as any)?.username ?? ""));
                    setAccountName(String((user as any)?.name ?? ""));
                    setAccountEmail(String((user as any)?.email ?? ""));
                    setIsAccountDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>تغيير كلمة المرور</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void handleSignOut();
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Floating patient shortcuts (keeps Today Patients sidebar untouched) */}
        <div className="fixed top-4 right-4 z-40 hidden lg:block">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50">
                  روابط المريض
                </NavigationMenuTrigger>
                <NavigationMenuContent className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="grid min-w-[220px] gap-1 text-right text-sm">
                    <a href="/patients" className="rounded-lg px-3 py-2 hover:bg-slate-100">قائمة المرضى</a>
                    <a href="/patient-file" className="rounded-lg px-3 py-2 hover:bg-slate-100">ملف المريض</a>
                    <a href="/patient-summary" className="rounded-lg px-3 py-2 hover:bg-slate-100">التقرير المجمع</a>
                    <a href="/medical-reports" className="rounded-lg px-3 py-2 hover:bg-slate-100">التقارير الطبية</a>
                    <a href="/patient-hub" className="rounded-lg px-3 py-2 hover:bg-slate-100">Patient Hub</a>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {isMobile && (
          <div className="sticky -top-16 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-10 w-10 rounded-xl border border-slate-200 bg-white shadow-sm" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    SELRS
                  </span>
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(219,234,254,0.32),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] p-3 sm:p-4">{children}</main>
        <div className="border-t border-slate-200/80 bg-white/80 px-3 py-3 text-xs text-muted-foreground sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{buildLabel}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{nativeAppLabel}</Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Offline cache: {offlineCacheCount}</Badge>
            </div>
          </div>
        </div>
      </SidebarInset>

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
              <Input
                id="fullNameEditable"
                value={accountName}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailEditable">Email</Label>
              <Input
                id="emailEditable"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usernameEditable">Username</Label>
              <Input
                id="usernameEditable"
                value={accountUsername}
                onChange={(e) => setAccountUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changeUsernameMutation.isPending) {
                    void handleUpdateUsername();
                  }
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
            {mustForcePasswordChange && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                For Security, You Must Change Your Password Before Continuing.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changePasswordMutation.isPending) {
                    void handleChangePassword();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              {!mustForcePasswordChange && (
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  disabled={changePasswordMutation.isPending}
                >
                  إلغاء
                </Button>
              )}
              <Button
                onClick={() => void handleChangePassword()}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
