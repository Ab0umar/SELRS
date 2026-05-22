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
  Wrench,
  FileSearch,
  Settings,
  Coins,
  Plug,
  TestTube2,
  Eye,
  Bell,
  Layers,
  Copy,
  Scan,
  PenSquare,
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
import TestsManagement from "./TestsManagement";
import AdminSheetCopies from "./AdminSheetCopies";
import AdminFormsHub from "./AdminFormsHub";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminDiagnostics from "./AdminDiagnostics";
import AdminDataSourceAudit from "./AdminDataSourceAudit";
import AdminNotificationSettings from "./AdminNotificationSettings";
import AdminPatients from "./AdminPatients";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

type HubModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrap: string;
};

const ALL_MODULES: HubModuleCard[] = [
  {
    href: "/admin-hub/permissions",
    title: "الصلاحيات",
    description: "تحديد صلاحيات الوصول للأدوار المختلفة.",
    icon: Shield,
    iconWrap: "bg-secondary/[0.07] text-secondary",
  },
  {
    href: "/admin-hub/doctors",
    title: "إدارة الأطباء",
    description: "تنظيم قائمة الأطباء والتخصصات.",
    icon: Stethoscope,
    iconWrap: "bg-success/10 text-success",
  },
  {
    href: "/admin-hub/users",
    title: "إدارة المستخدمين",
    description: "إضافة وتعديل بيانات الموظفين والمستخدمين.",
    icon: Users,
    iconWrap: "bg-primary/10 text-primary",
  },
  {
    href: "/admin-hub/status",
    title: "حالة النظام",
    description: "مراقبة اتصال الخادم وقاعدة البيانات والأداء.",
    icon: Terminal,
    iconWrap: "bg-primary/[0.07] text-primary",
  },
  {
    href: "/admin-hub/migrations",
    title: "ترحيل البيانات",
    description: "تطبيق ترحيلات Drizzle وأدوات الصيانة.",
    icon: Database,
    iconWrap: "bg-primary/10 text-primary",
  },
  {
    href: "/admin-hub/services",
    title: "الخدمات والأسعار",
    description: "إدارة قائمة الخدمات الطبية ومطابقة الأطباء.",
    icon: HeartPulse,
    iconWrap: "bg-secondary/[0.07] text-secondary",
  },
  { 
    href: "/admin-hub/data-source-audit", 
    title: "تدقيق مصدر البيانات",
    description: "مراجعة وتدقيق مصدر البيانات للسجلات.",
    icon: FileSearch,
    iconWrap: "bg-muted text-muted-foreground",
  },
  { 
    href: "/admin-hub/settings", 
    title: "الإعدادات العامة",
    description: "ضبط إعدادات النظام والتسعير.",
    icon: Settings,
    iconWrap: "bg-muted text-muted-foreground",
  },
  { 
    href: "/admin-hub/api-tools", 
    title: "أدوات API",
    description: "أدوات للمطورين لفحص tRPC.",
    icon: Plug,
    iconWrap: "bg-muted text-muted-foreground",
  },
  { 
    href: "/admin-hub/tests", 
    title: "التحاليل",
    description: "إدارة قائمة التحاليل والفحوصات المخبرية.",
    icon: TestTube2,
    iconWrap: "bg-muted text-muted-foreground",
  },
  { 
    href: "/admin-hub/card-visibility", 
    title: "ظهور الكروت",
    description: "التحكم في الكروت التي تظهر في الداشبورد.",
    icon: Eye,
    iconWrap: "bg-muted text-muted-foreground",
  },
  { 
    href: "/admin-hub/notifications", 
    title: "إخطارات التطبيق",
    description: "إدارة إعدادات الإخطارات داخل التطبيق.",
    icon: Bell,
    iconWrap: "bg-muted text-muted-foreground",
  },
  { 
    href: "/admin-hub/forms", 
    title: "مركز النماذج",
    description: "إدارة، تصميم، ونسخ النماذج والشيتات.",
    icon: Layers,
    iconWrap: "bg-muted text-muted-foreground",
  },
  {
    href: "/admin-hub/pentacam-failed",
    title: "بنتاكام الفاشل",
    description: "مراجعة وإصلاح سجلات البنتاكام غير المكتملة.",
    icon: Scan,
    iconWrap: "bg-muted text-muted-foreground",
  },
  {
    href: "/admin-hub/patients",
    title: "إدارة المرضى",
    description: "مراجعة بيانات المرضى والمزامنة مع النظام.",
    icon: UserCheck,
    iconWrap: "bg-primary text-primary-foreground",
  },
  {
    href: "/admin-hub/sheets",
    title: "الشيتات",
    description: "إدارة الشيتات الطبية المتاحة في النظام.",
    icon: Layers,
    iconWrap: "bg-primary/[0.07] text-primary",
  },
  {
    href: "/admin-hub/sheet-designer",
    title: "مصمم الشيتات",
    description: "تصميم وتخصيص قوالب الشيتات الطبية.",
    icon: PenSquare,
    iconWrap: "bg-primary/[0.07] text-primary",
  },
  {
    href: "/admin-hub/sheet-copies",
    title: "نسخ الشيتات",
    description: "إدارة ونسخ الشيتات المحفوظة للمرضى.",
    icon: Copy,
    iconWrap: "bg-primary/[0.07] text-primary",
  },
];


