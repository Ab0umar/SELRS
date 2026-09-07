import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OperationalNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activeFor: string[];
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
  metrics?: OperationalMetric[];
  mark?: ReactNode;
  fullWidth?: boolean;
  moduleName?: string;
}

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/attendance" ||
    path === "/salary" ||
    path === "/kf" ||
    path === "/stockroom"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Shared frame for back-office modules. Pages own their data and workflows;
 * this component owns only the repeated visual hierarchy and navigation.
 */
export default function OperationalModuleShell({
  children,
  navigation,
  metrics = [],
  fullWidth = false,
  moduleName,
}: OperationalModuleShellProps) {
  const [location] = useLocation();

  return (
    <div
      className="min-h-screen bg-background p-4 text-foreground sm:p-6"
      data-operational-module={moduleName}
      dir="rtl"
    >
      <div className={cn("mx-auto flex flex-col gap-5", !fullWidth && "max-w-[1600px]")}>
        {metrics.length ? (
          <div className="print:hidden">
            <div
              className={cn(
                "grid w-full grid-cols-1 gap-2",
                metrics.length > 2
                  ? "sm:grid-cols-3 md:min-w-[520px]"
                  : "sm:grid-cols-2 md:min-w-[350px]",
              )}
            >
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {metric.label}
                    </div>
                    <div className="mt-1 truncate text-sm font-black tabular-nums text-foreground">{metric.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-2xl border border-border/60 bg-card p-2 print:hidden scrollbar-none">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(location, item.activeFor);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
