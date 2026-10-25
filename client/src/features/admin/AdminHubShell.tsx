import { useLocation, Link } from "wouter";
import { useMemo, useState, Suspense, lazy } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpLeft,
  ChevronRight,
  Database,
  HeartPulse,
  LayoutGrid,
  Shield,
  Stethoscope,
  Terminal,
  Users,
  Wrench,
  FileSearch,
  Link2,
  TestTube2,
  Copy,
  Layers,
  PenSquare,
  Scan,
  CalendarDays,
  Bell,
  Eye,
  UserCheck,
  Hospital,
  Search,
  X,
  Zap,
} from "lucide-react";
import AdminUsers from "./AdminUsers";
import AdminMigrations from "./AdminMigrations";
import AdminApiTools from "./AdminApiTools";
import AdminStatus from "./AdminStatus";
import AdminSettings from "./AdminSettings";
import PrintSettings from "./PrintSettings";
import AdminPermissions from "./AdminPermissions";
import AdminSheets from "./AdminSheets";
import AdminSheetDesigner from "./AdminSheetDesigner";
import AdminDoctors from "./AdminDoctors";
import AdminPentacamFailed from "./AdminPentacamFailed";
import AdminServices from "./AdminServices";
import TestsManagement from "../../pages/TestsManagement";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminDiagnostics from "./AdminDiagnostics";
import AdminDataSourceAudit from "./AdminDataSourceAudit";
import AdminNotificationSettings from "./AdminNotificationSettings";
import AdminPatients from "./AdminPatients";
import AdminPortalBookings from "./AdminPortalBookings";
import AdminLegacyPatients from "./AdminLegacyPatients";
import OpHistory from "./OpHistory";
import AdminWhatsAppInbox from "./AdminWhatsAppInbox";
import AutoReply from "./AutoReply";
const AiManagement = lazy(() => import("./AiManagement"));
import AdminPentacamLinking from "./AdminPentacamLinking";
import AdminPentacamDuplicates from "./AdminPentacamDuplicates";
import PentacamPage from "../../pages/PentacamPage";
import PatientsRecordsPage from "../../pages/PatientsRecordsPage";
import ExternalDoctors from "../../pages/ExternalDoctors";
import ExternalDoctorReferrals from "../../pages/ExternalDoctorReferrals";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import "./AdminHubShell.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type HubCategory = "all" | "staff" | "services" | "portal" | "system";

type HubModuleCard = {
  href: string;
  label: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
  category: "staff" | "services" | "portal" | "system";
};

const CATEGORIES: { id: HubCategory; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "جميع الأقسام", icon: LayoutGrid },
  { id: "staff", label: "الكادر والصلاحيات", icon: Users },
  { id: "services", label: "الفحوصات والملفات", icon: Layers },
  { id: "portal", label: "المرضى والبوابة", icon: HeartPulse },
  { id: "system", label: "النظام والصيانة", icon: Terminal },
];

