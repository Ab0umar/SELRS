import { useLocation, Link } from "wouter";
import { useState, Suspense } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Database,
  HeartPulse,
  LayoutGrid,
  Shield,
  Stethoscope,
  Terminal,
  Users,
  Wrench,
  FileSearch,
  Settings,
  DollarSign,
  Link2,
  TestTube2,
  Copy,
  Layers,
  PenSquare,
  Scan,
  CalendarDays,
  Bell,
  Eye,
  ChevronRight,
  UserCheck,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import AdminUsers from "./AdminUsers";
import AdminMigrations from "./AdminMigrations";
import AdminApiTools from "./AdminApiTools";
import AdminStatus from "./AdminStatus";
import AdminSettings from "./AdminSettings";
import AdminPermissions from "./AdminPermissions";
import AdminSheets from "./AdminSheets";
import AdminSheetDesigner from "./AdminSheetDesigner";
import AdminDoctors from "./AdminDoctors";
import AdminPentacamFailed from "./AdminPentacamFailed";
import AdminServices from "./AdminServices";
import TestsManagement from "../../pages/TestsManagement";
import AdminSheetCopies from "./AdminSheetCopies";
import AdminFormsHub from "./AdminFormsHub";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminDiagnostics from "./AdminDiagnostics";
import AdminDataSourceAudit from "./AdminDataSourceAudit";
import AdminNotificationSettings from "./AdminNotificationSettings";
import AdminPatients from "./AdminPatients";
import AdminPortalBookings from "./AdminPortalBookings";
import ExternalDoctors from "../../pages/ExternalDoctors";
import ExternalDoctorReferrals from "../../pages/ExternalDoctorReferrals";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";

type HubModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrap: string;
  category: "staff" | "services" | "portal" | "system";
};

