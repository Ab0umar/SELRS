import { useMemo } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { permissionPathForHubLink } from "@/lib/hubPermissionPaths";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  LayoutGrid,
  Network,
  Pill,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ServicesHubNav } from "@/components/shared/ServicesHubNav";
import { StatCard } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { SERVICES_HUB_MODULE_ICON_WRAP } from "@/lib/servicesHubModules";
import EgyptianDrugReferencePage from "./EgyptianDrugReferencePage";

type HubModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrap: string;
};

const MAIN_MODULES: HubModuleCard[] = [
  {
    href: "/services-hub/drug-reference",
    title: "مرجع الأدوية المصرية",
    description: "بحث عربي وإنجليزي وإضافة الدواء المختار إلى كتالوج الروشتات.",
    icon: BookOpen,
    iconWrap: SERVICES_HUB_MODULE_ICON_WRAP["drug-reference"],
  },
  {
    href: "/services-hub/medications",
    title: "الأدوية",
    description: "إدارة قائمة الأدوية والمستحضرات الطبية.",
    icon: Pill,
    iconWrap: SERVICES_HUB_MODULE_ICON_WRAP.medications,
  },
  {
    href: "/services-hub/catalog",
    title: "كتالوج الفحوصات",
    description: "عرض وإدارة قائمة الفحوصات والخدمات الطبية.",
    icon: FlaskConical,
    iconWrap: SERVICES_HUB_MODULE_ICON_WRAP.catalog,
  },
  {
    href: "/services-hub/registry",
    title: "سجل الأدوية",
    description: "تتبع وإدارة سجلات الأدوية والمخزون.",
    icon: Pill,
    iconWrap: SERVICES_HUB_MODULE_ICON_WRAP.registry,
  },
  {
    href: "/services-hub/txhub",
    title: "ربط النتائج الخارجية",
    description: "استيراد نتائج المختبر والأشعة وربطها بالمدى الطبيعي.",
    icon: Network,
    iconWrap: SERVICES_HUB_MODULE_ICON_WRAP.txhub,
  },
];

export default function ServicesHubShell() {
  const [location] = useLocation();
  const { canAccess } = usePermissions();
  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const servicesQuery = trpc.medical.getServicesFromDb.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const isHubHome =
    location === "/services-hub" || location === "/services-hub/";
  const stats = useMemo(() => {
    const meds = medicationsQuery.data ?? [];
    const tests = testsQuery.data ?? [];
    const services = servicesQuery.data ?? [];
    const txhub = tests.filter(
      (row: any) => row.type === "lab" || row.type === "imaging",
    );
    return {
      meds: meds.length,
      tests: tests.length,
      services: services.length,
      txhub: txhub.length,
    };
  }, [medicationsQuery.data, testsQuery.data, servicesQuery.data]);

  const loading =
    medicationsQuery.isLoading ||
    testsQuery.isLoading ||
    servicesQuery.isLoading;

  const renderComponent = () => {
    if (isHubHome) return null;
    // Hub sub-paths inherit the hub permission, so re-check the permission that
    // actually guards the page being rendered.
    if (!canAccess(permissionPathForHubLink(location))) {
      return (
        <div className="rounded-xl border border-border/80 bg-card p-6 text-right text-sm text-muted-foreground">
          لا تملك صلاحية فتح هذه الصفحة.
        </div>
      );
    }

    if (location === "/services-hub/medications") {
      return <Redirect to="/medications" />;
    }
    if (location === "/services-hub/drug-reference") {
      return <EgyptianDrugReferencePage />;
    }
    if (location === "/services-hub/catalog") {
      return <Redirect to="/examinations/catalog" />;
    }
    if (location === "/services-hub/registry") {
      return <Redirect to="/medications/registry" />;
    }
    if (location === "/services-hub/txhub") {
      return <Redirect to="/txhub" />;
    }

    return (
      <div className="rounded-xl border border-border/80 bg-card p-6 text-right text-sm text-muted-foreground">
        المسار غير معروف. ارجع إلى{" "}
        <Link
          href="/services-hub"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          مركز الخدمات
        </Link>
        .
      </div>
    );
  };

  const HubLanding = () => (
    <>
      <PageHeader
        title="مركز الخدمات"
        subtitle="مركز مرجعي للخدمات والأدوية والفحوصات والتحاليل. افتح الوحدة المناسبة ثم عد للمركز عند الحاجة."
        icon={<LayoutGrid className="h-5 w-5" />}
      />

      <ServicesHubNav active="hub" className="mb-4" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border/80 bg-card shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <SectionHeader
              title="الوحدات المتصلة"
              badge={
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                >
                  {MAIN_MODULES.length} صفحات
                </Badge>
              }
            />

            <div className="space-y-2">
              {MAIN_MODULES.filter((mod) =>
          canAccess(permissionPathForHubLink(mod.href)),
        ).map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.href}
                    className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3 text-right">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          mod.iconWrap,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            {mod.title}
                          </h3>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {mod.href.replace("/services-hub", "") || "/"}
                          </span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full gap-2 rounded-lg sm:w-auto"
                    >
                      <Link href={mod.href}>
                        فتح
                        <ArrowRight className="h-4 w-4 rotate-180" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 text-right">
                <h2 className="text-sm font-bold">لقطة مباشرة</h2>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  الأرقام التالية تساعدك على معرفة أين تبدأ قبل فتح أي صفحة.
                </p>
              </div>
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              >
                مباشر
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              <StatCard title="الأدوية" value={loading ? "…" : stats.meds} />
              <StatCard title="الفحوصات" value={loading ? "…" : stats.tests} />
              <StatCard
                title="الخدمات"
                value={loading ? "…" : stats.services}
              />
              <StatCard
                title="النتائج الخارجية"
                value={loading ? "…" : stats.txhub}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 shadow-sm">
            <div className="space-y-2 text-right">
              <h2 className="text-sm font-bold">كيف يُستخدم</h2>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                ابدأ من الأدوية أو السجل عندما تحتاج تعديل بيانات مرجعية،
                واستخدم كتالوج الفحوصات وTXhub عندما تعمل على المعايير والنتائج.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-0 pb-10 text-right"
      dir="rtl"
    >
      {!isHubHome ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link href="/services-hub">
              <ArrowRight className="h-4 w-4 rotate-180" />
              مركز الخدمات
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            التنقل الكامل متاح أيضاً من القائمة الجانبية.
          </span>
        </div>
      ) : null}

      {isHubHome ? <HubLanding /> : null}
      {renderComponent()}
    </div>
  );
}
