import { useLocation, Link } from "wouter";
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
import TestsManagement from "./TestsManagement";
import AdminSheetCopies from "./AdminSheetCopies";
import AdminFormsHub from "./AdminFormsHub";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminDiagnostics from "./AdminDiagnostics";
import AdminDataSourceAudit from "./AdminDataSourceAudit";
import AdminNotificationSettings from "./AdminNotificationSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { cn } from "@/lib/utils";

type HubModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrap: string;
};

const MAIN_MODULES: HubModuleCard[] = [
  {
    href: "/admin-hub/permissions",
    title: "الصلاحيات",
    description: "تحديد صلاحيات الوصول للأدوار المختلفة.",
    icon: Shield,
    iconWrap: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  },
  {
    href: "/admin-hub/doctors",
    title: "إدارة الأطباء",
    description: "تنظيم قائمة الأطباء والتخصصات.",
    icon: Stethoscope,
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    href: "/admin-hub/users",
    title: "إدارة المستخدمين",
    description: "إضافة وتعديل بيانات الموظفين والمستخدمين.",
    icon: Users,
    iconWrap: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
  {
    href: "/admin-hub/status",
    title: "حالة النظام",
    description: "مراقبة اتصال الخادم وقاعدة البيانات والأداء.",
    icon: Terminal,
    iconWrap: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
  {
    href: "/admin-hub/migrations",
    title: "ترحيل البيانات",
    description: "تطبيق ترحيلات Drizzle وأدوات صيانة المخطط.",
    icon: Database,
    iconWrap: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  },
  {
    href: "/admin-hub/services",
    title: "الخدمات والأسعار",
    description: "إدارة قائمة الخدمات الطبية ومطابقة الأطباء.",
    icon: HeartPulse,
    iconWrap: "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300",
  },
];

const MORE_LINKS: { href: string; label: string }[] = [
  { href: "/admin-hub/diagnostics", label: "🔧 التشخيص والإصلاح" },
  { href: "/admin-hub/data-source-audit", label: "مصدر البيانات — تدقيق" },
  { href: "/admin-hub/settings", label: "الإعدادات العامة" },
  { href: "/admin-hub/settings/pricing-rules", label: "تسعير المواعيد" },
  { href: "/admin-hub/api-tools", label: "أدوات API" },
  { href: "/admin-hub/tests", label: "التحاليل" },
  { href: "/admin-hub/card-visibility", label: "ظهور الكروت" },
  { href: "/admin-hub/notifications", label: "إخطارات التطبيق" },
  { href: "/admin-hub/forms", label: "النماذج (جميع التابات)" },
  { href: "/admin-hub/sheets", label: "شيتات المرضى" },
  { href: "/admin-hub/sheet-designer", label: "مصمم النماذج" },
  { href: "/admin-hub/sheet-copies", label: "نسخ النماذج" },
  { href: "/admin-hub/pentacam-failed", label: "بنتاكام الفاشل" },
];

export default function AdminHubShell() {
  const [location] = useLocation();

  const isHubHome = location === "/admin-hub" || location === "/admin-hub/";

  const renderComponent = () => {
    if (isHubHome) return null;
    if (location === "/admin-hub/users" || location === "/admin/users") return <AdminUsers />;
    if (location === "/admin-hub/migrations" || location === "/admin/migrations") return <AdminMigrations />;
    if (location === "/admin-hub/api-tools" || location === "/admin/api-tools") return <AdminApiTools />;
    if (location === "/admin-hub/status" || location === "/admin/status") return <AdminStatus />;
    if (location === "/admin-hub/card-visibility" || location === "/admin/card-visibility") return <AdminCardVisibility />;
    if (location === "/admin-hub/settings/pricing-rules" || location === "/admin/settings/pricing-rules") {
      return <AdminSettings pricingOnly />;
    }
    if (location === "/admin-hub/settings" || location === "/admin/settings") return <AdminSettings />;
    if (location === "/admin-hub/permissions" || location === "/admin/permissions") return <AdminPermissions />;
    if (location === "/admin-hub/forms" || location === "/admin/forms") return <AdminFormsHub />;
    if (location === "/admin-hub/sheets" || location === "/admin/sheets") return <AdminSheets />;
    if (location === "/admin-hub/sheet-designer" || location === "/admin/sheet-designer") return <AdminSheetDesigner />;
    if (location === "/admin-hub/sheet-copies" || location === "/admin/sheet-copies") return <AdminSheetCopies />;
    if (location === "/admin-hub/doctors" || location === "/admin/doctors") return <AdminDoctors />;
    if (location === "/admin-hub/pentacam-failed" || location === "/admin/pentacam-failed") return <AdminPentacamFailed />;
    if (location === "/admin-hub/services" || location === "/admin/services") return <AdminServices />;
    if (location === "/admin-hub/tests" || location === "/admin/tests") return <TestsManagement />;
    if (location === "/admin-hub/diagnostics") return <AdminDiagnostics />;
    if (location === "/admin-hub/data-source-audit" || location === "/admin/data-source-audit") return <AdminDataSourceAudit />;
    if (location === "/admin-hub/notifications" || location === "/admin/notifications") return <AdminNotificationSettings />;

    return (
      <div className="rounded-xl border border-border/80 bg-card p-6 text-right text-sm text-muted-foreground">
        المسار غير معروف. ارجع إلى{" "}
        <Link href="/admin-hub" className="font-semibold text-primary underline-offset-4 hover:underline">
          مركز الإدارة
        </Link>
        .
      </div>
    );
  };

  const HubLanding = () => (
    <>
      <PageHeader
        title="مركز الإدارة"
        subtitle="اختصارات للصفحات الإدارية الأكثر استخداماً؛ بقية الأدوات ضمن «المزيد»."
        icon={<LayoutGrid className="h-5 w-5" />}
      />

      <Card className="mb-6 border-emerald-200/90 bg-emerald-50/90 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 justify-end font-bold text-emerald-900 dark:text-emerald-100">
              <Activity className="h-4 w-4" />
              التشخيص والإصلاح
            </div>
            <p className="text-sm text-emerald-900/85 dark:text-emerald-200/90">
              أدوات فحص وإصلاح البيانات المتقدمة (للمشرفين).
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/admin-hub/diagnostics">فتح التشخيص</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MAIN_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.href}
              className={cn(
                "border-border/80 bg-card shadow-sm transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1 text-right">
                    <h3 className="font-black text-base tracking-tight">{mod.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{mod.description}</p>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      mod.iconWrap,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <Button asChild className="w-full selrs-gradient-btn text-white hover:opacity-95 gap-2">
                    <Link href={mod.href}>
                      <LayoutGrid className="h-4 w-4" />
                      فتح الموديول
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CollapsibleSection
        title="صفحات إدارية أخرى"
        defaultOpen={false}
        className="mt-8 border-border/80 bg-muted/20 shadow-sm"
      >
        <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-4 justify-end bg-card/80">
          {MORE_LINKS.map((item) => (
            <Button key={item.href} variant="outline" size="sm" asChild className="rounded-full">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </CollapsibleSection>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-0 pb-10 text-right" dir="rtl">
      {!isHubHome ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link href="/admin-hub">
              <ArrowRight className="h-4 w-4 rotate-180" />
              مركز الإدارة
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">التنقل الكامل متاح أيضاً من القائمة الجانبية.</span>
        </div>
      ) : null}

      {isHubHome ? <HubLanding /> : null}
      {renderComponent()}
    </div>
  );
}
