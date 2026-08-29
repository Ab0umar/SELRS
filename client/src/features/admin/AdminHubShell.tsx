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
import AdminLegacyPatients from "./AdminLegacyPatients";
import OpHistory from "./OpHistory";
import AdminWhatsAppInbox from "./AdminWhatsAppInbox";
import AdminPentacamLinking from "./AdminPentacamLinking";
import AdminPentacamDuplicates from "./AdminPentacamDuplicates";
import ExternalDoctors from "../../pages/ExternalDoctors";
import ExternalDoctorReferrals from "../../pages/ExternalDoctorReferrals";
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
    iconWrap: "bg-info/10 text-info",
    category: "staff",
  },
  {
    href: "/admin-hub/external-referrals",
    title: "إحالات الأطباء الخارجية",
    description: "متابعة الحالات المحولة ونسب الإحالة للأطباء.",
    icon: FileSearch,
    iconWrap: "bg-primary/10 text-primary",
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
    iconWrap: "bg-primary/10 text-primary",
    category: "services",
  },
  {
    href: "/admin-hub/forms",
    title: "مستندات ونماذج المرضى",
    description: "إعداد استمارات الموافقة الجراحية والتعليمات الطبية للمرضى.",
    icon: PenSquare,
    iconWrap: "bg-success/10 text-success",
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
    iconWrap: "bg-info/10 text-info",
    category: "portal",
  },
  {
    href: "/admin-hub/legacy-patients",
    title: "سجل المرضى التاريخي",
    description: "بحث ومراجعة ملفات السنوات السابقة للمرضى.",
    icon: Users,
    iconWrap: "bg-muted text-muted-foreground",
    category: "portal",
  },
  {
    href: "/admin-hub/whatsapp-inbox",
    title: "رسائل واتساب الواردة",
    description: "متابعة رسائل المرضى والرد عليها من داخل المركز.",
    icon: Bell,
    iconWrap: "bg-success/10 text-success",
    category: "portal",
  },
  {
    href: "/admin-hub/op-history",
    title: "سجل العمليات",
    description: "مراجعة العمليات وتكويد الخدمات والتعديلات اليدوية.",
    icon: FileSearch,
    iconWrap: "bg-primary/10 text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/pentacam-linking",
    title: "ربط ملفات البنتاكام",
    description: "استيراد وربط صور البنتاكام بملفات المرضى.",
    icon: Link2,
    iconWrap: "bg-secondary/10 text-secondary",
    category: "services",
  },
  {
    href: "/admin-hub/pentacam-duplicates",
    title: "تنظيف ملفات البنتاكام المكررة",
    description: "مراجعة وحذف سجلات الرفع المكررة بأمان.",
    icon: Copy,
    iconWrap: "bg-warning/10 text-warning",
    category: "services",
  },
  {
    href: "/admin-hub/pentacam-failed",
    title: "فشل رفع البنتاكام",
    description: "مراجعة الملفات التي فشل رفعها ومعالجة أسباب الخطأ.",
    icon: Activity,
    iconWrap: "bg-destructive/10 text-destructive",
    category: "services",
  },
  {
    href: "/admin-hub/portal-bookings",
    title: "حجوزات البوابة الخارجية",
    description: "التحقق وتأكيد حجوزات موقع الويب الخارجي والطلبات للعيادات.",
    icon: CalendarDays,
    iconWrap: "bg-primary/10 text-primary",
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
    iconWrap: "bg-destructive/10 text-destructive",
    category: "system",
  },
  {
    href: "/admin-hub/api",
    title: "أدوات API",
    description: "اختبار أدوات المطورين وواجهات النظام الداخلية.",
    icon: Terminal,
    iconWrap: "bg-muted text-muted-foreground",
    category: "system",
  },
  {
    href: "/admin-hub/diagnostics",
    title: "تشخيصات النظام",
    description: "فحوصات سريعة لمشاكل الاتصال والتشغيل.",
    icon: Activity,
    iconWrap: "bg-info/10 text-info",
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
        href: "/salary",
        label: "المرتبات والعمولات",
        description: "الرواتب والجزاءات وتقارير الموظفين",
        activeFor: ["/salary"],
      },
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
      {
        href: "/admin-hub/pentacam-linking",
        label: "ربط ملفات البنتاكام",
        description: "استيراد وربط صور البنتاكام",
        activeFor: ["/admin-hub/pentacam-linking"],
      },
      {
        href: "/admin-hub/pentacam-duplicates",
        label: "تنظيف البنتاكام المكرر",
        description: "مراجعة سجلات الرفع المكررة",
        activeFor: ["/admin-hub/pentacam-duplicates"],
      },
      {
        href: "/admin-hub/pentacam-failed",
        label: "فشل رفع البنتاكام",
        description: "مراجعة الملفات التي فشل رفعها",
        activeFor: ["/admin-hub/pentacam-failed"],
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
        href: "/admin-hub/legacy-patients",
        label: "سجل المرضى التاريخي",
        description: "بحث للمراجعة فقط في قواعد بيانات السنوات السابقة",
        activeFor: ["/admin-hub/legacy-patients"],
      },
      {
        href: "/admin-hub/whatsapp-inbox",
        label: "رسائل واتساب الواردة",
        description: "متابعة الرسائل والردود",
        activeFor: ["/admin-hub/whatsapp-inbox"],
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
      {
        href: "/admin-hub/op-history",
        label: "سجل العمليات",
        description: "سجل التعديلات والعمليات الإدارية",
        activeFor: ["/admin-hub/op-history"],
      },
      {
        href: "/admin-hub/diagnostics",
        label: "تشخيصات النظام",
        description: "فحوصات الاتصال والتشغيل",
        activeFor: ["/admin-hub/diagnostics"],
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

type AdminHubShellProps = {
  basePath?: string;
};

export default function AdminHubShell({
  basePath = "/admin-hub",
}: AdminHubShellProps) {
  const [location, setLocation] = useLocation();
  const hubLocation =
    basePath === "/admin-hub"
      ? location
      : location === basePath
        ? "/admin-hub"
        : location.startsWith(`${basePath}/`)
          ? `/admin-hub${location.slice(basePath.length)}`
          : location;
  const { canAccess } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const opsHealth = opsHealthQuery.data;
  const isHubHome =
    hubLocation === "/admin-hub" || hubLocation === "/admin-hub/";

  const getBreadcrumbs = () => {
    if (isHubHome) return null;
    const parts = hubLocation.split("/").filter(Boolean);
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
    const loc = hubLocation.replace(/\/$/, "");
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
    if (loc === "/admin-hub/legacy-patients") return <AdminLegacyPatients />;
    if (loc === "/admin-hub/whatsapp-inbox") return <AdminWhatsAppInbox />;
    if (loc === "/admin-hub/op-history") return <OpHistory />;
    if (
      loc === "/admin-hub/pentacam-linking" ||
      loc.startsWith("/admin-hub/pentacam-linking/")
    )
      return <AdminPentacamLinking />;
    if (loc === "/admin-hub/pentacam-duplicates")
      return <AdminPentacamDuplicates />;
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

  const allNavItems = sidebarSections.flatMap((section) => section.items);
  const activeNavItem = allNavItems.find((item) =>
    isItemActive(hubLocation, item.activeFor),
  );
  const pageTitle = isHubHome
    ? "مركز التحكم التشغيلي"
    : activeNavItem?.label || "صفحة الإدارة";
  const pageDescription = isHubHome
    ? "إدارة المركز من مساحة واحدة بدون تنقّل متكرر."
    : activeNavItem?.description || "إدارة وتشغيل بيانات المركز.";

  return (
    <div
      data-admin-hub
      className="admin-hub-redesign-v3 min-h-screen bg-[#eef2f7] text-foreground"
      dir="rtl"
    >
      <div className="admin-hub-v3-app min-h-screen">
        <aside
          className={cn(
            "admin-hub-v3-rail fixed inset-y-0 right-0 z-40 flex flex-col",
            sidebarOpen ? "is-open" : "",
          )}
          aria-label="تنقل Admin Hub"
        >
          <div className="admin-hub-v3-brand">
            <Link href="/admin-hub" className="admin-hub-v3-brand-mark">
              <span>AD</span>
            </Link>
            <div className="admin-hub-v3-brand-copy">
              <span>Admin Hub</span>
              <small>عيون الشروق</small>
            </div>
            <button
              type="button"
              className="admin-hub-v3-rail-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="إغلاق القائمة"
            >
              ×
            </button>
          </div>

          <nav className="admin-hub-v3-rail-nav">
            <Link
              href="/admin-hub"
              className={cn("admin-hub-v3-rail-link", isHubHome && "is-active")}
              onClick={() => setSidebarOpen(false)}
              title="الرئيسية"
            >
              <LayoutGrid className="size-5" />
              <span>الرئيسية</span>
            </Link>
            {sidebarSections.map((section) => {
              const SectionIcon = section.icon;
              const firstItem = section.items[0];
              if (!firstItem) return null;
              const sectionActive = section.items.some((item) =>
                isItemActive(hubLocation, item.activeFor),
              );
              return (
                <Link
                  key={section.id}
                  href={firstItem.href}
                  className={cn(
                    "admin-hub-v3-rail-link",
                    sectionActive && "is-active",
                  )}
                  onClick={() => setSidebarOpen(false)}
                  title={section.label}
                >
                  <SectionIcon className="size-5" />
                  <span>{section.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="admin-hub-v3-rail-footer">
            <Link href="/dashboard" title="العودة للوحة الرئيسية">
              <ArrowRight className="size-5 rotate-180" />
            </Link>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="admin-hub-v3-backdrop fixed inset-0 z-30"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
          />
        ) : null}

        <section className="admin-hub-v3-workspace min-h-screen">
          <header className="admin-hub-v3-topbar sticky top-0 z-20">
            <div className="admin-hub-v3-topbar-inner">
              <button
                type="button"
                className="admin-hub-v3-menu-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="فتح قائمة Admin Hub"
              >
                <PanelRightOpen className="size-5" />
              </button>
              <div className="admin-hub-v3-location">
                <span className="admin-hub-v3-eyebrow">مساحة الإدارة</span>
                <strong>{pageTitle}</strong>
              </div>
              <div className="admin-hub-v3-topbar-tools">
                <select
                  className="admin-hub-v3-page-switcher"
                  value={isHubHome ? "/admin-hub" : activeNavItem?.href || ""}
                  onChange={(event) => {
                    if (event.target.value) setLocation(event.target.value);
                  }}
                  aria-label="الانتقال إلى صفحة إدارية"
                >
                  <option value="/admin-hub">الرئيسية</option>
                  {sidebarSections.map((section) => (
                    <optgroup key={section.id} label={section.label}>
                      {section.items.map((item) => (
                        <option key={item.href} value={item.href}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="admin-hub-v3-status-dot" title="النظام متصل" />
              </div>
            </div>
          </header>

          <main className="admin-hub-v3-main">
            {isHubHome ? (
              <div className="admin-hub-v3-home">
                <section className="admin-hub-v3-command-header">
                  <div>
                    <span className="admin-hub-v3-eyebrow">
                      Operations command center
                    </span>
                    <h1>إدارة المركز من مكان واحد</h1>
                    <p>
                      اختار القسم أو الصفحة المطلوبة مباشرة، من غير طبقات كروت
                      أو تابات متداخلة.
                    </p>
                  </div>
                  <div className="admin-hub-v3-health-strip">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="admin-hub-v3-health-item"
                      >
                        <span>{metric.label}</span>
                        <strong className={metric.tone}>{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className="admin-hub-v3-directory"
                  aria-label="دليل صفحات الإدارة"
                >
                  <div className="admin-hub-v3-directory-heading">
                    <div>
                      <span className="admin-hub-v3-eyebrow">Directory</span>
                      <h2>دليل الإدارة</h2>
                    </div>
                    <span>{allNavItems.length} صفحة متاحة</span>
                  </div>
                  <div className="admin-hub-v3-section-list">
                    {sidebarSections.map((section) => {
                      const SectionIcon = section.icon;
                      return (
                        <section
                          key={section.id}
                          className="admin-hub-v3-section-block"
                        >
                          <div className="admin-hub-v3-section-heading">
                            <span className="admin-hub-v3-section-icon">
                              <SectionIcon className="size-5" />
                            </span>
                            <div>
                              <h3>{section.label}</h3>
                              <p>{section.description}</p>
                            </div>
                            <span className="admin-hub-v3-section-count">
                              {section.items.length}
                            </span>
                          </div>
                          <div className="admin-hub-v3-link-list">
                            {section.items.map((item) => (
                              <Link key={item.href} href={item.href}>
                                <span>{item.label}</span>
                                <small>{item.description}</small>
                                <ChevronRight className="size-4 rotate-180" />
                              </Link>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : (
              <div className="admin-hub-v3-inner-page">
                <div className="admin-hub-v3-page-context">
                  <div>
                    <span className="admin-hub-v3-eyebrow">
                      Admin Hub / {activeNavItem?.label || "Page"}
                    </span>
                    <h1>{pageTitle}</h1>
                    <p>{pageDescription}</p>
                  </div>
                  <div className="admin-hub-v3-context-actions">
                    <select
                      className="admin-hub-v3-page-switcher"
                      value={activeNavItem?.href || ""}
                      onChange={(event) => {
                        if (event.target.value) setLocation(event.target.value);
                      }}
                      aria-label="الانتقال إلى صفحة إدارية"
                    >
                      <option value="">تغيير الصفحة</option>
                      {sidebarSections.map((section) => (
                        <optgroup key={section.id} label={section.label}>
                          {section.items.map((item) => (
                            <option key={item.href} value={item.href}>
                              {item.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="admin-hub-page-surface admin-hub-v3-inner-surface">
                  <Suspense fallback={<AppShellSkeleton />}>
                    {renderComponent()}
                  </Suspense>
                </div>
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}
