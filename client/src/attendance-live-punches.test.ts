import { describe, expect, it } from "vitest";
import {
  liveBoardReconnectDelay,
  mergeLivePunches,
  shouldReconnectLiveBoard,
  type LivePunch,
} from "./features/attendance/livePunches";

const punch = (empCd: string, timestamp: string): LivePunch => ({
  empCd,
  timestamp: new Date(timestamp),
  direction: "in",
  deviceId: "fk",
});

describe("live attendance punch merging", () => {
  it("retries with capped backoff except after an authorization rejection", () => {
    expect(liveBoardReconnectDelay(0)).toBe(1_000);
    expect(liveBoardReconnectDelay(4)).toBe(16_000);
    expect(liveBoardReconnectDelay(10)).toBe(30_000);
    expect(shouldReconnectLiveBoard(1006)).toBe(true);
    expect(shouldReconnectLiveBoard(1008)).toBe(false);
  });

  it("deduplicates polling and websocket rows by employee and timestamp", () => {
    const merged = mergeLivePunches(
      [punch("31", "2026-09-02T10:00:00Z")],
      [
        punch("31", "2026-09-02T10:00:00Z"),
        punch("32", "2026-09-02T10:01:00Z"),
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged[0].empCd).toBe("32");
  });

  it("keeps the most recent 100 punches", () => {
    const incoming = Array.from({ length: 120 }, (_, index) =>
      punch("31", new Date(Date.UTC(2026, 0, index + 1, 10)).toISOString()),
    );

    const merged = mergeLivePunches([], incoming);
    expect(merged).toHaveLength(100);
    expect(merged[0].timestamp.getTime()).toBeGreaterThan(
      merged[99].timestamp.getTime(),
    );
  });
});
