import { describe, expect, it } from "vitest";
import { closureApplies } from "../lib/bookingClosureMatch";

describe("closureApplies", () => {
  it("does not let one branch's closure close the other", () => {
    expect(closureApplies({ bookingType: null, branch: "kfs" }, "specialist", "tanta")).toBe(false);
    expect(closureApplies({ bookingType: null, branch: "kfs" }, "specialist", "kfs")).toBe(true);
  });
  it("applies all-branch closures everywhere", () => {
    expect(closureApplies({ bookingType: null, branch: null }, "lasik", "tanta")).toBe(true);
    expect(closureApplies({ bookingType: null, branch: "" }, "lasik", "kfs")).toBe(true);
  });
  it("respects the booking type", () => {
    expect(closureApplies({ bookingType: "pentacam", branch: null }, "specialist", "tanta")).toBe(false);
    expect(closureApplies({ bookingType: "pentacam", branch: null }, "pentacam", "tanta")).toBe(true);
  });
  it("applies every closure when no branch is requested", () => {
    expect(closureApplies({ bookingType: null, branch: "kfs" }, "specialist", undefined)).toBe(true);
  });
});
