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
  FlaskConical,
  Pill,
} from "lucide-react";
import "@/styles/clinical-workspace.css";
import AutorefsDashboard from "./AutorefsDashboard";
import RefractionsDashboard from "./RefractionsDashboard";
import MedicalReports from "./MedicalReports";
import PentacamPage from "./PentacamPage";
import PrescriptionsDashboard from "./PrescriptionsDashboard";

export type MedicalRecordsTabKey =
  "autoref" | "refraction" | "medical-reports" | "pentacam" | "tests" | "rays" | "tests-rays" | "diagnosis" | "prescriptions";
export type MedicalRecordsPageProps = {
  defaultTab?: MedicalRecordsTabKey;
  embeddedInHub?: boolean;
};
const tabs = [
  { key: "autoref", label: "AutoRef", icon: Activity },
  { key: "refraction", label: "Refraction", icon: Glasses },
  { key: "pentacam", label: "Pentacam", icon: Eye },
  { key: "tests-rays", label: "Test&Rays", icon: FlaskConical },
  { key: "diagnosis", label: "Diagnosis", icon: ClipboardList },
  { key: "prescriptions", label: "prescriptions", icon: Pill },
] as const;
export default function MedicalRecordsPage({
  defaultTab = "autoref",
  embeddedInHub = false,
}: MedicalRecordsPageProps = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const initialTab = useMemo<MedicalRecordsTabKey>(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "medical-reports") return "diagnosis";
    if (tab === "tests" || tab === "rays") return "tests-rays";
    if (tabs.some((item) => item.key === tab))
      return tab as MedicalRecordsTabKey;
    if (
      [
        "sheet",
        "linking",
        "duplicates",
        "failed",
        "results",
        "dashboard",
      ].includes(tab ?? "")
    )
      return "pentacam";
    if (location.includes("/pentacam")) return "pentacam";
    if (location.includes("/medical-reports")) return "diagnosis";
    if (location.includes("/refractions")) return "refraction";
    if (location.includes("/autorefs")) return "autoref";
    if (defaultTab === "medical-reports") return "diagnosis";
    if (defaultTab === "tests" || defaultTab === "rays") return "tests-rays";
    return defaultTab;
  }, [location, defaultTab]);
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);
  function select(value: string) {
    setActiveTab(value as MedicalRecordsTabKey);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  }
  return (
    <div
      dir="rtl"
      className="clinical-workspace w-full bg-background text-foreground"
    >
      <div className="w-full space-y-4 p-3 sm:p-5">
        {!embeddedInHub && (
          <div className="records-page-header border-b border-border bg-card p-4">
            <PageHeader
              title="السجلات الطبية"
              actions={
                <Button variant="outline" size="sm" onClick={() => goBack()}>
                  <ArrowRight className="h-4 w-4" />
                  رجوع
                </Button>
              }
            />
          </div>
        )}
        <Tabs
          dir="ltr"
          value={activeTab}
          onValueChange={select}
          className="w-full space-y-4"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {tabs.map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="min-h-11 gap-2 px-3 py-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="autoref" className="m-0" dir="rtl">
            <AutorefsDashboard />
          </TabsContent>
          <TabsContent value="refraction" className="m-0" dir="rtl">
            <RefractionsDashboard />
          </TabsContent>
          <TabsContent value="tests-rays" className="m-0" dir="rtl">
            <MedicalReports recordsCategory="tests-rays" />
          </TabsContent>
          <TabsContent value="diagnosis" className="m-0" dir="rtl">
            <MedicalReports recordsCategory="consult" />
          </TabsContent>
          <TabsContent value="prescriptions" className="m-0" dir="rtl">
            <PrescriptionsDashboard />
          </TabsContent>
          <TabsContent value="pentacam" className="m-0" dir="rtl">
            <PentacamPage embeddedInHub />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
