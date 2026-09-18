import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AccountingPageProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AccountingPage({
  actions,
  children,
  className,
}: AccountingPageProps) {
  return (
    <div className={cn("accounting-page space-y-3.5", className)} dir="rtl">
      {actions ? (
        <div className="flex flex-wrap items-center justify-start gap-2 print:hidden">
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function AccountingPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("accounting-panel", className)}>{children}</section>;
}
