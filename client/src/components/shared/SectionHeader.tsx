import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, badge, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-center justify-between gap-2", className)} dir="rtl">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">{title}</h2>
        {badge}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
