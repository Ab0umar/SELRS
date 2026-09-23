import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OperationalNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activeFor: string[];
  children?: OperationalNavigationItem[];
}

export interface OperationalMetric {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
}

interface OperationalModuleShellProps {
  children: ReactNode;
  title: string;
  description: string;
  navigation: OperationalNavigationItem[];
  /** Fixed / global metrics — LEFT */
  metrics?: OperationalMetric[];
  /** Center slot (e.g. tab actions like refresh) */
  metricsCenter?: ReactNode;
  /** Tab-specific metrics — RIGHT */
  endMetrics?: OperationalMetric[];
  mark?: ReactNode;
  fullWidth?: boolean;
  moduleName?: string;
}

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/attendance" ||
    path === "/salary" ||
    path === "/kf" ||
    path === "/stockroom" ||
    path === "/accounting"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

function MetricChip({
  metric,
  tone = "default",
}: {
  metric: OperationalMetric;
  tone?: "default" | "fixed";
}) {
  const Icon = metric.icon;
  return (
    <div
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm",
        tone === "fixed"
          ? "border-primary/20 bg-primary/5"
          : "border-border/70 bg-card",
      )}
      dir="rtl"
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          tone === "fixed" ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span
        dir="rtl"
        className="text-[11px] font-semibold text-muted-foreground [unicode-bidi:isolate]"
      >
        {metric.label}
      </span>
      <span
        dir="rtl"
        className="text-sm font-black tabular-nums tracking-tight text-foreground [unicode-bidi:isolate]"
      >
        {metric.value}
      </span>
    </div>
  );
}

/**
 * Shared frame for back-office modules.
 * Metrics row: LEFT = fixed metrics, CENTER = metricsCenter, RIGHT = endMetrics.
 * Structure unchanged — visual refine only.
 */
export default function OperationalModuleShell({
  children,
  navigation,
  metrics = [],
  metricsCenter = null,
  endMetrics = [],
  fullWidth = false,
  moduleName,
}: OperationalModuleShellProps) {
  const [location, setLocation] = useLocation();
  const showMetrics =
    metrics.length > 0 || endMetrics.length > 0 || metricsCenter != null;

  return (
    <div
      className="min-h-screen bg-background p-4 text-foreground sm:p-6"
      data-operational-module={moduleName}
      dir="rtl"
    >
      <div
        className={cn(
          "mx-auto flex flex-col gap-3",
          !fullWidth && "max-w-[1600px]",
        )}
      >
        {showMetrics ? (
          <div
            className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-2.5 shadow-sm print:hidden backdrop-blur-sm"
            dir="ltr"
          >
            <div
              className="flex flex-wrap items-center justify-start gap-2"
              dir="rtl"
            >
              {metrics.map((metric) => (
                <MetricChip
                  key={`L-${metric.label}`}
                  metric={metric}
                  tone="fixed"
                />
              ))}
            </div>
            <div
              className="flex flex-wrap items-center justify-center gap-2"
              dir="rtl"
            >
              {metricsCenter}
            </div>
            <div
              className="flex flex-wrap items-center justify-end gap-2"
              dir="rtl"
            >
              {endMetrics.map((metric) => (
                <MetricChip key={`R-${metric.label}`} metric={metric} />
              ))}
            </div>
          </div>
        ) : null}

        <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap rounded-2xl border border-border/60 bg-card p-1.5 shadow-sm print:hidden scrollbar-none">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(location, item.activeFor) || item.children?.some((child) => isItemActive(location, child.activeFor));
            if (item.children?.length) return (
              <label key={item.label} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold", active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Icon className="h-4 w-4" />
                <select aria-label={item.label} value={item.children.find((child) => isItemActive(location, child.activeFor))?.href ?? ""} onChange={(event) => { if (event.target.value) setLocation(event.target.value); }} className="max-w-40 cursor-pointer bg-transparent font-bold outline-none">
                  <option value="" disabled>{item.label}</option>
                  {item.children.map((child) => <option key={child.href} value={child.href}>{child.label}</option>)}
                </select>
              </label>
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
