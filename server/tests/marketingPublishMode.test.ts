import { describe, expect, it } from "vitest";
import {
  marketingPublishModeOf,
  marketingPublishSettingsFor,
} from "../../shared/marketingPublishMode";

describe("marketing publish mode", () => {
  it("reads every stored combination as one of the three choices", () => {
    expect(
      marketingPublishModeOf({ autoPublish: false, requireApproval: true }),
    ).toBe("off");
    expect(
      marketingPublishModeOf({ autoPublish: false, requireApproval: false }),
    ).toBe("off");
    expect(
      marketingPublishModeOf({ autoPublish: true, requireApproval: true }),
    ).toBe("review");
    expect(
      marketingPublishModeOf({ autoPublish: true, requireApproval: false }),
    ).toBe("auto");
  });

  it("writes the two stored settings for each choice", () => {
    expect(marketingPublishSettingsFor("review", false)).toEqual({
      autoPublish: true,
      requireApproval: true,
    });
    expect(marketingPublishSettingsFor("auto", true)).toEqual({
      autoPublish: true,
      requireApproval: false,
    });
  });

  it("keeps the stored approval flag when turning a page off", () => {
    expect(marketingPublishSettingsFor("off", false)).toEqual({
      autoPublish: false,
      requireApproval: false,
    });
    expect(marketingPublishSettingsFor("off", true)).toEqual({
      autoPublish: false,
      requireApproval: true,
    });
  });

  it("round-trips each choice", () => {
    for (const mode of ["off", "review", "auto"] as const)
      expect(
        marketingPublishModeOf(marketingPublishSettingsFor(mode, true)),
      ).toBe(mode);
  });
});
