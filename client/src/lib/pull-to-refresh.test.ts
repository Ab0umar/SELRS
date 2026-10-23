import { describe, expect, it } from "vitest";
import {
  MAX_PULL,
  PULL_RESISTANCE,
  REFRESH_THRESHOLD,
  computePullDistance,
  getLiveAnnouncement,
  getPullLabel,
  getPullPhase,
} from "./pull-to-refresh";

describe("computePullDistance", () => {
  it("should_return_zero_for_negative_delta", () => {
    expect(computePullDistance(-40)).toBe(0);
  });

  it("should_return_zero_for_zero_delta", () => {
    expect(computePullDistance(0)).toBe(0);
  });

  it("should_apply_resistance_and_round_to_whole_pixels", () => {
    expect(computePullDistance(100)).toBe(45); // 100 * 0.45
    expect(computePullDistance(101)).toBe(45); // 45.45 rounds down
    expect(computePullDistance(102)).toBe(46); // 45.9 rounds up
    expect(computePullDistance(103)).toBe(46); // 46.35 rounds down
  });

  it("should_clamp_at_max_pull", () => {
    expect(MAX_PULL).toBe(96);
    expect(computePullDistance(1000)).toBe(96);
  });

  it("should_expose_the_documented_constants", () => {
    expect(REFRESH_THRESHOLD).toBe(72);
    expect(PULL_RESISTANCE).toBe(0.45);
  });
});

describe("getPullPhase", () => {
  it("should_be_idle_when_distance_is_zero", () => {
    expect(getPullPhase(0, false)).toBe("idle");
  });

  it("should_be_pulling_below_the_threshold", () => {
    expect(getPullPhase(1, false)).toBe("pulling");
    expect(getPullPhase(71, false)).toBe("pulling");
  });

  it("should_become_ready_at_the_threshold_boundary", () => {
    expect(getPullPhase(71, false)).toBe("pulling");
    expect(getPullPhase(72, false)).toBe("ready");
    expect(getPullPhase(96, false)).toBe("ready");
  });

  it("should_refresh_regardless_of_pull_distance", () => {
    expect(getPullPhase(0, true)).toBe("refreshing");
    expect(getPullPhase(72, true)).toBe("refreshing");
  });
});

describe("getPullLabel", () => {
  it("should_show_the_pull_hint_for_idle_and_pulling", () => {
    expect(getPullLabel("idle")).toBe("اسحب للتحديث");
    expect(getPullLabel("pulling")).toBe("اسحب للتحديث");
  });

  it("should_ask_to_release_when_ready", () => {
    expect(getPullLabel("ready")).toBe("اترك للتحديث");
  });

  it("should_show_refresh_in_progress_while_refreshing", () => {
    expect(getPullLabel("refreshing")).toBe("جاري التحديث…");
  });
});

describe("getLiveAnnouncement", () => {
  it("should_stay_quiet_while_the_user_pulls", () => {
    expect(getLiveAnnouncement("pulling", "idle")).toBe("");
    expect(getLiveAnnouncement("ready", "pulling")).toBe("");
  });

  it("should_stay_quiet_when_the_pull_is_released_without_refresh", () => {
    expect(getLiveAnnouncement("idle", "ready")).toBe("");
  });

  it("should_return_empty_when_the_phase_does_not_change", () => {
    expect(getLiveAnnouncement("idle", "idle")).toBe("");
    expect(getLiveAnnouncement("refreshing", "refreshing")).toBe("");
  });

  it("should_announce_when_refresh_starts", () => {
    expect(getLiveAnnouncement("refreshing", "ready")).toBe("جاري التحديث…");
    expect(getLiveAnnouncement("refreshing", "idle")).toBe("جاري التحديث…");
  });

  it("should_announce_when_refresh_finishes", () => {
    expect(getLiveAnnouncement("idle", "refreshing")).toBe("تم التحديث");
    expect(getLiveAnnouncement("pulling", "refreshing")).toBe("تم التحديث");
  });
});
