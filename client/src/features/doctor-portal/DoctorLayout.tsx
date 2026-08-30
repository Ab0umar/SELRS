import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useDoctorAuth } from "@/hooks/useDoctorAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/doctor-portal/dashboard", label: "مرضاي", icon: LayoutDashboard },
];

export default function DoctorLayout({ children }: { children: ReactNode }) {
  const { fullName, username, logout } = useDoctorAuth();
  const [location] = useLocation();
  const displayName = fullName ?? username ?? "طبيب";

  return (
    <div
      className="min-h-screen flex flex-col bg-[#F4F8FB] text-foreground font-sans"
      dir="rtl"
    >
      {/* Sticky top header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#e2edf7] shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          {/* Logo + portal title */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block p-1.5 bg-[#F4F8FB] border border-[#e2edf7] rounded-xl">
              <BrandLogo className="size-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-primary leading-tight">
                مركز عيون الشروق
              </h1>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                بوابة الأطباء الخارجيين
              </p>
            </div>
          </div>

          {/* Doctor name + logout */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col pl-2 border-l border-border/60">
              <span className="text-xs font-bold text-foreground text-right">
                {displayName}
              </span>
              <span className="text-[10px] text-muted-foreground text-right">
                بوابة الطبيب
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="rounded-xl hover:bg-destructive/5 hover:text-destructive text-muted-foreground cursor-pointer size-10"
              title="تسجيل الخروج"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content frame */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 md:py-8 flex flex-col gap-6">
        {/* Desktop nav tabs */}
        <nav className="hidden md:flex flex-wrap items-center gap-1.5 border-b border-[#dbe7f4] pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-white hover:text-primary hover:shadow-xs border border-transparent hover:border-[#dbe7f4]",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-[#e2edf7] flex items-center justify-around px-2 shadow-lg">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl transition-all duration-150 cursor-pointer",
                  active
                    ? "text-primary font-bold scale-105"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="text-[9px] tracking-tight">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
