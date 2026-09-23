# Reports app shell and navigation

`ClinicalReportsPage` is rendered inside the authenticated app shell. `AppShell` delegates chrome to `AppTopNav`/`AppBottomNav`; `AppNav` is the typed nav manifest containing the `/reports` group.

### `client/src/components/layout/AppNav.tsx`

```tsx
/**
 * Typed navigation manifest for AppSidebar (web + mobile): collapsible groups, closed by default.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Banknote,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CircleDot,
  ClipboardList,
  DollarSign,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Filter,
  FlaskConical,
  Glasses,
  History,
  Home,
  Hospital,
  LayoutDashboard,
  MessageCircle,
  Network,
  Pill,
  ReceiptText,
  Repeat,
  ScrollText,
  Send,
  Settings,
  Smartphone,
  Stethoscope,
  Syringe,
  UserRound,
  Users,
  Wallet,
  BarChart3,
  Zap,
} from "lucide-react";

export type NavLeaf = {
  icon: LucideIcon;
  label: string;
  path: string;
  roles?: string[];
  isMain?: boolean;
};

/** Collapsible sidebar section (optional module home via groupPath). */
export type NavGroupSection = {
  label: string;
  items: NavLeaf[];
  /** Clicking the section title navigates here (e.g. `/accounting`). */
  groupPath?: string;
  /** Stable key for expand/collapse state (defaults to `g-${index}` in the sidebar). */
  navKey?: string;
  isMain?: boolean;
};

export type NavGroup = NavGroupSection | NavLeaf;

/** Attendance — 5 items only */
export const attendanceNavGroup: NavGroupSection = {
  label: "الحضور",
  groupPath: "/attendance",
  navKey: "attendance",
  items: [
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/attendance" },
    { icon: Activity, label: "مباشر", path: "/attendance/live" },
    { icon: Users, label: "الموظفون", path: "/attendance/employees" },
    { icon: BarChart3, label: "التقارير", path: "/attendance/reports" },
    { icon: Settings, label: "الإعدادات", path: "/attendance/settings" },
  ],
};

/** المرتبات */
export const salaryNavGroup: NavGroupSection = {
  label: "المرتبات",
  groupPath: "/salary",
  navKey: "salary",
  items: [
    { icon: DollarSign, label: "البيانات الأساسية", path: "/salary" },
    { icon: DollarSign, label: "العمولات", path: "/salary/pools" },
    { icon: DollarSign, label: "الصندوق والعيدية", path: "/salary/funds" },
    { icon: DollarSign, label: "الجزاءات", path: "/salary/penalties" },
    { icon: DollarSign, label: "كشف المرتبات", path: "/salary/payroll" },
  ],
};

/** الحسابات — روابط متداخلة؛ عنوان القسم يفتح لوحة الحسابات */
export const accountingNavGroup: NavGroupSection = {
  label: "الحسابات",
  groupPath: "/accounting",
  navKey: "accounting",
  items: [
    {
      icon: CalendarDays,
      label: "الإيراد اليومي",
      path: "/accounting/daily-revenue",
    },
    {
      icon: Banknote,
      label: "إيراد الخدمات",
      path: "/accounting/service-revenue",
    },
    {
      icon: ReceiptText,
      label: "الإيصالات",
      path: "/accounting/receipts",
    },
    {
      icon: ClipboardList,
      label: "الخدمات",
      path: "/accounting/services",
    },
    {
      icon: Users,
      label: "استعلام المرضى",
      path: "/accounting/patients",
    },
    {
      icon: UserRound,
      label: "حساب مريض",
      path: "/accounting/patient",
    },
    {
      icon: Stethoscope,
      label: "حساب طبيب",
      path: "/accounting/doctor",
    },
    {
      icon: Wallet,
      label: "الخزنة",
      path: "/accounting/cashbook",
    },
    {
      icon: BookOpen,
      label: "قيود الخزنة",
      path: "/accounting/ledger",
    },
    {
      icon: FileText,
      label: "القروض",
      path: "/accounting/loans",
    },
    {
      icon: Banknote,
      label: "كشف السلف",
      path: "/accounting/advances",
    },
    {
      icon: Home,
      label: "حساب البيت",
      path: "/accounting/home-fund",
    },
    {
      icon: Smartphone,
      label: "انستاباي",
      path: "/accounting/instapay",
    },
    {
      icon: UserRound,
      label: "د. السعدني",
      path: "/accounting/dr-saadany",
    },
  ],
};

/** لوحة الإدارة + العيادات + المرضى + مركز الخدمات + مركز الإدارة */
export const adminNavGroups: NavGroup[] = [
  {
    icon: Activity,
    label: "لوحة التحكم",
    path: "/dashboard?tab=admin",
    isMain: true,
  },
  attendanceNavGroup,
  salaryNavGroup,
  accountingNavGroup,
  { icon: Hospital, label: "كفرالشيخ", path: "/kf", isMain: true },
  { icon: Archive, label: "المخزن", path: "/stockroom", isMain: true },
  { icon: Syringe, label: "العمليات", path: "/operations", isMain: true },
  { icon: Network, label: "مركز المريض", path: "/patient-hub", isMain: true },
  {
    icon: History,
    label: "سجل المرضى",
    path: "/admin-hub/legacy-patients",
    isMain: true,
  },
  {
    icon: ScrollText,
    label: "سجل العمليات",
    path: "/admin-hub/op-history",
    isMain: true,
  },
  {
    icon: MessageCircle,
    label: "رسائل واتساب الواردة",
    path: "/admin-hub/whatsapp-inbox",
    isMain: true,
  },
  {
    label: "ملف المريض",
    navKey: "clinics-file",
    groupPath: "/medicalfile",
    items: [{ icon: FileText, label: "ملف المريض", path: "/medicalfile" }],
  },
  {
    label: "السجلات الطبية",
    navKey: "clinics-measurements",
    groupPath: "/records/medical",
    items: [
      {
        icon: Activity,
        label: "السجلات الطبية",
        path: "/records/medical",
      },
    ],
  },
  {
    label: "روشتات و تقارير",
    navKey: "clinics-prescriptions",
    groupPath: "/prescription",
    items: [
      { icon: Pill, label: "الروشتات", path: "/prescription" },
      {
        icon: ClipboardList,
        label: "التقارير الطبية",
        path: "/medical-reports",
      },
      {
        icon: Filter,
        label: "المرجع الطبي",
        path: "/medical-reference",
      },
    ],
  },
  {
    label: "الشيتات",
    navKey: "clinics-sheets",
    groupPath: "/sheets",
    items: [
      { icon: FileSpreadsheet, label: "الشيتات الطبية", path: "/sheets" },
    ],
  },
  {
    label: "التقارير",
    navKey: "clinics-reports",
    groupPath: "/reports",
    items: [
      { icon: FileText, label: "التقارير الطبية", path: "/reports" },
    ],
  },
  {
    label: "أشعة و تحاليل",
    navKey: "clinics-tests",
    groupPath: "/request-tests",
    items: [
      { icon: FlaskConical, label: "أشعة و تحاليل", path: "/request-tests" },
    ],
  },
  {
    label: "المرضى",
    navKey: "patients",
    groupPath: "/records/patients",
    items: [
      { icon: FileText, label: "ملف المريض", path: "/medicalfile" },
      {
        icon: History,
        label: "سجلات المرضى",
        path: "/records/patients",
      },
    ],
  },
  {
    label: "مركز الخدمات",
    navKey: "services",
    groupPath: "/services-hub",
    items: [{ icon: Pill, label: "مركز الخدمات", path: "/services-hub" }],
  },
];

const FULL_ATTENDANCE_ROLES = ["manager", "reception", "accountant", "nurse"];

/** نفس هيكل الإدمن بدون «مركز الإدارة»، مع إضافة «حضوري» للجميع */
export const staffNavGroups: NavGroup[] = [
  ...adminNavGroups.map((g) =>
    g === attendanceNavGroup
      ? {
          ...attendanceNavGroup,
          items: attendanceNavGroup.items.map((item) => ({
            ...item,
            roles: FULL_ATTENDANCE_ROLES,
          })),
        }
      : g,
  ),
  { icon: CalendarCheck, label: "حضوري", path: "/attendance/my", isMain: true },
  {
    icon: CalendarDays,
    label: "الروستر",
    path: "/attendance/shift-schedule",
    roles: ["doctor", "technician"],
    isMain: true,
  },
];
```