const ALL_MODULES: HubModuleCard[] = [
  {
    href: "/salary",
    title: "المرتبات",
    description: "كشف المرتبات والعمولات والجزاءات الشهرية.",
    icon: DollarSign,
    iconWrap: "bg-success/10 text-success",
    category: "staff",
  },
  {
    href: "/admin-hub/permissions",
    title: "الصلاحيات",
    description: "تحديد صلاحيات الوصول للأدوار المختلفة.",
    icon: Shield,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "staff",
  },
  {
    href: "/admin-hub/doctors",
    title: "إدارة الأطباء",
    description: "تنظيم قائمة الأطباء والتخصصات.",
    icon: Stethoscope,
    iconWrap: "bg-success/10 text-success",
    category: "staff",
  },
  {
    href: "/admin-hub/users",
    title: "إدارة المستخدمين",
    description: "إضافة وتعديل بيانات الموظفين والمستخدمين.",
    icon: Users,
    iconWrap: "bg-primary/10 text-primary",
    category: "staff",
  },
  {
    href: "/admin-hub/external-doctors",
    title: "الأطباء الخارجيون",
    description: "أطباء الإحالة الخارجيين وعلاقاتهم بالمركز.",
    icon: Stethoscope,
    iconWrap: "bg-teal-500/10 text-teal-500",
    category: "staff",
  },
  {
    href: "/admin-hub/external-referrals",
    title: "إحالات الأطباء الخارجية",
    description: "متابعة الحالات المحولة ونسب الإحالة للأطباء.",
    icon: FileSearch,
    iconWrap: "bg-indigo-500/10 text-indigo-500",
    category: "staff",
  },
  {
    href: "/admin-hub/status",
    title: "حالة النظام",
    description: "مراقبة اتصال الخادم وقاعدة البيانات والأداء.",
    icon: Terminal,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/migrations",
    title: "ترحيل البيانات",
    description: "تطبيق ترحيلات Drizzle وأدوات الصيانة.",
    icon: Database,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/services",
    title: "ربط الخدمات",
    description: "مطابقة الخدمات المحلية مع رموز الربط.",
    icon: LayoutGrid,
    iconWrap: "bg-warning/10 text-warning",
    category: "services",
  },
  {
    href: "/admin-hub/tests",
    title: "تسعير الفحوصات",
    description: "تحديد الفحوصات الطبية وأسعارها بالمركز.",
    icon: TestTube2,
    iconWrap: "bg-indigo-500/10 text-indigo-500",
    category: "services",
  },
  {
    href: "/admin-hub/forms",
    title: "مستندات ونماذج المرضى",
    description: "إعداد استمارات الموافقة الجراحية والتعليمات الطبية للمرضى.",
    icon: PenSquare,
    iconWrap: "bg-emerald-500/10 text-emerald-500",
    category: "services",
  },
  {
    href: "/admin-hub/sheets",
    title: "ملفات الفحص",
    description: "مراجعة وحذف وتعديل استمارات فحص الحالات.",
    icon: Layers,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "services",
  },
  {
    href: "/admin-hub/sheet-designer",
    title: "مصمم نماذج الملفات",
    description: "بناء وتحديث حقول استمارات الفحص والمتابعة.",
    icon: Scan,
    iconWrap: "bg-primary/10 text-primary",
    category: "services",
  },
  {
    href: "/admin-hub/sheet-copies",
    title: "سجلات نسخ الملفات",
    description: "مراجعة ونقل الحقول الطبية المسجلة للملف الإلكتروني.",
    icon: Copy,
    iconWrap: "bg-muted text-muted-foreground",
    category: "services",
  },
  {
    href: "/admin-hub/patients",
    title: "سجل المرضى الكلي",
    description: "البحث التفصيلي وتعديل كافة ملفات المرضى التاريخية بالمركز.",
    icon: Users,
    iconWrap: "bg-teal-500/10 text-teal-500",
    category: "portal",
  },
  {
    href: "/admin-hub/portal-bookings",
    title: "حجوزات البوابة الخارجية",
    description: "التحقق وتأكيد حجوزات موقع الويب الخارجي والطلبات للعيادات.",
    icon: CalendarDays,
    iconWrap: "bg-indigo-500/10 text-indigo-500",
    category: "portal",
  },
  {
    href: "/admin-hub/settings",
    title: "الإعدادات العامة",
    description: "تعديل المسمى الطبي والتأكيد على خيارات تشغيل المنشأة.",
    icon: Settings,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/admin-hub/card-visibility",
    title: "بطاقات الاستعلام",
    description: "التحكم في ظهور كروت الإحصائيات بالرئيسية.",
    icon: Eye,
    iconWrap: "bg-warning/10 text-warning",
    category: "system",
  },
  {
    href: "/admin-hub/audit",
    title: "تدقيق الحسابات",
    description: "سجل حركات تعديل قيم الكشوفات والمبالغ المالية.",
    icon: FileSearch,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/notifications",
    title: "إعدادات التنبيهات",
    description: "ضبط تنبيهات النظام وقنوات الإرسال.",
    icon: Bell,
    iconWrap: "bg-rose-500/10 text-rose-500",
    category: "system",
  },
];

