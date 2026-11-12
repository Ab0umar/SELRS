import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import "@/styles/clinical-workspace.css";
import "@/styles/medical-report-brand.css";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CalendarOff,
  FileCheck2,
  FileText,
  FileWarning,
  Send,
  Printer,
  CheckCircle2,
  X,
  User,
} from "lucide-react";

import ClinicalReport from "./ClinicalReport";
import PrePostOpReport from "./PrePostOpReport";
import PostOpOffdays from "./PostOpOffdays";
import MedicalConditionReport from "./MedicalConditionReport";
import ReferralLetter from "./ReferralLetter";
import PrintableMedicalReport from "@/components/reports/PrintableMedicalReport";
import { direction } from "html2canvas/dist/types/css/property-descriptors/direction";
import { ReportHeaderSlotContext } from "@/components/reports/ReportHeader";
import type { ReportStock } from "@/components/reports/ReportStationery";

export type ClinicalReportsTabKey =
  | "clinical"
  | "pre-post-op"
  | "offdays"
  | "condition"
  | "referral"
  | "medical-report";

export type ClinicalReportsPageProps = {
  defaultTab?: ClinicalReportsTabKey;
  embeddedInHub?: boolean;
};

export default function ClinicalReportsPage({
  defaultTab = "offdays",
  embeddedInHub = false,
}: ClinicalReportsPageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();

  // Route matches for any direct report URLs with an ID
  const [, refParams] = useRoute("/sheets/referral/:id");
  const [, clinParams1] = useRoute("/clinical-report/:id");
  const [, clinParams2] = useRoute("/sheets/clinical-report/:id");
  const [, prePostParams] = useRoute("/pre-post-op-report/:id");
  const [, offdaysParams] = useRoute("/post-op-offdays/:id");
  const [, condParams] = useRoute("/medical-condition-report/:id");
  const [, medParams] = useRoute("/medical-report/:id");
  const [, repIdParams] = useRoute("/reports/:id");

  const routePatientId = useMemo(() => {
    const id =
      refParams?.id ||
      clinParams1?.id ||
      clinParams2?.id ||
      prePostParams?.id ||
      offdaysParams?.id ||
      condParams?.id ||
      medParams?.id ||
      repIdParams?.id;
    return id ? Number(id) : undefined;
  }, [
    refParams,
    clinParams1,
    clinParams2,
    prePostParams,
    offdaysParams,
    condParams,
    medParams,
    repIdParams,
  ]);

  const queryPatientId = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const val = sp.get("patientId") || sp.get("id");
      return val ? Number(val) : undefined;
    } catch {
      return undefined;
    }
  }, [location]);

  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
    routePatientId || queryPatientId,
  );

  useEffect(() => {
    const detected = routePatientId || queryPatientId;
    if (detected && detected !== selectedPatientId) {
      setSelectedPatientId(detected);
    }
  }, [routePatientId, queryPatientId]);

  const patientQuery = trpc.patient.getPatient.useQuery(selectedPatientId ?? null, {
    enabled: Boolean(selectedPatientId),
    refetchOnWindowFocus: false,
  });

  const handlePatientSelect = (id: number | undefined) => {
    setSelectedPatientId(id);
    try {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set("patientId", String(id));
      } else {
        url.searchParams.delete("patientId");
        url.searchParams.delete("id");
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  };

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<ClinicalReportsTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (
        tabParam &&
        ["clinical", "pre-post-op", "offdays", "condition", "referral", "medical-report"].includes(
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
    if (location.includes("/medical-report")) return "medical-report";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<ClinicalReportsTabKey>(initialTab);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [reportStock, setReportStock] = useState<ReportStock>(() =>
    typeof window !== "undefined" && window.localStorage.getItem("clinical-report-stock") === "preprinted"
      ? "preprinted"
      : "blank",
  );

  const changeReportStock = (stock: ReportStock) => {
    setReportStock(stock);
    window.localStorage.setItem("clinical-report-stock", stock);
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as ClinicalReportsTabKey;
    setActiveTab(nextTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      if (selectedPatientId) {
        url.searchParams.set("patientId", String(selectedPatientId));
      }
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
    <div dir="rtl" data-report-stock={reportStock} className="mobile-flat-clinical clinical-workspace w-full bg-background text-foreground print:bg-white">
      <style>{`
        @media print {
          /* Letterhead ~5cm via sheet padding-top in medical-report-brand.css */
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Hide hub chrome only - do NOT blanket-hide document <header> */
          .print\:hidden,
          .no-print,
          [role="tablist"] {
            display: none !important;
          }
          .page-layout {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <div className="w-full space-y-4 p-3 sm:p-5 lg:px-4 lg:pt-2 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-4 lg:space-y-0 print:block print:p-0 print:space-y-0">
        {!embeddedInHub && (
          <div data-report-header className="mobile-unframed-content flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-card px-4 py-3 lg:sticky lg:top-3 lg:col-start-1 lg:flex-col lg:items-stretch print:hidden">
            <div className="records-page-header flex items-center justify-between gap-3">
              <h1 className="whitespace-nowrap text-xl font-semibold">التقارير الطبية</h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => goBack()}
                >
                  <ArrowRight className="h-3.5 w-3.5"/>
                  <span>رجوع</span>
                </Button>
              </div>
            </div>

            {/* Unified Patient Search Bar and Global Print Button wired to ALL tabs */}
            <div className="mobile-report-toolbar flex min-w-[260px] flex-1 flex-wrap items-center justify-between gap-3 lg:min-w-0 lg:flex-none lg:flex-col lg:items-stretch">
              <div className="flex-1 max-w-xl" dir="rtl">
                <PatientPicker
                  label="المريض"
                  placeholder="ابحث باسم المريض، كود الملف (مثال: 0412)، أو رقم الهاتف…"
                  initialPatientId={selectedPatientId}
                  onSelect={(p) => handlePatientSelect(p?.id ? Number(p.id) : undefined)}
                />
              </div>

              <div className="flex items-center gap-3">
                {selectedPatientId && patientQuery.data && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      المريض النشط: <strong>{(patientQuery.data as any).fullName}</strong> (كود: {(patientQuery.data as any).patientCode || selectedPatientId})
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePatientSelect(undefined)}
                      className="mr-1 inline-flex items-center gap-0.5 text-muted-foreground hover:text-rose-500 text-[11px] underline cursor-pointer"
                      title="إلغاء تحديد المريض"
                    >
                      <X className="w-3 h-3" />
                      <span>مسح</span>
                    </button>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2 shadow-sm text-sm shrink-0"
                  title="طباعة التقرير المفتوح حالياً أو حفظ كملف PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة التقرير</span>
                </Button>
              </div>
            </div>

            {/* The open report's own title row is moved here by <ReportHeader>. */}
            <div ref={setHeaderSlot} data-report-slot className="empty:hidden ms-auto lg:ms-0 lg:border-t lg:border-border/60 lg:pt-3" />
          </div>
        )}

        <ReportHeaderSlotContext.Provider value={headerSlot}>
        <div className="no-print flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 lg:col-start-1" dir="rtl">
          <label htmlFor="clinical-report-stock" className="shrink-0 text-sm font-semibold">الطباعة على</label>
          <select
            id="clinical-report-stock"
            value={reportStock}
            onChange={(event) => changeReportStock(event.target.value as ReportStock)}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="blank">ورق أبيض مع ترويسة المركز</option>
            <option value="preprinted">ورق المركز المطبوع مسبقاً</option>
          </select>
        </div>
        <Tabs
          dir="rtl"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4 lg:contents print:space-y-0"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] lg:col-start-1 print:hidden">
            <TabsList className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1 lg:h-auto lg:min-w-0 lg:flex-col lg:items-stretch">
              {[
                { value: "offdays", label: "إجازة ما بعد العملية", icon: CalendarOff },
                { value: "pre-post-op", label: "تقرير قبل وبعد", icon: FileCheck2 },
                { value: "referral", label: "خطاب الإحالة", icon: Send },
                { value: "medical-report", label: "تقرير طبي", icon: Printer },
                { value: "condition", label: "تقرير حالة طبية", icon: FileWarning },
                { value: "clinical", label: "التقرير الشامل", icon: FileText },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent
            value="clinical"
            className="m-0 min-w-0 focus-visible:outline-none lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ClinicalReport
                patientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                hideHeaderSearch
                hidePrintButton
              />
            </div>
          </TabsContent>

          <TabsContent
            value="pre-post-op"
            className="m-0 min-w-0 focus-visible:outline-none lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <PrePostOpReport
                patientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                hideHeaderSearch
                hidePrintButton
              />
            </div>
          </TabsContent>

          <TabsContent
            value="offdays"
            className="m-0 min-w-0 focus-visible:outline-none lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <PostOpOffdays
                patientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                hideHeaderSearch
                hidePrintButton
              />
            </div>
          </TabsContent>

          <TabsContent
            value="condition"
            className="m-0 min-w-0 focus-visible:outline-none lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <MedicalConditionReport
                patientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                hideHeaderSearch
                hidePrintButton
              />
            </div>
          </TabsContent>

          <TabsContent
            value="referral"
            className="m-0 min-w-0 focus-visible:outline-none lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <ReferralLetter
                patientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                hideHeaderSearch
                hidePrintButton
              />
            </div>
          </TabsContent>

          <TabsContent
            value="medical-report"
            className="m-0 min-w-0 focus-visible:outline-none lg:col-start-2 lg:row-span-2 lg:row-start-1 print:m-0 print:p-0"
          >
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 lg:p-0 shadow-sm print:p-0 print:border-0 print:shadow-none print:bg-transparent print:rounded-none">
              <PrintableMedicalReport
                initialPatientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                hideTopBarSearch
                hidePrintButton
              />
            </div>
          </TabsContent>
        </Tabs>
        </ReportHeaderSlotContext.Provider>
      </div>
    </div>
  );
}
