import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AccountingPageProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AccountingPage({
  eyebrow = "Accounting Desk",
  title,
  description,
  actions,
  children,
  className,
}: AccountingPageProps) {
  return (
    <div className={cn("accounting-page space-y-5", className)} dir="rtl">
      <div className="accounting-page__header">
        <div className="min-w-0">
          <div className="accounting-page__eyebrow">{eyebrow}</div>
          <h2 className="accounting-page__title">{title}</h2>
          {description ? (
            <p className="accounting-page__description">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="accounting-page__actions">{actions}</div> : null}
      </div>
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
