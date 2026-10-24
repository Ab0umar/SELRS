// file: client/src/components/FloatingShortcuts.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { ShortcutsMenu } from "./FloatingShortcuts";

// Mock the auth hook (its real implementation is network-backed) so static
// markup renders a deterministic logged-in / logged-out user with no providers.
const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

const homeHref = "/home";
const profileHref = "/profile";
const labels = {
  home: "الرئيسية",
  profile: "الملف الشخصي",
  logout: "تسجيل الخروج",
} as const;

function renderShortcutsAt(
  path: string,
  props: { isMobile?: boolean; onLogout?: () => void } = {},
): string {
  return renderToStaticMarkup(
    <Router ssrPath={path}>
      <ShortcutsMenu isMobile={props.isMobile ?? true} onLogout={props.onLogout} />
    </Router>,
  );
}

/** Map of href -> opening <a ...> tag for every anchor in the markup. */
function anchorsByHref(html: string): Map<string, string> {
  const anchors = new Map<string, string>();
  for (const tag of html.match(/<a\s[^>]*>/g) ?? []) {
    const href = /href="([^"]*)"/.exec(tag)?.[1];
    if (href !== undefined) anchors.set(href, tag);
  }
  return anchors;
}

/** Opening tags of every <button> in the markup. */
function buttonTags(html: string): string[] {
  return html.match(/<button\s[^>]*>/g) ?? [];
}

describe("ShortcutsMenu mobile and auth gates", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
  });

  it("should_render_nothing_when_not_mobile", () => {
    const html = renderShortcutsAt(homeHref, { isMobile: false });

    expect(html).toBe("");
  });

  it("should_render_nothing_when_no_user", () => {
    authState.user = null;
    const html = renderShortcutsAt(homeHref);

    expect(html).toBe("");
  });
});

describe("ShortcutsMenu navigation semantics", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
  });

  it("should_render_home_and_profile_as_anchor_links_with_href", () => {
    const anchors = anchorsByHref(renderShortcutsAt("/queue"));

    expect(anchors.has(homeHref)).toBe(true);
    expect(anchors.get(homeHref)).toContain(`href="${homeHref}"`);
    expect(anchors.has(profileHref)).toBe(true);
    expect(anchors.get(profileHref)).toContain(`href="${profileHref}"`);
  });

  it("should_not_render_navigation_as_buttons", () => {
    const html = renderShortcutsAt("/queue");
    const buttons = buttonTags(html);

    // Logout is the only real <button>; Home/Profile must be links.
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContain(`aria-label="${labels.logout}"`);
    const anchors = anchorsByHref(html);
    expect(anchors.has(homeHref)).toBe(true);
    expect(anchors.has(profileHref)).toBe(true);
  });

  it("should_mark_current_route_with_aria_current_page", () => {
    const atHome = anchorsByHref(renderShortcutsAt(homeHref));
    expect(atHome.get(homeHref)).toContain('aria-current="page"');
    expect(atHome.get(profileHref)).not.toContain("aria-current");

    const atProfile = anchorsByHref(renderShortcutsAt(profileHref));
    expect(atProfile.get(profileHref)).toContain('aria-current="page"');
    expect(atProfile.get(homeHref)).not.toContain("aria-current");

    // Query strings are stripped before matching the current route.
    const withQuery = anchorsByHref(renderShortcutsAt(`${homeHref}?tab=x`));
    expect(withQuery.get(homeHref)).toContain('aria-current="page"');
  });
});

describe("ShortcutsMenu uniform sizing and labelling", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
  });

  it("should_give_all_three_controls_identical_size_classes", () => {
    const html = renderShortcutsAt("/queue");

    // The old Logout-only h-9/w-9 override produced a 36x44 button; it must
    // never come back. size="icon" already yields a uniform 44px (size-11).
    expect(html).not.toContain("h-9");
    expect(html).not.toContain("w-9");

    const anchors = anchorsByHref(html);
    const logout = buttonTags(html)[0];
    for (const tag of [anchors.get(homeHref), anchors.get(profileHref), logout]) {
      expect(tag).toContain("size-11");
      expect(tag).toContain("shrink-0");
      expect(tag).toContain("rounded-md");
    }
  });

  it("should_label_every_control_with_aria_label", () => {
    const html = renderShortcutsAt("/queue");

    for (const label of [labels.home, labels.profile, labels.logout]) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`title="${label}"`);
    }
  });
});

describe("ShortcutsMenu logout safety", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
  });

  it("should_not_call_onLogout_during_render", () => {
    const onLogout = vi.fn();
    const html = renderShortcutsAt(homeHref, { onLogout });

    // Rendering has zero side effects: no logout fires, and the confirm dialog
    // stays closed (its description text is absent from the markup).
    expect(onLogout).not.toHaveBeenCalled();
    expect(html).not.toContain("إنهاء الجلسة");
    expect(buttonTags(html)).toHaveLength(1);
  });
});
