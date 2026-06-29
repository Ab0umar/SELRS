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
  headerTitle,
  headerSubtitle,
  headerExtra,
}: BentoShellProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6" dir="rtl">
      <header className="max-w-[1600px] mx-auto mb-6 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-mono font-black text-sm">HR</div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-none">{headerTitle}</h1>
            {headerSubtitle && (<span className="text-[10px] text-slate-400 block mt-1 font-medium">{headerSubtitle}</span>)}
          </div>
        </div>
        {headerExtra && <div className="flex items-center gap-3 self-start md:self-center">{headerExtra}</div>}
      </header>
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
        <aside style={{ width: collapsed ? 76 : 260 }} className="hidden lg:flex lg:flex-col shrink-0 bg-white border border-slate-200 rounded-3xl p-4 min-h-[600px] transition-all duration-200 shadow-sm">
          <div className="flex justify-end mb-4 pb-2 border-b border-slate-100">
            <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-slate-50 text-slate-450 hover:text-slate-700 rounded-xl transition-all">
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
          <nav className="space-y-4">
            {navigationSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {!collapsed && <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-wider block">{section.label}</span>}
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
                          isActive ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-655 hover:bg-slate-50 hover:text-slate-900"
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
                  isActive ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <main className="flex-1 w-full min-w-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
