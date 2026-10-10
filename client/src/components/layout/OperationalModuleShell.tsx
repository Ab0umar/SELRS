import { type ReactNode } from "react";
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll";
import { Link, useLocation } from "wouter";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "./operational-ledger.css";

export interface OperationalNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activeFor: string[];
  description?: string;
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
  /** Ledger look: canvas page, flat tab strip, white content frame. */
  ledger?: boolean;
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
        "inline-flex min-h-11 min-w-0 max-w-full flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm",
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
        className="text-sm font-medium text-muted-foreground [unicode-bidi:isolate]"
      >
        {metric.label}
      </span>
      <span
        dir="rtl"
        className="break-words text-sm font-semibold tabular-nums text-foreground [unicode-bidi:isolate]"
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
  title,
  description,
  ledger = false,
}: OperationalModuleShellProps) {
  const [location, setLocation] = useLocation();
  useKeyboardScroll();
  const showMetrics =
    metrics.length > 0 || endMetrics.length > 0 || metricsCenter != null;

  return (
    <div
      className="min-w-0 min-h-screen bg-background p-4 text-foreground sm:p-6"
      data-operational-module={moduleName}
      data-ledger={ledger ? "" : undefined}
      dir="rtl"
    >
      <a
        href="#module-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("module-content")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground print:hidden"
      >
        تخطي إلى المحتوى
      </a>
      <div
        className={cn(
          "mx-auto flex flex-col gap-3",
          !fullWidth && "max-w-[1600px]",
        )}
      >
        {showMetrics ? (
          <div
            className="mobile-summary-cards grid w-full min-w-0 grid-cols-1 items-center gap-2 rounded-2xl border border-border/60 bg-card p-2.5 shadow-sm print:hidden lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
            dir="ltr"
          >
            <div
              className="flex min-w-0 flex-wrap items-center justify-start gap-2"
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
              className="flex min-w-0 flex-wrap items-center justify-center gap-2 [&>*]:max-w-full"
              dir="rtl"
            >
              {metricsCenter}
            </div>
            <div
              className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end"
              dir="rtl"
            >
              {endMetrics.map((metric) => (
                <MetricChip key={`R-${metric.label}`} metric={metric} />
              ))}
            </div>
          </div>
        ) : null}

        {title || description ? <header className="sr-only">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </header> : null}

        <nav aria-label="أقسام الوحدة" className="flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-card p-1.5 shadow-sm print:hidden sm:flex-wrap sm:overflow-visible">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(location, item.activeFor) || item.children?.some((child) => isItemActive(location, child.activeFor));
            if (item.children?.length) return (
              <label key={item.label} className={cn("inline-flex min-h-11 max-w-full items-center gap-2 rounded-md px-3 text-sm font-semibold", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Icon className="h-4 w-4" />
                <select aria-label={item.label} value={item.children.find((child) => isItemActive(location, child.activeFor))?.href ?? ""} onChange={(event) => { if (event.target.value) setLocation(event.target.value); }} className="min-h-11 max-w-40 cursor-pointer bg-transparent font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>option]:bg-popover [&>option]:text-popover-foreground">
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
                  "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold transition-colors sm:max-w-full sm:shrink sm:whitespace-normal",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="break-words">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div id="module-content" tabIndex={-1} className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm focus:outline-none sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
