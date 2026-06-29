// file: client/src/components/TopNav.tsx
import { Link } from "wouter";
import { cn } from "@/lib/utils";

/**
 * Simple top navigation bar used across the app.
 * Uses the existing theme colors and includes subtle hover animations.
 */
export default function TopNav() {
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
        <Link href="/" className="text-2xl font-bold tracking-tight">
          مركز عيون الشروق
        </Link>
        {/* Navigation items */}
        <nav className="flex space-x-4 rtl:space-x-reverse">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium hover:text-primary-foreground/80 transition-colors",
                "relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:scale-x-0 after:bg-primary-foreground after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
