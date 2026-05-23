import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  const subtitleText = description || subtitle;

  return (
    <div className={cn("flex flex-col gap-1.5 sm:gap-2 mb-2 sm:mb-4", className)} dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {icon ? (
            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">
              {icon}
            </div>
          ) : null}
          <div className="flex-1 min-w-0 text-start">
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight">{title}</h1>
            {subtitleText ? (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 text-start">{subtitleText}</p>
            ) : null}
          </div>
        </div>
        {actions || action ? (
          <div className="flex items-center gap-2 shrink-0">{actions || action}</div>
        ) : null}
      </div>
    </div>
  );
}
