import { useLocation, Link } from "wouter";
import { useMemo, useState, Suspense } from "react";
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
  Zap,
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
import PentacamPage from "../../pages/PentacamPage";
import PatientsRecordsPage from "../../pages/PatientsRecordsPage";
import ExternalDoctors from "../../pages/ExternalDoctors";
import ExternalDoctorReferrals from "../../pages/ExternalDoctorReferrals";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import "./AdminHubShell.css";

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
  // 1. Staff & Permissions
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

  // 2. Services & Sheets
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
    href: "/pentacam",
    label: "البنتاكام",
    helper: "شيت وصور الأشعة وربط الملفات وتدقيق التكرار",
    icon: Hospital,
    tone: "bg-muted text-primary",
    category: "services",
  },

  // 3. Patients & Portal
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

  // 4. System & Dev
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

export default function AdminHubShell({
  basePath = "/admin-hub",
}: AdminHubShellProps) {
  const [location, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<HubCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { canAccess } = usePermissions();

  const hubLocation =
    basePath === "/admin-hub"
      ? location
      : location === basePath
        ? "/admin-hub"
        : location.startsWith(`${basePath}/`)
          ? `/admin-hub${location.slice(basePath.length)}`
          : location;

  const isHubHome =
    hubLocation === "/admin-hub" || hubLocation === "/admin-hub/";

  const opsHealthQuery = trpc.medical.getOpsHealth.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const opsHealth = opsHealthQuery.data;

  const accessibleModules = useMemo(
    () => ALL_MODULES.filter((item) => canAccess(item.href)),
    [canAccess],
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
    return ALL_MODULES.find((m) => m.href === hubLocation);
  }, [hubLocation]);

  const renderComponent = () => {
    const loc = hubLocation.replace(/\/$/, "");
    if (loc === "/admin-hub/users") return <AdminUsers />;
    if (loc === "/admin-hub/migrations") return <AdminMigrations />;
    if (loc === "/admin-hub/api") return <AdminApiTools />;
    if (loc === "/admin-hub/status") return <AdminStatus />;
    if (loc === "/admin-hub/settings/pricing-rules")
      return <AdminSettings pricingOnly />;
    if (loc === "/admin-hub/settings") return <AdminStatus />;
    if (loc === "/admin-hub/permissions") return <AdminPermissions />;
    if (
      loc === "/admin-hub/sheets" ||
      loc === "/admin-hub/forms" ||
      loc === "/admin-hub/sheet-copies"
    )
      return <AdminSheets />;
    if (loc === "/admin-hub/sheet-designer") return <AdminSheetDesigner />;
    if (loc === "/admin-hub/doctors") return <AdminDoctors />;
    if (loc === "/admin-hub/pentacam-failed")
      return <PentacamPage defaultTab="failed" embeddedInHub />;
    if (loc === "/admin-hub/patients") return <AdminPatients />;
    if (loc === "/admin-hub/legacy-patients")
      return <PatientsRecordsPage defaultTab="record" embeddedInHub />;
    if (loc === "/admin-hub/whatsapp-inbox") return <AdminWhatsAppInbox />;
    if (loc === "/admin-hub/op-history")
      return <PatientsRecordsPage defaultTab="op" embeddedInHub />;
    if (
      loc === "/admin-hub/pentacam-linking" ||
      loc.startsWith("/admin-hub/pentacam-linking/")
    )
      return <PentacamPage defaultTab="linking" embeddedInHub />;
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

  const cardClassName =
    "group flex min-h-[116px] w-full flex-col justify-between rounded-xl border border-border/60 bg-card p-3 text-right transition-colors hover:border-primary/40 hover:bg-muted/30 active:bg-muted sm:min-h-[138px] sm:rounded-2xl sm:p-4";

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground" dir="rtl">
      <main className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {isHubHome ? (
          <section className="space-y-6">
            {/* Header & Live System Status */}
            <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-1.5 text-[10px] font-black tracking-[0.16em] text-primary">
                  ADMINISTRATION HUB
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  مركز الإدارة والتحكم
                </h2>
                <p className="mt-1 text-xs font-bold text-muted-foreground sm:text-sm">
                  أدوات التحكم والإعدادات المتقدمة وصيانة المنظومة في مكان واحد
                </p>
              </div>

              {/* Status Capsules */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-bold text-foreground">
                  <span
                    className={cn(
                      "size-2.5 rounded-full shadow-xs",
                      opsHealth?.dbConnected ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                  <span>
                    قاعدة البيانات:{" "}
                    {opsHealth?.dbConnected ? "متصلة" : "منفصلة"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-bold text-foreground">
                  <Zap className="size-3.5 text-emerald-600" />
                  <span>
                    النفق الآمن:{" "}
                    {opsHealth?.tunnelConnected ? "نشط" : "غير نشط"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-bold text-foreground font-mono">
                  <span>
                    مرضى اليوم:{" "}
                    {(opsHealth?.patientsCount ?? 0).toLocaleString("ar-EG")}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Pills & Quick Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const active = activeCategory === cat.id;
                  const count =
                    cat.id === "all"
                      ? accessibleModules.length
                      : accessibleModules.filter((m) => m.category === cat.id)
                          .length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border whitespace-nowrap",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <CatIcon className="size-3.5" />
                      <span>{cat.label}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Search Input */}
              <div className="relative min-w-[240px]">
                <Search className="size-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث سريع في البطاقات والأدوات…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-card py-2 pl-3 pr-9 text-xs font-bold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Grid of Branded Cards matching main home */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
              {filteredModules.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className={cardClassName}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`flex size-9 items-center justify-center rounded-xl ${card.tone} sm:size-10`}
                      >
                        <Icon className="size-4.5 sm:size-5" strokeWidth={2} />
                      </span>
                      <ArrowUpLeft className="size-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:text-primary" />
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-black leading-snug text-foreground sm:text-sm">
                        {card.label}
                      </h3>
                      <p className="mt-1 text-[10px] font-bold leading-normal text-muted-foreground line-clamp-2">
                        {card.helper}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin-hub"
                  className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
                >
                  <ArrowUpLeft className="size-3.5 rotate-90" />
                  <span>العودة لمركز الإدارة</span>
                </Link>
                <div className="h-4 w-px bg-border" />
                <span className="text-xs font-bold text-muted-foreground">
                  {currentModule?.label || "صفحة الإدارة"}
                </span>
              </div>

              <select
                className="cursor-pointer rounded-xl border border-border/60 bg-card px-4 py-2 text-xs font-bold text-foreground outline-none transition hover:border-primary/40"
                value={hubLocation}
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

            <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
              <Suspense fallback={<AppShellSkeleton />}>
                {renderComponent()}
              </Suspense>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
