import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarCheck,
  History,
  Repeat,
  ScrollText,
} from "lucide-react";

// Sub-components
import AdminLegacyPatients from "@/features/admin/AdminLegacyPatients";
import Followups from "./Followups";
import Visits from "./Visits";
import OpHistory from "@/features/admin/OpHistory";

export type PatientsRecordsTabKey =
  | "record"
  | "followups"
  | "visits"
  | "op";

export type PatientsRecordsPageProps = {
  defaultTab?: PatientsRecordsTabKey;
  embeddedInHub?: boolean;
};

export default function PatientsRecordsPage({
  defaultTab = "record",
  embeddedInHub = false,
}: PatientsRecordsPageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<PatientsRecordsTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (
        tabParam &&
        ["record", "followups", "visits", "op"].includes(tabParam)
      ) {
        return tabParam as PatientsRecordsTabKey;
      }
    } catch {
      // ignore
    }

    if (location.includes("/op-history")) return "op";
    if (location.includes("/visits")) return "visits";
    if (location.includes("/followups")) return "followups";
    if (location.includes("/legacy-patients")) return "record";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<PatientsRecordsTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as PatientsRecordsTabKey;
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
              title="سجلات المرضى"
              description="سجل المرضى، المتابعات الدورية، الزيارات، وسجل العمليات في صفحة موحدة"
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
                value="op"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <ScrollText className="h-4 w-4 shrink-0 text-primary" />
                <span>سجل العمليات</span>
              </TabsTrigger>

              <TabsTrigger
                value="visits"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                <span>الزيارات</span>
              </TabsTrigger>

              <TabsTrigger
                value="followups"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Repeat className="h-4 w-4 shrink-0 text-primary" />
                <span>المتابعات</span>
              </TabsTrigger>

              <TabsTrigger
                value="record"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <History className="h-4 w-4 shrink-0 text-primary" />
                <span>سجل المرضى</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="record" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <AdminLegacyPatients />
            </div>
          </TabsContent>

          <TabsContent value="followups" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <Followups />
            </div>
          </TabsContent>

          <TabsContent value="visits" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <Visits />
            </div>
          </TabsContent>

          <TabsContent value="op" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <OpHistory />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
