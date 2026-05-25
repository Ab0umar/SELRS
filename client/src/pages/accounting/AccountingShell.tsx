import type { ReactNode } from "react";
import {
  Banknote,
  BookOpen,
  Home,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const ACCOUNTING_LINKS = [
  { label: "الرئيسية", href: "/accounting", icon: Home },
  { label: "القيود", href: "/accounting/ledger", icon: BookOpen },
  { label: "اليومي", href: "/accounting/daily-revenue", icon: Banknote },
  { label: "إيراد الخدمات", href: "/accounting/service-revenue", icon: TrendingUp },
  { label: "الإيصالات", href: "/accounting/receipts", icon: ReceiptText },
] as const;

export default function AccountingShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div dir="rtl" className="bg-card text-foreground">
      <div className="h-1 w-full bg-border" />
      <header className="border-b border-border bg-background">
        <nav
          aria-label="روابط الحسابات"
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 lg:px-6"
        >
          {ACCOUNTING_LINKS.map(({ label, href, icon: Icon }) => {
            const active = location === href;
            const iconOnly = href === "/accounting";

            return (
              <Link
                key={href}
                href={href}
                aria-label={iconOnly ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                  iconOnly ? "w-10 px-0" : "px-3",
                  active
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground bg-muted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {!iconOnly && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 pb-[env(safe-area-inset-bottom)] lg:px-6 lg:py-5">
        {children}
      </main>
    </div>
  );
}