### `client/src/components/layout/AppShell.tsx`

```tsx
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
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { User } from "@shared/types";

import { AppBottomNav } from "./AppBottomNav";
import { AppTopNav } from "./AppTopNav";
import { ArrowRight, RefreshCw } from "lucide-react";

import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import { requestAppReload } from "@/lib/appRuntime";

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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
      className="flex h-dvh min-h-0 w-full max-w-[100vw] flex-col overflow-hidden selrs-page-bg print:h-auto print:overflow-visible print:max-w-none"
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
        />
      )}

      <div className="pointer-events-none fixed bottom-[5.5rem] left-3 z-50 flex items-center gap-2 print:hidden sm:bottom-4" dir="rtl">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="pointer-events-auto h-10 gap-2 rounded-xl border-border/80 bg-card/95 px-3 text-xs font-bold text-foreground shadow-sm backdrop-blur hover:bg-muted"
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" />
          <span className="hidden sm:inline">رجوع</span>
        </Button>
        {isNativeMobileApp && (
          <Button
            type="button"
            variant="outline"
            onClick={() => requestAppReload("manual-refresh")}
            className="pointer-events-auto h-10 gap-2 rounded-xl border-border/80 bg-card/95 px-3 text-xs font-bold text-primary shadow-sm backdrop-blur hover:bg-muted"
            aria-label="تحديث الصفحة"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        )}
      </div>

      <main
        data-app-scroll-container

        className={`flex min-h-0 flex-1 flex-col overflow-y-auto print:h-auto print:min-h-0 print:overflow-visible ${isAdminPatientsRoute ? "overflow-x-auto" : "overflow-x-hidden"} print:overflow-x-visible ${isDashboardLikeRoute ? "bg-transparent" : "bg-background"} ${isShiftScheduleRoute ? "p-0" : "px-1 pt-2 pb-2 sm:px-4 sm:py-3 md:px-4 md:py-4"}`}
      >
        <div
          className="selrs-app-content mx-auto min-h-0 w-full flex-1 max-w-none"
        >
          {children}
        </div>
      </main>

      {!hideSidebar && (
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
              <div className="rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-warning">
                For Security, You Must Change Your Password Before Continuing.
              </div>
            ) : null}
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
                  if (e.key === "Enter" && !changePasswordMutation.isPending)
                    void handleChangePassword();
                }}
              />
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
```

### `client/src/components/layout/AppBottomNav.tsx`

