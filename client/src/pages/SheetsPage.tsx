import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowRight, Repeat, Stethoscope, UserRound, Eye } from "lucide-react";
import "@/styles/clinical-workspace.css";

import { ReportHeaderSlotContext } from "@/components/reports/ReportHeader";
import FitSheet from "@/components/sheets/FitSheet";
import ConsultantSheet from "./ConsultantSheet";
import SpecialistSheet from "./SpecialistSheet";
import LasikExamSheet from "./LasikExamSheet";
import ConsultantFollowupPage from "./ConsultantFollowupPage";
import LasikFollowupPage from "./LasikFollowupPage";

export type SheetsTabKey =
  | "consultant"
  | "specialist"
  | "lasik"
  | "external"
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
  const [followupKind, setFollowupKind] = useState<"consultant" | "specialist">("consultant");

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
          "external",
          "followup-consultant",
          "followup-lasik",
        ].includes(tabParam)
      ) {
        return tabParam as SheetsTabKey;
      }
    } catch {}

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
    if (location.includes("/sheets/external")) return "external";
    if (location.includes("/sheets/lasik")) return "lasik";
    if (location.includes("/sheets/consultant")) return "consultant";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<SheetsTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  const handleTabChange = (val: string) => {
    const nextTab = val as SheetsTabKey;
    setActiveTab(nextTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div
      dir="rtl"
      className="mobile-flat-clinical clinical-workspace w-full bg-background text-foreground print:bg-white"
    >
      <div className="w-full space-y-4 p-3 sm:p-5 lg:px-4 lg:pt-2 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-4 lg:space-y-0 print:block print:p-0 print:space-y-0">
        {!embeddedInHub && (
          <div data-report-header className="records-page-header flex flex-col gap-3 rounded-2xl bg-card px-4 py-3 lg:sticky lg:top-3 lg:col-start-1 print:hidden">
            <PageHeader
              title="الشيتات الطبية"
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
            {/* The open sheet's own toolbar is moved here by <ReportHeader>. */}
            <div ref={setHeaderSlot} data-report-slot className="empty:hidden lg:border-t lg:border-border/60 lg:pt-3" />
          </div>
        )}

        <ReportHeaderSlotContext.Provider value={headerSlot}>
        <Tabs
          dir="rtl"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4 lg:contents print:space-y-0"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] lg:col-start-1 print:hidden">
            <TabsList className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1 lg:h-auto lg:min-w-0 lg:flex-col lg:items-stretch">
              <TabsTrigger
                value="consultant"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Stethoscope className="h-4 w-4 shrink-0 text-primary" />
                <span>كشف</span>
              </TabsTrigger>

              <TabsTrigger
                value="specialist"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <UserRound className="h-4 w-4 shrink-0 text-primary" />
                <span>مقاس نظارة / أشعة خارجي</span>
              </TabsTrigger>

              <TabsTrigger
                value="lasik"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Eye className="h-4 w-4 shrink-0 text-primary" />
                <span>تصحيح إبصار</span>
              </TabsTrigger>

              <TabsTrigger
                value="followup-consultant"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Repeat className="h-4 w-4 shrink-0 text-primary" />
                <span>متابعة</span>
              </TabsTrigger>

              <TabsTrigger
                value="external"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <UserRound className="h-4 w-4 shrink-0 text-primary" />
                <span>د. الصواف</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="consultant" className="m-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0">
            <FitSheet>
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ConsultantSheet sheetType="consultant" />
            </div>
          </FitSheet>
          </TabsContent>

          <TabsContent value="specialist" className="m-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0">
            <FitSheet>
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <SpecialistSheet />
            </div>
          </FitSheet>
          </TabsContent>

          <TabsContent value="lasik" className="m-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0">
            <FitSheet>
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <LasikExamSheet sheetType="lasik" />
            </div>
          </FitSheet>
          </TabsContent>

          <TabsContent
            value="followup-consultant"
            className="m-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <FitSheet>
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
                <label htmlFor="sheets-followup-kind">نوع المتابعة</label>
                <select
                  id="sheets-followup-kind"
                  className="min-h-11 rounded-md border border-input bg-background px-3"
                  value={followupKind}
                  onChange={(event) => setFollowupKind(event.target.value as "consultant" | "specialist")}
                >
                  <option value="consultant">استشاري</option>
                  <option value="specialist">أخصائي</option>
                </select>
              </div>
              <ConsultantFollowupPage key={followupKind} sheetType={followupKind} />
            </div>
          </FitSheet>
          </TabsContent>

          <TabsContent value="external" className="m-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0">
            <FitSheet>
            <LasikExamSheet sheetType="external" />
          </FitSheet>
          </TabsContent>

          <TabsContent
            value="followup-lasik"
            className="m-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <FitSheet>
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <LasikFollowupPage />
            </div>
          </FitSheet>
          </TabsContent>
        </Tabs>
        </ReportHeaderSlotContext.Provider>
      </div>
    </div>
  );
}
