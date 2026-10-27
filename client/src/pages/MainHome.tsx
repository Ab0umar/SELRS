import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Boxes,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  UserRound,
  Banknote,
  CalendarCheck,
  ChevronDown,
  Eye,
  History,
  Hospital,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Stethoscope,
  UserCog,
  Users,
  Search,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import "./main-home.css";
import "@/styles/frontdesk-design.css";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import {
  CARD_USAGE_UPDATED_EVENT,
  getCardUsageMap,
  pickDynamicBentoCards,
  recordCardUsage,
} from "@/lib/card-usage";

type HomeCard = {
  label: string;
  helper?: string;
  href?: string;
  permissionPaths?: string[];
  moreGroup?: string;
  menu?: "employees";
  icon: LucideIcon;
};

const HOME_CARDS: HomeCard[] = [
  {
    label: "القيم الطبيعية للفحوصات",
    helper: "المدى الطبيعي ووحدات القياس",
    href: "/examinations/catalog",
    permissionPaths: ["/examinations/catalog"],
    icon: FlaskConical,
  },
  {
    label: "الاستقبال",
    helper: "الحجوزات والمرضى",
    href: "/today",
    permissionPaths: ["/today", "/bookings", "/today-patients"],
    icon: CalendarCheck,
  },
  {
    label: "مسار اليوم",
    helper: "خطوات الحالات خلال اليوم",
    href: "/workflow",
    permissionPaths: ["/workflow", "/workflow-hub"],
    icon: ListChecks,
  },
  {
    label: "مركز المريض",
    helper: "الملفات والزيارات",
    href: "/patient-hub",
    permissionPaths: ["/patient-hub"],
    icon: Users,
  },
  {
    label: "الحسابات",
    helper: "الإيرادات والتحصيل",
    href: "/accounting",
    permissionPaths: ["/accounting"],
    icon: Banknote,
  },
  {
    label: "الموظفين",
    helper: "الحضور والمرتبات",
    permissionPaths: ["/attendance", "/salary"],
    menu: "employees",
    icon: UserCog,
  },
  {
    label: "القرار الإكلينيكي",
    helper: "RSB وPTA وعمق الاستئصال",
    href: "/clinical-decision-support",
    permissionPaths: ["/clinical-decision-support", "/clinical-suite"],
    icon: Eye,
  },
  {
    label: "كفرالشيخ",
    helper: "وحدة الفرع",
    href: "/kf",
    permissionPaths: ["/kf"],
    icon: Hospital,
  },
  {
    label: "المخزن",
    helper: "المستلزمات والمخزون",
    href: "/stockroom",
    permissionPaths: ["/stockroom"],
    icon: Boxes,
  },
  {
    label: "الأرشيف",
    helper: "سجلات المرضى والعمليات",
    href: "/archive",
    permissionPaths: [
      "/archive",
      "/admin/legacy-patients",
      "/admin-hub/legacy-patients",
      "/admin/op-history",
      "/admin-hub/op-history",
      "/medical-reference",
      "/patients-hub",
    ],
    icon: History,
  },
  {
    label: "رسائل واتساب",
    helper: "صندوق الوارد",
    href: "/admin/whatsapp-inbox",
    permissionPaths: ["/admin/whatsapp-inbox"],
    icon: MessageCircle,
  },
  {
    label: "مركز الإدارة",
    helper: "الإعدادات والصلاحيات",
    href: "/admin-hub",
    permissionPaths: ["/admin-hub"],
    icon: Settings,
  },
  {
    label: "الذكاء الاصطناعي",
    helper: "الأدوات والتدريب والمزوّدون",
    href: "/ai",
    permissionPaths: ["/admin-hub/ai"],
    icon: LayoutDashboard,
  },
  {
    label: "الحساب",
    helper: "الملف الشخصي والإعدادات",
    href: "/account",
    permissionPaths: ["/account", "/profile"],
    icon: UserRound,
  },
];

type MoreMenuGroup = {
  label: string;
  items: {
    label: string;
    href: string;
    icon: LucideIcon;
    permissionPaths?: string[];
  }[];
};

const EMPLOYEE_ITEMS = [
  {
    label: "الحضور",
    href: "/attendance",
    icon: CalendarCheck,
    permissionPaths: ["/attendance"],
  },
  {
    label: "المرتبات",
    href: "/salary",
    icon: Banknote,
    permissionPaths: ["/salary"],
  },
];

