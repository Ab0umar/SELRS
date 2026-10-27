import { describe, expect, it } from "vitest";
import { consolidateAdminDirectory } from "./admin-directory";

const cards = [
  "users",
  "legacy-patients",
  "op-history",
  "ai",
  "auto-reply",
  "medical-assistant",
  "external-doctors",
  "external-referrals",
].map((name) => ({
  href: `/admin-hub/${name}`,
  label: name,
  helper: `description ${name}`,
}));

describe("administration directory sections", () => {
  it("shows one card per section without deleting its child routes", () => {
    const result = consolidateAdminDirectory(cards, () => true);
    expect(result.map((card) => card.href)).toEqual([
      "/admin-hub/users",
      "/admin-hub/legacy-patients",
      "/admin-hub/ai",
      "/admin-hub/external-doctors",
    ]);
    expect(cards).toHaveLength(8);
  });
  it.each([
    "op-history",
    "auto-reply",
    "medical-assistant",
    "external-referrals",
  ])(
    "keeps a permitted child accessible without granting its parent: %s",
    (child) => {
      const path = `/admin-hub/${child}`;
      const result = consolidateAdminDirectory(cards, (href) => href === path);
      expect(result).toHaveLength(1);
      expect(result[0].href).toBe(path);
    },
  );
  it("does not expose sections when permissions are denied", () => {
    expect(consolidateAdminDirectory(cards, () => false)).toEqual([]);
  });
  it("preserves search terms for consolidated children without expanding visible copy", () => {
    const result = consolidateAdminDirectory(cards, () => true);
    const ai = result.find((card) => card.href === "/admin-hub/ai")!;
    expect(ai.searchTerms).toContain("medical-assistant");
    expect(ai.searchTerms).toContain("auto-reply");
    expect(ai.helper).toBe("description ai");
  });
});
