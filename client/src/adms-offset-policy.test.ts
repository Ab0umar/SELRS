import { describe, expect, it } from "vitest";
import { mayAutoDetectAdmsOffset } from "../../server/services/attendance/admsOffsetPolicy";

describe("ADMS automatic offset policy", () => {
  it("does not retune an already calibrated device", () => {
    expect(mayAutoDetectAdmsOffset(undefined, undefined)).toBe(true);
    expect(mayAutoDetectAdmsOffset(3, undefined)).toBe(false);
    expect(mayAutoDetectAdmsOffset(undefined, "3")).toBe(false);
  });
});
