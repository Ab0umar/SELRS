import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarOff,
  FileCheck2,
  FileText,
  FileWarning,
  Send,
} from "lucide-react";

// Sub-components
import ClinicalReport from "./ClinicalReport";
import PrePostOpReport from "./PrePostOpReport";
import PostOpOffdays from "./PostOpOffdays";
import MedicalConditionReport from "./MedicalConditionReport";
import ReferralLetter from "./ReferralLetter";

export type ClinicalReportsTabKey =
  | "clinical"
  | "pre-post-op"
  | "offdays"
  | "condition"
  | "referral";

export type ClinicalReportsPageProps = {
  defaultTab?: ClinicalReportsTabKey;
  embeddedInHub?: boolean;
};

export default function ClinicalReportsPage({
  defaultTab = "clinical",
  embeddedInHub = false,
}: ClinicalReportsPageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<ClinicalReportsTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (
        tabParam &&
        ["clinical", "pre-post-op", "offdays", "condition", "referral"].includes(
          tabParam,
        )
      ) {
        return tabParam as ClinicalReportsTabKey;
      }
    } catch {
      // ignore
    }

    if (location.includes("/pre-post-op-report")) return "pre-post-op";
    if (location.includes("/post-op-offdays")) return "offdays";
    if (location.includes("/medical-condition-report")) return "condition";
    if (location.includes("/sheets/referral")) return "referral";
    if (location.includes("/clinical-report")) return "clinical";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<ClinicalReportsTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as ClinicalReportsTabKey;
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
              title="التقارير الطبية"
              description="إصدار ومتابعة التقارير الطبية الشاملة وتقارير العمليات والإجازات وخطابات الإحالة"
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
                value="referral"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Send className="h-4 w-4 shrink-0 text-primary" />
                <span>خطاب الإحالة</span>
              </TabsTrigger>

              <TabsTrigger
                value="condition"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <FileWarning className="h-4 w-4 shrink-0 text-primary" />
                <span>تقرير حالة طبية</span>
              </TabsTrigger>

              <TabsTrigger
                value="offdays"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <CalendarOff className="h-4 w-4 shrink-0 text-primary" />
                <span>إجازة ما بعد العملية</span>
              </TabsTrigger>

              <TabsTrigger
                value="pre-post-op"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                <span>تقرير ما قبل وبعد العملية</span>
              </TabsTrigger>

              <TabsTrigger
                value="clinical"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span>التقرير الشامل</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="clinical"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ClinicalReport />
            </div>
          </TabsContent>

          <TabsContent
            value="pre-post-op"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <PrePostOpReport />
            </div>
          </TabsContent>

          <TabsContent
            value="offdays"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <PostOpOffdays />
            </div>
          </TabsContent>

          <TabsContent
            value="condition"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <MedicalConditionReport />
            </div>
          </TabsContent>

          <TabsContent
            value="referral"
            className="m-0 focus-visible:outline-none print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ReferralLetter />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
