import { describe, expect, it, vi } from "vitest";
vi.mock("../db", () => ({ getDb: vi.fn(), getDbConnection: vi.fn() }));
vi.mock("../_core/env", () => ({ ENV: {} }));
import { cairoDayStart } from "../services/marketing/scheduler.service";
import { marketingGraphVersion } from "../services/marketing/facebookPublisher.service";

describe("Cairo day boundary", () => {
  it("starts the day at Cairo midnight, not server midnight", () => {
    // 23:30 UTC on the 14th is already the 15th in Cairo (UTC+2).
    expect(cairoDayStart(new Date("2026-11-14T23:30:00Z")).toISOString()).toBe(
      "2026-11-14T22:00:00.000Z",
    );
    expect(cairoDayStart(new Date("2026-11-14T21:30:00Z")).toISOString()).toBe(
      "2026-11-13T22:00:00.000Z",
    );
  });
});

describe("Graph API version", () => {
  it("accepts v<major>.<minor> and falls back otherwise", () => {
    expect(marketingGraphVersion("v22.0")).toBe("v22.0");
    expect(marketingGraphVersion("22.0")).toBe("v21.0");
    expect(marketingGraphVersion("v22.0/../x")).toBe("v21.0");
    expect(marketingGraphVersion(undefined)).toBe("v21.0");
  });
});
