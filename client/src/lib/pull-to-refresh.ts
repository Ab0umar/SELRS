// Pull-to-refresh gesture math and state, extracted from PullToRefresh.tsx so
// it can be unit-tested in vitest's node environment (no jsdom installed).

export const MAX_PULL = 96;
export const REFRESH_THRESHOLD = 72;
export const PULL_RESISTANCE = 0.45;

export type PullPhase = "idle" | "pulling" | "ready" | "refreshing";

const PULL_HINT = "اسحب للتحديث";

const PHASE_LABELS: Record<PullPhase, string> = {
  idle: PULL_HINT,
  pulling: PULL_HINT,
  ready: "اترك للتحديث",
  refreshing: "جاري التحديث…",
};

/** Rubber-band distance in px for a downward touch delta; 0 when moving up. */
export function computePullDistance(deltaY: number): number {
  if (deltaY <= 0) return 0;
  return Math.min(MAX_PULL, Math.round(deltaY * PULL_RESISTANCE));
}

export function getPullPhase(
  pullDistance: number,
  isRefreshing: boolean,
): PullPhase {
  if (isRefreshing) return "refreshing";
  if (pullDistance >= REFRESH_THRESHOLD) return "ready";
  if (pullDistance > 0) return "pulling";
  return "idle";
}

/** Arabic label shown in the visual pull indicator for the current phase. */
export function getPullLabel(phase: PullPhase): string {
  return PHASE_LABELS[phase];
}

/**
 * Text for the aria-live region. Non-empty only for the transitions screen
 * readers care about — refresh started and refresh finished — so the live
 * region is not spammed on every pixel of pull.
 */
export function getLiveAnnouncement(
  phase: PullPhase,
  previousPhase: PullPhase,
): string {
  if (phase !== previousPhase) {
    if (phase === "refreshing") return PHASE_LABELS.refreshing;
    if (previousPhase === "refreshing") return "تم التحديث";
  }
  return "";
}
