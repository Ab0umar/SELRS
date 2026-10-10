import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BentoShellProps {
  children: ReactNode;
  navigationSections: Array<{
    id: string;
    label: string;
    items: Array<{
      href: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      activeFor: string[];
    }>;
  }>;
  mobileNavItems: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    activeFor: string[];
  }>;
  headerTitle: string;
  headerSubtitle?: string;
  headerExtra?: ReactNode;
}

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default function BentoShell({
  children,
  navigationSections,
  mobileNavItems,
  headerExtra,
}: BentoShellProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-w-0 min-h-screen bg-background p-4 text-foreground sm:p-6" dir="rtl">
      {headerExtra ? (
        <div className="mx-auto mb-5 flex max-w-[1600px] justify-end">
          {headerExtra}
        </div>
      ) : null}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
        <aside style={{ width: collapsed ? 76 : 260 }} className="hidden min-h-[600px] shrink-0 rounded-2xl border border-border/60 bg-card p-4 lg:flex lg:flex-col">
          <div className="mb-4 flex justify-end border-b border-border/60 pb-2">
            <Button variant="bare" aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"} title={collapsed ? "توسيع القائمة" : "طي القائمة"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </Button>
          </div>
          <nav className="space-y-4">
            {navigationSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {!collapsed && <span className="block px-3 text-sm font-semibold text-muted-foreground">{section.label}</span>}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = isItemActive(location, item.activeFor);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex min-h-11 items-center rounded-2xl text-sm font-bold transition-colors",
                          collapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="flex-1 break-words">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <nav aria-label="الأقسام" className="lg:hidden w-full flex flex-wrap items-center gap-2 border-b border-border pb-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(location, item.activeFor);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 w-full rounded-2xl border border-border/60 bg-card p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
