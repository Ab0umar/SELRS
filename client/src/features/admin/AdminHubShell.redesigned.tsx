import { useLocation, Link } from "wouter";
import { useState } from "react";
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
    href: "/booking-triage/permissions",
    title: "الصلاحيات",
    description: "تحديد صلاحيات الوصول للأدوار المختلفة.",
    icon: Shield,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "staff",
  },
  {
    href: "/booking-triage/doctors",
    title: "إدارة الأطباء",
    description: "تنظيم قائمة الأطباء والتخصصات.",
    icon: Stethoscope,
    iconWrap: "bg-success/10 text-success",
    category: "staff",
  },
  {
    href: "/booking-triage/users",
    title: "إدارة المستخدمين",
    description: "إضافة وتعديل بيانات الموظفين والمستخدمين.",
    icon: Users,
    iconWrap: "bg-primary/10 text-primary",
    category: "staff",
  },
  {
    href: "/booking-triage/external-doctors",
    title: "الأطباء الخارجيون",
    description: "أطباء الإحالة من خارج المركز.",
    icon: UserCheck,
    iconWrap: "bg-primary/10 text-primary",
    category: "staff",
  },
  {
    href: "/booking-triage/external-referrals",
    title: "إحالات الأطباء",
    description: "تقارير الحالات المحولة من الأطباء الخارجيين.",
    icon: FileSearch,
    iconWrap: "bg-primary/10 text-primary",
    category: "staff",
  },
  {
    href: "/booking-triage/services",
    title: "ربط الخدمات",
    description: "تحديد مسمى الخدمة المطابق بالسيستم.",
    icon: Link2,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "services",
  },
  {
    href: "/booking-triage/tests",
    title: "الفحوصات",
    description: "إعدادات الفحوصات والأسعار والقيم القياسية.",
    icon: TestTube2,
    iconWrap: "bg-primary/10 text-primary",
    category: "services",
  },
  {
    href: "/booking-triage/forms",
    title: "مستندات المرضى",
    description: "نماذج الموافقة الطبية والتعليمات الورقية للمريض.",
    icon: Copy,
    iconWrap: "bg-primary/10 text-primary",
    category: "services",
  },
  {
    href: "/booking-triage/sheets",
    title: "ملفات الفحص الإلكترونية",
    description: "تصميم وإدارة ملفات فحص الحالات والنماذج المخصصة.",
    icon: Layers,
    iconWrap: "bg-primary/10 text-primary",
    category: "services",
  },
  {
    href: "/booking-triage/sheet-designer",
    title: "مصمم النماذج",
    description: "واجهة تصميم مرئية لحقول ملف الفحص للمريض.",
    icon: PenSquare,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "services",
  },
  {
    href: "/booking-triage/sheet-copies",
    title: "سجلات نسخ الملفات",
    description: "سجل عمليات نسخ ونقل حقول النماذج الطبية.",
    icon: Scan,
    iconWrap: "bg-primary/10 text-primary",
    category: "services",
  },
  {
    href: "/booking-triage/patients",
    title: "سجل المرضى الكلي",
    description: "البحث والتعديل في سجلات جميع المرضى المسجلين بالنظام.",
    icon: HeartPulse,
    iconWrap: "bg-primary/10 text-primary",
    category: "portal",
  },
  {
    href: "/booking-triage/portal-bookings",
    title: "حجوزات البوابة الخارجية",
    description: "طلبات الحجز الواردة من موقع الحجز الخارجي.",
    icon: CalendarDays,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "portal",
  },
  {
    href: "/booking-triage/status",
    title: "حالة تشغيل الخادم",
    description: "مؤشرات تشغيل السيرفر واستهلاك المعالج والذاكرة.",
    icon: Activity,
    iconWrap: "bg-success/10 text-success",
    category: "system",
  },
  {
    href: "/booking-triage/migrations",
    title: "تحديثات قاعدة البيانات",
    description: "متابعة وتطبيق ميزان وتحديثات جداول الداتابيز.",
    icon: Database,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/booking-triage/api",
    title: "تواصل tRPC API",
    description: "أداة مطوري النظام لاختبار الاتصالات واستعلامات الخادم.",
    icon: Terminal,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "system",
  },
  {
    href: "/booking-triage/settings",
    title: "إعدادات النظام العامة",
    description: "التحكم في المتغيرات الأساسية وعناوين الاتصال بالنظام.",
    icon: Wrench,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/booking-triage/card-visibility",
    title: "إعدادات بطاقات الاستعلام",
    description: "تحديد البطاقات النشطة وغير النشطة في لوحة التحكم.",
    icon: Eye,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/booking-triage/audit",
    title: "سجل تدقيق البيانات",
    description: "سجل التغييرات وعمليات تعديل البيانات بالنظام.",
    icon: FileSearch,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/booking-triage/notifications",
    title: "إعدادات التنبيهات",
    description: "قنوات التنبيهات والبريد الإلكتروني والرسائل النصية.",
    icon: Bell,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
];