const navigationSections = [
  {
    id: "staff",
    label: "إدارة كادر العمل",
    description: "المستخدمون، الأطباء، الصلاحيات والإحالات",
    icon: Users,
    items: [
      {
        href: "/admin-hub/users",
        label: "إدارة المستخدمين",
        description: "بيانات حسابات ودخول الموظفين",
        activeFor: ["/admin-hub/users"],
      },
      {
        href: "/admin-hub/doctors",
        label: "كادر الأطباء بالمركز",
        description: "بيانات وتخصصات الأطباء المسجلين",
        activeFor: ["/admin-hub/doctors"],
      },
      {
        href: "/admin-hub/permissions",
        label: "صلاحيات الوصول للأدوار",
        description: "صلاحيات ومجموعات العمل بالسيستم",
        activeFor: ["/admin-hub/permissions"],
      },
      {
        href: "/admin-hub/external-doctors",
        label: "الأطباء الخارجيون",
        description: "أطباء الإحالة الخارجيين وعلاقاتهم",
        activeFor: ["/admin-hub/external-doctors"],
      },
      {
        href: "/admin-hub/external-referrals",
        label: "إحالات الأطباء الخارجية",
        description: "الحالات المحولة ونسب الإحالة",
        activeFor: ["/admin-hub/external-referrals"],
      },
    ],
  },
  {
    id: "services",
    label: "الخدمات والملفات الطبية",
    description: "إعداد الفحوصات والخدمات والملفات ونماذج الموافقة",
    icon: Layers,
    items: [
      {
        href: "/admin-hub/services",
        label: "ربط وتطابق الخدمات",
        description: "تطابق أسماء الخدمات بالمركز",
        activeFor: ["/admin-hub/services"],
      },
      {
        href: "/admin-hub/tests",
        label: "إعدادات وتسعير الفحوصات",
        description: "أسعار التحاليل والفحوصات الفنية",
        activeFor: ["/admin-hub/tests"],
      },
      {
        href: "/admin-hub/forms",
        label: "مستندات ونماذج المرضى",
        description: "الموافقات الطبية وتعليمات الليزك",
        activeFor: ["/admin-hub/forms"],
      },
      {
        href: "/admin-hub/sheets",
        label: "ملفات الفحص الإلكترونية",
        description: "ملفات كشف واستمارات الفحص للحالات",
        activeFor: ["/admin-hub/sheets"],
      },
      {
        href: "/admin-hub/sheet-designer",
        label: "مصمم نماذج الملفات",
        description: "أداة بناء حقول وقيم الكشف",
        activeFor: ["/admin-hub/sheet-designer"],
      },
      {
        href: "/admin-hub/sheet-copies",
        label: "سجلات نسخ الملفات",
        description: "سجل نقل بنية وقيم الحقول الطبية",
        activeFor: ["/admin-hub/sheet-copies"],
      },
    ],
  },
  {
    id: "portal",
    label: "المرضى وحجوزات البوابة",
    description: "البحث الكلي وإحالات حجز الويب الخارجي",
    icon: HeartPulse,
    items: [
      {
        href: "/admin-hub/patients",
        label: "سجل المرضى الكلي",
        description: "البحث في كافة المرضى المسجلين بالمركز",
        activeFor: ["/admin-hub/patients"],
      },
      {
        href: "/admin-hub/portal-bookings",
        label: "حجوزات البوابة الخارجية",
        description: "حجوزات موقع الويب الخارجي والطلبات",
        activeFor: ["/admin-hub/portal-bookings"],
      },
      {
        href: "/admin/legacy-patients",
        label: "سجل المرضى (23/24/25)",
        description: "بحث للمراجعة فقط في قواعد بيانات السنوات السابقة",
        activeFor: ["/admin/legacy-patients"],
      },
    ],
  },
  {
    id: "system",
    label: "النظام والصيانة",
    description: "حالة السيرفر وترحيل الجداول وسجلات الحسابات",
    icon: Terminal,
    items: [
      {
        href: "/admin-hub/status",
        label: "حالة الخادم الفنية",
        description: "أداء السيرفر واستخدام المعالج والذاكرة",
        activeFor: ["/admin-hub/status"],
      },
      {
        href: "/admin-hub/migrations",
        label: "مزامنة تحديثات الجداول",
        description: "ترحيل البيانات وتعديل قواعد البيانات",
        activeFor: ["/admin-hub/migrations"],
      },
      {
        href: "/admin-hub/api",
        label: "لوحة اختبار tRPC API",
        description: "أدوات API للمطورين",
        activeFor: ["/admin-hub/api"],
      },
      {
        href: "/admin-hub/settings",
        label: "إعدادات النظام العامة",
        description: "عناوين وخواص تشغيل المركز الكلية",
        activeFor: ["/admin-hub/settings"],
      },
      {
        href: "/admin-hub/card-visibility",
        label: "إعدادات بطاقات الاستعلام",
        description: "التحكم في ظهور كروت Dashboard",
        activeFor: ["/admin-hub/card-visibility"],
      },
      {
        href: "/admin-hub/audit",
        label: "سجل تدقيق التغييرات",
        description: "سجلات الأمن وحركة التعديل",
        activeFor: ["/admin-hub/audit"],
      },
      {
        href: "/admin-hub/notifications",
        label: "إعدادات التنبيهات",
        description: "إعدادات الرسائل وسيرفرات البريد",
        activeFor: ["/admin-hub/notifications"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/admin-hub"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

// Top navigation (horizontal bar, single row, all breakpoints)
const topbarNavItems = [
  { href: "/admin-hub/users", label: "المستخدمين", icon: Users },
  { href: "/admin-hub/doctors", label: "الأطباء", icon: Stethoscope },
  { href: "/admin-hub/permissions", label: "الصلاحيات", icon: Shield },
  {
    href: "/admin-hub/external-doctors",
    label: "طبيب خارجي",
    icon: FileSearch,
  },
  { href: "/admin-hub/tests", label: "الخدمات", icon: TestTube2 },
  { href: "/admin-hub/services", label: "ربط الخدمات", icon: LayoutGrid },
  {
    href: "/admin-hub/sheet-designer",
    label: "نماذج الملفات",
    icon: Scan,
  },
  { href: "/admin-hub/patients", label: "المرضى", icon: Users },
  { href: "/admin/legacy-patients", label: "سجل المرضى", icon: HeartPulse },
  {
    href: "/admin-hub/portal-bookings",
    label: "الحجز",
    icon: CalendarDays,
  },
  { href: "/admin-hub/status", label: "السيرفر", icon: Terminal },
  { href: "/admin-hub/migrations", label: "اسكيما", icon: Database },
  { href: "/admin-hub/notifications", label: "الإشعارات", icon: Bell },
];

export default function AdminHubShell() {
  const [location] = useLocation();
  const { canAccess } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const opsHealth = opsHealthQuery.data;
  const isHubHome = location === "/admin-hub" || location === "/admin-hub/";

  const getBreadcrumbs = () => {
    if (isHubHome) return null;
    const parts = location.split("/").filter(Boolean);
    const crumbs = [{ label: "الرئيسية للمشرف", href: "/admin-hub" }];

    let currentPath = "/admin-hub";
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      const mod = ALL_MODULES.find((m) => m.href === currentPath);
      crumbs.push({
        label: mod ? mod.title : part,
        href: currentPath,
      });
    }
    return crumbs;
  };

  const renderComponent = () => {
    const loc = location.replace(/\/$/, "");
    if (loc === "/admin-hub/users") return <AdminUsers />;
    if (loc === "/admin-hub/migrations") return <AdminMigrations />;
    if (loc === "/admin-hub/api") return <AdminApiTools />;
    if (loc === "/admin-hub/status") return <AdminStatus />;
    if (loc === "/admin-hub/settings") return <AdminSettings />;
    if (loc === "/admin-hub/permissions") return <AdminPermissions />;
    if (loc === "/admin-hub/sheets") return <AdminSheets />;
    if (loc === "/admin-hub/sheet-designer") return <AdminSheetDesigner />;
    if (loc === "/admin-hub/doctors") return <AdminDoctors />;
    if (loc === "/admin-hub/pentacam-failed") return <AdminPentacamFailed />;
    if (loc === "/admin-hub/sheet-copies") return <AdminSheetCopies />;
    if (loc === "/admin-hub/forms") return <AdminFormsHub />;
    if (loc === "/admin-hub/patients") return <AdminPatients />;
    if (loc === "/admin-hub/portal-bookings") return <AdminPortalBookings />;
    if (loc === "/admin-hub/card-visibility") return <AdminCardVisibility />;
    if (loc === "/admin-hub/diagnostics") return <AdminDiagnostics />;
    if (loc === "/admin-hub/audit") return <AdminDataSourceAudit />;
    if (loc === "/admin-hub/notifications")
      return <AdminNotificationSettings />;
    if (loc === "/admin-hub/services") return <AdminServices />;
    if (loc === "/admin-hub/tests") return <TestsManagement />;
    if (loc === "/admin-hub/external-doctors") return <ExternalDoctors />;
    if (loc === "/admin-hub/external-referrals")
      return <ExternalDoctorReferrals />;
    return null;
  };

  const CATEGORIES = [
    {
      id: "staff" as const,
      title: "إدارة كادر العمل البشري",
      subtitle: "إضافة وتعديل بيانات الموظفين والمستخدمين والصلاحيات والأطباء",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
    {
      id: "services" as const,
      title: "تخصيص الفحوصات والخدمات والملفات الطبية",
      subtitle:
        "إعداد حقول كشف الحالات والتعليمات ونماذج الموافقة الطبية والأسعار",
      icon: Layers,
      color: "text-secondary",
      bg: "bg-secondary/10 border-secondary/20",
    },
    {
      id: "portal" as const,
      title: "المرضى وحجوزات البوابة الخارجية",
      subtitle: "البحث في ملفات المرضى ومراجعة طلبات الكشف والحجز الخارجي",
      icon: HeartPulse,
      color: "text-info",
      bg: "bg-info/10 border-info/20",
    },
    {
      id: "system" as const,
      title: "أدوات النظام المتقدمة وقواعد البيانات",
      subtitle:
        "ترحيل البيانات، ومراقبة مؤشرات كفاءة الخادم وسجلات الأمان الفنية",
      icon: Terminal,
      color: "text-warning",
      bg: "bg-warning/10 border-warning/20",
    },
  ];

  const crumbs = getBreadcrumbs();

  const metrics = [
    {
      label: "قاعدة البيانات",
      value: opsHealthQuery.isLoading
        ? "—"
        : opsHealth?.dbConnected
          ? "متصلة"
          : "غير متصلة",
      tone: opsHealth?.dbConnected
        ? "text-success font-black animate-pulse"
        : "text-destructive font-black",
      accent: opsHealth?.dbConnected
        ? "bg-success/10 border-success/20"
        : "bg-destructive/10 border-destructive/20",
    },
    {
      label: "النفق الآمن",
      value: opsHealthQuery.isLoading
        ? "—"
        : opsHealth?.tunnelConnected
          ? "نشط"
          : "غير نشط",
      tone: opsHealth?.tunnelConnected
        ? "text-success font-black animate-pulse"
        : "text-destructive font-black",
      accent: opsHealth?.tunnelConnected
        ? "bg-success/10 border-success/20"
        : "bg-destructive/10 border-destructive/20",
    },
    {
      label: "مرضى اليوم",
      value: opsHealthQuery.isLoading
        ? "—"
        : (opsHealth?.patientsCount ?? 0).toLocaleString("ar-EG"),
      tone: "text-primary",
      accent: "bg-primary/10 border-primary/20",
    },
  ];

  const sidebarSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  const quickLinks = [
    {
      href: "/admin-hub/portal-bookings",
      label: "حجوزات البوابة",
      hint: "مراجعة الطلبات الجديدة",
      icon: CalendarDays,
    },
    {
      href: "/admin-hub/users",
      label: "المستخدمون",
      hint: "الحسابات والأدوار",
      icon: Users,
    },
    {
      href: "/admin-hub/status",
      label: "حالة النظام",
      hint: "الاتصال والأداء",
      icon: Activity,
    },
  ].filter((item) => canAccess(item.href));

  return (
    <div
      data-admin-hub
      className="min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      <div className="min-h-screen lg:flex lg:flex-row-reverse">
        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-40 flex w-[min(86vw,320px)] flex-col border-l border-border/70 bg-card shadow-2xl transition-transform duration-200 lg:static lg:w-[280px] lg:shrink-0 lg:translate-x-0 lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-5">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="إغلاق القائمة"
            >
              <PanelRightClose className="size-5" />
            </button>
            <Link href="/admin-hub" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-sm">
                AD
              </span>
              <span className="text-right">
                <span className="block text-sm font-black text-foreground">
                  Admin Hub
                </span>
                <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                  عيون الشروق
                </span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              مساحة الإدارة
            </p>
            <div className="space-y-5">
              {sidebarSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <div key={section.id}>
                    <div className="mb-2 flex items-center gap-2 px-3 text-xs font-bold text-foreground">
                      <SectionIcon className="size-4 text-primary" />
                      <span>{section.label}</span>
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isItemActive(location, item.activeFor);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                              active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 shrink-0 transition-transform",
                                active
                                  ? "rotate-180"
                                  : "group-hover:-translate-x-0.5",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border/70 p-4">
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              <span>العودة للوحة الرئيسية</span>
              <ArrowRight className="size-4 rotate-180" />
            </Link>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur print:static">
            <div className="mx-auto flex min-h-16 w-full max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl border border-border bg-card p-2 text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:hidden"
                  aria-label="فتح القائمة"
                >
                  <PanelRightOpen className="size-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    Admin Hub
                  </p>
                  <p className="truncate text-sm font-bold text-foreground">
                    مركز الإدارة والتشغيل
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={cn(
                      "hidden min-w-[92px] rounded-xl border px-3 py-2 text-right sm:block",
                      metric.accent,
                    )}
                  >
                    <span className="block text-[10px] font-semibold text-muted-foreground">
                      {metric.label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs font-black",
                        metric.tone,
                      )}
                    >
                      {metric.value}
                    </span>
                  </div>
                ))}
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground sm:hidden">
                  AD
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {crumbs ? (
              <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground print:hidden">
                {crumbs.map((crumb, index) => (
                  <span key={crumb.href} className="flex items-center gap-2">
                    {index > 0 ? (
                      <ChevronRight className="size-3 rotate-180 opacity-40" />
                    ) : null}
                    <Link
                      href={crumb.href}
                      className={cn(
                        "transition-colors hover:text-foreground",
                        index === crumbs.length - 1
                          ? "pointer-events-none font-black text-foreground"
                          : "hover:underline hover:underline-offset-4",
                      )}
                    >
                      {crumb.label}
                    </Link>
                  </span>
                ))}
              </nav>
            ) : null}

            {isHubHome ? (
              <div className="space-y-7">
                <section className="admin-hub-hero flex flex-col gap-6 rounded-3xl border border-border/70 bg-card px-5 py-6 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:px-7">
                  <div className="max-w-2xl">
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                      Operations control room
                    </span>
                    <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                      مركز إدارة عيون الشروق
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                      كل أدوات الإدارة في مساحة واحدة هادئة وواضحة، مع تنقّل
                      جانبي ثابت بدل التابات والكروت المتكررة.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={cn(
                          "min-w-[92px] rounded-2xl border px-3 py-3",
                          metric.accent,
                        )}
                      >
                        <span className="block text-[10px] font-semibold text-muted-foreground">
                          {metric.label}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block text-base font-black",
                            metric.tone,
                          )}
                        >
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {quickLinks.length > 0 ? (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                          Shortcuts
                        </p>
                        <h2 className="mt-1 text-lg font-black text-foreground">
                          الوصول السريع
                        </h2>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        أكثر المهام استخدامًا
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {quickLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1 text-right">
                              <span className="block text-sm font-black text-foreground">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {item.hint}
                              </span>
                            </span>
                            <ArrowRight className="size-4 rotate-180 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <div className="space-y-8">
                  {CATEGORIES.map((category) => {
                    const CategoryIcon = category.icon;
                    const modules = ALL_MODULES.filter(
                      (module) =>
                        module.category === category.id &&
                        canAccess(module.href),
                    );
                    if (modules.length === 0) return null;
                    return (
                      <section key={category.id}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                                category.bg,
                                category.color,
                              )}
                            >
                              <CategoryIcon className="size-5" />
                            </span>
                            <div className="min-w-0">
                              <h2 className="truncate text-base font-black text-foreground">
                                {category.title}
                              </h2>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {category.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-black text-muted-foreground">
                            {modules.length}
                          </span>
                        </div>
                        <div className="admin-hub-module-list grid overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:grid-cols-2">
                          {modules.map((module) => {
                            const Icon = module.icon;
                            return (
                              <Link
                                key={module.href}
                                href={module.href}
                                className="group flex min-w-0 items-center gap-3 border-b border-border/60 px-4 py-3.5 text-right transition-colors last:border-b-0 hover:bg-muted/45"
                              >
                                <span
                                  className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                                    module.iconWrap,
                                  )}
                                >
                                  <Icon className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold text-foreground">
                                    {module.title}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {module.description}
                                  </span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 rotate-180 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="admin-hub-page-surface">
                <Suspense fallback={<AppShellSkeleton />}>
                  {renderComponent()}
                </Suspense>
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}
