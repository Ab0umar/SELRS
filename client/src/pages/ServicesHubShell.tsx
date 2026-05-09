import { useLocation, Link, Redirect } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  LayoutGrid,
  Network,
  Pill,
} from "lucide-react";
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
    href: "/services-hub/medications",
    title: "الأدوية",
    description: "إدارة قائمة الأدوية والمستحضرات الطبية.",
    icon: Pill,
    iconWrap: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
  {
    href: "/services-hub/catalog",
    title: "كتالوج الفحوصات",
    description: "عرض وإدارة قائمة الفحوصات والخدمات الطبية.",
    icon: FlaskConical,
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    href: "/services-hub/registry",
    title: "سجل الأدوية",
    description: "تتبع وإدارة سجلات الأدوية والمخزون.",
    icon: Pill,
    iconWrap: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  },
  {
    href: "/services-hub/txhub",
    title: "TXhub تحاليل",
    description: "ربط وإدارة نظام التحاليل الخارجي.",
    icon: Network,
    iconWrap: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  },
];

const MORE_LINKS: { href: string; label: string }[] = [];

export default function ServicesHubShell() {
  const [location] = useLocation();

  const isHubHome = location === "/services-hub" || location === "/services-hub/";

  const renderComponent = () => {
    if (isHubHome) return null;

    if (location === "/services-hub/medications") {
      return <Redirect to="/medications" />;
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
        <Link href="/services-hub" className="font-semibold text-primary underline-offset-4 hover:underline">
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
        subtitle="إدارة الخدمات الطبية والأدوية والفحوصات والتحاليل."
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
            <Link href="/services-hub">
              <ArrowRight className="h-4 w-4 rotate-180" />
              مركز الخدمات
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
