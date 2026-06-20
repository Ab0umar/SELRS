import { useLocation, Link } from "wouter";
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
  Coins,
  DollarSign,
  Plug,
  TestTube2,
  Eye,
  Bell,
  Layers,
  Copy,
  Scan,
  PenSquare,
  UserCheck,
  CalendarDays,
  Globe,
  Link2,
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
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
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
    href: "/booking-triage/status",
    title: "حالة النظام",
    description: "مراقبة اتصال الخادم وقاعدة البيانات والأداء.",
    icon: Terminal,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "system",
  },
  {
    href: "/booking-triage/migrations",
    title: "ترحيل البيانات",
    description: "تطبيق ترحيلات Drizzle وأدوات الصيانة.",
    icon: Database,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/booking-triage/services",
    title: "الخدمات والأسعار",
    description: "إدارة قائمة الخدمات الطبية ومطابقة الأطباء.",
    icon: HeartPulse,
    iconWrap: "bg-secondary/[0.07] text-secondary",
    category: "services",
  },
  {
    href: "/booking-triage/data-source-audit",
    title: "تدقيق مصدر البيانات",
    description: "مراجعة وتدقيق مصدر البيانات للسجلات.",
    icon: FileSearch,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/booking-triage/settings",
    title: "الإعدادات العامة",
    description: "ضبط إعدادات النظام والتسعير.",
    icon: Settings,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/booking-triage/api-tools",
    title: "أدوات API",
    description: "أدوات للمطورين لفحص tRPC.",
    icon: Plug,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/booking-triage/tests",
    title: "التحاليل",
    description: "إدارة قائمة التحاليل والفحوصات المخبرية.",
    icon: TestTube2,
    iconWrap: "bg-muted text-muted-foreground",
    category: "services",
  },
  {
    href: "/booking-triage/card-visibility",
    title: "ظهور الكروت",
    description: "التحكم في الكروت التي تظهر في الداشبورد.",
    icon: Eye,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/booking-triage/notifications",
    title: "إخطارات التطبيق",
    description: "إدارة إعدادات الإخطارات داخل التطبيق.",
    icon: Bell,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/booking-triage/forms",
    title: "مركز النماذج",
    description: "إدارة، تصميم، ونسخ النماذج والشيتات.",
    icon: Layers,
    iconWrap: "bg-muted text-muted-foreground",
    category: "services",
  },
  {
    href: "/admin/pentacam",
    title: "ربط صور البنتاكام",
    description: "استيراد صور JPG وربطها بالمرضى أو إعادة التعيين.",
    icon: Scan,
    iconWrap: "bg-primary/10 text-primary",
    category: "portal",
  },
  {
    href: "/booking-triage/pentacam-failed",
    title: "بنتاكام الفاشل",
    description: "مراجعة وإصلاح سجلات البنتاكام غير المكتملة.",
    icon: Scan,
    iconWrap: "bg-muted text-muted-foreground",
    category: "portal",
  },
  {
    href: "/booking-triage/patients",
    title: "إدارة المرضى",
    description: "مراجعة بيانات المرضى والمزامنة مع النظام.",
    icon: UserCheck,
    iconWrap: "bg-primary text-primary-foreground",
    category: "portal",
  },
  {
    href: "/booking-triage/portal-bookings",
    title: "حجوزات البوابة",
    description: "إدارة حجوزات بوابة المرضى وجدول الأوقات المتاحة.",
    icon: CalendarDays,
    iconWrap: "bg-secondary/15 text-secondary",
    category: "portal",
  },
  {
    href: "/booking-triage/external-doctors",
    title: "الأطباء الخارجيون",
    description: "إدارة حسابات الأطباء الخارجيين وصلاحيات الوصول للصور.",
    icon: Globe,
    iconWrap: "bg-primary/10 text-primary",
    category: "staff",
  },
  {
    href: "/booking-triage/external-doctors/referrals",
    title: "إحالات الأطباء الخارجيين",
    description: "ربط المرضى بالأطباء الخارجيين لمنحهم وصولاً لصورهم.",
    icon: Link2,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "staff",
  },
  {
    href: "/doctor-portal/login",
    title: "بوابة الطبيب الخارجي",
    description: "صفحة دخول الأطباء الخارجيين لعرض صور مرضاهم.",
    icon: Globe,
    iconWrap: "bg-secondary/15 text-secondary",
    category: "portal",
  },
  {
    href: "/my/login",
    title: "بوابة المريض",
    description: "صفحة دخول المرضى لمتابعة ملفاتهم وحجوزاتهم.",
    icon: UserCheck,
    iconWrap: "bg-secondary/15 text-secondary",
    category: "portal",
  },
  {
    href: "/booking-triage/sheets",
    title: "الشيتات",
    description: "إدارة الشيتات الطبية المتاحة في النظام.",
    icon: Layers,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "services",
  },
  {
    href: "/booking-triage/sheet-designer",
    title: "مصمم الشيتات",
    description: "تصميم وتخصيص قوالب الشيتات الطبية.",
    icon: PenSquare,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "services",
  },
  {
    href: "/booking-triage/sheet-copies",
    title: "نسخ الشيتات",
    description: "إدارة ونسخ الشيتات المحفوظة للمرضى.",
    icon: Copy,
    iconWrap: "bg-primary/[0.07] text-primary",
    category: "services",
  },
];

