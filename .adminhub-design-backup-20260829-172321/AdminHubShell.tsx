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
    iconWrap: "bg-secondary/[0.07] text-primary",
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
    iconWrap: "bg-secondary/[0.07] text-primary",
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

  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const opsHealth = opsHealthQuery.data;
  const isHubHome =
    location === "/admin-hub" || location === "/admin-hub/";

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
    if (loc === "/admin-hub/pentacam-failed")
      return <AdminPentacamFailed />;
    if (loc === "/admin-hub/sheet-copies") return <AdminSheetCopies />;
    if (loc === "/admin-hub/forms") return <AdminFormsHub />;
    if (loc === "/admin-hub/patients") return <AdminPatients />;
    if (loc === "/admin-hub/portal-bookings")
      return <AdminPortalBookings />;
    if (loc === "/admin-hub/card-visibility")
      return <AdminCardVisibility />;
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
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "services" as const,
      title: "تخصيص الفحوصات والخدمات والملفات الطبية",
      subtitle:
        "إعداد حقول كشف الحالات والتعليمات ونماذج الموافقة الطبية والأسعار",
      icon: Layers,
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "portal" as const,
      title: "المرضى وحجوزات البوابة الخارجية",
      subtitle: "البحث في ملفات المرضى ومراجعة طلبات الكشف والحجز الخارجي",
      icon: HeartPulse,
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      id: "system" as const,
      title: "أدوات النظام المتقدمة وقواعد البيانات",
      subtitle:
        "ترحيل البيانات، ومراقبة مؤشرات كفاءة الخادم وسجلات الأمان الفنية",
      icon: Terminal,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
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
        ? "text-emerald-500 font-black animate-pulse"
        : "text-rose-500 font-black",
      accent: opsHealth?.dbConnected
        ? "bg-emerald-500/10 border-emerald-500/20"
        : "bg-rose-500/10 border-rose-500/20",
    },
    {
      label: "النفق الآمن",
      value: opsHealthQuery.isLoading
        ? "—"
        : opsHealth?.tunnelConnected
          ? "نشط"
          : "غير نشط",
      tone: opsHealth?.tunnelConnected
        ? "text-emerald-500 font-black animate-pulse"
        : "text-rose-500 font-black",
      accent: opsHealth?.tunnelConnected
        ? "bg-emerald-500/10 border-emerald-500/20"
        : "bg-rose-500/10 border-rose-500/20",
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

  return (
    <div
      className="min-h-screen bg-background text-foreground p-4 sm:p-6"
      dir="rtl"
    >
      {/* ── 1. Floating Bento Top Header Capsule ── */}
      <header className="max-w-[1600px] mx-auto mb-6 bg-card border border-border/60 rounded-3xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-mono font-black text-sm">
            AD
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none">
              لوحة التحكم الإدارية للمشرف
            </h1>
            <span className="text-[10px] text-muted-foreground block mt-1 font-medium">
              إدارة المستخدمين والأطباء والصلاحيات وحالة تشغيل المركز
            </span>
          </div>
        </div>

        {/* Top metrics grids */}
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-3 md:w-auto md:min-w-[500px]">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border p-2.5 px-3 flex flex-col justify-center ${metric.accent}`}
            >
              <span className="text-[9px] font-bold text-muted-foreground block leading-none">
                {metric.label}
              </span>
              <span
                className={`mt-1 text-xs font-black font-mono leading-none ${metric.tone}`}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── 2. Floating Console Layout ── */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        {/* Horizontal Top Navigation Bar (all breakpoints) */}
        <nav className="w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none print:hidden">
          {topbarNavItems
            .filter((item) => canAccess(item.href))
            .map((item) => {
              const isActive = isItemActive(location, [item.href]);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-primary dark:text-primary-foreground dark:shadow-primary/10"
                      : "bg-card border border-border/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Main Content Floating Bento Container */}
        <main className="flex-1 w-full min-w-0 bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
          {crumbs && (
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-4 print:hidden">
              {crumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && <span className="opacity-40">/</span>}
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors hover:text-foreground",
                      i === crumbs.length - 1
                        ? "font-black text-foreground pointer-events-none"
                        : "underline-offset-4 hover:underline",
                    )}
                  >
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>
          )}

          {isHubHome ? (
            <div className="space-y-6">
              {/* Critical Actions Tier */}
              <Link href="/admin-hub/diagnostics">
                <div className="group relative overflow-hidden border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 shadow-sm hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-[1.002] active:scale-[0.998] transition-all duration-150 cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-4 text-right">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 transition-transform group-hover:scale-105">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground text-xs">
                        التشخيص والإصلاح
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        أدوات فحص وإصلاح البيانات المتقدمة للمشرفين التقنيين.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-500 rotate-180 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* Grouped Modules */}
              <div className="space-y-8">
                {CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const modules = ALL_MODULES.filter(
                    (m) => m.category === cat.id && canAccess(m.href),
                  );

                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-border pb-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-xl text-sm border",
                            cat.bg,
                            cat.color,
                          )}
                        >
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <h2 className="text-xs font-black text-foreground">
                            {cat.title}
                          </h2>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {cat.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {modules.map((mod) => {
                          const Icon = mod.icon;
                          return (
                            <Link key={mod.href} href={mod.href}>
                              <div className="group h-full bg-card border border-border/60 rounded-2xl p-5 shadow-xs hover:border-border hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between">
                                <div className="flex items-start gap-3 text-right">
                                  <div
                                    className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors border border-border/40 group-hover:bg-muted/40",
                                      mod.iconWrap,
                                    )}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <h3 className="font-bold text-xs tracking-tight text-foreground transition-colors group-hover:text-foreground">
                                      {mod.title}
                                    </h3>
                                    <p className="text-[10px] leading-normal text-muted-foreground font-semibold line-clamp-2">
                                      {mod.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Suspense fallback={<AppShellSkeleton />}>
              {renderComponent()}
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