const MORE_GROUPS: MoreMenuGroup[] = [
  {
    label: "السجل",
    items: [
      { label: "المرضى", href: "/admin/legacy-patients", icon: History },
      { label: "المتابعات", href: "/followups", icon: Activity },
      { label: "الزيارات", href: "/visits", icon: CalendarCheck },
      { label: "العمليات", href: "/admin/op-history", icon: Archive },
      {
        label: "الانكسار الآلي",
        href: "/sheets/autorefs/dashboard",
        icon: Activity,
      },
      {
        label: "الانكسارات",
        href: "/sheets/refractions/dashboard",
        icon: Stethoscope,
      },
      {
        label: "البنتاكام",
        href: "/sheets/pentacam/dashboard",
        icon: Hospital,
      },
      { label: "التقارير الطبية", href: "/medical-reports", icon: Archive },
    ],
  },
  {
    label: "التسويق",
    items: [{ label: "التسويق", href: "/marketing", icon: MessageCircle }],
  },
  {
    label: "البنتاكام",
    items: [
      {
        label: "لوحة البنتاكام",
        href: "/sheets/pentacam/dashboard",
        icon: Hospital,
      },
      { label: "شيتات البنتاكام", href: "/sheets/pentacam", icon: Activity },
      { label: "البنتاكام (إداري)", href: "/admin/pentacam", icon: Settings },
    ],
  },
  {
    label: "الشيتات",
    items: [
      { label: "شيت كشف", href: "/sheets/consultant", icon: Stethoscope },
      {
        label: "شيت مقاس نظاره / اشعه خارجي",
        href: "/sheets/specialist",
        icon: Users,
      },
      { label: "شيت تصحيح ابصار", href: "/sheets/lasik", icon: Activity },
      {
        label: "متابعة الاستشاري",
        href: "/sheets/followup/consultant",
        icon: History,
      },
      { label: "متابعة الليزك", href: "/sheets/followup/lasik", icon: History },
    ],
  },
  {
    label: "التقارير",
    items: [
      { label: "التقرير الشامل", href: "/clinical-report", icon: Archive },
      {
        label: "تقرير ما قبل وبعد العملية",
        href: "/pre-post-op-report",
        icon: Archive,
      },
      {
        label: "إجازة ما بعد العملية",
        href: "/post-op-offdays",
        icon: CalendarCheck,
      },
      {
        label: "تقرير حالة طبية",
        href: "/medical-condition-report",
        icon: Activity,
      },
      { label: "خطاب الإحالة", href: "/sheets/referral", icon: MessageCircle },
    ],
  },
];

const HOME_CARD_ORDER = [
  "الاستقبال",
  "مسار اليوم",
  "مركز المريض",
  "الحسابات",
  "الموظفين",
  "القرار الإكلينيكي",
  "كفرالشيخ",
  "المخزن",
  "الأرشيف",
  "السجل",
  "الشيتات",
  "التقارير",
  "مركز الخدمات",
  "القيم الطبيعية للفحوصات",
  "رسائل واتساب",
  "التسويق",
  "الذكاء الاصطناعي",
  "مركز الإدارة",
  "الحساب",
] as const;

const MORE_CATEGORY_CARDS: HomeCard[] = [
  {
    label: "السجل",
    helper: "السجلات الطبية",
    href: "/records/medical",
    permissionPaths: ["/records/medical"],
    icon: History,
  },
  {
    label: "الشيتات",
    helper: "شيتات الكشف والمتابعة",
    href: "/sheets",
    permissionPaths: [
      "/sheets",
      "/sheets/consultant",
      "/sheets/specialist",
      "/sheets/lasik",
      "/sheets/followup/consultant",
      "/sheets/followup/lasik",
    ],
    icon: ClipboardList,
  },
  {
    label: "التقارير",
    helper: "التقارير والخطابات",
    href: "/reports",
    permissionPaths: [
      "/reports",
      "/clinical-reports",
      "/clinical-report",
      "/pre-post-op-report",
      "/post-op-offdays",
      "/medical-condition-report",
      "/sheets/referral",
    ],
    icon: FileText,
  },
  {
    label: "مركز الخدمات",
    helper: "الأدوية والتحاليل والخدمات",
    href: "/services-hub",
    permissionPaths: [
      "/services-hub",
      "/medications",
      "/examinations/catalog",
      "/medications/registry?tab=diseases",
      "/medications/registry?tab=symptoms",
      "/txhub",
    ],
    icon: LayoutDashboard,
  },
  {
    label: "التسويق",
    helper: "التواصل والمتابعة",
    href: "/marketing",
    permissionPaths: ["/marketing"],
    moreGroup: "التسويق",
    icon: Megaphone,
  },
];

