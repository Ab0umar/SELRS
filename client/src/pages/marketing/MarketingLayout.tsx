import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BookImage,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Settings,
  Share2,
} from "lucide-react";

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
    href: "/marketing/brand",
    label: "مكتبة العلامة التجارية",
    description: "تصاميم مرجعية وهوية بصرية",
    icon: BookImage,
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
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  const [location] = useLocation();

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground"
      dir="rtl"
    >
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
      <div className="flex flex-col">
        {/* Horizontal Top Navigation Bar (all breakpoints) */}
        <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-border bg-card/50 px-3 py-2 scrollbar-none sm:px-4 lg:px-5 print:hidden">
          {navItems.map((item) => {
            const active = isActive(location, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 px-3 py-5 sm:px-4 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
