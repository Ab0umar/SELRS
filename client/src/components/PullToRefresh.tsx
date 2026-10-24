import {
  computePullDistance,
  getLiveAnnouncement,
  getPullPhase,
  MAX_PULL,
  REFRESH_THRESHOLD,
  type PullPhase,
} from "@/lib/pull-to-refresh";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import * as React from "react";

type PullToRefreshProps = {
  children: React.ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  enabled?: boolean;
  className?: string;
};

export function PullToRefresh({
  children,
  onRefresh,
  enabled = true,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const previousPhaseRef = React.useRef<PullPhase>("idle");
  const [announcement, setAnnouncement] = React.useState("");

  const phase = getPullPhase(pullDistance, isRefreshing);

  // Only refresh start/finish reach the live region; getLiveAnnouncement
  // returns "" for pull transitions so it is never spammed per pixel.
  React.useEffect(() => {
    const message = getLiveAnnouncement(phase, previousPhaseRef.current);
    previousPhaseRef.current = phase;
    if (message) setAnnouncement(message);
  }, [phase]);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const apply = () => setIsCoarsePointer(mediaQuery.matches);
    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
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
      if ((window.scrollY || document.documentElement.scrollTop || 0) > 0)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-no-pull-refresh='true']")) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
    },
    [enabled, isCoarsePointer, isRefreshing],
  );

  // React registers touch listeners passively, so preventDefault is ignored
  // inside onTouchMove; track the pull with a native non-passive listener.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !isCoarsePointer) return;
    const handleTouchMove = (event: TouchEvent) => {
      if (isRefreshing) return;
      const startY = startYRef.current;
      if (startY == null) return;
      if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) {
        resetPull();
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch) return;
      const nextDistance = computePullDistance(touch.clientY - startY);
      if (nextDistance > 0 && event.cancelable) {
        event.preventDefault();
      }
      setPullDistance(nextDistance);
    };
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    return () => container.removeEventListener("touchmove", handleTouchMove);
  }, [enabled, isCoarsePointer, isRefreshing, resetPull]);

  const handleTouchEnd = React.useCallback(async () => {
    if (!enabled || !isCoarsePointer || isRefreshing) {
      resetPull();
      return;
    }
    const shouldRefresh = pullDistance >= REFRESH_THRESHOLD;
    resetPull();
    if (!shouldRefresh) return;
    await refresh();
  }, [
    enabled,
    isCoarsePointer,
    isRefreshing,
    pullDistance,
    refresh,
    resetPull,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overscroll-y-contain", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => {
        void handleTouchEnd();
      }}
      onTouchCancel={resetPull}
    >
      {/* Non-gesture refresh for keyboard/mouse users; sr-only until focused. */}
      {enabled && (
        <Button
          type="button"
          variant="bare"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          aria-label="تحديث البيانات"
          className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-50 focus-visible:top-2 focus-visible:end-2 focus-visible:grid focus-visible:size-11 focus-visible:place-items-center focus-visible:rounded-full focus-visible:border focus-visible:border-primary/20 focus-visible:bg-background/95 focus-visible:shadow-lg focus-visible:backdrop-blur"
        >
          <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
        </Button>
      )}
      {/* Announces refresh start/finish; stays silent while pulling. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none sticky top-0 z-20 flex h-0 items-end justify-center overflow-visible transition-[transform,opacity] duration-200 motion-reduce:transition-none",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `translateY(${Math.min(MAX_PULL, isRefreshing ? REFRESH_THRESHOLD : pullDistance)}px)`,
        }}
      >
        <div className="rounded-full border border-primary/20 bg-background/95 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-2">
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary motion-reduce:animate-none" />
            ) : pullDistance >= REFRESH_THRESHOLD ? (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            )}
            {isRefreshing
              ? "جاري التحديث…"
              : pullDistance >= REFRESH_THRESHOLD
                ? "اترك للتحديث"
                : "اسحب للتحديث"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