const ALL_MODULES: HubModuleCard[] = [
  { href: "/admin-hub/ai", label: "الذكاء الاصطناعي والتواصل", helper: "المزوّدون وتجارب النص والصورة وسجل الاستهلاك", icon: Database, tone: "bg-muted text-primary", category: "system" },
  { href: "/admin-hub/auto-reply", label: "الرد الآلي", helper: "محادثات واتساب وماسنجر وتعليقات الصفحة", icon: Bell, tone: "bg-muted text-primary", category: "portal" },
  { href: "/admin-hub/print-settings", label: "إعدادات الطباعة", helper: "مقاسات الورق والهوامش والترويسات", icon: PenSquare, tone: "bg-muted text-primary", category: "services" },
  {
    href: "/admin-hub/users",
    label: "المستخدمين",
    helper: "الحسابات والموظفين",
    icon: Users,
    tone: "bg-muted text-primary",
    category: "staff",
  },
  {
    href: "/admin-hub/doctors",
    label: "الأطباء",
    helper: "الكادر الطبي والتخصصات",
    icon: Stethoscope,
    tone: "bg-muted text-primary",
    category: "staff",
  },
  {
    href: "/admin-hub/permissions",
    label: "الصلاحيات",
    helper: "أدوار ومجموعات العمل",
    icon: Shield,
    tone: "bg-muted text-primary",
    category: "staff",
  },
  {
    href: "/admin-hub/external-doctors",
    label: "الأطباء الخارجيين",
    helper: "أطباء الإحالة والتعاقدات",
    icon: UserCheck,
    tone: "bg-muted text-primary",
    category: "staff",
  },
  {
    href: "/admin-hub/external-referrals",
    label: "إحالات الأطباء",
    helper: "الحالات المحولة والعمولات",
    icon: FileSearch,
    tone: "bg-muted text-primary",
    category: "staff",
  },

  {
    href: "/admin-hub/services",
    label: "ربط الخدمات",
    helper: "التكويد والمطابقة",
    icon: Link2,
    tone: "bg-muted text-primary",
    category: "services",
  },
  {
    href: "/admin-hub/tests",
    label: "الفحوصات",
    helper: "الأسعار وإعدادات الباقات",
    icon: TestTube2,
    tone: "bg-muted text-primary",
    category: "services",
  },
  {
    href: "/admin-hub/sheets",
    label: "ملفات الفحص الإلكترونية",
    helper: "استمارات العيادات والقوالب",
    icon: Layers,
    tone: "bg-muted text-primary",
    category: "services",
  },
  {
    href: "/admin-hub/sheet-designer",
    label: "مصمم النماذج",
    helper: "بناء وتعديل حقول الكشف",
    icon: Scan,
    tone: "bg-muted text-primary",
    category: "services",
  },
  {
    href: "/admin-hub/pentacam-linking",
    label: "البنتاكام",
    helper: "شيت وصور الأشعة وربط الملفات وتدقيق التكرار",
    icon: Hospital,
    tone: "bg-muted text-primary",
    category: "services",
  },

  {
    href: "/admin-hub/patients",
    label: "سجل المرضى الكلي",
    helper: "البحث في كافة المرضى",
    icon: Users,
    tone: "bg-muted text-primary",
    category: "portal",
  },
  {
    href: "/admin-hub/legacy-patients",
    label: "الأرشيف التاريخي",
    helper: "سجلات السنوات السابقة",
    icon: Users,
    tone: "bg-muted text-primary",
    category: "portal",
  },
  {
    href: "/admin-hub/portal-bookings",
    label: "حجوزات البوابة",
    helper: "طلبات الحجز الخارجي",
    icon: CalendarDays,
    tone: "bg-muted text-primary",
    category: "portal",
  },
  {
    href: "/admin-hub/whatsapp-inbox",
    label: "رسائل واتساب",
    helper: "صندوق الوارد والتواصل",
    icon: Bell,
    tone: "bg-muted text-primary",
    category: "portal",
  },

  {
    href: "/admin-hub/status",
    label: "حالة السيرفر",
    helper: "مراقبة الأداء والاتصال",
    icon: Terminal,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/migrations",
    label: "اسكيما وتحديثات",
    helper: "ترحيل جداول الداتابيز",
    icon: Database,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/op-history",
    label: "سجل العمليات",
    helper: "سجل التعديلات والإجراءات",
    icon: FileSearch,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/settings/pricing-rules",
    label: "قواعد تسعير المواعيد",
    helper: "أسعار الكشوفات وحسابات الأطباء",
    icon: CalendarDays,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/card-visibility",
    label: "بطاقات اللوحة",
    helper: "التحكم في ظهور الكروت",
    icon: Eye,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/audit",
    label: "تدقيق البيانات",
    helper: "سجل حركات وتعديل المبالغ",
    icon: FileSearch,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/notifications",
    label: "الإشعارات",
    helper: "قنوات التنبيه والإرسال",
    icon: Bell,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/api",
    label: "tRPC API",
    helper: "أدوات مطوري النظام",
    icon: Terminal,
    tone: "bg-muted text-primary",
    category: "system",
  },
  {
    href: "/admin-hub/diagnostics",
    label: "التشخيص والإصلاح",
    helper: "فحص الأعطال والشبكة",
    icon: Wrench,
    tone: "bg-muted text-primary",
    category: "system",
  },
];

type AdminHubShellProps = {
  basePath?: string;
};

const HUB_ROUTE_ALIASES: Record<string, string> = {
  "/admin-hub/forms": "/admin-hub/sheets",
  "/admin-hub/sheet-copies": "/admin-hub/sheets",
  "/admin-hub/pentacam": "/admin-hub/pentacam-linking",
};

