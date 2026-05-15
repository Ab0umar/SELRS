import { useLocation, Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CircleDot,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Pill,
  TestTube2,
  LayoutGrid,
} from "lucide-react";
import ExaminationForm from "./ExaminationForm";
import MedicalReports from "./MedicalReports";
import PatientSummary from "./PatientSummary";
import PentacamResultsDashboard from "./PentacamResultsDashboard";
import PrescriptionsList from "./PrescriptionsList";
import RefractionsDashboard from "./RefractionsDashboard";
import AutorefsDashboard from "./AutorefsDashboard";
import PrescriptionsDashboard from "./PrescriptionsDashboard";
import RequestTests from "./RequestTests";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { cn } from "@/lib/utils";

type HubModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrap: string;
};

const MAIN_MODULES: HubModuleCard[] = [
  {
    href: "/clinics-hub/examination",
    title: "الفحوصات",
    description: "إجراء فحوصات العيون الشاملة وتسجيل النتائج.",
    icon: Eye,
    iconWrap: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
  {
    href: "/clinics-hub/medical-reports",
    title: "التقارير الطبية",
    description: "عرض وإدارة التقارير الطبية للمرضى.",
    icon: ClipboardList,
    iconWrap: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  },
  {
    href: "/clinics-hub/patient-summary",
    title: "تقرير المريض",
    description: "ملخص شامل لحالة المريض والفحوصات السابقة.",
    icon: FileSpreadsheet,
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    href: "/clinics-hub/pentacam",
    title: "نتائج البنتكام",
    description: "عرض نتائج فحص البنتكام والتحليلات المتقدمة.",
    icon: CircleDot,
    iconWrap: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  },
  {
    href: "/clinics-hub/refractions-dashboard",
    title: "لوحة الانكسارات",
    description: "استعراض سريع لسجلات الانكسار مع البحث والمراجعة.",
    icon: Eye,
    iconWrap: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
  {
    href: "/clinics-hub/autorefs-dashboard",
    title: "لوحة Autoref",
    description: "مراجعة الانكسار الآلي والضغط من نفس مساحة العيادة.",
    icon: FileSpreadsheet,
    iconWrap: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
  {
    href: "/clinics-hub/prescriptions-dashboard",
    title: "لوحة الروشتات",
    description: "متابعة سريعة للوصفات وحالتها من داخل العيادة.",
    icon: Pill,
    iconWrap: "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300",
  },
  {
    href: "/clinics-hub/prescriptions",
    title: "الروشتات",
    description: "كتابة وإدارة روشتات العلاج والأدوية.",
    icon: Pill,
    iconWrap: "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300",
  },
  {
    href: "/clinics-hub/request-tests",
    title: "طلب تحاليل",
    description: "طلب الفحوصات والتحاليل الإضافية للمريض.",
    icon: TestTube2,
    iconWrap: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
];

const MORE_LINKS: { href: string; label: string }[] = [];

export default function ClinicsHubShell() {
  const [location] = useLocation();

  const isHubHome = location === "/clinics-hub" || location === "/clinics-hub/";

  const renderComponent = () => {
    if (isHubHome) return null;
    if (location === "/clinics-hub/examination") return <ExaminationForm />;
    if (location === "/clinics-hub/medical-reports") return <MedicalReports />;
    if (location === "/clinics-hub/patient-summary") return <PatientSummary />;
    if (location === "/clinics-hub/pentacam") return <PentacamResultsDashboard />;
    if (location === "/clinics-hub/refractions-dashboard") return <RefractionsDashboard />;
    if (location === "/clinics-hub/autorefs-dashboard") return <AutorefsDashboard />;
    if (location === "/clinics-hub/prescriptions-dashboard") return <PrescriptionsDashboard />;
    if (location === "/clinics-hub/prescriptions") return <PrescriptionsList />;
    if (location === "/clinics-hub/request-tests") return <RequestTests />;

    return (
      <div className="rounded-xl border border-border/80 bg-card p-6 text-right text-sm text-muted-foreground">
        المسار غير معروف. ارجع إلى{" "}
        <Link href="/clinics-hub" className="font-semibold text-primary underline-offset-4 hover:underline">
          مركز العيادات
        </Link>
        .
      </div>
    );
  };

  const HubLanding = () => (
    <>
      <PageHeader
        title="مركز العيادات"
        subtitle="الوصول السريع إلى أدوات الفحص والتشخيص والعلاج."
        icon={<LayoutGrid className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MAIN_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.href}
              className={cn(
                "border-border/80 bg-card shadow-sm transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1 text-right">
                    <h3 className="font-black text-base tracking-tight">{mod.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{mod.description}</p>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      mod.iconWrap,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <Button asChild className="w-full selrs-gradient-btn text-white hover:opacity-95 gap-2">
                    <Link href={mod.href}>
                      <LayoutGrid className="h-4 w-4" />
                      فتح الموديول
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {MORE_LINKS.length > 0 && (
        <CollapsibleSection
          title="روابط إضافية"
          defaultOpen={false}
          className="mt-8 border-border/80 bg-muted/20 shadow-sm"
        >
          <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-4 justify-end bg-card/80">
            {MORE_LINKS.map((item) => (
              <Button key={item.href} variant="outline" size="sm" asChild className="rounded-full">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-0 pb-10 text-right" dir="rtl">
      {!isHubHome ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link href="/clinics-hub">
              <ArrowRight className="h-4 w-4 rotate-180" />
              مركز العيادات
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">التنقل الكامل متاح أيضاً من القائمة الجانبية.</span>
        </div>
      ) : null}

      {isHubHome ? <HubLanding /> : null}
      {renderComponent()}
    </div>
  );
}
