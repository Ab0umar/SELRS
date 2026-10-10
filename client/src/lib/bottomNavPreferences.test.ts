import { describe, expect, it } from "vitest";
import {
  moveBottomNavKey,
  normalizeBottomNavKeys,
} from "./bottomNavPreferences";

describe("mobile navigation preferences", () => {
  it("preserves saved order while removing invalid and duplicate keys", () => {
    expect(
      normalizeBottomNavKeys(["b", "a", "b", "unknown", 2], ["a", "b"]),
    ).toEqual(["b", "a"]);
    expect(normalizeBottomNavKeys([], ["a"])).toEqual([]);
    expect(normalizeBottomNavKeys({}, ["a"])).toBeNull();
  });
  it("moves an item without changing the input or enabled items", () => {
    const keys = ["a", "b", "c"];
    expect(moveBottomNavKey(keys, "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveBottomNavKey(keys, "b", 1)).toEqual(["a", "c", "b"]);
    expect(keys).toEqual(["a", "b", "c"]);
  });
  it("does not move beyond the ends or insert missing keys", () => {
    expect(moveBottomNavKey(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveBottomNavKey(["a", "b"], "b", 1)).toEqual(["a", "b"]);
    expect(moveBottomNavKey(["a"], "missing", 1)).toEqual(["a"]);
  });
});
