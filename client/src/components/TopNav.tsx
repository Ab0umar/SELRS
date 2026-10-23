// file: client/src/components/TopNav.tsx
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

/**
 * Simple top navigation bar used across the app.
 * Uses the existing theme colors and includes subtle hover animations.
 */

// The ! modifiers are needed because design-system.css paints an unlayered
// --ring focus outline that matches the primary background on this header.
const focusRing =
  "focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-primary-foreground";

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
      <div
        className="container mx-auto flex flex-col gap-1 px-3 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2"
      >
        {/* Brand/logo */}
        <Link
          href="/"
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center self-start whitespace-nowrap rounded-md text-lg font-bold sm:self-auto sm:text-xl md:text-2xl",
            focusRing,
          )}
        >
          مركز عيون الشروق
        </Link>
        {/* Navigation items */}
        <nav
          aria-label="التنقل الرئيسي"
          className="grid w-full grid-cols-4 gap-1 sm:flex sm:w-auto sm:gap-2 md:gap-4"
        >
          {navItems.map((item) => {
            const isActive = isItemActive(location, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-md px-2 py-1 text-center text-sm font-medium leading-tight transition-colors hover:text-primary-foreground/80 active:bg-primary-foreground/10 sm:whitespace-nowrap",
                  "relative after:absolute after:end-0 after:-bottom-1 after:h-0.5 after:w-full after:scale-x-0 after:bg-primary-foreground after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100",
                  focusRing,
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