// Navigation structure
const navigationSections = [
  {
    id: "staff",
    label: "الموظفون والصلاحيات",
    items: [
      { href: "/booking-triage/users", label: "إدارة المستخدمين", icon: Users, activeFor: ["/booking-triage/users", "/admin/users"] },
      { href: "/booking-triage/doctors", label: "إدارة الأطباء", icon: Stethoscope, activeFor: ["/booking-triage/doctors", "/admin/doctors"] },
      { href: "/booking-triage/permissions", label: "صلاحيات الأدوار", icon: Shield, activeFor: ["/booking-triage/permissions", "/admin/permissions"] },
      { href: "/booking-triage/external-doctors", label: "الأطباء الخارجيون", icon: Globe, activeFor: ["/booking-triage/external-doctors"] },
      { href: "/booking-triage/external-doctors/referrals", label: "إحالات الأطباء", icon: Link2, activeFor: ["/booking-triage/external-doctors/referrals"] },
    ]
  },
  {
    id: "services",
    label: "الخدمات والعيادات",
    items: [
      { href: "/booking-triage/services", label: "الخدمات والأسعار", icon: HeartPulse, activeFor: ["/booking-triage/services", "/admin/services"] },
      { href: "/booking-triage/tests", label: "التحاليل", icon: TestTube2, activeFor: ["/booking-triage/tests", "/admin/tests"] },
      { href: "/booking-triage/forms", label: "مركز النماذج", icon: Layers, activeFor: ["/booking-triage/forms", "/admin/forms"] },
      { href: "/booking-triage/sheets", label: "الشيتات الطبية", icon: Layers, activeFor: ["/booking-triage/sheets", "/admin/sheets"] },
      { href: "/booking-triage/sheet-designer", label: "مصمم الشيتات", icon: PenSquare, activeFor: ["/booking-triage/sheet-designer", "/admin/sheet-designer"] },
      { href: "/booking-triage/sheet-copies", label: "نسخ الشيتات", icon: Copy, activeFor: ["/booking-triage/sheet-copies", "/admin/sheet-copies"] },
    ]
  },
  {
    id: "portal",
    label: "بوابة المرضى والملفات",
    items: [
      { href: "/booking-triage/patients", label: "إدارة المرضى", icon: UserCheck, activeFor: ["/booking-triage/patients", "/admin/patients"] },
      { href: "/booking-triage/portal-bookings", label: "حجوزات البوابة", icon: CalendarDays, activeFor: ["/booking-triage/portal-bookings"] },
      { href: "/booking-triage/pentacam-failed", label: "بنتاكام الفاشل", icon: Scan, activeFor: ["/booking-triage/pentacam-failed", "/admin/pentacam-failed"] },
    ]
  },
  {
    id: "system",
    label: "إعدادات النظام والصيانة",
    items: [
      { href: "/booking-triage/status", label: "حالة النظام", icon: Terminal, activeFor: ["/booking-triage/status", "/admin/status"] },
      { href: "/booking-triage/migrations", label: "ترحيل البيانات", icon: Database, activeFor: ["/booking-triage/migrations", "/admin/migrations"] },
      { href: "/booking-triage/data-source-audit", label: "تدقيق مصدر البيانات", icon: FileSearch, activeFor: ["/booking-triage/data-source-audit", "/admin/data-source-audit"] },
      { href: "/booking-triage/settings", label: "إعدادات العامة", icon: Settings, activeFor: ["/booking-triage/settings", "/admin/settings"] },
      { href: "/booking-triage/api-tools", label: "أدوات API", icon: Plug, activeFor: ["/booking-triage/api-tools", "/admin/api-tools"] },
      { href: "/booking-triage/card-visibility", label: "ظهور الكروت", icon: Eye, activeFor: ["/booking-triage/card-visibility", "/admin/card-visibility"] },
      { href: "/booking-triage/notifications", label: "إخطارات التطبيق", icon: Bell, activeFor: ["/booking-triage/notifications", "/admin/notifications"] },
    ]
  }
];

