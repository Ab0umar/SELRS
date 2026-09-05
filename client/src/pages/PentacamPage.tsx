import { useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Copy,
  Eye,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sub-page components
import PentacamResultsDashboard from "./PentacamResultsDashboard";
import PentacamSheet from "./PentacamSheet";
import AdminPentacamLinking from "@/features/admin/AdminPentacamLinking";
import AdminPentacamFailed from "@/features/admin/AdminPentacamFailed";
import AdminPentacamDuplicates from "@/features/admin/AdminPentacamDuplicates";

export type PentacamTabKey =
  | "dashboard"
  | "sheet"
  | "linking"
  | "failed"
  | "duplicates";

export type PentacamPageProps = {
  defaultTab?: PentacamTabKey;
  embeddedInHub?: boolean;
};

export default function PentacamPage({
  defaultTab = "sheet",
  embeddedInHub = false,
}: PentacamPageProps = {}) {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();

  // Check possible route params for patient ID
  const [, sheetsParams] = useRoute("/sheets/pentacam/:id");
  const [, adminParams] = useRoute("/admin/pentacam/:id");
  const [, hubLinkingParams] = useRoute("/admin-hub/pentacam-linking/:id");

  const routePatientId = useMemo(() => {
    const raw =
      sheetsParams?.id ?? adminParams?.id ?? hubLinkingParams?.id;
    if (raw) {
      const num = Number(raw);
      if (Number.isFinite(num) && num > 0) return num;
    }
    try {
      const sp = new URLSearchParams(window.location.search);
      const qp = sp.get("patientId");
      if (qp) {
        const num = Number(qp);
        if (Number.isFinite(num) && num > 0) return num;
      }
    } catch {
      // ignore
    }
    return undefined;
  }, [sheetsParams?.id, adminParams?.id, hubLinkingParams?.id]);

  // Determine initial tab from route, URL query, or defaultTab
  const initialTab = useMemo<PentacamTabKey>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (tabParam === "results" || tabParam === "dashboard") return "dashboard";
      if (
        tabParam &&
        ["sheet", "linking", "failed", "duplicates"].includes(tabParam)
      ) {
        return tabParam as PentacamTabKey;
      }
    } catch {
      // ignore
    }

    if (location.includes("/pentacam/dashboard")) return "dashboard";
    if (location.includes("/pentacam-linking")) return "linking";
    if (location.includes("/admin/pentacam")) return "linking";
    if (location.includes("/pentacam-failed")) return "failed";
    if (location.includes("/pentacam-duplicates")) return "duplicates";
    if (location.startsWith("/sheets/pentacam")) return "sheet";

    return defaultTab;
  }, [location, defaultTab]);

  const [activeTab, setActiveTab] = useState<PentacamTabKey>(initialTab);
  const [sharedPatientId, setSharedPatientId] = useState<number | undefined>(
    routePatientId,
  );

  // Keep activeTab in sync if initialTab changes (e.g. navigation via route)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Keep sharedPatientId in sync with route params
  useEffect(() => {
    if (routePatientId && routePatientId !== sharedPatientId) {
      setSharedPatientId(routePatientId);
    }
  }, [routePatientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Tab Switch and update URL search param without full reload
  const handleTabChange = (val: string) => {
    const nextTab = val as PentacamTabKey;
    setActiveTab(nextTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  };

  // Queries for live counters
  const statsQuery = trpc.medical.getPentacamDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const failedQuery = trpc.medical.listFailedPentacamFiles.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const dupsQuery = trpc.medical.findDuplicateSrv100Uploads.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const handleRefreshAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      failedQuery.refetch(),
      dupsQuery.refetch(),
    ]);
  };

  const isRefreshing =
    statsQuery.isFetching || failedQuery.isFetching || dupsQuery.isFetching;

  // Counts for badges
  const examsTodayCount = statsQuery.data?.examsToday ?? 0;
  const failedCount = failedQuery.data?.length ?? 0;
  const dupsCount = dupsQuery.data?.length ?? 0;

  const isAdmin = user?.role === "admin";

  return (
    <div dir="rtl" className="w-full bg-background text-foreground">
      <div
        className={cn(
          "w-full",
          !embeddedInHub ? "px-3 py-4 sm:px-6 sm:py-6" : "p-0",
        )}
      >
        {/* Page Header */}
        {!embeddedInHub && (
          <div className="mb-4">
            <PageHeader
              title="مركز البنتاكام (Pentacam)"
              description="إدارة شاملة لنتائج وفحوصات وصور البنتاكام، مطابقة الملفات، وتدقيق التكرار"
              icon={<Eye className="h-5 w-5 text-primary" />}
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleRefreshAll}
                    disabled={isRefreshing}
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                    />
                    <span>تحديث</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => goBack()}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>رجوع</span>
                  </Button>
                </div>
              }
            />
          </div>
        )}

        {/* 5 Tabs for the 5 Pentacam pages in the repo */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full space-y-4"
        >
          <div className="overflow-x-auto pb-1 [scrollbar-width:none]">
            <TabsList className="inline-flex h-11 w-full min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
              {/* Tab 1: النتائج */}
              <TabsTrigger
                value="dashboard"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Activity className="h-4 w-4 shrink-0 text-primary" />
                <span>النتائج</span>
                {examsTodayCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="mr-1 h-5 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary"
                  >
                    {examsTodayCount} اليوم
                  </Badge>
                )}
              </TabsTrigger>

              {/* Tab 2: اخطاء الرفع */}
              <TabsTrigger
                value="failed"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-destructive data-[state=active]:shadow-sm sm:text-sm"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span>اخطاء الرفع</span>
                {failedCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="mr-1 h-5 rounded-full px-1.5 text-[10px] font-semibold"
                  >
                    {failedCount}
                  </Badge>
                )}
              </TabsTrigger>

              {/* Tab 3: المكرر */}
              <TabsTrigger
                value="duplicates"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-sm sm:text-sm"
              >
                <Copy className="h-4 w-4 shrink-0 text-amber-600" />
                <span>المكرر</span>
                {dupsCount > 0 && (
                  <Badge
                    variant="outline"
                    className="mr-1 h-5 rounded-full border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                  >
                    {dupsCount}
                  </Badge>
                )}
              </TabsTrigger>

              {/* Tab 4: ربط البنتاكام */}
              <TabsTrigger
                value="linking"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <Link2 className="h-4 w-4 shrink-0 text-[#c2781c]" />
                <span>ربط البنتاكام</span>
              </TabsTrigger>

              {/* Tab 5: شيت البنتاكام */}
              <TabsTrigger
                value="sheet"
                className="gap-2 px-3.5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                <span>شيت البنتاكام</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content: Tab 1 - Pentacam Sheet / JPG Scans */}
          <TabsContent value="sheet" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <PentacamSheet
                embedded
                initialPatientId={sharedPatientId}
                onSelectPatient={(p) => setSharedPatientId(p?.id ?? undefined)}
                onSwitchTab={(tab) => handleTabChange(tab)}
              />
            </div>
          </TabsContent>

          {/* Content: Tab 2 - Pentacam Linking */}
          <TabsContent value="linking" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <AdminPentacamLinking
                embedded
                initialPatientId={sharedPatientId}
                onSelectPatient={(p) => setSharedPatientId(p?.id ?? undefined)}
                onSwitchTab={(tab) => handleTabChange(tab)}
              />
            </div>
          </TabsContent>

          {/* Content: Tab 3 - Duplicate Pentacam Files */}
          <TabsContent value="duplicates" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-bold text-foreground">
                  إدارة وفحص ملفات البنتاكام المكررة
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  تنظيف ومطابقة السجلات المكررة في التخزين وقاعدة البيانات بأمان
                  مع الاحتفاظ بالملف الأصلي.
                </p>
              </div>
              <AdminPentacamDuplicates />
            </div>
          </TabsContent>

          {/* Content: Tab 4 - Failed Pentacam Uploads */}
          <TabsContent value="failed" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <AdminPentacamFailed hideDuplicates />
            </div>
          </TabsContent>

          {/* Content: Tab 5 - Results Dashboard */}
          <TabsContent value="dashboard" className="m-0 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <PentacamResultsDashboard hidePageChrome />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
