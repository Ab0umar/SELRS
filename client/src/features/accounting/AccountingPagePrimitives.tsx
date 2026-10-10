import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccountingPageProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AccountingPage({
  title,
  description,
  actions,
  children,
  className,
}: AccountingPageProps) {
  return (
    <div className={cn("accounting-page space-y-3.5", className)} dir="rtl">
      {title ? (
        <header className="accounting-page-heading print:hidden">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center justify-start gap-2 print:hidden">
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function AccountingQueryBoundary({
  query,
  label,
  children,
}: {
  query: {
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  };
  label: string;
  children: ReactNode;
}) {
  if (query.isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-4 border-y border-border py-6"
      >
        <p className="text-sm">تعذر تحميل {label}.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          <RefreshCw className="h-4 w-4" /> إعادة المحاولة
        </Button>
      </div>
    );
  }
  if (query.isLoading) {
    return (
      <p
        role="status"
        className="border-y border-border py-6 text-sm text-muted-foreground"
      >
        جارٍ تحميل {label}
      </p>
    );
  }
  return <>{children}</>;
}

export function AccountingPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("accounting-panel", className)}>{children}</section>
  );
}
