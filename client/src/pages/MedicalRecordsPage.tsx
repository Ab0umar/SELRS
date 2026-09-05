import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Eye,
  Glasses,
} from "lucide-react";

// Sub-components
import AutorefsDashboard from "./AutorefsDashboard";
import RefractionsDashboard from "./RefractionsDashboard";
import MedicalReports from "./MedicalReports";
import PentacamPage from "./PentacamPage";

export type MedicalRecordsTabKey =
  | "autoref"
  | "refraction"
  | "medical-reports"
  | "pentacam";

export type MedicalRecordsPageProps = {
  defaultTab?: MedicalRecordsTabKey;
  embeddedInHub?: boolean;
};

export default function MedicalRecordsPage({
  defaultTab = "autoref",
  embeddedInHub = false,
}: MedicalRecordsPageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<MedicalRecordsTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (
        tabParam &&
        ["autoref", "refraction", "medical-reports", "pentacam"].includes(
          tabParam,
        )
      ) {
        return tabParam as MedicalRecordsTabKey;
      }
    } catch {
      // ignore
    }

    if (location.includes("/pentacam")) return "pentacam";
    if (location.includes("/medical-reports")) return "medical-reports";
    if (location.includes("/refractions")) return "refraction";
    if (location.includes("/autorefs")) return "autoref";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<MedicalRecordsTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as MedicalRecordsTabKey;
    setActiveTab(nextTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="w-full bg-background text-foreground">
      <div className="w-full space-y-4 p-3 sm:p-5">
        {!embeddedInHub && (
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <PageHeader
              title="السجلات الطبية"
              description="لوحة Autoref، الانكسارات، التقارير الطبية، وفحوصات البنتاكام في شاشة موحدة"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => goBack()}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>رجوع</span>
                </Button>
              }
            />
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none]">
            <TabsList className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
              <TabsTrigger
                value="pentacam"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Eye className="h-4 w-4 shrink-0 text-primary" />
                <span>البنتاكام</span>
              </TabsTrigger>

              <TabsTrigger
                value="medical-reports"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                <span>التقارير الطبية</span>
              </TabsTrigger>

              <TabsTrigger
                value="refraction"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Glasses className="h-4 w-4 shrink-0 text-primary" />
                <span>لوحة الانكسارات</span>
              </TabsTrigger>

              <TabsTrigger
                value="autoref"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Activity className="h-4 w-4 shrink-0 text-primary" />
                <span>لوحة Autoref</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="autoref" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <AutorefsDashboard />
            </div>
          </TabsContent>

          <TabsContent value="refraction" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <RefractionsDashboard />
            </div>
          </TabsContent>

          <TabsContent value="medical-reports" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <MedicalReports />
            </div>
          </TabsContent>

          <TabsContent value="pentacam" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <PentacamPage embeddedInHub />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
