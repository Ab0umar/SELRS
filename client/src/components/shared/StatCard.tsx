import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mobile: all summary cards in one horizontal row (scroll). From `sm`: use with `sm:grid sm:grid-cols-*`. */
export const STAT_CARDS_MOBILE_ROW =
  "flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-none sm:overflow-visible sm:pb-0";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  icon?: LucideIcon | ReactNode;
  iconColor?: string;
  trend?: { value: number; positive: boolean } | "up" | "down";
  change?: string;
  description?: string;
  /** Muted by default; use e.g. text-success for emphasis */
  descriptionClassName?: string;
  className?: string;
}

export function StatCard({
  title,
  label,
  value,
  icon,
  iconColor,
  trend,
  change,
  description,
  descriptionClassName,
  className,
}: StatCardProps) {
  const displayLabel = title || label;
  const iconIsElement = isValidElement(icon);
  const IconComponent = !iconIsElement && icon ? (icon as LucideIcon) : null;

  const isStringTrend = typeof trend === "string";
  const trendObj = !isStringTrend && trend ? trend : null;
  const trendDir: "up" | "down" | null = isStringTrend ? trend : trendObj ? (trendObj.positive ? "up" : "down") : null;

  return (
    <div
      className={cn(
        "min-w-[5.75rem] max-w-[42vw] shrink-0 rounded-xl border bg-card p-2 shadow-sm sm:min-w-0 sm:max-w-none sm:shrink sm:p-3",
        className,
      )}
      dir="rtl"
    >
      <div className="mb-1.5 flex items-center justify-between gap-1 sm:mb-2">
        <span className="line-clamp-2 min-w-0 text-[10px] font-semibold leading-tight text-muted-foreground sm:text-xs">
          {displayLabel}
        </span>
        {icon ? (
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8",
              iconColor || "bg-primary text-primary-foreground",
            )}
          >
            {IconComponent ? <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : (icon as ReactNode)}
          </div>
        ) : null}
      </div>
      <div className="text-base font-black tabular-nums tracking-tight sm:text-lg">{value}</div>
      {trendDir || change || description ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trendDir ? (
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-semibold",
                trendDir === "up" ? "text-secondary" : "text-destructive",
              )}
            >
              {trendDir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change ?? (trendObj ? `${trendObj.value}%` : "")}
            </div>
          ) : null}
          {description ? (
            <span className={cn("text-[10px]", descriptionClassName ?? "text-muted-foreground")}>{description}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