```tsx
import {
  Activity,
  Archive,
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock,
  DollarSign,
  GripVertical,
  Hospital,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Network,
  Pencil,
  Settings,
  Syringe,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeNavPath,
  pathGrantedByRoots,
} from "@/lib/nav-permission-utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  adminNavGroups,
  staffNavGroups,
  type NavGroupSection,
  type NavLeaf,
} from "./AppNav";

// All possible tabs per role
const ALL_ADMIN_TABS = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    paths: ["/dashboard"],
  },
  {
    key: "patients",
    label: "مركز المريض",
    icon: Network,
    paths: [
      "/patient-hub",
      "/patients-hub",
      "/patients",
      "/followups",
      "/visits",
    ],
  },
  {
    key: "operations",
    label: "العمليات",
    icon: Syringe,
    paths: ["/operations"],
  },
  {
    key: "accounting",
    label: "الحسابات",
    icon: Banknote,
    paths: ["/accounting"],
  },
  { key: "salary", label: "المرتبات", icon: DollarSign, paths: ["/salary"] },
  {
    key: "attendance",
    label: "الحضور",
    icon: Activity,
    paths: ["/attendance"],
  },
  { key: "kf", label: "كفرالشيخ", icon: Hospital, paths: ["/kf"] },
  { key: "stockroom", label: "المخزن", icon: Archive, paths: ["/stockroom"] },
  {
    key: "marketing",
    label: "التسويق",
    icon: Megaphone,
    paths: ["/marketing"],
  },
  { key: "admin", label: "الإدارة", icon: Settings, paths: ["/admin-hub"] },
] as const;

const ALL_STAFF_TABS = [
  {
    key: "today",
    label: "اليوم",
    icon: Clock,
    paths: ["/today", "/today-patients", "/dashboard"],
  },
  {
    key: "patients",
    label: "مركز المريض",
    icon: Users,
    paths: [
      "/patient-hub",
      "/patients-hub",
      "/patients",
      "/followups",
      "/visits",
    ],
  },
  {
    key: "operations",
    label: "العمليات",
    icon: Syringe,
    paths: ["/operations"],
  },
  {
    key: "accounting",
    label: "الحسابات",
    icon: Banknote,
    paths: ["/accounting"],
  },
  { key: "kf", label: "كفرالشيخ", icon: Hospital, paths: ["/kf"] },
  {
    key: "roster",
    label: "الروستر",
    icon: CalendarDays,
    paths: ["/attendance/shift-schedule"],
  },
] as const;

type AdminKey = (typeof ALL_ADMIN_TABS)[number]["key"];
type StaffKey = (typeof ALL_STAFF_TABS)[number]["key"];

const DEFAULT_ADMIN_KEYS: AdminKey[] = [
  "dashboard",
  "patients",
  "operations",
  "accounting",
  "salary",
  "attendance",
  "kf",
  "admin",
];
const DEFAULT_STAFF_KEYS: StaffKey[] = [
  "today",
  "patients",
  "operations",
  "accounting",
  "kf",
];
const DEFAULT_STAFF_KEYS_DR: StaffKey[] = [...DEFAULT_STAFF_KEYS, "roster"];

const STORAGE_KEY_ADMIN = "selrs:bottom-nav-admin";
const STORAGE_KEY_STAFF = "selrs:bottom-nav-staff";

function getStorageKey(isAdmin: boolean, userRole: string): string {
  if (isAdmin) return STORAGE_KEY_ADMIN;
  if (["doctor", "technician", "manager"].includes(userRole)) {
    return `${STORAGE_KEY_STAFF}-${userRole}`;
  }
  return STORAGE_KEY_STAFF;
}

function loadKeys<T extends string>(storageKey: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as T[];
    }
  } catch {}
  return defaults;
}

function saveKeys(storageKey: string, keys: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {}
}

function isTabActive(location: string, paths: readonly string[]): boolean {
  const base = location.split("?")[0];
  return paths.some((p) => base === p || base.startsWith(`${p}/`));
}

interface AppBottomNavProps {
  location: string;
  onNavigate: (path: string) => void;
  onOpenMore?: () => void;
  moreOpen?: boolean;
  isAdmin?: boolean;
  userRole?: string;
  allowedRoots?: unknown;
  permissionsLoaded?: boolean;
}

export function AppBottomNav({
  location,
  onNavigate,
  onOpenMore,
  moreOpen,
  isAdmin = false,
  userRole = "",
  allowedRoots,
  permissionsLoaded = true,
}: AppBottomNavProps) {
  const isRosterRole = ["doctor", "technician", "manager"].includes(userRole);
  const storageKey = getStorageKey(isAdmin, userRole);
  const allTabs = isAdmin ? ALL_ADMIN_TABS : ALL_STAFF_TABS;
  const defaultKeys = isAdmin
    ? DEFAULT_ADMIN_KEYS
    : isRosterRole
      ? DEFAULT_STAFF_KEYS_DR
      : DEFAULT_STAFF_KEYS;

  const [enabledKeys, setEnabledKeys] = useState<string[]>(() =>
    loadKeys(storageKey, defaultKeys as unknown as string[]),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    saveKeys(storageKey, enabledKeys);
  }, [storageKey, enabledKeys]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-app-scroll-container]",
    );
    if (!scrollContainer) return;

    let lastScrollTop = scrollContainer.scrollTop;
    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      const delta = nextScrollTop - lastScrollTop;
      // Android's overscroll "bounce" jitters scrollTop by a pixel or two at
      // the very bottom, flipping delta's sign every frame and rapidly
      // toggling navHidden (visible as the nav bar shaking). Treat "at/near
      // the bottom" as a stability zone, same as the existing top-of-scroll one.
      const maxScrollTop =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const nearBottom = maxScrollTop - nextScrollTop <= 12;

      if (nextScrollTop <= 12 || nearBottom || delta < -4) {
        setNavHidden(false);
      } else if (delta > 4 && nextScrollTop > 48) {
        setNavHidden(true);
      }

      lastScrollTop = nextScrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setNavHidden(false);
  }, [location]);

  const toggleKey = useCallback((key: string) => {
    setEnabledKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const leafVisible = useCallback(
    (leaf: NavLeaf): boolean => {
      const allowedRoles = leaf.roles?.map((role) => role.toLowerCase());
      if (allowedRoles?.length && !allowedRoles.includes(userRole))
        return false;
      if (isAdmin) return true;
      if (!permissionsLoaded) return false;
      const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
      return pathGrantedByRoots(cleanPath, allowedRoots as any);
    },
    [allowedRoots, isAdmin, permissionsLoaded, userRole],
  );

  // Filter tabs: enabled + permission check for staff
  const visibleTabs = allTabs.filter((tab) => {
    if (
      !enabledKeys.includes(tab.key) &&
      !(tab.key === "roster" && isRosterRole)
    )
      return false;
    if (isAdmin) return true;
    if (tab.key === "roster") return isRosterRole;
    if (!permissionsLoaded) return false;
    const cleanPath = normalizeNavPath(tab.paths[0]?.split("?")[0] ?? "");
    return pathGrantedByRoots(cleanPath, allowedRoots as any);
  });

  const moreGroups = useMemo(() => {
    const navGroups = isAdmin ? adminNavGroups : staffNavGroups;
    const sections = navGroups.filter(
      (item): item is NavGroupSection => "items" in item,
    );
    const leafByPath = new Map(
      sections.flatMap((section) =>
        section.items.map((item) => [item.path, item] as const),
      ),
    );
    const recordItems = [
      ["/records/patients", "سجلات المرضى"],
      ["/records/medical", "السجلات الطبية"],
    ]
      .map(([path, label]) => {
        const leaf = leafByPath.get(path);
        return leaf ? { ...leaf, label } : null;
      })
      .filter((leaf): leaf is NavLeaf => leaf != null && leafVisible(leaf));

    const excludedSections = new Set([
      "accounting",
      "attendance",
      "salary",
      "clinics-file",
      "clinics-measurements",
      "clinics-prescriptions",
      "clinics-tests",
      "patients",
    ]);
    const movedPaths = new Set([
      "/pentacam",
      "/records/medical",
      "/records/patients",
      "/medical-reports",
    ]);
    const remainingSections = sections
      .filter((section) => !excludedSections.has(section.navKey ?? ""))
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (leaf) => !movedPaths.has(leaf.path) && leafVisible(leaf),
        ),
      }))
      .filter((section) => section.items.length > 0);

    return [
      {
        label: "سجل",
        navKey: "records",
        groupPath: "/patients-hub",
        items: recordItems,
      },
      ...remainingSections,
    ].filter((section) => section.items.length > 0);
  }, [isAdmin, leafVisible]);

  const handleMoreNavigate = (path: string) => {
    setMoreSheetOpen(false);
    setOpenSections({});
    onNavigate(path);
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        dir="rtl"
        className={cn(
          "md:hidden shrink-0 overflow-hidden bg-background transition-[max-height,transform,padding,border-color] duration-200 ease-out print:hidden",
          navHidden && !sheetOpen && !moreSheetOpen
            ? "pointer-events-none max-h-0 translate-y-full border-transparent"
            : "max-h-24 translate-y-0 border-t border-border",
        )}
        style={{
          paddingBottom:
            navHidden && !sheetOpen && !moreSheetOpen
              ? "0px"
              : "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex h-14 items-stretch overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(location, tab.paths);
            return (
              <button
                key={tab.key}
                type="button"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors shrink-0",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-muted-foreground",
                )}
                onClick={() => onNavigate(tab.paths[0])}
              >
                {active && (
                  <span
                    className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary"
                    aria-hidden
                  />
                )}
                <Icon
                  className="size-5 shrink-0"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px] leading-none",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            type="button"
            aria-label="المزيد"
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors shrink-0",
              moreSheetOpen || moreOpen
                ? "text-primary"
                : "text-muted-foreground/70 hover:text-muted-foreground",
            )}
            onClick={() => {
              setMoreSheetOpen(true);
              onOpenMore?.();
            }}
          >
            <LayoutGrid
              className="size-5 shrink-0"
              strokeWidth={moreSheetOpen || moreOpen ? 2.2 : 1.8}
            />
            <span
              className={cn(
                "whitespace-nowrap text-[10px] leading-none",
                moreSheetOpen || moreOpen ? "font-semibold" : "font-medium",
              )}
            >
              المزيد
            </span>
          </button>
        </div>
      </nav>

      <Sheet
        open={moreSheetOpen}
        onOpenChange={(open) => {
          setMoreSheetOpen(open);
          if (!open) setOpenSections({});
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[82vh] overflow-y-auto rounded-t-xl p-0"
          dir="rtl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-right text-base">المزيد</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border/70 pb-[env(safe-area-inset-bottom)]">
            {moreGroups.map((group, index) => {
              const key = group.navKey ?? `${group.label}-${index}`;
              const isSingle = group.items.length === 1;
              const isOpen = openSections[key] ?? false;
              return (
                <section key={key}>
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-start text-sm font-semibold text-foreground"
                    onClick={() => {
                      if (isSingle) {
                        handleMoreNavigate(group.items[0].path);
                      } else {
                        toggleSection(key);
                      }
                    }}
                  >
                    <span>{group.label}</span>
                    {!isSingle && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                  {!isSingle && isOpen && (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isTabActive(location, [item.path]);
                        return (
                          <button
                            key={item.path}
                            type="button"
                            className={cn(
                              "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-start text-xs font-medium transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground hover:bg-muted",
                            )}
                            onClick={() => handleMoreNavigate(item.path)}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="min-w-0 truncate">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            <div className="p-3">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-start text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setOpenSections({});
                  setSheetOpen(true);
                }}
              >
                <Pencil
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span>تخصيص شريط التنقل</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-y-auto rounded-t-2xl"
          dir="rtl"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-right">تخصيص شريط التنقل</SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mb-4">
            اختر الصفحات التي تظهر في شريط التنقل السفلي
          </p>
          <div className="space-y-2">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const rosterLocked = tab.key === "roster" && isRosterRole;
              const enabled = rosterLocked || enabledKeys.includes(tab.key);
              return (
                <div
                  key={tab.key}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={rosterLocked}
                    onCheckedChange={() => toggleKey(tab.key)}
                    aria-label={
                      rosterLocked
                        ? "الروستر متاح دائما لهذا الحساب"
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### `client/src/components/layout/AppTopNav.tsx`

```tsx
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME_AR } from "@/lib/brand";
import type { User } from "@shared/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  Archive,
  Banknote,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clock,
  DollarSign,
  Filter,
  History,
  Hospital,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Network,
  ScrollText,
  Search,
  Settings,
  Syringe,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import {
  type CSSProperties,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import {
  accountingNavGroup,
  adminNavGroups,
  staffNavGroups,
  type NavGroupSection,
  type NavLeaf,
} from "./AppNav";

function dispatchOpenCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("selrs:open-command-palette"));
}

