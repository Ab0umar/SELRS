import { cn } from "@/lib/utils";

export function GradientBar({ className }: { className?: string }) {
  return <div className={cn("selrs-gradient-bar h-0.5 w-full rounded-full", className)} aria-hidden />;
}