const normalizeHubRoute = (path: string) => {
  const cleanPath = path.replace(/\/+$/, "") || "/admin-hub";
  const alias = Object.entries(HUB_ROUTE_ALIASES).find(
    ([source]) => cleanPath === source || cleanPath.startsWith(`${source}/`),
  );
  if (!alias) return cleanPath;
  return `${alias[1]}${cleanPath.slice(alias[0].length)}`;
};

const getRoutePermissionPath = (path: string) => normalizeHubRoute(path);

export default function AdminHubShell({
  basePath = "/admin-hub",
}: AdminHubShellProps) {
  const [location, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<HubCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    canAccess,
    isLoaded: permissionsLoaded,
    isLoading: permissionsLoading,
    isError: permissionsError,
    refetch: refetchPermissions,
  } = usePermissions();

  const hubLocation =
    basePath === "/admin-hub"
      ? location
      : location === basePath
        ? "/admin-hub"
        : location.startsWith(`${basePath}/`)
          ? `/admin-hub${location.slice(basePath.length)}`
          : location;

  const normalizedHubLocation = normalizeHubRoute(hubLocation);
  const isHubHome = normalizedHubLocation === "/admin-hub";

  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    enabled: isHubHome,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const opsHealth = opsHealthQuery.data;

  const accessibleModules = useMemo(
    () =>
      permissionsLoaded
        ? ALL_MODULES.filter((item) => canAccess(item.href))
        : [],
    [canAccess, permissionsLoaded],
  );

  const filteredModules = useMemo(() => {
    return accessibleModules.filter((card) => {
      const matchCat =
        activeCategory === "all" || card.category === activeCategory;
      const matchQuery =
        !searchQuery.trim() ||
        card.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        card.helper.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchQuery;
    });
  }, [accessibleModules, activeCategory, searchQuery]);

  const currentModule = useMemo(() => {
    return ALL_MODULES.find(
      (m) =>
        normalizedHubLocation === m.href ||
        normalizedHubLocation.startsWith(`${m.href}/`),
    );
  }, [normalizedHubLocation]);

  const moduleGroups = activeCategory === "all"
    ? [{ id: "all", label: "جميع الأقسام", modules: filteredModules }]
    : CATEGORIES.filter(category => category.id !== "all")
    .map(category => ({
      ...category,
      modules: filteredModules.filter(module => module.category === category.id),
    }))
    .filter(category => category.modules.length > 0);

  const renderComponent = () => {
    const loc = normalizedHubLocation;
    if (loc === "/admin-hub/users") return <AdminUsers />;
    if (loc === "/admin-hub/migrations") return <AdminMigrations />;
    if (loc === "/admin-hub/api") return <AdminApiTools />;
    if (loc === "/admin-hub/status") return <AdminStatus />;
    if (loc === "/admin-hub/settings/pricing-rules")
      return <AdminSettings pricingOnly />;
    if (loc === "/admin-hub/settings") return <AdminSettings />;
    if (loc === "/admin-hub/print-settings") return <PrintSettings />;
    if (loc === "/admin-hub/permissions") return <AdminPermissions />;
    if (loc === "/admin-hub/sheets") return <AdminSheets />;
    if (loc === "/admin-hub/sheet-designer") return <AdminSheetDesigner />;
    if (loc === "/admin-hub/doctors") return <AdminDoctors />;
    if (
      loc === "/admin-hub/pentacam-linking" ||
      loc.startsWith("/admin-hub/pentacam-linking/")
    )
      return <PentacamPage defaultTab="linking" embeddedInHub />;
    if (loc === "/admin-hub/pentacam-failed")
      return <PentacamPage defaultTab="failed" embeddedInHub />;
    if (loc === "/admin-hub/patients") return <AdminPatients />;
    if (loc === "/admin-hub/legacy-patients")
      return <PatientsRecordsPage defaultTab="record" embeddedInHub />;
    if (loc === "/admin-hub/whatsapp-inbox") return <AdminWhatsAppInbox />;
    if (loc === "/admin-hub/auto-reply") return <AutoReply />;
    if (loc === "/admin-hub/ai") return <AiManagement />;
    if (loc === "/admin-hub/op-history")
      return <PatientsRecordsPage defaultTab="op" embeddedInHub />;
    if (loc === "/admin-hub/pentacam-duplicates")
      return <PentacamPage defaultTab="duplicates" embeddedInHub />;
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

  const renderedComponent = isHubHome ? null : renderComponent();
  const isKnownAdminRoute = renderedComponent !== null;
  const currentRouteAllowed =
    isHubHome ||
    !isKnownAdminRoute ||
    (permissionsLoaded &&
      !permissionsError &&
      canAccess(getRoutePermissionPath(normalizedHubLocation)));

  const cardClassName =
    "admin-tool-link group";
  const hasHomeFilters =
    activeCategory !== "all" || Boolean(searchQuery.trim());

  return (
    <div
      data-admin-hub
      className="exact-admin-hub min-h-screen min-w-0 bg-background text-foreground"
      dir="rtl"
    >
      <main className="w-full px-2 py-3 sm:px-4 sm:py-4">
        {isHubHome ? (
          <section className="admin-directory">
            <div className="admin-directory-heading">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  مركز الإدارة
                </h1>
              </div>

              <div
                className="admin-health"
                aria-label="حالة النظام"
              >
                <div
                  className="admin-health-item"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      !opsHealth
                        ? "bg-muted-foreground"
                        : opsHealth.dbConnected
                          ? "bg-success"
                          : "bg-destructive",
                    )}
                  />
                  <span>
                    قاعدة البيانات:{" "}
                    {opsHealthQuery.isError
                      ? "تعذر التحقق"
                      : !opsHealth
                        ? "جارٍ التحقق"
                        : opsHealth.dbConnected
                          ? "متصلة"
                          : "منفصلة"}
                  </span>
                </div>
                <div
                  className="admin-health-item"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <Zap aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  <span>
                    النفق الآمن:{" "}
                    {opsHealthQuery.isError
                      ? "تعذر التحقق"
                      : !opsHealth
                        ? "جارٍ التحقق"
                        : opsHealth.tunnelConnected
                          ? "نشط"
                          : "غير نشط"}
                  </span>
                </div>
                <div
                  className="admin-health-item"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span>
                    مرضى اليوم:{" "}
                    {opsHealthQuery.isError
                      ? "تعذر تحميل العدد"
                      : (opsHealth?.patientsCount?.toLocaleString("ar-EG") ??
                        "جارٍ تحميل العدد")}
                  </span>
                </div>
                {opsHealthQuery.isError && (
                  <Button variant="bare"
                    type="button"
                    onClick={() => void opsHealthQuery.refetch()}
                    className="min-h-11 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    إعادة المحاولة
                  </Button>
                )}
              </div>
            </div>

            <div className="admin-directory-controls">
              <div
                className="admin-category-nav"
                role="group"
                aria-label="تصفية أقسام الإدارة"
              >
                {CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const active = activeCategory === cat.id;
                  const count =
                    cat.id === "all"
                      ? accessibleModules.length
                      : accessibleModules.filter((m) => m.category === cat.id)
                          .length;
                  return (
                    <Button variant="bare"
                      key={cat.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "min-h-11 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <CatIcon className="size-3.5" />
                      <span>{cat.label}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[13px] font-bold",
                          active
                            ? "bg-primary-foreground/10 text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>

              <div className="admin-directory-search relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input bare
                  type="search"
                  aria-label="بحث في أدوات الإدارة"
                  placeholder="بحث في أدوات الإدارة"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-input bg-card py-2 pe-12 ps-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {searchQuery && (
                  <Button variant="bare"
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => setSearchQuery("")}
                    className="absolute end-0 top-0 flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {permissionsLoading ? (
              <p
                role="status"
                aria-live="polite"
                className="py-6 text-sm text-muted-foreground"
              >
                جارٍ تحميل أدوات الإدارة…
              </p>
            ) : permissionsError ? (
              <div
                role="alert"
                className="space-y-3 py-6 text-sm text-destructive"
              >
                <p>تعذر تحميل صلاحيات أدوات الإدارة.</p>
                <Button variant="bare"
                  type="button"
                  onClick={() => void refetchPermissions()}
                  className="min-h-11 rounded-md border border-destructive/40 px-3 py-2 font-medium transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  إعادة تحميل الصلاحيات
                </Button>
              </div>
            ) : filteredModules.length === 0 ? (
              <div
                role="status"
                className="space-y-3 py-6 text-sm text-muted-foreground"
              >
                <p>
                  {hasHomeFilters
                    ? "لا توجد أدوات مطابقة للتصفية الحالية."
                    : "لا توجد أدوات متاحة لحسابك."}
                </p>
                {hasHomeFilters && (
                  <Button variant="bare"
                    type="button"
                    onClick={() => {
                      setActiveCategory("all");
                      setSearchQuery("");
                    }}
                    className="min-h-11 rounded-md border border-border px-3 py-2 font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    مسح التصفية
                  </Button>
                )}
              </div>
            ) : (
              <div className="admin-directory-results">
                {moduleGroups.map(category => (
                  <section key={category.id} className="admin-tool-group" aria-label={activeCategory === "all" ? "أدوات الإدارة" : undefined} aria-labelledby={activeCategory === "all" ? undefined : `admin-group-${category.id}`}>
                    {activeCategory !== "all" && <header className="admin-tool-group-heading">
                      <h2 id={`admin-group-${category.id}`}>{category.label}</h2>
                      <span>{category.modules.length}</span>
                    </header>}
                    <div className="admin-tool-list">
                    {category.modules.map(card => {
                      const Icon = card.icon;
                      return (
                    <Link
                      key={card.href}
                      href={card.href}
                      className={cardClassName}
                      data-category={card.category}
                      title={card.helper}
                    >
                      <div className="shrink-0">
                        <span className="admin-tool-icon">
                          <Icon
                            className="size-4.5 sm:size-5"
                            strokeWidth={2}
                          />
                        </span>
                      </div>
                      <div className="admin-tool-copy min-w-0">
                        <h3 className="text-sm font-semibold leading-normal text-foreground">
                          {card.label}
                        </h3>
                        <p className="mt-1 text-sm leading-normal text-muted-foreground">
                          {card.helper}
                        </p>
                      </div>
                      <ChevronRight aria-hidden="true" className="admin-tool-arrow" />
                    </Link>
                      );
                    })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="admin-detail space-y-5">
            <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/admin-hub"
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ArrowUpLeft className="size-3.5 rotate-90" />
                  <span>العودة لمركز الإدارة</span>
                </Link>
                <div className="h-4 w-px bg-border" />
                <span className="truncate text-xs font-bold text-muted-foreground">
                  {currentModule?.label || "صفحة الإدارة"}
                </span>
              </div>

              <select
                className="min-h-11 w-full min-w-0 cursor-pointer rounded-xl border border-border/60 bg-card px-4 py-2 text-xs font-bold text-foreground outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
                value={currentModule?.href ?? ""}
                onChange={(e) => {
                  if (e.target.value) setLocation(e.target.value);
                }}
                aria-label="الانتقال السريع لصفحة أخرى"
              >
                <option value="">الانتقال السريع لصفحة أخرى…</option>
                {accessibleModules.map((item) => (
                  <option key={item.href} value={item.href}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0 py-2">
              {permissionsLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="space-y-3 py-8 text-center text-sm text-muted-foreground"
                >
                  <p>جارٍ التحقق من صلاحيات القسم…</p>
                </div>
              ) : permissionsError ? (
                <div
                  role="alert"
                  className="space-y-3 py-8 text-center text-sm text-destructive"
                >
                  <p>تعذر التحقق من صلاحيات هذا القسم.</p>
                  <Button variant="bare"
                    type="button"
                    onClick={() => void refetchPermissions()}
                    className="min-h-11 rounded-md border border-destructive/40 px-3 py-2 font-medium transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : !currentRouteAllowed ? (
                <div role="alert" className="space-y-4 py-8 text-center">
                  <h1 className="text-2xl font-semibold text-foreground">
                    لا تملك صلاحية الوصول
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    اطلب من مسؤول النظام منحك صلاحية هذا القسم.
                  </p>
                  <Link
                    href="/admin-hub"
                    className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    العودة إلى مركز الإدارة
                  </Link>
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div role="status" aria-live="polite" className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        جارٍ تحميل القسم…
                      </p>
                      <AppShellSkeleton />
                    </div>
                  }
                >
                  {renderedComponent ?? (
                    <div className="space-y-4 py-8 text-center" role="alert">
                      <h1 className="text-2xl font-semibold text-foreground">
                        الصفحة غير موجودة
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        لا يوجد قسم إداري بهذا العنوان.
                      </p>
                      <Link
                        href="/admin-hub"
                        className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        العودة إلى مركز الإدارة
                      </Link>
                    </div>
                  )}
                </Suspense>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
