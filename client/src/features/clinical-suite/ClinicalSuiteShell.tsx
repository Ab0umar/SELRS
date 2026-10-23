import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClinicalDecisionSupport } from "./ClinicalDecisionSupport";
import { RevenueLedgerPreview } from "./RevenueLedgerPreview";
import { BiometricAttendanceMonitor } from "./BiometricAttendanceMonitor";
import { PatientQueueFlow } from "./PatientQueueFlow";
import {
  Eye,
  FileSpreadsheet,
  Clock,
  Activity,
  Layers,
  Search,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  getCommandPaletteShortcutLabel,
  openCommandPalette,
} from "@/lib/commandPalette";
import { ROUTES } from "../../../../shared/routes";

export default function ClinicalSuiteShell() {
  const [activeTab, setActiveTab] = useState<string>("clinical");
  const [, setLocation] = useLocation();

  const handleOpenCommandPalette = () => {
    openCommandPalette();
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      data-module-content-start
      className="min-h-screen bg-background text-foreground p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
            <Stethoscope className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                المجموعة الإكلينيكية والتشغيلية المتكاملة
              </h1>
              <Badge
                dir="ltr"
                lang="en"
                variant="outline"
                className="text-[13px] font-mono border-primary/30 text-primary"
              >
                SELRS Suite v2.6
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              منصة مركز السعدني لجراحة العيون والليزك • القرارات الإكلينيكية،
              المزامنة، والإيرادات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCommandPalette}
            className="text-xs h-8 flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>
              بحث سريع (<bdi dir="ltr">{getCommandPaletteShortcutLabel()}</bdi>)
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(ROUTES.examination)}
            className="text-xs h-8 flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <span>شيت الفحص</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Button>
        </div>
      </div>

      <Tabs
        dir="rtl"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex h-auto max-w-full flex-nowrap overflow-x-auto p-1 bg-muted/50 border border-border rounded-xl">
          <TabsTrigger
            value="clinical"
            className="py-2 text-xs flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span dir="ltr" lang="en" className="font-semibold">
              Clinical Decision Support
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="accounting"
            className="py-2 text-xs flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">إيرادات اليوم والحصص</span>
          </TabsTrigger>

          <TabsTrigger
            value="attendance"
            className="py-2 text-xs flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-semibold">مراقبة جهاز البصمة</span>
          </TabsTrigger>

          <TabsTrigger
            value="flow"
            className="py-2 text-xs flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">مسار المرضى والعمليات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="clinical"
          className="space-y-4 m-0 focus-visible:outline-none"
        >
          <ClinicalDecisionSupport />
        </TabsContent>

        <TabsContent
          value="accounting"
          className="space-y-4 m-0 focus-visible:outline-none"
        >
          <RevenueLedgerPreview />
        </TabsContent>

        <TabsContent
          value="attendance"
          className="space-y-4 m-0 focus-visible:outline-none"
        >
          <BiometricAttendanceMonitor />
        </TabsContent>

        <TabsContent
          value="flow"
          className="space-y-4 m-0 focus-visible:outline-none"
        >
          <PatientQueueFlow />
        </TabsContent>
      </Tabs>
    </div>
  );
}
