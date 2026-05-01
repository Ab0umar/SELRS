import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  children?: ReactNode;
  filters?: FilterOption[];
  selected?: string;
  onSelect?: (value: string) => void;
  variant?: "pill" | "tab";
  className?: string;
}

export function FilterBar({
  children,
  filters,
  selected,
  onSelect,
  variant = "pill",
  className,
}: FilterBarProps) {
  if (filters && onSelect) {
    return (
      <div
        className={cn("flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none pb-0.5", className)}
        dir="rtl"
      >
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              "text-xs sm:text-sm px-2.5 py-1 border transition whitespace-nowrap shrink-0 font-semibold",
              variant === "pill" ? "rounded-full" : "rounded-md",
              selected != null && selected !== "" && selected === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return <div className={cn("flex items-center gap-2 overflow-x-auto pb-0.5", className)}>{children}</div>;
}
