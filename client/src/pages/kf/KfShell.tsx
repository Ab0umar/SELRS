import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Users, CalendarRange, ClipboardList, CalendarDays, BarChart3, ReceiptText, Wallet } from "lucide-react";

const LINKS = [
  { href: "/kf", label: "الرئيسية", icon: Home },
  { href: "/kf/patients", label: "المرضى", icon: Users },
  { href: "/kf/operations", label: "العمليات", icon: ClipboardList },
  { href: "/kf/followups", label: "المتابعات", icon: CalendarRange },
  { href: "/kf/accounting/daily-revenue", label: "الإيراد اليومي", icon: CalendarDays },
  { href: "/kf/accounting/service-revenue", label: "إيراد الخدمات", icon: BarChart3 },
  { href: "/kf/accounting/receipts", label: "الإيصالات", icon: ReceiptText },
  { href: "/kf/accounting/ledger", label: "الخزنة", icon: Wallet },
] as const;

export default function KfShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div dir="rtl" className="bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 lg:px-6">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/kf" && location.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 lg:px-6">{children}</main>
    </div>
  );
}
