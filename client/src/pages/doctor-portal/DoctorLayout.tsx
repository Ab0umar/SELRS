import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { FileImage, LayoutDashboard, LogOut, Stethoscope } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-[#f6f9fd] text-foreground" dir="rtl">
      <div className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
        <div className="overflow-hidden rounded-none border-0 bg-white shadow-none sm:rounded-[2rem] sm:border sm:border-[#dce9f5] sm:shadow-[0_20px_60px_rgba(28,64,104,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,#002A63_0%,#0F4E93_38%,#DDEAF7_79%,#F8FAFC_100%)] px-4 pb-24 pt-5 text-white sm:px-6 sm:pb-28 lg:px-10 lg:pb-32">
            <div className="mx-auto flex max-w-2xl items-center justify-center gap-4 px-6 py-4 text-center text-white">
              <BrandLogo className="size-14 shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.18)] sm:size-16" />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-none sm:text-3xl">مركز عيون الشروق</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">بوابة الأطباء الخارجيين</p>
              </div>
            </div>
          </div>

          <div className="-mt-20 px-4 pb-5 sm:px-6 sm:pb-6 lg:-mt-24 lg:px-10">
            <div className="mx-auto max-w-7xl space-y-4">
              <div className="rounded-[2rem] border border-[#dbe7f4] bg-white p-4 shadow-[0_12px_36px_rgba(28,64,104,0.06)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-secondary">بوابة الطبيب</p>
                    <p className="truncate text-lg font-semibold leading-none text-primary sm:text-xl">
                      {fullName ?? username ?? "طبيب"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">خروج</span>
                  </Button>
                </div>

                <nav className="mt-4 flex items-center gap-2 overflow-x-auto rounded-full border border-[#dbe7f4] bg-[#f6f9fd] p-1">
                  {NAV.map((item) => {
                    const Icon = item.icon;
                    const active = location.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={cn(
                            "inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-white hover:text-primary",
                          )}
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <main>{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
