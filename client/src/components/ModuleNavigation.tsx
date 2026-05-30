/**
 * Module Navigation Component
 * Reusable navigation component for Salary and Attendance modules
 * Provides consistent styling and behavior
 */

import { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, LucideIcon } from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  description: string;
  activeFor: string[];
}

interface NavigationSection {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

interface ModuleNavigationProps {
  sections: NavigationSection[];
  currentPath: string;
  colorScheme: "primary" | "secondary";
}

function isItemActive(pathname: string, activeFor: string[]): boolean {
  return activeFor.some((path) =>
    path === "/salary" || path === "/attendance"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isSectionActive(pathname: string, items: NavigationItem[]): boolean {
  return items.some((item) => isItemActive(pathname, item.activeFor));
}

export function ModuleNavigation({
  sections,
  currentPath,
  colorScheme,
}: ModuleNavigationProps) {
  const colorClasses = {
    primary: {
      activeText: "text-primary",
      activeBg: "bg-primary/10",
      focusRing: "focus-visible:ring-primary/30",
    },
    secondary: {
      activeText: "text-secondary",
      activeBg: "bg-secondary/10",
      focusRing: "focus-visible:ring-secondary/30",
    },
  };

  const colors = colorClasses[colorScheme];

  return (
    <nav className="space-y-1">
      {sections.map((section) => {
        const active = isSectionActive(currentPath, section.items);
        const SectionIcon = section.icon;

        return (
          <div key={section.id} className="space-y-1">
            {/* Section header */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <SectionIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {section.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {section.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Section items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const itemActive = isItemActive(currentPath, item.activeFor);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 ${colors.focusRing} focus-visible:ring-offset-2 ${
                      itemActive
                        ? `${colors.activeBg} ${colors.activeText} font-medium shadow-sm`
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Divider between sections */}
            {section.id !== sections[sections.length - 1].id && (
              <div className="my-2 border-t border-border" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Sidebar wrapper component
 */
export function ModuleSidebar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={`w-full border-b border-border bg-card/50 lg:w-64 lg:border-b-0 lg:border-r p-3 sm:p-4 ${className}`}
    >
      {children}
    </aside>
  );
}

/**
 * Main content wrapper component
 */
export function ModuleContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`flex-1 px-3 py-5 sm:px-4 lg:px-5 ${className}`}>
      {children}
    </main>
  );
}

/**
 * Module header component with metrics
 */
interface MetricCard {
  label: string;
  value: string | number;
  tone: string;
  accent: string;
}

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
  badge: string;
  badgeIcon?: LucideIcon;
  metrics: MetricCard[];
  colorScheme: "primary" | "secondary";
}

export function ModuleHeader({
  title,
  subtitle,
  badge,
  badgeIcon: BadgeIcon,
  metrics,
  colorScheme,
}: ModuleHeaderProps) {
  const borderColor =
    colorScheme === "primary"
      ? "border-primary/15 from-primary/5"
      : "border-secondary/15 from-secondary/5";

  return (
    <div className={`border-b ${borderColor} bg-gradient-to-b to-transparent`}>
      <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Title section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-2 rounded-full border ${
                  colorScheme === "primary"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-secondary/20 bg-secondary/10 text-secondary"
                } px-3 py-1 text-xs font-medium`}
              >
                {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
                {badge}
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-lg border p-3 ${metric.accent}`}
              >
                <div className="text-xs font-semibold text-foreground/70">
                  {metric.label}
                </div>
                <div
                  className={`mt-1.5 text-lg font-bold tabular-nums ${metric.tone}`}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
