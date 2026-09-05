import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Repeat,
  Stethoscope,
  UserRound,
  Zap,
} from "lucide-react";

// Sub-components
import ConsultantSheet from "./ConsultantSheet";
import SpecialistSheet from "./SpecialistSheet";
import LasikExamSheet from "./LasikExamSheet";
import ConsultantFollowupPage from "./ConsultantFollowupPage";
import LasikFollowupPage from "./LasikFollowupPage";

export type SheetsTabKey =
  | "consultant"
  | "specialist"
  | "lasik"
  | "followup-consultant"
  | "followup-lasik";

export type SheetsPageProps = {
  defaultTab?: SheetsTabKey;
  embeddedInHub?: boolean;
};

export default function SheetsPage({
  defaultTab = "consultant",
  embeddedInHub = false,
}: SheetsPageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<SheetsTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (
        tabParam &&
        [
          "consultant",
          "specialist",
          "lasik",
          "followup-consultant",
          "followup-lasik",
        ].includes(tabParam)
      ) {
        return tabParam as SheetsTabKey;
      }
    } catch {
      // ignore
    }

    if (
      location.includes("/followup/consultant") ||
      (location.includes("/consultant/") && location.includes("/followup"))
    )
      return "followup-consultant";
    if (
      location.includes("/followup/lasik") ||
      (location.includes("/lasik/") && location.includes("/followup"))
    )
      return "followup-lasik";
    if (location.includes("/sheets/specialist")) return "specialist";
    if (location.includes("/sheets/lasik")) return "lasik";
    if (location.includes("/sheets/consultant")) return "consultant";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<SheetsTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as SheetsTabKey;
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
    <div className="w-full bg-background text-foreground print:bg-white">
      <div className="w-full space-y-4 p-3 sm:p-5 print:p-0 print:space-y-0">
        {!embeddedInHub && (
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm print:hidden">
            <PageHeader
              title="الشيتات الطبية"
              description="كافة الشيتات الطبية والاستشارات ومقاسات النظارة ومتابعات الليزك في شاشة موحدة"
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
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] print:hidden">
            <TabsList className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
              <TabsTrigger
                value="consultant"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Stethoscope className="h-4 w-4 shrink-0 text-primary" />
                <span>شيت كشف</span>
              </TabsTrigger>

              <TabsTrigger
                value="specialist"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <UserRound className="h-4 w-4 shrink-0 text-primary" />
                <span>شيت مقاس نظاره / خارجي</span>
              </TabsTrigger>

              <TabsTrigger
                value="lasik"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Zap className="h-4 w-4 shrink-0 text-primary" />
                <span>شيت تصحيح ابصار</span>
              </TabsTrigger>

              <TabsTrigger
                value="followup-consultant"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Repeat className="h-4 w-4 shrink-0 text-primary" />
                <span>متابعة الاستشاري</span>
              </TabsTrigger>

              <TabsTrigger
                value="followup-lasik"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Repeat className="h-4 w-4 shrink-0 text-primary" />
                <span>متابعة الليزك</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="consultant"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ConsultantSheet />
            </div>
          </TabsContent>

          <TabsContent
            value="specialist"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <SpecialistSheet />
            </div>
          </TabsContent>

          <TabsContent
            value="lasik"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <LasikExamSheet />
            </div>
          </TabsContent>

          <TabsContent
            value="followup-consultant"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ConsultantFollowupPage />
            </div>
          </TabsContent>

          <TabsContent
            value="followup-lasik"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <LasikFollowupPage />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