const mobileNavItems = [
  { href: "/booking-triage", label: "الرئيسية", icon: LayoutGrid, activeFor: ["/booking-triage"] },
  { href: "/booking-triage/users", label: "المستخدمين", icon: Users, activeFor: ["/booking-triage/users", "/admin/users"] },
  { href: "/booking-triage/doctors", label: "الأطباء", icon: Stethoscope, activeFor: ["/booking-triage/doctors", "/admin/doctors"] },
  { href: "/booking-triage/patients", label: "المرضى", icon: UserCheck, activeFor: ["/booking-triage/patients", "/admin/patients"] },
  { href: "/booking-triage/status", label: "الحالة", icon: Terminal, activeFor: ["/booking-triage/status", "/admin/status"] },
  { href: "/booking-triage/settings", label: "الإعدادات", icon: Settings, activeFor: ["/booking-triage/settings", "/admin/settings"] },
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
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const opsHealth = opsHealthQuery.data;

  const isHubHome = location === "/booking-triage" || location === "/booking-triage/";

  const getBreadcrumbs = () => {
    if (isHubHome) return null;
    const parts = location.split("/").filter(Boolean);
    const crumbs = [{ label: "مركز الإدارة", href: "/booking-triage" }];

    if (parts.length > 1) {
      const moduleName = parts[1];
      const found = ALL_MODULES.find((m) => m.href.includes(moduleName));
      if (found) {
        crumbs.push({ label: found.title, href: found.href });
      }
    }

    return crumbs;
  };

  const renderComponent = () => {
    if (isHubHome) return null;
    if (location === "/booking-triage/users" || location === "/admin/users")
      return <AdminUsers />;
    if (
      location === "/booking-triage/migrations" ||
      location === "/admin/migrations"
    )
      return <AdminMigrations />;
    if (location === "/booking-triage/api-tools" || location === "/admin/api-tools")
      return <AdminApiTools />;
    if (location === "/booking-triage/status" || location === "/admin/status")
      return <AdminStatus />;
    if (
      location === "/booking-triage/card-visibility" ||
      location === "/admin/card-visibility"
    )
      return <AdminCardVisibility />;
    if (
      location === "/booking-triage/settings/pricing-rules" ||
      location === "/admin/settings/pricing-rules"
    ) {
      return <AdminSettings pricingOnly />;
    }
    if (location === "/booking-triage/settings" || location === "/admin/settings")
      return <AdminSettings />;
    if (
      location === "/booking-triage/permissions" ||
      location === "/admin/permissions"
    )
      return <AdminPermissions />;
    if (location === "/booking-triage/forms" || location === "/admin/forms")
      return <AdminFormsHub />;
    if (location === "/booking-triage/sheets" || location === "/admin/sheets")
      return <AdminSheets />;
    if (
      location === "/booking-triage/sheet-designer" ||
      location === "/admin/sheet-designer"
    )
      return <AdminSheetDesigner />;
    if (
      location === "/booking-triage/sheet-copies" ||
      location === "/admin/sheet-copies"
    )
      return <AdminSheetCopies />;
    if (location === "/booking-triage/doctors" || location === "/admin/doctors")
      return <AdminDoctors />;
    if (
      location === "/booking-triage/pentacam-failed" ||
      location === "/admin/pentacam-failed"
    )
      return <AdminPentacamFailed />;
    if (location === "/booking-triage/services" || location === "/admin/services")
      return <AdminServices />;
    if (location === "/booking-triage/tests" || location === "/admin/tests")
      return <TestsManagement />;
    if (location === "/booking-triage/diagnostics") return <AdminDiagnostics />;
    if (
      location === "/booking-triage/data-source-audit" ||
      location === "/admin/data-source-audit"
    )
      return <AdminDataSourceAudit />;
    if (
      location === "/booking-triage/notifications" ||
      location === "/admin/notifications"
    )
      return <AdminNotificationSettings />;
    if (location === "/booking-triage/patients" || location === "/admin/patients")
      return <AdminPatients />;
    if (location === "/booking-triage/portal-bookings")
      return <AdminPortalBookings />;
    if (location === "/booking-triage/external-doctors") return <ExternalDoctors />;
    if (location === "/booking-triage/external-doctors/referrals")
      return <ExternalDoctorReferrals />;

    return (
      <div className="rounded-xl border border-border/80 bg-card p-6 text-right text-sm text-muted-foreground">
        المسار غير معروف. ارجع إلى{" "}
        <Link
          href="/booking-triage"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          مركز الإدارة
        </Link>
        .
      </div>
    );
  };

  const CATEGORIES = [
    {
      id: "staff" as const,
      title: "الموظفون والصلاحيات",
      subtitle: "إدارة المستخدمين والأطباء والصلاحيات والرواتب",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      id: "services" as const,
      title: "الخدمات والعيادات الطبية",
      subtitle: "إدارة الخدمات والأسعار وقوالب الشيتات والفحوصات",
      icon: HeartPulse,
      color: "text-secondary",
      bg: "bg-secondary/5",
    },
    {
      id: "portal" as const,
      title: "بوابة المرضى والملفات",
      subtitle: "إدارة المرضى والحجوزات ومزامنة صور البنتاكام وبوابات تسجيل الدخول",
      icon: Scan,
      color: "text-secondary",
      bg: "bg-secondary/15",
    },
    {
      id: "system" as const,
      title: "إعدادات النظام والصيانة",
      subtitle: "مراقبة حالة الخادم، الميجريشن، إعدادات tRPC والإخطارات",
      icon: Settings,
      color: "text-muted-foreground",
      bg: "bg-muted/40",
    },
  ];

  const HubLanding = () => (
    <div className="space-y-8">
      <PageHeader
        title="مركز الإدارة"
        subtitle="التحكم الشامل في المستخدمين، الأطباء، والخدمات الفنية للمركز."
        icon={<LayoutGrid className="h-5 w-5 text-primary" />}
      />

      {/* Critical Actions Tier */}
      <Link href="/booking-triage/diagnostics">
        <Card className="group relative overflow-hidden border-success/30 bg-success/5 transition-all hover:border-success/40 hover:bg-success/10 active:scale-[0.99] cursor-pointer">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-right">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success transition-transform group-hover:scale-110">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-foreground">
                  التشخيص والإصلاح
                </div>
                <p className="text-xs text-muted-foreground">
                  أدوات فحص وإصلاح البيانات المتقدمة للمشرفين التقنيين.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-success/70 rotate-180 transition-transform group-hover:-translate-x-1" />
          </CardContent>
        </Card>
      </Link>

      {/* Grouped Modules */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const modules = ALL_MODULES.filter((m) => m.category === cat.id && canAccess(m.href));

          return (
            <div key={cat.id} className="space-y-3">
              <div className="flex items-center gap-3 border-b border-border/40 pb-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm", cat.bg, cat.color)}>
                  <CatIcon className="h-4 w-4" />
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold text-foreground">
                    {cat.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Link key={mod.href} href={mod.href}>
                      <Card
                        className={cn(
                          "group h-full border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98] cursor-pointer",
                        )}
                      >
                        <CardContent className="flex h-full flex-col gap-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:bg-primary/5",
                                mod.iconWrap,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1 text-right">
                              <h3 className="font-bold text-xs tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
                                {mod.title}
                              </h3>
                              <p className="text-[11px] leading-normal text-muted-foreground line-clamp-2">
                                {mod.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent backdrop-blur-sm">
        <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            {/* Title section */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    <Shield className="h-3.5 w-3.5 animate-pulse" />
                    مركز الإدارة والتحكم
                  </div>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  لوحة التحكم الإدارية
                </h1>
                <p className="max-w-xl text-xs text-muted-foreground">
                  إدارة المستخدمين، الأطباء، الصلاحيات، الخدمات، وحالة تشغيل النظام
                </p>
              </div>

              {/* Compact Metrics Pill Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 bg-muted/40 px-3.5 py-2 rounded-xl border border-border/40 w-fit self-start sm:self-center shadow-xs">
                <span className="flex items-center gap-1.5">
                  <Database className={cn("h-3.5 w-3.5 shrink-0", opsHealth?.dbConnected ? "text-success" : "text-destructive")} />
                  قاعدة البيانات: <strong className={cn("font-bold", opsHealth?.dbConnected ? "text-success" : "text-destructive")}>{opsHealthQuery.isLoading ? "—" : (opsHealth?.dbConnected ? "متصلة" : "غير متصلة")}</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <Plug className={cn("h-3.5 w-3.5 shrink-0", opsHealth?.tunnelConnected ? "text-success" : "text-destructive")} />
                  النفق الآمن: <strong className={cn("font-bold", opsHealth?.tunnelConnected ? "text-success" : "text-destructive")}>{opsHealthQuery.isLoading ? "—" : (opsHealth?.tunnelConnected ? "نشط" : "غير نشط")}</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                  عدد المرضى: <strong className="text-foreground">{opsHealthQuery.isLoading ? "—" : (opsHealth?.patientsCount ?? 0).toLocaleString("ar-EG")}</strong>
                </span>
              </div>
            </div>

            {/* Mobile Horizontal Pill Navigation Bar (Inline top navigation) */}
            <div className="lg:hidden mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap border-t border-border/40 pt-3">
              {mobileNavItems.filter((item) => canAccess(item.href)).map((item) => {
                const Icon = item.icon;
                const itemActive = isItemActive(location, item.activeFor);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                      itemActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row w-full">
        {/* Sidebar Navigation (Desktop only) */}
        <aside className="hidden lg:block w-full border-b border-border/60 bg-card/20 lg:w-64 lg:border-b-0 lg:border-r border-border/60 min-h-[calc(100vh-115px)]">
          <nav className="space-y-4 p-4 sticky top-4">
            {/* Main Hub Home Link */}
            <div className="space-y-1">
              <Link
                href="/booking-triage"
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 border",
                  isHubHome
                    ? "bg-primary/10 text-primary font-medium border-primary/10 shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border-transparent"
                )}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate font-semibold">لوحة التحكم الرئيسية</span>
              </Link>
            </div>

            {navigationSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccess(item.href));
              if (!visibleItems.length) return null;
              return (
              <div key={section.id} className="space-y-1">
                {/* Section header */}
                <div className="px-3 py-1">
                  <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                    {section.label}
                  </h3>
                </div>

                {/* Section items */}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const itemActive = isItemActive(location, item.activeFor);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          itemActive
                            ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/10"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${itemActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        <span className="flex-1 min-w-0 truncate">{item.label}</span>
                        <ChevronLeft
                          className={`h-3.5 w-3.5 shrink-0 transition-all opacity-0 ${
                            itemActive
                              ? "opacity-100 text-primary translate-x-0"
                              : "group-hover:opacity-100 group-hover:-translate-x-0.5"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );})}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 px-3 py-4 sm:px-4 min-w-0">
          {crumbs && (
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mb-4 print:hidden">
              {crumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && <span className="opacity-40">/</span>}
                  <Link
                    href={crumb.href}
                    className={cn(
                      "transition-colors hover:text-primary",
                      i === crumbs.length - 1
                        ? "font-bold text-foreground pointer-events-none"
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

