import { cn } from "@/lib/utils";
import { ArrowDown, Loader2, Sparkles } from "lucide-react";
import * as React from "react";

type PullToRefreshProps = {
  children: React.ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  enabled?: boolean;
  className?: string;
};

const MAX_PULL = 96;
const REFRESH_THRESHOLD = 72;

export function PullToRefresh({
  children,
  onRefresh,
  enabled = true,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = React.useState(false);
  const startYRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const apply = () => setIsCoarsePointer(mediaQuery.matches);
    apply();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", apply);
      return () => mediaQuery.removeEventListener("change", apply);
    }
    mediaQuery.addListener(apply);
    return () => mediaQuery.removeListener(apply);
  }, []);

  const resetPull = React.useCallback(() => {
    startYRef.current = null;
    setPullDistance(0);
  }, []);

  const refresh = React.useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, onRefresh]);

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!enabled || !isCoarsePointer || isRefreshing) return;
      if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-no-pull-refresh='true']")) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
    },
    [enabled, isCoarsePointer, isRefreshing]
  );

  const handleTouchMove = React.useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!enabled || !isCoarsePointer || isRefreshing) return;
      const startY = startYRef.current;
      if (startY == null) return;
      if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) {
        resetPull();
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaY = touch.clientY - startY;
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }
      const nextDistance = Math.min(MAX_PULL, Math.round(deltaY * 0.45));
      if (nextDistance > 0) {
        event.preventDefault();
      }
      setPullDistance(nextDistance);
    },
    [enabled, isCoarsePointer, isRefreshing, resetPull]
  );

  const handleTouchEnd = React.useCallback(async () => {
    if (!enabled || !isCoarsePointer || isRefreshing) {
      resetPull();
      return;
    }
    const shouldRefresh = pullDistance >= REFRESH_THRESHOLD;
    resetPull();
    if (!shouldRefresh) return;
    await refresh();
  }, [enabled, isCoarsePointer, isRefreshing, pullDistance, refresh, resetPull]);

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        void handleTouchEnd();
      }}
      onTouchCancel={resetPull}
    >
      <div
        className={cn(
          "pointer-events-none sticky top-0 z-20 flex h-0 items-end justify-center overflow-visible transition-all duration-200",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: `translateY(${Math.min(MAX_PULL, isRefreshing ? REFRESH_THRESHOLD : pullDistance)}px)` }}
      >
        <div className="rounded-full border border-primary/20 bg-white/95 px-4 py-2 text-xs text-slate-600 shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-2">
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : pullDistance >= REFRESH_THRESHOLD ? (
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            )}
            {isRefreshing
              ? "Refreshing..."
              : pullDistance >= REFRESH_THRESHOLD
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