export default function AdminHubShell() {
  const [location] = useLocation();

  const isHubHome = location === "/admin-hub" || location === "/admin-hub/";

  const getBreadcrumbs = () => {
    if (isHubHome) return null;
    const parts = location.split("/").filter(Boolean);
    const crumbs = [{ label: "مركز الإدارة", href: "/admin-hub" }];
    
    if (parts.length > 1) {
      const moduleName = parts[1];
      const found = ALL_MODULES.find(m => m.href.includes(moduleName));
      if (found) {
        crumbs.push({ label: found.title, href: found.href });
      }
    }
    
    return crumbs;
  };

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
    if (location === "/admin-hub/patients" || location === "/admin/patients") return <AdminPatients />;

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
    <div className="space-y-6">
      <PageHeader
        title="مركز الإدارة"
        subtitle="التحكم الشامل في المستخدمين، الأطباء، والخدمات الفنية للمركز."
        icon={<LayoutGrid className="h-5 w-5 text-primary" />}
      />

      {/* Critical Actions Tier */}
      <Link href="/admin-hub/diagnostics">
        <Card className="group relative overflow-hidden border-success/30/60 bg-success/10/40 transition-all hover:border-success/40 hover:bg-success/10/60 active:scale-[0.99]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-right">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success transition-transform group-hover:scale-110">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-foreground">التشخيص والإصلاح</div>
                <p className="text-xs text-success/70">أدوات فحص وإصلاح البيانات المتقدمة للمشرفين التقنيين.</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-success/70 rotate-180 transition-transform group-hover:-translate-x-1" />
          </CardContent>
        </Card>
      </Link>

      {/* All Modules Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ALL_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card
                className={cn(
                  "group h-full border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]",
                )}
              >
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors group-hover:bg-primary/5",
                        mod.iconWrap,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 text-right">
                      <h3 className="font-bold text-sm tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
                        {mod.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
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

  const crumbs = getBreadcrumbs();

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4 sm:px-6 pb-10 text-right" dir="rtl">
      {crumbs && (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mb-2">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span className="opacity-40">/</span>}
              <Link 
                href={crumb.href} 
                className={cn(
                  "transition-colors hover:text-primary",
                  i === crumbs.length - 1 ? "font-bold text-foreground pointer-events-none" : "underline-offset-4 hover:underline"
                )}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>
      )}

      {isHubHome ? <HubLanding /> : null}
      <div className={cn(!isHubHome && "pt-2")}>
        {renderComponent()}
      </div>
    </div>
  );
}
