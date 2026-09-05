import { Link } from "wouter";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  ArrowUpLeft,
  Banknote,
  CalendarCheck,
  ChevronDown,
  History,
  Hospital,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Stethoscope,
  UserCog,
  Users,
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
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";

type HomeCard = {
  label: string;
  helper?: string;
  href?: string;
  permissionPaths?: string[];
  moreGroup?: string;
  menu?: "more" | "account" | "employees" | "section";
  icon: LucideIcon;
  tone: string;
};

const HOME_CARDS: HomeCard[] = [
  {
    label: "الاستقبال",
    helper: "الحجوزات والمرضى",
    href: "/today",
    permissionPaths: ["/today", "/bookings", "/today-patients"],
    icon: CalendarCheck,
    tone: "text-[#2a4f9a] bg-[#edf3ff]",
  },
  {
    label: "مسار اليوم",
    helper: "Workflow",
    href: "/workflow",
    permissionPaths: ["/workflow", "/workflow-hub"],
    icon: Activity,
    tone: "text-[#157a67] bg-[#edf8f4]",
  },
  {
    label: "مركز المريض",
    helper: "الملفات والزيارات",
    href: "/patient-hub",
    permissionPaths: ["/patient-hub"],
    icon: Users,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
  },
  {
    label: "الحسابات",
    helper: "الإيرادات والتحصيل",
    href: "/accounting",
    permissionPaths: ["/accounting"],
    icon: Banknote,
    tone: "text-[#b6534d] bg-[#fff0ef]",
  },
  {
    label: "الموظفين",
    helper: "الحضور والمرتبات",
    permissionPaths: ["/attendance", "/salary"],
    menu: "employees",
    icon: UserCog,
    tone: "text-[#3b7d4d] bg-[#edf7ee]",
  },
  {
    label: "كفرالشيخ",
    helper: "وحدة الفرع",
    href: "/kf",
    permissionPaths: ["/kf"],
    icon: Hospital,
    tone: "text-[#c2781c] bg-[#fff4e6]",
  },
  {
    label: "المخزن",
    helper: "المستلزمات والمخزون",
    href: "/stockroom",
    permissionPaths: ["/stockroom"],
    icon: Archive,
    tone: "text-[#16718a] bg-[#eaf8fb]",
  },
  {
    label: "أرشيف",
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
    tone: "text-[#6c4bb1] bg-[#f1edff]",
  },
  {
    label: "رسائل واتساب",
    helper: "صندوق الوارد",
    href: "/admin/whatsapp-inbox",
    permissionPaths: ["/admin/whatsapp-inbox"],
    icon: MessageCircle,
    tone: "text-[#16836a] bg-[#e9f8f1]",
  },
  {
    label: "مركز الإدارة",
    helper: "الإعدادات والصلاحيات",
    href: "/admin-hub",
    permissionPaths: ["/admin-hub"],
    icon: Settings,
    tone: "text-[#334c80] bg-[#edf2fb]",
  },
  {
    label: "المزيد",
    helper: "الخدمات والمراجع",
    menu: "more",
    icon: MoreHorizontal,
    tone: "text-[#68758c] bg-[#f1f4f8]",
  },
  {
    label: "الحساب",
    helper: "الملف الشخصي والإعدادات",
    href: "/account",
    permissionPaths: ["/account", "/profile"],
    icon: UserCog,
    tone: "text-[#8b5b18] bg-[#fff5df]",
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
  { label: "الحضور", href: "/attendance", icon: CalendarCheck, permissionPaths: ["/attendance"] },
  { label: "المرتبات", href: "/salary", icon: Banknote, permissionPaths: ["/salary"] },
];

const MORE_GROUPS: MoreMenuGroup[] = [
  {
    label: "السجل",
    items: [
      { label: "المرضى", href: "/admin/legacy-patients", icon: History },
      { label: "المتابعات", href: "/followups", icon: Activity },
      { label: "الزيارات", href: "/visits", icon: CalendarCheck },
      { label: "العمليات", href: "/admin/op-history", icon: Archive },
      { label: "AutoRef", href: "/sheets/autorefs/dashboard", icon: Activity },
      { label: "Refractions", href: "/sheets/refractions/dashboard", icon: Stethoscope },
      { label: "Pentacam", href: "/sheets/pentacam/dashboard", icon: Hospital },
      { label: "Medical Reports", href: "/medical-reports", icon: Archive },
    ],
  },
  {
    label: "التسويق",
    items: [{ label: "التسويق", href: "/marketing", icon: MessageCircle }],
  },
  {
    label: "البنتاكام",
    items: [
      { label: "لوحة البنتاكام", href: "/sheets/pentacam/dashboard", icon: Hospital },
      { label: "شيتات البنتاكام", href: "/sheets/pentacam", icon: Activity },
      { label: "البنتاكام (إداري)", href: "/admin/pentacam", icon: Settings },
    ],
  },
  {
    label: "الشيتات",
    items: [
      { label: "شيت كشف", href: "/sheets/consultant", icon: Stethoscope },
      { label: "شيت مقاس نظاره / اشعه خارجي", href: "/sheets/specialist", icon: Users },
      { label: "شيت تصحيح ابصار", href: "/sheets/lasik", icon: Activity },
      { label: "متابعة الاستشاري", href: "/sheets/followup/consultant", icon: History },
      { label: "متابعة الليزك", href: "/sheets/followup/lasik", icon: History },
    ],
  },
  {
    label: "التقارير",
    items: [
      { label: "التقرير الشامل", href: "/clinical-report", icon: Archive },
      { label: "تقرير ما قبل وبعد العملية", href: "/pre-post-op-report", icon: Archive },
      { label: "إجازة ما بعد العملية", href: "/post-op-offdays", icon: CalendarCheck },
      { label: "تقرير حالة طبية", href: "/medical-condition-report", icon: Activity },
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
  "كفرالشيخ",
  "المخزن",
  "أرشيف",
  "السجل",
  "البنتاكام",
  "الشيتات",
  "التقارير",
  "مركز الخدمات",
  "رسائل واتساب",
  "التسويق",
  "مركز الإدارة",
  "الحساب",
] as const;

const MORE_CATEGORY_CARDS: HomeCard[] = [
  {
    label: "السجل",
    helper: "سجلات المرضى والعمليات",
    href: "/records/patients",
    permissionPaths: [
      "/records/patients",
      "/patients-records",
      "/patients-hub",
      "/medicalfile",
      "/followups",
      "/visits",
      "/admin/legacy-patients",
      "/admin/op-history",
    ],
    icon: History,
    tone: "text-[#6c4bb1] bg-[#f1edff]",
  },
  {
    label: "البنتاكام",
    helper: "لوحات وشيتات البنتاكام",
    href: "/pentacam",
    permissionPaths: [
      "/pentacam",
      "/sheets/pentacam/dashboard",
      "/sheets/pentacam",
      "/admin/pentacam",
    ],
    icon: Hospital,
    tone: "text-[#c2781c] bg-[#fff4e6]",
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
    icon: Stethoscope,
    tone: "text-[#157a67] bg-[#edf8f4]",
  },
  {
    label: "التقارير",
    helper: "التقارير والخطابات الطبية",
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
    icon: Archive,
    tone: "text-[#4b5cc4] bg-[#eef0ff]",
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
    icon: Settings,
    tone: "text-[#334c80] bg-[#edf2fb]",
  },
  {
    label: "التسويق",
    helper: "التواصل والمتابعة",
    href: "/marketing",
    permissionPaths: ["/marketing"],
    moreGroup: "التسويق",
    icon: MessageCircle,
    tone: "text-[#16836a] bg-[#e9f8f1]",
  },
];

export default function MainHome() {
  const { user } = useAuth();
  const [openMoreGroup, setOpenMoreGroup] = useState<string | null>(null);
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
  const visibleHomeCards = useMemo(
    () => {
      const cardsByLabel = new Map([
        ...HOME_CARDS,
        ...MORE_CATEGORY_CARDS,
      ].map((card) => [card.label, card] as const));
      const orderedCards = HOME_CARD_ORDER.map((label) => cardsByLabel.get(label)).filter(
        Boolean,
      ) as HomeCard[];

      return orderedCards.filter((card) => {
        if (card.menu === "employees") return visibleEmployeeItems.length > 0;
        if (card.moreGroup) {
          return visibleMoreGroups.some((group) => group.label === card.moreGroup);
        }
        return permissionsResolved && canAccess(card.permissionPaths ?? [card.href ?? "/home"]);
      });
    },
    [
      allowedRoots,
      isAdmin,
      permissionsResolved,
      visibleEmployeeItems,
      visibleMoreGroups,
    ],
  );

  const cardClassName =
    "group flex min-h-[116px] w-full flex-col justify-between rounded-xl border border-[#dfe7f2] bg-white p-2.5 text-right shadow-[0_6px_20px_rgba(42,79,154,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#b5c6e2] hover:shadow-[0_14px_30px_rgba(42,79,154,0.12)] active:translate-y-0 sm:min-h-[138px] sm:rounded-2xl sm:p-4";

  const renderCard = (card: HomeCard) => {
    const Icon = card.icon;
    const cardContent = (
      <>
        <div className="flex items-start justify-between gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${card.tone} sm:size-10 sm:rounded-xl`}
          >
            <Icon className="size-4 sm:size-5" strokeWidth={2} />
          </span>
          <ArrowUpLeft className="size-3.5 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:text-[#2a4f9a] sm:size-4" />
        </div>
        <div>
          <h3 className="text-[11px] font-black leading-tight text-[#10265d] sm:text-sm">{card.label}</h3>
          <p className="mt-1 text-[9px] font-bold leading-tight text-slate-400 sm:text-[10px]">
            {card.helper}
          </p>
        </div>
      </>
    );

    if (card.menu === "more") {
      return (
        <DropdownMenu key={card.label}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cardClassName}>
              {cardContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-60 rounded-2xl p-1.5"
            style={{ direction: "rtl" }}
          >
            <DropdownMenuLabel className="px-3 py-2 text-sm font-black">
              المزيد
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1.5 p-1">
              {visibleMoreGroups.map((group) => {
                const isOpen = openMoreGroup === group.label;
                return (
                  <div key={group.label} className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                    <button
                      type="button"
                      onClick={() => setOpenMoreGroup(isOpen ? null : group.label)}
                      className="flex w-full items-center justify-between px-3 py-3 text-sm font-bold text-foreground transition hover:bg-muted/70"
                      aria-expanded={isOpen}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-border/60 bg-background/70 p-1">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <DropdownMenuItem
                              key={`${group.label}-${item.href}`}
                              asChild
                              className="cursor-pointer gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"
                            >
                              <Link href={item.href}>
                                <ItemIcon className="size-4 text-muted-foreground" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (card.menu === "section" && card.moreGroup) {
      const group = MORE_GROUPS.find((item) => item.label === card.moreGroup);
      const items = group?.items.filter((item) =>
        canAccess(item.permissionPaths ?? [item.href]),
      ) ?? [];
      return (
        <DropdownMenu key={card.label}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cardClassName}>
              {cardContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-72 rounded-2xl p-1.5"
            style={{ direction: "rtl" }}
          >
            <DropdownMenuLabel className="px-3 py-2 text-sm font-black">
              {card.label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <DropdownMenuItem
                  key={`${card.label}-${item.href}`}
                  asChild
                  className="cursor-pointer gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
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

    if (card.menu === "employees") {
      return (
        <DropdownMenu key={card.label}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cardClassName}>
              {cardContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 rounded-2xl p-1.5"
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
                  className="cursor-pointer gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
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
      <Link key={card.label} href={card.href ?? "/home"} className={cardClassName}>
        {cardContent}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7faff] text-[#10234f]" dir="rtl">
      <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-12">
        <section className="mt-0">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 text-[10px] font-black tracking-[0.16em] text-[#c2781c]">
                MAIN MENU
              </div>
              <h2 className="text-2xl font-black text-[#10265d]">
                اختار من القائمة الرئيسية
              </h2>
            </div>
            <p className="text-xs font-bold text-slate-400">
              اختصارات المنصة في مكان واحد
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
            {visibleHomeCards.map(renderCard)}
          </div>
        </section>

      </main>

    </div>
  );
}
