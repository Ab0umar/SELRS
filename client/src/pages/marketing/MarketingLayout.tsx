import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BarChart2, ChevronRight, FileText, LayoutDashboard, Settings, Share2 } from "lucide-react";

interface MarketingLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    href: "/marketing",
    label: "لوحة التحكم",
    description: "نظرة عامة وإجراءات سريعة",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/marketing/history",
    label: "سجل المنشورات",
    description: "المنشورات المنشورة",
    icon: Share2,
    exact: false,
  },
  {
    href: "/marketing/drafts",
    label: "المسودات",
    description: "المنشورات غير المكتملة",
    icon: FileText,
    exact: false,
  },
  {
    href: "/marketing/settings",
    label: "الإعدادات",
    description: "الجدولة وربط Facebook",
    icon: Settings,
    exact: false,
  },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="page-layout min-h-screen bg-background text-foreground" dir="rtl">
      {/* Header */}
      <div className="border-b border-primary/15 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              التسويق الرقمي
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            أتمتة التسويق
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            إدارة منشورات Facebook للمركز الطبي تلقائياً
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full border-b border-border bg-card/50 lg:w-64 lg:border-b-0 lg:border-r">
          <nav className="space-y-1 p-3 sm:p-4">
            {navItems.map((item) => {
              const active = isActive(location, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ${
                    active
                      ? "bg-background text-primary font-medium ring-1 ring-inset ring-primary/15 shadow-sm"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 mt-0.5 shrink-0 transition-opacity ${active ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"}`}
                  />
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-3 py-5 sm:px-4 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
