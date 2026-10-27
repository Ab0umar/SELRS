import { describe, expect, it } from "vitest";
import {
  aiMarketingPages,
  aiPages,
  aiPermissionPath,
  legacyAiRoutes,
} from "./navigation";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import { PAGE_PERMISSION_DEFINITIONS } from "@/lib/page-permissions";

describe("independent AI module access", () => {
  it("preserves existing permissions for every new AI destination", () => {
    const registered = new Set(
      PAGE_PERMISSION_DEFINITIONS.map((entry) => entry.id),
    );
    for (const page of [...aiPages, ...aiMarketingPages]) {
      expect(registered.has(aiPermissionPath(page.path)), page.path).toBe(true);
    }
  });

  it("keeps management permission separate from reply, clinical and marketing tools", () => {
    const allowed = permissionsToAllowedRoots(["/admin-hub/ai:rw"]);
    expect(pathGrantedByRoots(normalizeNavPath("/ai/settings"), allowed)).toBe(
      true,
    );
    expect(pathGrantedByRoots(normalizeNavPath("/ai/usage"), allowed)).toBe(
      true,
    );
    for (const path of [
      "/ai/replies",
      "/ai/medical",
      "/ai/marketing",
      "/ai/whatsapp",
    ]) {
      expect(pathGrantedByRoots(normalizeNavPath(path), allowed), path).toBe(
        false,
      );
    }
  });

  it("maps old and new permission tokens to the same destination", () => {
    expect(
      permissionsToAllowedRoots(["/ai/replies:rw", "/admin-hub/auto-reply:r"]),
    ).toEqual(["/admin-hub/auto-reply"]);
    expect(normalizeNavPath("/ai/marketing/settings?tab=schedule")).toBe(
      "/marketing/settings",
    );
    expect(
      pathGrantedByRoots(normalizeNavPath("/ai/marketing/settings"), [
        "/marketing",
      ]),
    ).toBe(false);
  });

  it("redirects legacy entry points into registered module pages without loops", () => {
    const destinations = new Set(
      [...aiPages, ...aiMarketingPages].map((page) => page.path),
    );
    for (const [oldPath, destination] of Object.entries(legacyAiRoutes)) {
      expect(destinations.has(destination), oldPath).toBe(true);
      expect(legacyAiRoutes[destination]).toBeUndefined();
    }
  });
});
