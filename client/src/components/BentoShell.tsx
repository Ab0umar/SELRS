import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

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
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-6" dir="rtl">
      {headerExtra ? (
        <div className="mx-auto mb-5 flex max-w-[1600px] justify-end">
          {headerExtra}
        </div>
      ) : null}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
        <aside style={{ width: collapsed ? 76 : 260 }} className="hidden min-h-[600px] shrink-0 rounded-2xl border border-border/60 bg-card p-4 lg:flex lg:flex-col">
          <div className="mb-4 flex justify-end border-b border-border/60 pb-2">
            <button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
          <nav className="space-y-4">
            {navigationSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {!collapsed && <span className="block px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{section.label}</span>}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = isItemActive(location, item.activeFor);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center rounded-2xl text-xs font-bold transition-all duration-150",
                          collapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <div className="lg:hidden w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none whitespace-nowrap mb-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(location, item.activeFor);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all",
                  isActive ? "bg-primary text-primary-foreground" : "border border-border/60 bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <main className="min-w-0 flex-1 w-full rounded-2xl border border-border/60 bg-card p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