export default function MainHome() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const [usageMap, setUsageMap] = useState(() =>
    getCardUsageMap("home", user?.id),
  );
  useEffect(() => {
    const syncUsage = () => setUsageMap(getCardUsageMap("home", user?.id));
    syncUsage();
    window.addEventListener(CARD_USAGE_UPDATED_EVENT, syncUsage);
    window.addEventListener("storage", syncUsage);
    return () => {
      window.removeEventListener(CARD_USAGE_UPDATED_EVENT, syncUsage);
      window.removeEventListener("storage", syncUsage);
    };
  }, [user?.id]);
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });
  const allowedRoots = useMemo(
    () => permissionsToAllowedRoots((permissionsQuery.data ?? []) as string[]),
    [permissionsQuery.data],
  );
  const permissionsResolved = isAdmin || permissionsQuery.isSuccess;
  const canAccess = (paths: string[]) =>
    isAdmin ||
    (permissionsResolved &&
      paths.some((path) =>
        pathGrantedByRoots(normalizeNavPath(path), allowedRoots),
      ));
  const visibleMoreGroups = useMemo(
    () =>
      MORE_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          canAccess(item.permissionPaths ?? [item.href]),
        ),
      })).filter((group) => group.items.length > 0),
    [allowedRoots, isAdmin, permissionsResolved],
  );
  const visibleEmployeeItems = useMemo(
    () => EMPLOYEE_ITEMS.filter((item) => canAccess(item.permissionPaths)),
    [allowedRoots, isAdmin, permissionsResolved],
  );
  const visibleHomeCards = useMemo(() => {
    const cardsByLabel = new Map(
      [...HOME_CARDS, ...MORE_CATEGORY_CARDS].map(
        (card) => [card.label, card] as const,
      ),
    );
    const orderedCards = HOME_CARD_ORDER.map((label) =>
      cardsByLabel.get(label),
    ).filter(Boolean) as HomeCard[];

    return orderedCards.filter((card) => {
      if (card.menu === "employees") return visibleEmployeeItems.length > 0;
      if (card.moreGroup) {
        return visibleMoreGroups.some(
          (group) => group.label === card.moreGroup,
        );
      }
      return (
        permissionsResolved &&
        canAccess(card.permissionPaths ?? [card.href ?? "/home"])
      );
    });
  }, [
    allowedRoots,
    isAdmin,
    permissionsResolved,
    visibleEmployeeItems,
    visibleMoreGroups,
  ]);

  const cardClassName =
    "home-app group";
  const HERO_PRIORITY = [
    "مسار اليوم",
    "الاستقبال",
    "مركز المريض",
    "الحسابات",
    "الشيتات",
    "السجل",
    "كفرالشيخ",
    "التقارير",
  ];
  const FEATURED_PRIORITY = [
    "الاستقبال",
    "مركز المريض",
    "الحسابات",
    "الشيتات",
    "السجل",
    "كفرالشيخ",
    "التقارير",
    "المخزن",
    "الأرشيف",
    "مركز الخدمات",
    "القرار الإكلينيكي",
  ];
  const displayedCards = visibleHomeCards.filter(card =>
    `${card.label} ${card.helper ?? ""}`.includes(search.trim()),
  );
  const linkableCards = displayedCards.filter(card => Boolean(card.href));
  const { heroCard, featuredCards } = useMemo(
    () =>
      pickDynamicBentoCards(
        linkableCards,
        card => card.label,
        usageMap,
        [...HERO_PRIORITY, ...FEATURED_PRIORITY],
      ),
    [linkableCards, usageMap],
  );
  const restCards = displayedCards.filter(
    card => card !== heroCard && !featuredCards.includes(card),
  );

  const renderCard = (card: HomeCard) => {
    const itemClassName = cardClassName;
    const Icon = card.icon;
    const cardContent = (
      <>
        <span className="home-app-icon" data-tone={
          ["مسار اليوم", "الموظفين"].includes(card.label) ? "orange" :
          ["الاستقبال", "كفرالشيخ", "رسائل واتساب"].includes(card.label) ? "green" :
          ["المخزن", "الأرشيف", "مركز الإدارة", "الحساب"].includes(card.label) ? "neutral" : "blue"
        }>
          <Icon strokeWidth={1.8} aria-hidden />
        </span>
        <div className="home-app-name">
          <h3>
            {card.label}
          </h3>
        </div>
      </>
    );

    if (card.menu === "employees") {
      return (
        <DropdownMenu key={card.label}>
          <DropdownMenuTrigger asChild>
            <Button variant="bare" type="button" className={itemClassName} title={card.helper}>
              {cardContent}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 rounded-md p-1.5"
            style={{ direction: "rtl" }}
          >
            <DropdownMenuLabel className="px-3 py-2 text-sm font-black">
              الموظفين
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleEmployeeItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.href}
                  asChild
                  className="cursor-pointer gap-2 rounded-md px-3 py-2.5 text-sm font-semibold"
                >
                  <Link href={item.href}>
                    <ItemIcon className="size-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Link
        key={card.label}
        href={card.href ?? "/home"}
        className={itemClassName}
        title={card.helper}
        onClick={() => recordCardUsage("home", card.label, user?.id)}
      >
        {cardContent}
      </Link>
    );
  };

  return (
    <div className="main-home-library min-h-screen bg-background text-foreground" dir="rtl">
      <main data-module-content-start className="home-library-content">
        <section className="mt-0">
          <header className="home-library-heading">
            <div><h1>عيون الشروق</h1><p>أقسام المركز</p></div>
            <label className="home-library-search">
              <Search className="size-5 shrink-0" aria-hidden />
              <Input type="search" aria-label="البحث في أقسام المركز" placeholder="ابحث عن قسم…" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
          </header>

          {!isAdmin && permissionsQuery.isLoading ? (
            <div
              role="status"
              className="rounded-md border border-border/60 bg-card px-4 py-6 text-center text-sm text-muted-foreground"
            >
              جاري تحميل الصلاحيات والقائمة…
            </div>
          ) : !isAdmin && permissionsQuery.isError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-md border border-warning/50 bg-warning/10 px-4 py-6 text-center"
            >
              <p className="text-sm text-foreground">
                تعذر تحميل صلاحيات القائمة.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => void permissionsQuery.refetch()}
                disabled={permissionsQuery.isFetching}
              >
                <RefreshCw className="size-4" aria-hidden />
                {permissionsQuery.isFetching
                  ? "جارٍ إعادة المحاولة…"
                  : "إعادة المحاولة"}
              </Button>
            </div>
          ) : visibleHomeCards.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              لا توجد أقسام متاحة لحسابك. اطلب الصلاحيات من مدير النظام.
            </div>
          ) : (
            <div>
              <div className="home-library-grid" data-featured-count={featuredCards.length} aria-label="أقسام المركز">
                {heroCard && (
                  <Link
                    href={heroCard.href ?? "/home"}
                    className="home-bento-hero"
                    title={heroCard.helper}
                    onClick={() => recordCardUsage("home", heroCard.label, user?.id)}
                  >
                    <span>{heroCard.label === "مسار اليوم" ? "الزيارات والفحص" : (heroCard.helper ?? "القسم الأساسي")}</span>
                    <div>
                      <strong>
                        {heroCard.label === "مسار اليوم" ? (
                          <>مسار{" "}<br />اليوم</>
                        ) : (
                          heroCard.label
                        )}
                      </strong>
                      <ArrowLeft aria-hidden />
                    </div>
                  </Link>
                )}
                {featuredCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.label}
                      href={card.href ?? "/home"}
                      className="home-bento-block"
                      data-block={index}
                      title={card.helper}
                      onClick={() => recordCardUsage("home", card.label, user?.id)}
                    >
                      <strong>{card.label}</strong>
                      <Icon strokeWidth={1.8} aria-hidden />
                    </Link>
                  );
                })}
                {restCards.map(renderCard)}
              </div>
              {displayedCards.length === 0 && <div className="home-library-empty" role="status"><p>لا توجد أقسام مطابقة.</p><Button variant="outline" onClick={() => setSearch("")}>عرض كل الأقسام</Button></div>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