const navigationSections = [
  {
    id: "staff" as const,
    label: "إدارة الكادر البشري",
    description: "بيانات وصلاحيات الموظفين والأطباء",
    icon: Users,
    items: [
      { href: "/booking-triage/users", label: "المستخدمون والموظفون", description: "بيانات حسابات ودخول الموظفين", activeFor: ["/booking-triage/users"] },
      { href: "/booking-triage/doctors", label: "كادر الأطباء بالمركز", description: "بيانات وتخصصات الأطباء المسجلين", activeFor: ["/booking-triage/doctors"] },
      { href: "/booking-triage/permissions", label: "صلاحيات الوصول للأدوار", description: "صلاحيات ومجموعات العمل بالسيستم", activeFor: ["/booking-triage/permissions"] },
      { href: "/booking-triage/external-doctors", label: "الأطباء الخارجيون", description: "أطباء الإحالة الخارجيين وعلاقاتهم", activeFor: ["/booking-triage/external-doctors"] },
      { href: "/booking-triage/external-referrals", label: "إحالات الأطباء الخارجية", description: "الحالات المحولة ونسب الإحالة", activeFor: ["/booking-triage/external-referrals"] },
    ],
  },
  {
    id: "services" as const,
    label: "تخصيص الفحص والخدمات",
    description: "إعداد حقول ونماذج الفحوصات والأسعار",
    icon: Layers,
    items: [
      { href: "/booking-triage/services", label: "ربط وتطابق الخدمات", description: "تطابق أسماء الخدمات بالمركز", activeFor: ["/booking-triage/services"] },
      { href: "/booking-triage/tests", label: "إعدادات وتسعير الفحوصات", description: "أسعار التحاليل والفحوصات الفنية", activeFor: ["/booking-triage/tests"] },
      { href: "/booking-triage/forms", label: "مستندات ونماذج المرضى", description: "الموافقات الطبية وتعليمات الليزك", activeFor: ["/booking-triage/forms"] },
      { href: "/booking-triage/sheets", label: "ملفات الفحص الإلكترونية", description: "ملفات كشف واستمارات الفحص للحالات", activeFor: ["/booking-triage/sheets"] },
      { href: "/booking-triage/sheet-designer", label: "مصمم نماذج الملفات", description: "أداة بناء حقول وقيم الكشف", activeFor: ["/booking-triage/sheet-designer"] },
      { href: "/booking-triage/sheet-copies", label: "سجلات نسخ الملفات", description: "سجل نقل بنية وقيم الحقول الطبية", activeFor: ["/booking-triage/sheet-copies"] },
    ],
  },
  {
    id: "portal" as const,
    label: "البوابة والمرضى",
    description: "سجلات المرضى وحجوزات البوابة",
    icon: HeartPulse,
    items: [
      { href: "/booking-triage/patients", label: "سجل المرضى الكلي", description: "البحث في كافة المرضى المسجلين بالمركز", activeFor: ["/booking-triage/patients"] },
      { href: "/booking-triage/portal-bookings", label: "حجوزات البوابة الخارجية", description: "حجوزات موقع الويب الخارجي والطلبات", activeFor: ["/booking-triage/portal-bookings"] },
    ],
  },
  {
    id: "system" as const,
    label: "إعدادات النظام والصيانة",
    description: "مراقبة وإعداد خادم تشغيل النظام",
    icon: Settings,
    items: [
      { href: "/booking-triage/status", label: "حالة الخادم الفنية", description: "أداء السيرفر واستخدام المعالج والذاكرة", activeFor: ["/booking-triage/status"] },
      { href: "/booking-triage/migrations", label: "مزامنة تحديثات الجداول", description: "ترحيل البيانات وتعديل قواعد البيانات", activeFor: ["/booking-triage/migrations"] },
      { href: "/booking-triage/api", label: "لوحة اختبار tRPC API", description: "أدوات API للمطورين", activeFor: ["/booking-triage/api"] },
      { href: "/booking-triage/settings", label: "إعدادات النظام العامة", description: "عناوين وخواص تشغيل المركز الكلية", activeFor: ["/booking-triage/settings"] },
      { href: "/booking-triage/card-visibility", label: "إعدادات بطاقات الاستعلام", description: "التحكم في ظهور كروت Dashboard", activeFor: ["/booking-triage/card-visibility"] },
      { href: "/booking-triage/audit", label: "سجل تدقيق التغييرات", description: "سجلات الأمن وحركة التعديل", activeFor: ["/booking-triage/audit"] },
      { href: "/booking-triage/notifications", label: "إعدادات التنبيهات", description: "إعدادات الرسائل وسيرفرات البريد", activeFor: ["/booking-triage/notifications"] },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/booking-triage"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function AdminHubShell() {
  const [location] = useLocation();
  const { canAccess } = usePermissions();

  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const opsHealth = opsHealthQuery.data;

  const isHubHome = location === "/booking-triage" || location === "/booking-triage/";

  const getBreadcrumbs = () => {
    if (isHubHome) return null;
    const parts = location.split("/").filter(Boolean);
    const crumbs = [{ label: "الرئيسية للمشرف", href: "/booking-triage" }];
    
    let currentPath = "/booking-triage";
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
    if (loc === "/booking-triage/users") return <AdminUsers />;
    if (loc === "/booking-triage/migrations") return <AdminMigrations />;
    if (loc === "/booking-triage/api") return <AdminApiTools />;
    if (loc === "/booking-triage/status") return <AdminStatus />;
    if (loc === "/booking-triage/settings") return <AdminSettings />;
    if (loc === "/booking-triage/permissions") return <AdminPermissions />;
    if (loc === "/booking-triage/sheets") return <AdminSheets />;
    if (loc === "/booking-triage/sheet-designer") return <AdminSheetDesigner />;
    if (loc === "/booking-triage/doctors") return <AdminDoctors />;
    if (loc === "/booking-triage/pentacam-failed") return <AdminPentacamFailed />;
    if (loc === "/booking-triage/sheet-copies") return <AdminSheetCopies />;
    if (loc === "/booking-triage/forms") return <AdminFormsHub />;
    if (loc === "/booking-triage/patients") return <AdminPatients />;
    if (loc === "/booking-triage/portal-bookings") return <AdminPortalBookings />;
    if (loc === "/booking-triage/card-visibility") return <AdminCardVisibility />;
    if (loc === "/booking-triage/diagnostics") return <AdminDiagnostics />;
    if (loc === "/booking-triage/audit") return <AdminDataSourceAudit />;
    if (loc === "/booking-triage/notifications") return <AdminNotificationSettings />;
    if (loc === "/booking-triage/services") return <AdminServices />;
    if (loc === "/booking-triage/tests") return <TestsManagement />;
    if (loc === "/booking-triage/external-doctors") return <ExternalDoctors />;
    if (loc === "/booking-triage/external-referrals") return <ExternalDoctorReferrals />;
    return null;
  };

  const CATEGORIES = [
    {
      id: "staff" as const,
      title: "إدارة كادر العمل البشري",
      subtitle: "إضافة وتعديل بيانات الموظفين والمستخدمين والصلاحيات والأطباء",
      icon: Users,
      color: "text-blue-650",
      bg: "bg-blue-50",
    },
    {
      id: "services" as const,
      title: "تخصيص الفحوصات والخدمات والملفات الطبية",
      subtitle: "إعداد حقول كشف الحالات والتعليمات ونماذج الموافقة الطبية والأسعار",
      icon: Layers,
      color: "text-purple-655",
      bg: "bg-purple-50",
    },
    {
      id: "portal" as const,
      title: "المرضى وحجوزات البوابة الخارجية",
      subtitle: "البحث في ملفات المرضى ومراجعة طلبات الكشف والحجز الخارجي",
      icon: HeartPulse,
      color: "text-rose-650",
      bg: "bg-rose-50",
    },
    {
      id: "system" as const,
      title: "إعدادات النظام والصيانة",
      subtitle: "مراقبة حالة الخادم، الميجريشن، إعدادات tRPC والإخطارات",
      icon: Settings,
      color: "text-slate-550",
      bg: "bg-slate-100",
    },
  ];

  const HubLanding = () => (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        title="مركز الإدارة"
        subtitle="التحكم الشامل في المستخدمين، الأطباء، والخدمات الفنية للمركز."
        icon={<LayoutGrid className="h-5 w-5 text-slate-800" />}
      />

      {/* Critical Actions Tier */}
      <Link href="/booking-triage/diagnostics">
        <div className="group relative overflow-hidden border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 shadow-sm hover:border-emerald-350 hover:bg-emerald-50 hover:scale-[1.005] active:scale-[0.995] transition-all duration-150 cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-4 text-right">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 transition-transform group-hover:scale-105">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 text-xs">
                التشخيص والإصلاح
              </div>
              <p className="text-[10px] text-slate-450 font-semibold">
                أدوات فحص وإصلاح البيانات المتقدمة للمشرفين التقنيين.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-700 rotate-180 transition-transform group-hover:-translate-x-1" />
        </div>
      </Link>

      {/* Grouped Modules */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const modules = ALL_MODULES.filter((m) => m.category === cat.id && canAccess(m.href));

          return (
            <div key={cat.id} className="space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-sm border", cat.bg, cat.color, "border-slate-200/50")}>
                  <CatIcon className="h-4 w-4" />
                </div>
                <div className="text-right">
                  <h2 className="text-xs font-black text-slate-900">
                    {cat.title}
                  </h2>
                  <p className="text-[10px] text-slate-455 font-semibold mt-0.5">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Link key={mod.href} href={mod.href}>
                      <div
                        className="group h-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-450 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3 text-right">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors border border-slate-200/50 group-hover:bg-slate-50",
                              mod.iconWrap,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="font-bold text-xs tracking-tight text-slate-800 transition-colors group-hover:text-slate-950">
                              {mod.title}
                            </h3>
                            <p className="text-[10px] leading-normal text-slate-455 font-semibold line-clamp-2">
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
  );

  const crumbs = getBreadcrumbs();

  const metrics = [
    {
      label: "قاعدة البيانات",
      value: opsHealthQuery.isLoading ? "—" : (opsHealth?.dbConnected ? "متصلة" : "غير متصلة"),
      tone: opsHealth?.dbConnected ? "text-emerald-700 font-black animate-pulse" : "text-rose-700 font-black",
      accent: opsHealth?.dbConnected ? "bg-emerald-50 border-emerald-250" : "bg-rose-50 border-rose-250",
    },
    {
      label: "النفق الآمن",
      value: opsHealthQuery.isLoading ? "—" : (opsHealth?.tunnelConnected ? "نشط" : "غير نشط"),
      tone: opsHealth?.tunnelConnected ? "text-emerald-700 font-black animate-pulse" : "text-rose-700 font-black",
      accent: opsHealth?.tunnelConnected ? "bg-emerald-50 border-emerald-250" : "bg-rose-50 border-rose-250",
    },
    {
      label: "عدد المرضى اليوم",
      value: opsHealthQuery.isLoading ? "—" : (opsHealth?.patientsCount ?? 0).toLocaleString("ar-EG"),
      tone: "text-slate-800 font-black",
      accent: "bg-slate-50 border-slate-200",
    },
  ];

  return (
    <div
      className="page-layout min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Header with metrics */}
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Title section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  <Shield className="h-3.5 w-3.5" />
                  مركز الإدارة والتحكم
                </div>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                لوحة التحكم الإدارية
              </h1>
              <p className="max-w-2xl text-[11px] font-semibold text-slate-400 mt-1 leading-snug">
                إدارة المستخدمين، الأطباء، الصلاحيات، الخدمات، وحالة تشغيل النظام.
              </p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-2xl border p-3.5 shadow-sm bg-white flex flex-col justify-between`}
                >
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {metric.label}
                  </div>
                  <div className={`mt-2 text-sm font-black leading-none tracking-tight ${metric.tone}`}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full border-b border-slate-200 bg-white/50 lg:w-64 lg:border-b-0 lg:border-r">
          <nav className="space-y-1 p-3 sm:p-4 sticky top-4">
            {/* Main Hub Home Link */}
            <div className="space-y-1">
              <Link
                href="/booking-triage"
                className={cn(
                  "group flex items-center rounded-xl text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 gap-2.5 px-3 py-2.5 border",
                  isHubHome
                    ? "bg-slate-900 text-white font-bold border-transparent shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent"
                )}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate font-bold">لوحة التحكم الرئيسية</span>
              </Link>
            </div>

            <div className="my-2 border-t border-slate-100" />

            {navigationSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccess(item.href));
              if (!visibleItems.length) return null;
              return (
                <div key={section.id} className="space-y-1">
                  {/* Section header */}
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider leading-none">
                          {section.label}
                        </h3>
                        <p className="text-[10px] text-slate-450 font-semibold mt-1 leading-normal">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section items */}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const itemActive = isItemActive(location, item.activeFor);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 ${
                            itemActive
                              ? "bg-slate-900 text-white font-bold shadow-sm"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <ChevronRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 rotate-180 transition-transform group-hover:-translate-x-0.5", itemActive ? "text-white" : "text-slate-455 group-hover:text-slate-900")} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold">{item.label}</div>
                            <div className={`text-[10px] mt-0.5 ${itemActive ? "text-slate-200" : "text-slate-400 group-hover:text-slate-500"} font-semibold`}>
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {section.id !== "system" && (
                    <div className="my-2 border-t border-slate-100" />
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 min-w-0">
          {crumbs && (
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-4 print:hidden">
              {crumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && <span className="opacity-40">/</span>}
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors hover:text-slate-800",
                      i === crumbs.length - 1
                        ? "font-black text-slate-900 pointer-events-none"
                        : "underline-offset-4 hover:underline",
                    )}
                  >
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>
          )}

          {isHubHome ? <HubLanding /> : null}
          <div className={cn(!isHubHome && "pt-2")}>{renderComponent()}</div>
        </main>
      </div>
    </div>
  );
}