function tabActive(location: string, path: string): boolean {
  const navBase = path.split("?")[0];
  const locBase = location.split("?")[0];
  if (locBase === navBase) return true;
  if (navBase.length <= 1) return false;
  return locBase.startsWith(`${navBase}/`);
}

type AppTopNavProps = {
  location: string;
  onNavigate: (path: string) => void;
  onOpenAccount: () => void;
  onOpenPassword: () => void;
  onLogout: () => void;
  hideShortcuts?: boolean;
};

function DashboardAppbarIndicators() {
  const { merged, isError } = useTodayQueuePatientsMerged();
  const attQ = trpc.attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const stockQ = trpc.stockroom.getReports.useQuery({});
  const stockBadge = (stockQ.data?.inventory ?? []).filter(
    (i: any) => i.status === "كمية قليلة" || i.status === "نفذ المخزون",
  ).length;

  const items = [
    {
      label: "مرضى اليوم",
      value: isError ? "—" : merged.length,
      icon: Users,
      cls: "bg-primary/10 text-primary",
    },
    {
      label: "غياب اليوم",
      value: attQ.data?.absentToday ?? 0,
      icon: UserX,
      cls: "bg-warning/15 text-warning",
    },
    {
      label: "تنبيهات المخزن",
      value: stockBadge,
      icon: Archive,
      cls: "bg-destructive/15 text-destructive",
    },
  ];

  return (
    <div
      className="flex min-w-0 shrink items-center gap-1 md:hidden"
      aria-label="مؤشرات فورية"
    >
      {items.map(({ label, value, icon: Icon, cls }) => (
        <span
          key={label}
          className={cn(
            "inline-flex h-8 min-w-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold tabular-nums",
            cls,
          )}
          title={label}
          aria-label={`${label}: ${value.toLocaleString("ar-EG")}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{value.toLocaleString("ar-EG")}</span>
        </span>
      ))}
    </div>
  );
}

export function AppTopNav({
  location,
  onNavigate,
  onOpenAccount,
  onOpenPassword,
  onLogout,
  hideShortcuts = false,
}: AppTopNavProps) {
  const { user } = useAuth();
  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";

  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedRoots = useMemo(
    () => permissionsToAllowedRoots((permissionsQuery.data ?? []) as string[]),
    [permissionsQuery.data],
  );

  const leafVisible = useMemo(
    () =>
      (leaf: NavLeaf): boolean => {
        const allowedRoles = leaf.roles?.map((role) => role.toLowerCase());
        if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
          return false;
        }
        if (isAdmin) return true;
        const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
        if (pathGrantedByRoots(cleanPath, [])) return true; // always-granted paths
        if (!permissionsQuery.isSuccess) return false;
        return pathGrantedByRoots(cleanPath, allowedRoots);
      },
    [isAdmin, permissionsQuery.isSuccess, allowedRoots, userRole],
  );

  const navGroups = isAdmin ? adminNavGroups : staffNavGroups;

  const mainTabs = useMemo(
    () =>
      navGroups.filter(
        (item): item is NavLeaf =>
          !("items" in item) && Boolean(item.isMain) && leafVisible(item),
      ),
    [leafVisible, navGroups],
  );

  const allNavTabs = useMemo(
    () => [
      {
        icon: Clock,
        label: "اليوم",
        path: "/bookings",
        key: "today",
        paths: ["/today", "/today-patients", "/dashboard", "/bookings"],
        checkPath: "/bookings",
      },
      {
        icon: Users,
        label: "مركز المريض",
        path: "/patient-hub",
        key: "patients",
        paths: [
          "/patient-hub",
          "/patients-hub",
          "/patients",
          "/new-cases",
          "/followups",
          "/visits",
        ],
        checkPath: "/patient-hub",
      },
      {
        icon: Syringe,
        label: "العمليات",
        path: "/operations",
        key: "operations",
        paths: ["/operations"],
        checkPath: "/operations",
      },
      {
        icon: Banknote,
        label: "الحسابات",
        path: "/accounting",
        key: "accounting",
        paths: ["/accounting"],
        checkPath: "/accounting",
      },
      {
        icon: Hospital,
        label: "كفرالشيخ",
        path: "/kf",
        key: "kf",
        paths: ["/kf"],
        checkPath: "/kf",
      },
      {
        icon: Archive,
        label: "المخزن",
        path: "/stockroom",
        key: "stockroom",
        paths: ["/stockroom"],
        checkPath: "/stockroom",
      },
      {
        icon: DollarSign,
        label: "المرتبات",
        path: "/salary",
        key: "salary",
        paths: ["/salary"],
        checkPath: "/salary",
      },
      {
        icon: Activity,
        label: "الحضور",
        path: "/attendance",
        key: "attendance",
        paths: ["/attendance"],
        checkPath: "/attendance",
      },
      {
        icon: CalendarDays,
        label: "الروستر",
        path: "/attendance/shift-schedule",
        key: "roster",
        paths: ["/attendance/shift-schedule"],
        checkPath: "/attendance/shift-schedule",
        roles: ["doctor", "technician", "manager"],
      },
      {
        icon: Archive,
        label: "أرشيف",
        path: "/archive",
        key: "archive",
        paths: [
          "/archive",
          "/admin-hub/legacy-patients",
          "/admin/legacy-patients",
          "/admin-hub/op-history",
          "/admin/op-history",
          "/medical-reference",
        ],
        checkPath: "/archive",
      },
      {
        icon: MessageCircle,
        label: "رسائل واتساب",
        path: "/admin-hub/whatsapp-inbox",
        key: "whatsapp-inbox",
        paths: ["/admin-hub/whatsapp-inbox"],
        checkPath: "/admin-hub/whatsapp-inbox",
      },
    ],
    [],
  );

  const mainNavTabs = useMemo(() => {
    if (isAdmin) return [];
    if (!permissionsQuery.isSuccess) return [];
    return allNavTabs.filter((tab) => {
      if (tab.key === "more") return true;
      const allowedRoles = tab.roles?.map((role) => role.toLowerCase());
      if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
        return false;
      }
      if (tab.key === "roster") return true;
      const cleanPath = normalizeNavPath(tab.checkPath?.split("?")[0] ?? "");
      return pathGrantedByRoots(cleanPath, allowedRoots);
    });
  }, [isAdmin, allNavTabs, permissionsQuery.isSuccess, allowedRoots, userRole]);

  const adminTopNavItems = useMemo(
    () => [
      {
        type: "link" as const,
        icon: LayoutDashboard,
        label: "لوحة التحكم",
        path: "/dashboard?tab=admin",
      },
      {
        type: "link" as const,
        icon: Network,
        label: "مركز المريض",
        path: "/patient-hub",
      },
      {
        type: "link" as const,
        icon: Banknote,
        label: "الحسابات",
        path: "/accounting",
      },
      {
        type: "menu" as const,
        key: "employees",
        icon: Users,
        label: "الموظفين",
        items: [
          { icon: Activity, label: "الحضور", path: "/attendance" },
          { icon: DollarSign, label: "المرتبات", path: "/salary" },
        ],
      },
      {
        type: "link" as const,
        icon: Hospital,
        label: "كفرالشيخ",
        path: "/kf",
      },
      {
        type: "link" as const,
        icon: Archive,
        label: "المخزن",
        path: "/stockroom",
      },
      {
        type: "link" as const,
        icon: Archive,
        label: "أرشيف",
        path: "/archive",
        paths: [
          "/archive",
          "/admin-hub/legacy-patients",
          "/admin/legacy-patients",
          "/admin-hub/op-history",
          "/admin/op-history",
          "/medical-reference",
        ],
      },
      {
        type: "link" as const,
        icon: MessageCircle,
        label: "رسائل واتساب",
        path: "/admin-hub/whatsapp-inbox",
      },
      {
        type: "link" as const,
        icon: Settings,
        label: "مركز الإدارة",
        path: "/admin-hub",
      },
    ],
    [],
  );

  const accountingItems = useMemo(
    () => accountingNavGroup.items.filter(leafVisible),
    [leafVisible],
  );

  const moreGroups = useMemo(() => {
    const sections = navGroups.filter(
      (item): item is NavGroupSection => "items" in item,
    );
    const leafByPath = new Map(
      sections.flatMap((section) =>
        section.items.map((item) => [item.path, item] as const),
      ),
    );
    const recordItems = [
      ["/records/patients", "سجلات المرضى"],
      ["/records/medical", "السجلات الطبية"],
    ]
      .map(([path, label]) => {
        const leaf = leafByPath.get(path);
        return leaf ? { ...leaf, label } : null;
      })
      .filter((leaf): leaf is NavLeaf => leaf != null && leafVisible(leaf));

    const excludedSections = new Set([
      "accounting",
      "attendance",
      "salary",
      "clinics-file",
      "clinics-measurements",
      "clinics-prescriptions",
      "clinics-tests",
      "patients",
    ]);
    const movedPaths = new Set([
      "/pentacam",
      "/records/medical",
      "/records/patients",
      "/medical-reports",
    ]);
    const remainingSections = sections
      .filter((section) => !excludedSections.has(section.navKey ?? ""))
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (leaf) => !movedPaths.has(leaf.path) && leafVisible(leaf),
        ),
      }))
      .filter((section) => section.items.length > 0);

    const marketingSection = isAdmin
      ? [
          {
            label: "التسويق",
            navKey: "marketing",
            groupPath: "/marketing",
            items: [{ icon: Megaphone, label: "التسويق", path: "/marketing" }],
          },
        ]
      : [];

    return [
      {
        label: "سجل",
        navKey: "records",
        groupPath: "/patients-hub",
        items: recordItems,
      },
      ...marketingSection,
      ...remainingSections,
    ].filter((section) => section.items.length > 0);
  }, [isAdmin, navGroups, leafVisible]);

  const logoTarget = "/home";

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dateStr = mounted
    ? new Date().toLocaleDateString("ar-EG", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const userName =
    user && typeof user.name === "string" && String(user.name).trim()
      ? String((user as User).name).trim()
      : String((user as User | null)?.username ?? "").trim() || "-";

  const accountingActive = tabActive(location, "/accounting");
  const isDashboardRoute = location.split("?")[0] === "/dashboard";

  const [moreOpen, setMoreOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <header
      data-app-top-nav
      dir="rtl"
      className="relative z-40 shrink-0 border-b border-border/60 bg-background/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl print:hidden"
    >
      <div className="selrs-gradient-bar h-1 w-full" aria-hidden />

      <div
        data-app-top-nav-row
        className={cn(
          "flex h-[4.5rem] w-full items-center gap-3 px-3 sm:px-4 lg:px-5",
          hideShortcuts && "justify-between",
        )}
        dir="rtl"
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate(logoTarget)}
          className="flex h-11 shrink-0 items-center gap-2.5 rounded-2xl border border-border/60 bg-card px-2.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm md:px-3.5"
          aria-label="الرئيسية"
        >
          <BrandLogo className="h-8 w-8 shrink-0 rounded-xl border border-border/60 bg-muted/40" />
          <span className="hidden text-sm font-black text-foreground 2xl:block">
            {BRAND_NAME_AR}
          </span>
        </button>

        {/* Main tabs, desktop only */}
        {!hideShortcuts && <nav
          className="hidden min-w-0 flex-1 items-stretch overflow-x-auto whitespace-nowrap md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="القائمة الرئيسية"
        >
          {isAdmin
            ? adminTopNavItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.type === "link"
                    ? (item.paths
                        ? item.paths.some((p) => tabActive(location, p))
                        : tabActive(location, item.path))
                    : item.items.some((child) =>
                        tabActive(location, child.path),
                      );
                const triggerClassName = cn(
                  "my-1 flex h-10 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-xl border px-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:px-2 xl:text-[11px] 2xl:text-xs",
                  active
                    ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                );

                if (item.type === "link") {
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => onNavigate(item.path)}
                      className={triggerClassName}
                    >
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={active ? 2.2 : 1.8}
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <DropdownMenu key={item.key}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className={triggerClassName}>
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={active ? 2.2 : 1.8}
                          aria-hidden
                        />
                        <span>{item.label}</span>
                        <ChevronDown
                          className="h-3 w-3 shrink-0 opacity-70"
                          aria-hidden
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-48"
                      style={{ direction: "rtl" } satisfies CSSProperties}
                    >
                      {item.items.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <DropdownMenuItem
                            key={child.path}
                            className="cursor-pointer gap-2"
                            onClick={() => onNavigate(child.path)}
                          >
                            <ChildIcon className="h-4 w-4" aria-hidden />
                            {child.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })
            : mainNavTabs.map((tab) => {
                const active = tab.paths.some((p) => {
                  const base = location.split("?")[0];
                  return base === p || base.startsWith(`${p}/`);
                });
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onNavigate(tab.path)}
                    className={cn(
                      "my-1 flex h-10 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-xl border px-1.5 text-[10px] font-semibold transition-colors xl:px-2 xl:text-[11px] 2xl:text-xs",
                      active
                        ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                    )}
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                      aria-hidden
                    />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}

          {/* الحسابات dropdown — only shown when not already in mainNavTabs */}
          {!isAdmin &&
            accountingItems.length > 0 &&
            !mainNavTabs.some((t) => t.key === "accounting") && (
              <div className="flex h-full items-stretch whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onNavigate("/accounting")}
                  className={cn(
                    "my-1 flex h-10 min-w-0 items-center whitespace-nowrap rounded-s-xl border px-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none xl:text-[11px] 2xl:text-xs",
                    accountingActive
                      ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                  )}
                >
                  <span className="whitespace-nowrap">الحسابات</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "my-1 flex h-10 items-center rounded-e-xl border px-1 text-xs transition-colors focus-visible:outline-none",
                        accountingActive
                          ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                      )}
                      aria-label="فتح قائمة الحسابات"
                    >
                      <ChevronDown
                        className="h-3.5 w-3.5 opacity-70"
                        aria-hidden
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52"
                    style={{ direction: "rtl" } satisfies CSSProperties}
                  >
                    {(() => {
                      const byPath = new Map(
                        accountingItems.map((i) => [i.path, i]),
                      );
                      const pick = (paths: string[]) =>
                        paths
                          .map((p) => byPath.get(p))
                          .filter(Boolean) as typeof accountingItems;
                      const treasury = pick([
                        "/accounting/ledger",
                        "/accounting/daily-revenue",
                        "/accounting/service-revenue",
                        "/accounting/receipts",
                      ]);
                      const statements = pick([
                        "/accounting/cashbook",
                        "/accounting/advances",
                        "/accounting/instapay",
                        "/accounting/home-fund",
                        "/accounting/dr-saadany",
                      ]);
                      const loans = pick(["/accounting/loans"]);
                      const knownPaths = new Set(
                        [...treasury, ...statements, ...loans].map(
                          (i) => i.path,
                        ),
                      );
                      const reports = accountingItems.filter(
                        (i) => !knownPaths.has(i.path),
                      );
                      const labelOverrides: Record<string, string> = {
                        "/accounting/cashbook": "الخزينة",
                        "/accounting/advances": "السلف",
                        "/accounting/home-fund": "البيت",
                      };
                      const renderSection = (
                        label: string,
                        items: typeof accountingItems,
                        sep = true,
                      ) =>
                        items.length > 0 ? (
                          <>
                            {sep && <DropdownMenuSeparator />}
                            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {label}
                            </DropdownMenuLabel>
                            {items.map((item) => (
                              <DropdownMenuItem
                                key={item.path}
                                className="cursor-pointer gap-2"
                                onClick={() => onNavigate(item.path)}
                              >
                                <item.icon className="h-4 w-4" />
                                {labelOverrides[item.path] ?? item.label}
                              </DropdownMenuItem>
                            ))}
                          </>
                        ) : null;
                      return (
                        <>
                          {renderSection("الخزينة", treasury, false)}
                          {renderSection("كشف حساب", statements, true)}
                          {renderSection("صندوق القرض", loans, true)}
                          {renderSection("تقارير", reports, true)}
                        </>
                      );
                    })()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
        </nav>}

        {/* Controls */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-2xl border border-border/60 bg-card/75 p-1 shadow-xs",
            hideShortcuts && "order-last",
          )}
          dir="rtl"
        >
          {isDashboardRoute && <DashboardAppbarIndicators />}

          {/* المزيد popover, desktop only, accordion sections closed by default */}
          {!hideShortcuts && moreGroups.length > 0 && (
            <Popover
              open={moreOpen}
              onOpenChange={(o) => {
                setMoreOpen(o);
                if (!o) setOpenSections({});
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden h-9 shrink-0 gap-0.5 whitespace-nowrap rounded-xl border border-border bg-background/70 px-2 text-[10px] font-semibold md:flex xl:text-xs"
                >
                  <span>المزيد</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 opacity-70 transition-transform duration-200",
                      moreOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-56 p-0 overflow-hidden"
                style={{ direction: "rtl" } satisfies CSSProperties}
              >
                {moreGroups.map((group, gi) => {
                  const key = group.navKey ?? String(gi);
                  const isOpen = openSections[key] ?? false;
                  const isSingle = group.items.length === 1;
                  return (
                    <div
                      key={key}
                      className={cn(gi > 0 && "border-t border-border/50")}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isSingle) {
                            onNavigate(group.items[0].path);
                            setMoreOpen(false);
                            setOpenSections({});
                          } else {
                            toggleSection(key);
                          }
                        }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground bg-muted/40"
                      >
                        <span>{group.label}</span>
                        {!isSingle && (
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                              isOpen && "rotate-180",
                            )}
                            aria-hidden
                          />
                        )}
                      </button>
                      {!isSingle && isOpen && (
                        <div className="pb-1">
                          {group.items.map((item) => (
                            <button
                              key={item.path}
                              type="button"
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted text-muted-foreground"
                              onClick={() => {
                                onNavigate(item.path);
                                setMoreOpen(false);
                                setOpenSections({});
                              }}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </PopoverContent>
            </Popover>
          )}

          {/* Search */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-2xl border border-border bg-background/70"
            title="بحث (⌘K)"
            aria-label="فتح لوحة البحث"
            onClick={dispatchOpenCommandPalette}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Date badge, hidden on small screens */}
          <Badge
            variant="outline"
            className="hidden rounded-2xl bg-background/70 py-1 text-[10px] font-semibold 2xl:inline-flex"
          >
            <span className="me-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success/100" />
            {dateStr || "…"}
          </Badge>

          {/* Avatar + user dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 shrink-0 gap-1.5 rounded-2xl border border-border bg-background/70 px-1.5"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {userName.slice(0, 2).toUpperCase() || "؟"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[100px] truncate text-sm font-semibold 2xl:inline">
                  {userName}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground 2xl:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48"
              style={{ direction: "rtl" } satisfies CSSProperties}
            >
              <DropdownMenuLabel>الحساب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => onNavigate("/profile")}
              >
                <UserCog className="h-4 w-4" />
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => onNavigate("/attendance/my")}
              >
                <CalendarCheck className="h-4 w-4" />
                حضوري
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => onNavigate("/admin-hub")}
                >
                  <Settings className="h-4 w-4" />
                  مركز الإدارة
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={onOpenAccount}
              >
                <UserCog className="h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={onOpenPassword}
              >
                <KeyRound className="h-4 w-4" />
                تغيير كلمة المرور
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```
