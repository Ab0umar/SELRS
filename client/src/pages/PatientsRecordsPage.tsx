import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import "@/styles/clinical-workspace.css";
import {
  ArrowRight,
  CalendarCheck,
  History,
  Repeat,
  ScrollText,
} from "lucide-react";

import AdminLegacyPatients from "@/features/admin/AdminLegacyPatients";
import Followups from "./Followups";
import Visits from "./Visits";
import OpHistory from "@/features/admin/OpHistory";

export type PatientsRecordsTabKey = "record" | "followups" | "visits" | "op";

export type PatientsRecordsPageProps = {
  defaultTab?: PatientsRecordsTabKey;
  embeddedInHub?: boolean;
};

const TAB_LABELS: Record<PatientsRecordsTabKey, string> = {
  record: "سجل المرضى",
  followups: "المتابعات",
  visits: "الزيارات",
  op: "سجل العمليات",
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

  const activeTabLabel = TAB_LABELS[activeTab];

  return (
    <div
      className="clinical-workspace w-full bg-background text-foreground print:bg-white"
      dir="rtl"
    >
      <div className="w-full space-y-4 p-3 sm:p-5 print:space-y-0 print:p-0">
        {!embeddedInHub && (
          <div className="records-page-header rounded-2xl border border-border/80 bg-card p-4 shadow-sm print:hidden">
            <PageHeader
              title="سجلات المرضى"
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
          className="w-full space-y-4 print:space-y-0"
          dir="rtl"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] print:hidden">
            <TabsList
              aria-label="تبويبات سجلات المرضى"
              className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1"
            >
              <TabsTrigger
                value="record"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <History className="h-4 w-4 shrink-0 text-primary" />
                <span>المرضى</span>
              </TabsTrigger>
              <TabsTrigger
                value="op"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <ScrollText className="h-4 w-4 shrink-0 text-primary" />
                <span>العمليات</span>
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

            </TabsList>
          </div>

          <div className="hidden border-b border-border pb-3 text-sm font-semibold print:block">
            سجلات المرضى — {activeTabLabel}
          </div>

          <TabsContent
            value="record"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm sm:p-4 print:border-0 print:p-0 print:shadow-none">
              <AdminLegacyPatients />
            </div>
          </TabsContent>

          <TabsContent
            value="followups"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm sm:p-4 print:border-0 print:p-0 print:shadow-none">
              <Followups />
            </div>
          </TabsContent>

          <TabsContent
            value="visits"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm sm:p-4 print:border-0 print:p-0 print:shadow-none">
              <Visits />
            </div>
          </TabsContent>

          <TabsContent
            value="op"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm sm:p-4 print:border-0 print:p-0 print:shadow-none">
              <OpHistory />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
