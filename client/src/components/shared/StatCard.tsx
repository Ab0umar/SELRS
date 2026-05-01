import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  icon?: LucideIcon | ReactNode;
  iconColor?: string;
  trend?: { value: number; positive: boolean } | "up" | "down";
  change?: string;
  description?: string;
  /** Muted by default; use e.g. text-emerald-600 for emphasis */
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
    <div className={cn("rounded-xl border bg-card p-3 shadow-sm", className)} dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{displayLabel}</span>
        {icon ? (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconColor || "bg-primary/10 text-primary")}>
            {IconComponent ? <IconComponent className="h-4 w-4" /> : (icon as ReactNode)}
          </div>
        ) : null}
      </div>
      <div className="text-lg font-black tracking-tight tabular-nums">{value}</div>
      {trendDir || change || description ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trendDir ? (
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-semibold",
                trendDir === "up" ? "text-secondary dark:text-secondary" : "text-red-600 dark:text-red-400",
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
