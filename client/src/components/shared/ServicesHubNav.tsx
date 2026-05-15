import type { LucideIcon } from "lucide-react";
import { ArrowLeft, FlaskConical, LayoutGrid, Network, Pill } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

type ServicesHubSurface = "hub" | "medications" | "registry" | "catalog" | "txhub";

type HubNavItem = {
  id: ServicesHubSurface;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const SURFACE_ITEMS: HubNavItem[] = [
  {
    id: "hub",
    href: "/services-hub",
    title: "مركز الخدمات",
    description: "نقطة الدخول إلى الصفحات المرجعية.",
    icon: LayoutGrid,
    accent: "bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200",
  },
  {
    id: "medications",
    href: "/medications",
    title: "الأدوية",
    description: "قائمة الأدوية والإدارة التشغيلية.",
    icon: Pill,
    accent: "bg-sky-100 text-sky-800 dark:bg-sky-950/55 dark:text-sky-300",
  },
  {
    id: "registry",
    href: "/medications/registry",
    title: "السجل",
    description: "الأدوية والفحوصات والأمراض والأعراض.",
    icon: LayoutGrid,
    accent: "bg-violet-100 text-violet-800 dark:bg-violet-950/55 dark:text-violet-300",
  },
  {
    id: "catalog",
    href: "/examinations/catalog",
    title: "كتالوج الفحوصات",
    description: "تعريف الفحوصات والمرجع الطبيعي.",
    icon: FlaskConical,
    accent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/55 dark:text-emerald-300",
  },
  {
    id: "txhub",
    href: "/txhub",
    title: "ربط النتائج",
    description: "استيراد النتائج الخارجية وربطها بالمدى الطبيعي.",
    icon: Network,
    accent: "bg-orange-100 text-orange-800 dark:bg-orange-950/55 dark:text-orange-300",
  },
];

type ServicesHubNavProps = {
  active: ServicesHubSurface;
  className?: string;
};

export function ServicesHubNav({ active, className }: ServicesHubNavProps) {
  const [location] = useLocation();

  return (
    <div className={cn("space-y-2", className)} dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          التنقل المتصل
        </div>
        {location === "/services-hub" ? null : (
          <Link
            href="/services-hub"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            العودة إلى المركز
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        {SURFACE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border/80 bg-card hover:bg-muted/35",
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", item.accent)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
                  {isActive ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      الحالي
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
