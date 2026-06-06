import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function formatArabicDate(value: string | Date | null | undefined) {
  if (!value) return "غير محدد";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return `${DAY_NAMES[date.getDay()]} ${date.toLocaleDateString("ar-EG")}`;
}

export function formatArabicDateTime(value: string | Date | null | undefined) {
  if (!value) return "غير محدد";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return `${formatArabicDate(date)} • ${date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
}

export function PortalShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-secondary">
            <BrandLogo className="size-4 shrink-0" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em]">SELRS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-[1.75rem]">{title}</h1>
          {subtitle && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function PortalPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-[#dbe7f4] bg-white p-4 shadow-[0_12px_36px_rgba(28,64,104,0.06)] sm:p-5",
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PortalLabel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function PortalEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#d7e2ee] bg-[#f7fbfe] px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white text-primary shadow-[0_10px_24px_rgba(28,64,104,0.08)]">
        {icon ?? <AlertCircle className="size-5" />}
      </div>
      <div className="mx-auto max-w-md space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PortalLoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-[1.25rem] border border-[#dbe7f4] bg-white p-3">
          <Skeleton className="size-10 rounded-xl bg-[#e8f0f8]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 bg-[#e8f0f8]" />
            <Skeleton className="h-3 w-1/2 bg-[#eef4fa]" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg bg-[#eef4fa]" />
        </div>
      ))}
    </div>
  );
}

export function PortalStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const lower = status.toLowerCase();
  const variant =
    lower === "confirmed" ? "default" : lower === "pending" ? "secondary" : lower === "cancelled" ? "destructive" : "outline";

  return (
    <Badge
      variant={variant as "default" | "secondary" | "destructive" | "outline"}
      className={cn(
        "capitalize",
        lower === "confirmed" && "bg-primary text-primary-foreground hover:bg-primary/90",
        lower === "pending" && "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        lower === "cancelled" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        lower === "completed" && "border-[#d7e2ee] bg-[#eff4fa] text-foreground hover:bg-[#eff4fa]",
        className,
      )}
    >
      {label ?? status}
    </Badge>
  );
}

export function PortalBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1 px-2 text-muted-foreground hover:text-foreground">
      <Link href={href}>
        <ArrowLeft className="size-4" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export function PortalSectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
    </div>
  );
}

export function PortalMetric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "orange" | "neutral";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-secondary/12 text-secondary"
      : tone === "neutral"
        ? "bg-muted text-foreground"
        : "bg-primary/10 text-primary";

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className={cn("mb-2 inline-flex rounded-lg px-2 py-1 text-[11px] font-medium", toneClass)}>{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
