import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AccountingTopSectionProps = {
  totals: ReactNode;
  search: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export default function AccountingTopSection({ totals, search, aside, className }: AccountingTopSectionProps) {
  return (
    <section className={cn("rounded-[24px] border border-border bg-background p-4 lg:p-5", className)}>
      <div
        className={cn(
          "grid gap-4",
          aside
            ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(280px,0.8fr)]"
            : "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]",
        )}
      >
        <div className="min-w-0">{totals}</div>
        <div className="min-w-0 space-y-4">{search}</div>
        {aside ? <div className="min-w-0 space-y-4">{aside}</div> : null}
      </div>
    </section>
  );
}
