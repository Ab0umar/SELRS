import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Filter,
  History,
  ScrollText,
} from "lucide-react";

// Sub-components
import AdminLegacyPatients from "@/features/admin/AdminLegacyPatients";
import OpHistory from "@/features/admin/OpHistory";
import MedicalReference from "./MedicalReference";

export type ArchiveTabKey = "patients" | "operations" | "reference";

export type ArchivePageProps = {
  defaultTab?: ArchiveTabKey;
  embeddedInHub?: boolean;
};

export default function ArchivePage({
  defaultTab = "patients",
  embeddedInHub = false,
}: ArchivePageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<ArchiveTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (tabParam && ["patients", "operations", "reference"].includes(tabParam)) {
        return tabParam as ArchiveTabKey;
      }
    } catch {
      // ignore
    }

    if (location.includes("/medical-reference")) return "reference";
    if (location.includes("/op-history")) return "operations";
    if (location.includes("/legacy-patients")) return "patients";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<ArchiveTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as ArchiveTabKey;
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
    const onPopState = () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const tabParam = sp.get("tab");
        if (
          tabParam &&
          ["patients", "operations", "reference"].includes(tabParam)
        ) {
          setActiveTab(tabParam as ArchiveTabKey);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="w-full bg-background text-foreground print:bg-white" dir="rtl">
      <div className="w-full space-y-4 p-3 sm:p-5 print:p-0 print:space-y-0">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4 print:space-y-0"
          dir="rtl"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] print:hidden">
            <TabsList className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1" dir="rtl">
              <TabsTrigger
                value="patients"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <History className="h-4 w-4 shrink-0 text-primary" />
                <span>سجل المرضى</span>
              </TabsTrigger>

              <TabsTrigger
                value="operations"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <ScrollText className="h-4 w-4 shrink-0 text-primary" />
                <span>سجل العمليات</span>
              </TabsTrigger>

              <TabsTrigger
                value="reference"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Filter className="h-4 w-4 shrink-0 text-primary" />
                <span>المرجع الطبي</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="patients"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:border-0 print:shadow-none print:p-0">
              <AdminLegacyPatients />
            </div>
          </TabsContent>

          <TabsContent
            value="operations"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:border-0 print:shadow-none print:p-0">
              <OpHistory />
            </div>
          </TabsContent>

          <TabsContent
            value="reference"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:border-0 print:shadow-none print:p-0">
              <MedicalReference />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
