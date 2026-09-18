import type { ReactNode } from "react";
import { Home, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  subtitle,
  icon,
  action,
  actions,
  className,
}: PageHeaderProps) {
  const [, setLocation] = useLocation();
  const { logout, loading: logoutLoading } = useAuth();
  const hasTitle = Boolean(title || subtitle || description || icon);
  return (
    <div
      data-admin-page-header="true"
      className={cn(
        "mb-2 flex flex-wrap items-start justify-between gap-3 sm:mb-4",
        className,
      )}
      dir="rtl"
    >
      {hasTitle ? (
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            {title ? (
              <h1 className="truncate text-lg font-bold leading-tight text-foreground">
                {title}
              </h1>
            ) : null}
            {description || subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {description || subtitle}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {actions || action ? (
          <div className="flex items-center gap-2 shrink-0">
            {actions || action}
          </div>
        ) : null}
        <button
          type="button"
          aria-label="الصفحة الرئيسية"
          title="الصفحة الرئيسية"
          onClick={() => setLocation("/dashboard")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="تسجيل الخروج"
          title="تسجيل الخروج"
          onClick={() => void logout()}
          disabled={logoutLoading}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
