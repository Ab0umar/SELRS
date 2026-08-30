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
  Settings,
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
    tone: "text-[#2a4f9a] bg-[#eaf1ff]",
    category: "staff",
  },
  {
    href: "/admin-hub/doctors",
    label: "الأطباء",
    helper: "الكادر الطبي والتخصصات",
    icon: Stethoscope,
    tone: "text-[#157a67] bg-[#edf8f4]",
    category: "staff",
  },
  {
    href: "/admin-hub/permissions",
    label: "الصلاحيات",
    helper: "أدوار ومجموعات العمل",
    icon: Shield,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
    category: "staff",
  },
  {
    href: "/admin-hub/external-doctors",
    label: "الأطباء الخارجيين",
    helper: "أطباء الإحالة والتعاقدات",
    icon: UserCheck,
    tone: "text-[#16718a] bg-[#eaf8fb]",
    category: "staff",
  },
  {
    href: "/admin-hub/external-referrals",
    label: "إحالات الأطباء",
    helper: "الحالات المحولة والعمولات",
    icon: FileSearch,
    tone: "text-[#c2781c] bg-[#fff4e6]",
    category: "staff",
  },

  // 2. Services & Sheets
  {
    href: "/admin-hub/services",
    label: "ربط الخدمات",
    helper: "التكويد والمطابقة",
    icon: Link2,
    tone: "text-[#b6534d] bg-[#fff0ef]",
    category: "services",
  },
  {
    href: "/admin-hub/tests",
    label: "الفحوصات",
    helper: "الأسعار وإعدادات الباقات",
    icon: TestTube2,
    tone: "text-[#2a4f9a] bg-[#eaf1ff]",
    category: "services",
  },
  {
    href: "/admin-hub/sheets",
    label: "ملفات الفحص الإلكترونية",
    helper: "استمارات العيادات والقوالب",
    icon: Layers,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
    category: "services",
  },
  {
    href: "/admin-hub/sheet-designer",
    label: "مصمم النماذج",
    helper: "بناء وتعديل حقول الكشف",
    icon: Scan,
    tone: "text-[#6c4bb1] bg-[#f1edff]",
    category: "services",
  },
  {
    href: "/admin-hub/pentacam-linking",
    label: "ربط البنتاكام",
    helper: "استيراد صور وفحوصات الأشعة",
    icon: Hospital,
    tone: "text-[#c2781c] bg-[#fff4e6]",
    category: "services",
  },
  {
    href: "/admin-hub/pentacam-duplicates",
    label: "البنتاكام المكرر",
    helper: "تنظيف الملفات المكررة بأمان",
    icon: Copy,
    tone: "text-[#b6534d] bg-[#fff0ef]",
    category: "services",
  },
  {
    href: "/admin-hub/pentacam-failed",
    label: "فشل البنتاكام",
    helper: "معالجة أخطاء رفع الفحوصات",
    icon: Activity,
    tone: "text-[#b6534d] bg-[#fff0ef]",
    category: "services",
  },

  // 3. Patients & Portal
  {
    href: "/admin-hub/patients",
    label: "سجل المرضى الكلي",
    helper: "البحث في كافة المرضى",
    icon: Users,
    tone: "text-[#157a67] bg-[#edf8f4]",
    category: "portal",
  },
  {
    href: "/admin-hub/legacy-patients",
    label: "الأرشيف التاريخي",
    helper: "سجلات السنوات السابقة",
    icon: Users,
    tone: "text-[#2a4f9a] bg-[#eaf1ff]",
    category: "portal",
  },
  {
    href: "/admin-hub/portal-bookings",
    label: "حجوزات البوابة",
    helper: "طلبات الحجز الخارجي",
    icon: CalendarDays,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
    category: "portal",
  },
  {
    href: "/admin-hub/whatsapp-inbox",
    label: "رسائل واتساب",
    helper: "صندوق الوارد والتواصل",
    icon: Bell,
    tone: "text-[#16836a] bg-[#e9f8f1]",
    category: "portal",
  },

  // 4. System & Dev
  {
    href: "/admin-hub/status",
    label: "حالة السيرفر",
    helper: "مراقبة الأداء والاتصال",
    icon: Terminal,
    tone: "text-[#157a67] bg-[#edf8f4]",
    category: "system",
  },
  {
    href: "/admin-hub/migrations",
    label: "اسكيما وتحديثات",
    helper: "ترحيل جداول الداتابيز",
    icon: Database,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
    category: "system",
  },
  {
    href: "/admin-hub/op-history",
    label: "سجل العمليات",
    helper: "سجل التعديلات والإجراءات",
    icon: FileSearch,
    tone: "text-[#2a4f9a] bg-[#eaf1ff]",
    category: "system",
  },
  {
    href: "/admin-hub/settings",
    label: "إعدادات المركز",
    helper: "المتغيرات والخيارات العامة",
    icon: Settings,
    tone: "text-[#c2781c] bg-[#fff4e6]",
    category: "system",
  },
  {
    href: "/admin-hub/card-visibility",
    label: "بطاقات اللوحة",
    helper: "التحكم في ظهور الكروت",
    icon: Eye,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
    category: "system",
  },
  {
    href: "/admin-hub/audit",
    label: "تدقيق البيانات",
    helper: "سجل حركات وتعديل المبالغ",
    icon: FileSearch,
    tone: "text-[#b6534d] bg-[#fff0ef]",
    category: "system",
  },
  {
    href: "/admin-hub/notifications",
    label: "الإشعارات",
    helper: "قنوات التنبيه والإرسال",
    icon: Bell,
    tone: "text-[#c2781c] bg-[#fff4e6]",
    category: "system",
  },
  {
    href: "/admin-hub/api",
    label: "tRPC API",
    helper: "أدوات مطوري النظام",
    icon: Terminal,
    tone: "text-[#334c80] bg-[#edf2fb]",
    category: "system",
  },
  {
    href: "/admin-hub/diagnostics",
    label: "التشخيص والإصلاح",
    helper: "فحص الأعطال والشبكة",
    icon: Wrench,
    tone: "text-[#157a67] bg-[#edf8f4]",
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
      const matchCat = activeCategory === "all" || card.category === activeCategory;
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
    if (loc === "/admin-hub/settings") return <AdminSettings />;
    if (loc === "/admin-hub/permissions") return <AdminPermissions />;
    if (loc === "/admin-hub/sheets" || loc === "/admin-hub/forms" || loc === "/admin-hub/sheet-copies") return <AdminSheets />;
    if (loc === "/admin-hub/sheet-designer") return <AdminSheetDesigner />;
    if (loc === "/admin-hub/doctors") return <AdminDoctors />;
    if (loc === "/admin-hub/pentacam-failed") return <AdminPentacamFailed />;
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

  const cardClassName =
    "group flex min-h-[116px] w-full flex-col justify-between rounded-xl border border-[#dfe7f2] bg-white p-3 text-right shadow-[0_6px_20px_rgba(42,79,154,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#b5c6e2] hover:shadow-[0_14px_30px_rgba(42,79,154,0.12)] active:translate-y-0 sm:min-h-[138px] sm:rounded-2xl sm:p-4";

  return (
    <div className="min-h-screen bg-[#f7faff] text-[#10234f] pb-16" dir="rtl">
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {isHubHome ? (
          <section className="space-y-6">
            {/* Header & Live System Status */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[#dfe7f2]">
              <div>
                <div className="mb-1.5 text-[10px] font-black tracking-[0.16em] text-[#c2781c]">
                  ADMINISTRATION HUB
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#10265d] tracking-tight">
                  مركز الإدارة والتحكم
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
                  أدوات التحكم والإعدادات المتقدمة وصيانة المنظومة في مكان واحد
                </p>
              </div>

              {/* Status Capsules */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 shadow-2xs">
                  <span className={cn("size-2.5 rounded-full shadow-xs", opsHealth?.dbConnected ? "bg-emerald-500" : "bg-rose-500")} />
                  <span>قاعدة البيانات: {opsHealth?.dbConnected ? "متصلة" : "منفصلة"}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 shadow-2xs">
                  <Zap className="size-3.5 text-emerald-600" />
                  <span>النفق الآمن: {opsHealth?.tunnelConnected ? "نشط" : "غير نشط"}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 shadow-2xs font-mono">
                  <span>مرضى اليوم: {(opsHealth?.patientsCount ?? 0).toLocaleString("ar-EG")}</span>
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
                      : accessibleModules.filter((m) => m.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border whitespace-nowrap",
                        active
                          ? "bg-[#10265d] text-white border-[#10265d] shadow-sm"
                          : "bg-white text-slate-600 border-[#dfe7f2] hover:bg-slate-50 hover:border-slate-300",
                      )}
                    >
                      <CatIcon className="size-3.5" />
                      <span>{cat.label}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
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
                <Search className="size-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث سريع في البطاقات والأدوات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-[#dfe7f2] text-xs font-bold text-[#10265d] placeholder:text-slate-400 outline-none focus:border-[#2a4f9a] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>
            </div>

            {/* Grid of Branded Cards matching main home */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
              {filteredModules.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href} className={cardClassName}>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`flex size-9 items-center justify-center rounded-xl ${card.tone} sm:size-10`}
                      >
                        <Icon className="size-4.5 sm:size-5" strokeWidth={2} />
                      </span>
                      <ArrowUpLeft className="size-4 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:text-[#2a4f9a]" />
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-black leading-snug text-[#10265d] sm:text-sm">
                        {card.label}
                      </h3>
                      <p className="mt-1 text-[10px] font-bold leading-normal text-slate-400 line-clamp-2">
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
            {/* Branded Subpage Top Navigation Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-[#dfe7f2] pb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin-hub"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-[#10265d] hover:bg-slate-50 transition shadow-2xs"
                >
                  <ArrowUpLeft className="size-3.5 rotate-90" />
                  <span>العودة لمركز الإدارة</span>
                </Link>
                <div className="h-4 w-px bg-slate-300" />
                <span className="text-xs font-bold text-slate-500">
                  {currentModule?.label || "صفحة الإدارة"}
                </span>
              </div>

              {/* Quick Jump Selector */}
              <select
                className="px-4 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition"
                value={hubLocation}
                onChange={(e) => {
                  if (e.target.value) setLocation(e.target.value);
                }}
                aria-label="الانتقال السريع لصفحة أخرى"
              >
                <option value="">الانتقال السريع لصفحة أخرى...</option>
                {accessibleModules.map((item) => (
                  <option key={item.href} value={item.href}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subpage Content Container */}
            <div className="rounded-2xl border border-[#dfe7f2] bg-white p-4 sm:p-6 shadow-[0_6px_20px_rgba(42,79,154,0.05)]">
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
