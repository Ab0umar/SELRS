// file: client/src/components/TopNav.tsx
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

/**
 * Simple top navigation bar used across the app.
 * Uses the existing theme colors and includes subtle hover animations.
 */

function isItemActive(pathname: string, href: string): boolean {
  const currentPath = pathname.split("?")[0].split("#")[0];
  const itemPath = href.split("?")[0].split("#")[0];
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export default function TopNav() {
  const [location] = useLocation();
  const navItems = [
    { href: "/dashboard", label: "لوحة التحكم" },
    { href: "/patients", label: "المرضى" },
    { href: "/appointments", label: "المواعيد" },
    { href: "/reports", label: "التقارير" },
  ];

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        {/* Brand/logo */}
        <Link href="/" className="text-2xl font-bold">
          مركز عيون الشروق
        </Link>
        {/* Navigation items */}
        <nav
          aria-label="التنقل الرئيسي"
          className="flex space-x-4 rtl:space-x-reverse"
        >
          {navItems.map((item) => {
            const isActive = isItemActive(location, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-primary-foreground/80",
                  "relative after:absolute after:end-0 after:-bottom-1 after:h-0.5 after:w-full after:scale-x-0 after:bg-primary-foreground after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100",
                  isActive &&
                    "bg-primary-foreground/15 font-semibold text-primary-foreground after:scale-x-100"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
