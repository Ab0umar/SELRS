import { Suspense, useEffect, useMemo, lazy } from "react";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { permissionPathForHubLink } from "@/lib/hubPermissionPaths";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, BookOpen, Layers } from "lucide-react";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";

// Embedded tools inside Services Hub
const EgyptianDrugReferencePage = lazy(() => import("./EgyptianDrugReferencePage"));
const MedicationsManagement = lazy(() => import("./MedicationsManagement"));
const AdminServices = lazy(() => import("../features/admin/AdminServices"));

type HubTabKey = "drug-reference" | "registry" | "services";

const TAB_ORDER: HubTabKey[] = ["drug-reference", "registry", "services"];

const TAB_META: Record<
  HubTabKey,
  { href: string; label: string; icon: typeof BookOpen }
> = {
  "drug-reference": {
    href: "/services-hub/drug-reference",
    label: "مرجع الأدوية",
    icon: BookOpen,
  },
  registry: {
    href: "/services-hub/registry",
    label: "السجل",
    icon: Layers,
  },
  services: {
    href: "/services-hub/services",
    label: "خدمات المركز",
    icon: Activity,
  },
};

export default function ServicesHubShell() {
  const [location, setLocation] = useLocation();
  const { canAccess } = usePermissions();

  const accessibleTabs = useMemo(
    () => TAB_ORDER.filter((tab) => canAccess(permissionPathForHubLink(TAB_META[tab].href))),
    [canAccess],
  );

  const loc = location.split("?")[0];

  const activeTab = useMemo<HubTabKey>(() => {
    const match = TAB_ORDER.find(
      (tab) => loc === TAB_META[tab].href || loc.startsWith(TAB_META[tab].href + "/"),
    );
    if (match && accessibleTabs.includes(match)) return match;
    return accessibleTabs[0] ?? "registry";
  }, [loc, accessibleTabs]);

  useEffect(() => {
    if (accessibleTabs.length === 0) return;
    const isHubHome = loc === "/services-hub" || loc === "/services-hub/";
    if (isHubHome) {
      setLocation(TAB_META[activeTab].href, { replace: true });
    }
  }, [loc, activeTab, accessibleTabs, setLocation]);

  const handleTabChange = (next: string) => {
    const tab = next as HubTabKey;
    setLocation(TAB_META[tab].href);
  };

  const renderTabContent = (tab: HubTabKey) => {
    switch (tab) {
      case "drug-reference":
        return <EgyptianDrugReferencePage embeddedInHub />;
      case "registry":
        return <MedicationsManagement embeddedInHub />;
      case "services":
        return <AdminServices embeddedInHub />;
      default:
        return null;
    }
  };

  if (accessibleTabs.length === 0) {
    return (
      <div className="w-full p-6 text-right text-sm text-rose-700" dir="rtl">
        لا تملك صلاحية فتح أي قسم من مركز الخدمات.
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-foreground" dir="rtl">
      <div className="w-full space-y-4 p-3 sm:p-5">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4"
          dir="rtl"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none]">
            <TabsList
              className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1"
              dir="rtl"
            >
              {accessibleTabs.map((tab) => {
                const meta = TAB_META[tab];
                const Icon = meta.icon;
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span>{meta.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {accessibleTabs.map((tab) => (
            <TabsContent
              key={tab}
              value={tab}
              className="m-0 focus-visible:outline-none"
            >
              <Suspense fallback={<AppShellSkeleton />}>
                {renderTabContent(tab)}
              </Suspense>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
