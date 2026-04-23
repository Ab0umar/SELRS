import { useMemo } from "react";
import { Button } from "./ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { useAuth } from "@/hooks/useAuth";
import { Users, Workflow as WorkflowIcon, Settings, UserRound, Home, UserCog, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export const navGroups = [
  {
    title: "Patient Hub",
    trigger: "Patient Hub",
    links: [
      { href: "/patient-hub", label: "Patient Hub" },
      { href: "/patients", label: "قائمة المرضى" },
      { href: "/patient-file", label: "ملف المريض" },
      { href: "/patient-summary", label: "التقرير المجمع" },
      { href: "/medical-reports", label: "التقارير الطبية" },
    ],
  },
  {
    title: "Workflow",
    trigger: "Workflow",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/examination", label: "الفحوصات" },
      { href: "/quick-entry", label: "دخول سريع" },
      { href: "/new-cases", label: "حالات جديدة" },
      { href: "/followups", label: "المتابعات" },
      { href: "/visits", label: "الزيارات" },
      { href: "/today", label: "مرضى اليوم" },
      { href: "/operations", label: "العمليات" },
    ],
  },
  {
    title: "Admin",
    trigger: "Admin",
    links: [
      { href: "/admin-hub/users", label: "المستخدمون" },
      { href: "/admin-hub/permissions", label: "الصلاحيات" },
      { href: "/admin-hub/services", label: "الخدمات" },
      { href: "/admin-hub/tests", label: "التحاليل" },
      { href: "/admin-hub/card-visibility", label: "إعدادات الكروت" },
      { href: "/admin-hub/settings", label: "الإعدادات" },
      { href: "/admin-hub/settings", label: "إعدادات الإشعارات" },
      { href: "/admin-hub/settings/pricing-rules", label: "Pricing Rules" },
      { href: "/admin-hub/api-tools", label: "أدوات API" },
      { href: "/admin-hub/migrations", label: "الترحيلات" },
      { href: "/admin-hub/status", label: "الحالة" },
      { href: "/admin-hub/sheets", label: "الشيتات" },
      { href: "/admin-hub/sheet-designer", label: "مصمم الشيت" },
      { href: "/admin-hub/sheet-copies", label: "نسخ الشيت" },
      { href: "/admin-hub/doctors", label: "الأطباء" },
      { href: "/admin-hub/pentacam-failed", label: "Pentacam Failed" },
    ],
  },
  {
    title: "Doctor Hub",
    trigger: "Doctor Hub",
    links: [{ href: "/doctor/patient/0", label: "Doctor View" }],
  },
];

const getGroupIcon = (title: string) => {
  switch (title) {
    case "Patient Hub":
      return <Users className="h-4 w-4" />;
    case "Workflow":
      return <WorkflowIcon className="h-4 w-4" />;
    case "Admin":
      return <Settings className="h-4 w-4" />;
    case "Doctor Hub":
      return <UserRound className="h-4 w-4" />;
    default:
      return null;
  }
};

export function ShortcutsMenu({ isMobile, onLogout }: { isMobile?: boolean; onLogout?: () => void }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isVisible = useMemo(() => Boolean(user?.id), [user?.id]);
  const showAdminButton = user?.role === "admin";

  if (!isVisible) return null;

  if (isMobile) {
    return (
      <div className="flex flex-row gap-0 justify-between w-full items-center">
        {/* Left: Home + Account */}
        <div className="flex gap-0 items-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setLocation("/")}
            className="h-9 w-9 border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-none"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setLocation("/profile")}
            className="h-9 w-9 border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-none"
          >
            <UserCog className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Dropdowns (reversed) */}
        <div className="flex gap-0">
          {/* Patient Hub dropdown */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-none border border-slate-200 bg-primary px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1 h-9">
                  <span className="hidden sm:inline">Patient Hub</span>
                  <span className="sm:hidden">{getGroupIcon("Patient Hub")}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="rounded-md border border-slate-200 bg-white shadow-sm z-50 mt-2 max-h-[250px] overflow-y-auto">
                  <div className="space-y-1 text-right text-sm text-slate-900" style={{ minWidth: "150px" }}>
                    {navGroups[0].links.map((link) => (
                      <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Workflow dropdown */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-none border border-slate-200 bg-primary px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1 h-9">
                  <span className="hidden sm:inline">Workflow</span>
                  <span className="sm:hidden">{getGroupIcon("Workflow")}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="rounded-md border border-slate-200 bg-white shadow-sm z-50 mt-2 max-h-[250px] overflow-y-auto">
                  <div className="space-y-1 text-right text-sm text-slate-900" style={{ minWidth: "150px" }}>
                    {navGroups[1].links.map((link) => (
                      <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Admin dropdown */}
          {showAdminButton && (
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-none border border-slate-200 bg-primary px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1 h-9">
                    <span className="hidden sm:inline">Admin</span>
                    <span className="sm:hidden">{getGroupIcon("Admin")}</span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="rounded-md border border-slate-200 bg-white shadow-sm z-50 mt-2 max-h-[250px] overflow-y-auto">
                    <div className="space-y-1 text-right text-sm text-slate-900" style={{ minWidth: "150px" }}>
                      {navGroups[2].links.map((link) => (
                        <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}

          {/* Doctor Hub dropdown */}
          {["doctor", "admin"].includes(user?.role ?? "") && (
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-none border border-slate-200 bg-primary px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1 h-9">
                    <span className="hidden sm:inline">Doctor Hub</span>
                    <span className="sm:hidden">{getGroupIcon("Doctor Hub")}</span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="rounded-md border border-slate-200 bg-white shadow-sm z-50 mt-2 max-h-[250px] overflow-y-auto">
                    <div className="space-y-1 text-right text-sm text-slate-900" style={{ minWidth: "150px" }}>
                      {navGroups[3].links.map((link) => (
                        <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>

        {/* Right: Logout + Account */}
        <div className="flex gap-0 items-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onLogout?.()}
            className="h-9 w-9 border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-none"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-2 justify-center">
      {navGroups.map((group) => {
        // Filter dropdowns based on user role
        const showGroup =
          group.title === "Patient Hub" ||
          group.title === "Workflow" ||
          (group.title === "Doctor Hub" && ["doctor", "admin"].includes(user?.role ?? "")) ||
          (group.title === "Admin" && user?.role === "admin");

        if (!showGroup) return null;

        return (
          <NavigationMenu key={group.title}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-md border border-slate-200 bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-1">
                  {group.trigger}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="rounded-md border border-slate-200 bg-white shadow-sm z-50 mt-2">
                  <div className="space-y-1 text-right text-sm text-slate-900" style={{ minWidth: "150px" }}>
                    {group.links.map((link) => (
                      <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        );
      })}
    </div>
  );
}

export default function FloatingShortcuts() {
  // Disabled: Moved to header via ShortcutsMenu in ProtectedRoute
  return null;
}
